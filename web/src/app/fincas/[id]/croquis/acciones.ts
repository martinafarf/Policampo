"use server";

// Acción del servidor para guardar sectores del método croquis (Esp. 02, T4).
// Reglas: RN-02, RN-03, RN-05 (recalcula superficies desde las geometrías), RN-06, RS-02, RS-06, RS-15.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { establecimiento, sector } from "@/db/schema";
import {
  LIMITES_ESTABLECIMIENTO,
  esUuidValido,
  validarSectoresConDibujo,
  type EntradaSectorConGeometria,
} from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { listarCultivosParaFinca } from "../../_lib/cultivos";

export interface PayloadGuardarCroquis {
  version: number;
  sectores: EntradaSectorConGeometria[];
}

export interface ResultadoGuardarCroquis {
  guardado: boolean;
  errores?: string[];
  nuevaVersion?: number;
}

export async function guardarSectoresCroquis(
  establecimientoId: string,
  payload: PayloadGuardarCroquis,
): Promise<ResultadoGuardarCroquis> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/croquis`);

  if (!esUuidValido(establecimientoId)) {
    notFound();
  }

  const bytesPayload = new TextEncoder().encode(JSON.stringify(payload ?? {})).byteLength;
  if (bytesPayload > LIMITES_ESTABLECIMIENTO.maxBytesGuardado) {
    return {
      guardado: false,
      errores: ["Los datos enviados superan el tamaño máximo permitido (1 MB)."],
    };
  }

  if (
    !payload ||
    !Number.isInteger(payload.version) ||
    payload.version < 1 ||
    !Array.isArray(payload.sectores)
  ) {
    return {
      guardado: false,
      errores: ["Los datos enviados no tienen el formato esperado."],
    };
  }

  const [actual] = await db
    .select()
    .from(establecimiento)
    .where(
      and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuario.id)),
    )
    .limit(1);

  if (!actual) {
    notFound();
  }

  // RN-03 y CA-02-15: rechazar si el establecimiento no usa el método croquis.
  if (actual.metodoCaracterizacion !== "croquis") {
    return {
      guardado: false,
      errores: ["Esta finca no se carga con croquis."],
    };
  }

  if (actual.superficieTotalHa === null) {
    return {
      guardado: false,
      errores: ["La finca necesita una superficie total para armar el croquis."],
    };
  }

  const sectoresPrevios = await db
    .select({ cultivoId: sector.cultivoId })
    .from(sector)
    .where(eq(sector.establecimientoId, actual.id));

  const idsYaAsignados = sectoresPrevios
    .map((s) => s.cultivoId)
    .filter((id): id is string => id !== null);

  const cultivosDisponibles = await listarCultivosParaFinca(idsYaAsignados);
  const mapaCultivos = new Map(cultivosDisponibles.map((c) => [c.id, c]));

  // Recalcula todas las superficies desde las geometrías (ignora cualquier valor enviado por el navegador).
  const validacion = validarSectoresConDibujo(
    {
      metodo: "croquis",
      superficieTotalHa: Number(actual.superficieTotalHa),
      sectores: payload.sectores,
    },
    mapaCultivos,
  );

  if (!validacion.valido) {
    return { guardado: false, errores: validacion.errores };
  }

  // Guardado atómico + control optimista de versión (CA-02-14, RS-15, CA-02-24).
  const resultadoTx = await db.transaction(async (tx) => {
    const actualizados = await tx
      .update(establecimiento)
      .set({
        version: payload.version + 1,
        actualizadoEn: new Date(),
      })
      .where(
        and(
          eq(establecimiento.id, actual.id),
          eq(establecimiento.usuarioId, usuario.id),
          eq(establecimiento.version, payload.version),
        ),
      )
      .returning({ version: establecimiento.version });

    if (actualizados.length === 0) {
      return { conflictoVersion: true as const };
    }

    await tx.delete(sector).where(eq(sector.establecimientoId, actual.id));

    if (validacion.sectores.length > 0) {
      await tx.insert(sector).values(
        validacion.sectores.map((s) => ({
          establecimientoId: actual.id,
          tipo: s.tipo,
          cultivoId: s.cultivoId,
          cultivoOtro: s.cultivoOtro,
          subtipoFlores: s.subtipoFlores,
          nombre: s.nombre,
          superficieHa: s.superficieHa.toFixed(4),
          ubicacionRelativa: null,
          geometria: s.geometria,
          orden: s.orden,
        })),
      );
    }

    return { conflictoVersion: false as const, nuevaVersion: actualizados[0].version };
  });

  if (resultadoTx.conflictoVersion) {
    return {
      guardado: false,
      errores: [
        "La finca cambió en otro dispositivo. Tus cambios siguen acá; recargá la página para ver la versión actual.",
      ],
    };
  }

  revalidatePath("/fincas");
  revalidatePath(`/fincas/${actual.id}`);

  return { guardado: true, nuevaVersion: resultadoTx.nuevaVersion };
}
