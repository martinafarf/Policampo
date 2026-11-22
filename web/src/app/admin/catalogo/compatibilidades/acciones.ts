"use server";

// Acciones de administración para la matriz de compatibilidades (Esp. 03, T3, CA-03-06, 09, 15, 16).
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cambioCatalogo, compatibilidad, cultivo, plantaServicio } from "@/db/schema";
import {
  validarEntradaCompatibilidad,
  validarPublicacionCompatibilidad,
  validarYPrepararCambioCatalogo,
  type EntradaCompatibilidad,
} from "@/dominio/catalogo";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirAdministrador } from "@/lib/sesion";

export interface ResultadoAccionCompatibilidad {
  ok: boolean;
  compatibilidadId?: string;
  errores?: string[];
}

export async function guardarCompatibilidad(
  cultivoId: string,
  plantaId: string,
  entrada: EntradaCompatibilidad,
): Promise<ResultadoAccionCompatibilidad> {
  const admin = await requerirAdministrador();

  if (!esUuidValido(cultivoId) || !esUuidValido(plantaId)) {
    notFound();
  }

  const validacion = validarEntradaCompatibilidad(entrada);
  if (!validacion.valido) {
    return { ok: false, errores: validacion.errores };
  }

  const [[filaCultivo], [filaPlanta]] = await Promise.all([
    db.select().from(cultivo).where(eq(cultivo.id, cultivoId)).limit(1),
    db.select().from(plantaServicio).where(eq(plantaServicio.id, plantaId)).limit(1),
  ]);

  if (!filaCultivo || !filaPlanta) {
    notFound();
  }

  const [existente] = await db
    .select()
    .from(compatibilidad)
    .where(and(eq(compatibilidad.cultivoId, cultivoId), eq(compatibilidad.plantaId, plantaId)))
    .limit(1);

  const { datos } = validacion;

  if (existente && existente.estado === "publicado") {
    const chequeo = validarPublicacionCompatibilidad({
      grado: datos.grado,
      justificacion: datos.justificacion,
      fuenteTipo: datos.fuenteTipo,
      fuenteDetalle: datos.fuenteDetalle,
      validadoPor: datos.validadoPor,
      estadoCultivo: filaCultivo.estado,
      estadoPlanta: filaPlanta.estado,
    });
    if (!chequeo.puedePublicar) {
      return {
        ok: false,
        errores: [
          `Esta compatibilidad está publicada y no puede quedar incompleta. Falta: ${chequeo.faltantes.join(", ")}.`,
        ],
      };
    }
  }

  const idGuardado = await db.transaction(async (tx) => {
    if (existente) {
      await tx
        .update(compatibilidad)
        .set({
          grado: datos.grado,
          justificacion: datos.justificacion,
          fuenteTipo: datos.fuenteTipo,
          fuenteDetalle: datos.fuenteDetalle,
          validadoPor: datos.validadoPor,
          actualizadoEn: new Date(),
        })
        .where(eq(compatibilidad.id, existente.id));

      const registro = validarYPrepararCambioCatalogo({
        entidad: "compatibilidad",
        entidadId: existente.id,
        accion: "edicion",
        administradorId: admin.id,
        antes: {
          grado: existente.grado,
          justificacion: existente.justificacion,
          fuenteTipo: existente.fuenteTipo,
          fuenteDetalle: existente.fuenteDetalle,
          validadoPor: existente.validadoPor,
        },
        despues: { ...datos },
      });
      await tx.insert(cambioCatalogo).values(registro);
      return existente.id;
    }

    const [creada] = await tx
      .insert(compatibilidad)
      .values({
        cultivoId,
        plantaId,
        grado: datos.grado,
        justificacion: datos.justificacion,
        estado: "borrador",
        fuenteTipo: datos.fuenteTipo,
        fuenteDetalle: datos.fuenteDetalle,
        validadoPor: datos.validadoPor,
      })
      .returning({ id: compatibilidad.id });

    const registro = validarYPrepararCambioCatalogo({
      entidad: "compatibilidad",
      entidadId: creada.id,
      accion: "alta",
      administradorId: admin.id,
      antes: null,
      despues: { cultivoId, plantaId, ...datos, estado: "borrador" },
    });
    await tx.insert(cambioCatalogo).values(registro);
    return creada.id;
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/compatibilidades");
  return { ok: true, compatibilidadId: idGuardado };
}

export async function publicarCompatibilidad(
  compatibilidadId: string,
): Promise<ResultadoAccionCompatibilidad> {
  const admin = await requerirAdministrador();
  if (!esUuidValido(compatibilidadId)) {
    notFound();
  }

  const [actual] = await db
    .select()
    .from(compatibilidad)
    .where(eq(compatibilidad.id, compatibilidadId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  const [[filaCultivo], [filaPlanta]] = await Promise.all([
    db.select({ estado: cultivo.estado }).from(cultivo).where(eq(cultivo.id, actual.cultivoId)).limit(1),
    db
      .select({ estado: plantaServicio.estado })
      .from(plantaServicio)
      .where(eq(plantaServicio.id, actual.plantaId))
      .limit(1),
  ]);

  // CA-03-06: una compatibilidad solo se puede publicar si su cultivo y su planta están publicados.
  const chequeo = validarPublicacionCompatibilidad({
    grado: actual.grado,
    justificacion: actual.justificacion,
    fuenteTipo: actual.fuenteTipo,
    fuenteDetalle: actual.fuenteDetalle,
    validadoPor: actual.validadoPor,
    estadoCultivo: filaCultivo?.estado ?? "borrador",
    estadoPlanta: filaPlanta?.estado ?? "borrador",
  });

  if (!chequeo.puedePublicar) {
    return {
      ok: false,
      errores: chequeo.faltantes.map((f) => `No se puede publicar: ${f}.`),
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(compatibilidad)
      .set({ estado: "publicado", actualizadoEn: new Date() })
      .where(eq(compatibilidad.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "compatibilidad",
      entidadId: actual.id,
      accion: "publicacion",
      administradorId: admin.id,
      antes: { estado: actual.estado },
      despues: { estado: "publicado" },
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/compatibilidades");
  return { ok: true, compatibilidadId: actual.id };
}

export async function retirarCompatibilidad(
  compatibilidadId: string,
  motivo: string,
): Promise<ResultadoAccionCompatibilidad> {
  const admin = await requerirAdministrador();
  if (!esUuidValido(compatibilidadId)) {
    notFound();
  }

  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    return { ok: false, errores: ["Indicá un motivo (al menos 5 caracteres) para retirar."] };
  }

  const [actual] = await db
    .select()
    .from(compatibilidad)
    .where(eq(compatibilidad.id, compatibilidadId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(compatibilidad)
      .set({ estado: "retirado", actualizadoEn: new Date() })
      .where(eq(compatibilidad.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "compatibilidad",
      entidadId: actual.id,
      accion: "retiro",
      administradorId: admin.id,
      antes: { estado: actual.estado },
      despues: { estado: "retirado" },
      motivo: motivoLimpio,
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/compatibilidades");
  return { ok: true, compatibilidadId: actual.id };
}
