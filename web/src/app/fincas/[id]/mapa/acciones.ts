"use server";

// Acción del servidor para guardar contorno y sectores del método mapa (Esp. 02, T5).
// Reglas: RN-02, RN-03, RN-05 (recalcula contorno y sectores con Turf.js), RN-06, RS-02, RS-06, RS-15.
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

export interface PayloadGuardarMapa {
  version: number;
  contorno: unknown;
  sectores: EntradaSectorConGeometria[];
}

export interface ResultadoGuardarMapa {
  guardado: boolean;
  errores?: string[];
  nuevaVersion?: number;
  superficieTotalHa?: number;
}

export async function guardarTerrenoMapa(
  establecimientoId: string,
  payload: PayloadGuardarMapa,
): Promise<ResultadoGuardarMapa> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/mapa`);

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

  // RN-03 y CA-02-15: solo fincas con método mapa.
  if (actual.metodoCaracterizacion !== "mapa") {
    return {
      guardado: false,
      errores: ["Esta finca no se carga en el mapa."],
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

  // Recalcula la superficie total desde el contorno y cada sector desde su geometría con Turf.js (CA-02-10, 11, 12).
  const validacion = validarSectoresConDibujo(
    {
      metodo: "mapa",
      contorno: payload.contorno,
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
        contorno: validacion.contornoValidado,
        superficieTotalHa: validacion.superficieTotalHa.toFixed(4),
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

  return {
    guardado: true,
    nuevaVersion: resultadoTx.nuevaVersion,
    superficieTotalHa: validacion.superficieTotalHa,
  };
}
