"use server";

// Acción del servidor para guardar sectores del método cuestionario (Esp. 02, T3).
// Reglas: RN-02, RN-03, RN-06, RS-02, RS-06, RS-15, CA-02-06, 08, 09, 14, 15, 24.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { establecimiento, sector } from "@/db/schema";
import {
  LIMITES_ESTABLECIMIENTO,
  esUuidValido,
  validarSectoresCuestionario,
  type EntradaSectorCuestionario,
  type ErrorSector,
} from "@/dominio/establecimientos";
import { listarCultivosParaFinca } from "../../_lib/cultivos";
import { exigirUsuarioActual } from "../../_lib/sesion";

export interface ResultadoGuardarCuestionario {
  guardado: boolean;
  errorGeneral?: string;
  erroresSectores?: ErrorSector[];
  nuevaVersion?: number;
}

export interface PayloadGuardarCuestionario {
  version: number;
  sectores: EntradaSectorCuestionario[];
}

export async function guardarSectoresCuestionario(
  establecimientoId: string,
  payload: PayloadGuardarCuestionario,
): Promise<ResultadoGuardarCuestionario> {
  const usuario = await exigirUsuarioActual(`/fincas/${establecimientoId}/cuestionario`);

  if (!esUuidValido(establecimientoId)) {
    notFound();
  }

  // Tope de tamaño de petición de 1 MB (sección 7.2, RS-06).
  const bytesPayload = new TextEncoder().encode(JSON.stringify(payload ?? {})).byteLength;
  if (bytesPayload > LIMITES_ESTABLECIMIENTO.maxBytesGuardado) {
    return {
      guardado: false,
      errorGeneral: "Los datos enviados superan el tamaño máximo permitido (1 MB).",
    };
  }

  if (!payload || !Number.isInteger(payload.version) || payload.version < 1 || !Array.isArray(payload.sectores)) {
    return {
      guardado: false,
      errorGeneral: "Los datos enviados no tienen el formato esperado.",
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

  // RN-03 y CA-02-15: no se pueden guardar sectores con un método distinto al de la finca.
  if (actual.metodoCaracterizacion !== "cuestionario") {
    return {
      guardado: false,
      errorGeneral: "Esta finca no se carga por cuestionario.",
    };
  }

  if (actual.superficieTotalHa === null) {
    return {
      guardado: false,
      errorGeneral: "La finca necesita una superficie total antes de cargar sectores.",
    };
  }

  // Cargar cultivos activos + los que ya estaban asignados a la finca (para no romper inactivos previos).
  const sectoresActuales = await db
    .select({ cultivoId: sector.cultivoId })
    .from(sector)
    .where(eq(sector.establecimientoId, actual.id));

  const idsYaAsignados = sectoresActuales
    .map((s) => s.cultivoId)
    .filter((id): id is string => id !== null);

  const cultivosDisponibles = await listarCultivosParaFinca(idsYaAsignados);
  const mapaCultivos = new Map(cultivosDisponibles.map((c) => [c.id, c]));

  const validacion = validarSectoresCuestionario(
    Number(actual.superficieTotalHa),
    payload.sectores,
    mapaCultivos,
  );

  if (!validacion.valido) {
    return {
      guardado: false,
      errorGeneral: validacion.errorGeneral,
      erroresSectores: validacion.errores,
    };
  }

  // Guardado atómico en una sola transacción + control optimista de versión (CA-02-14, RS-15, CA-02-24).
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
          ubicacionRelativa: s.ubicacionRelativa,
          geometria: null,
          orden: s.orden,
        })),
      );
    }

    return { conflictoVersion: false as const, nuevaVersion: actualizados[0].version };
  });

  if (resultadoTx.conflictoVersion) {
    return {
      guardado: false,
      errorGeneral:
        "La finca cambió en otro dispositivo. Tus cambios siguen acá; recargá la página para ver la versión actual.",
    };
  }

  revalidatePath("/fincas");
  revalidatePath(`/fincas/${actual.id}`);

  return { guardado: true, nuevaVersion: resultadoTx.nuevaVersion };
}
