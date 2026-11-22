"use server";

// Acciones de administración para datos agronómicos de cultivos (Esp. 03, T3, CA-03-04, 15, 16).
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { cambioCatalogo, cultivo, cultivoEcorregion } from "@/db/schema";
import {
  validarEntradaCultivo,
  validarPublicacionCultivo,
  validarYPrepararCambioCatalogo,
  type EntradaCultivoCatalogo,
} from "@/dominio/catalogo";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirAdministrador } from "@/lib/sesion";

export interface ResultadoAccionCultivo {
  ok: boolean;
  cultivoId?: string;
  errores?: string[];
}

function esErrorClaveDuplicada(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const codigo =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : "";
  return codigo === "23505";
}

export async function crearCultivoCatalogo(
  entrada: EntradaCultivoCatalogo,
): Promise<ResultadoAccionCultivo> {
  const admin = await requerirAdministrador();
  const validacion = validarEntradaCultivo(entrada);
  if (!validacion.valido) {
    return { ok: false, errores: validacion.errores };
  }

  const { datos } = validacion;

  try {
    const creadoId = await db.transaction(async (tx) => {
      const [creado] = await tx
        .insert(cultivo)
        .values({
          clave: datos.clave,
          nombre: datos.nombre,
          activo: datos.activo,
          dependenciaPolinizacion: datos.dependenciaPolinizacion,
          tipoPolinizacion: datos.tipoPolinizacion,
          polinizadoresNecesarios: datos.polinizadoresNecesarios,
          estado: "borrador",
          fuenteTipo: datos.fuenteTipo,
          fuenteDetalle: datos.fuenteDetalle,
          validadoPor: datos.validadoPor,
        })
        .returning();

      if (datos.periodos.length > 0) {
        await tx.insert(cultivoEcorregion).values(
          datos.periodos.map((p) => ({
            cultivoId: creado.id,
            ecorregion: p.ecorregion,
            floracionSemanas: p.floracionSemanas,
            cosechaSemanas: p.cosechaSemanas,
          })),
        );
      }

      const registro = validarYPrepararCambioCatalogo({
        entidad: "cultivo",
        entidadId: creado.id,
        accion: "alta",
        administradorId: admin.id,
        antes: null,
        despues: { ...datos, estado: "borrador" },
      });
      await tx.insert(cambioCatalogo).values(registro);
      return creado.id;
    });

    revalidatePath("/admin/catalogo");
    revalidatePath("/admin/catalogo/cultivos");
    revalidatePath("/fincas");
    return { ok: true, cultivoId: creadoId };
  } catch (error) {
    if (esErrorClaveDuplicada(error)) {
      return { ok: false, errores: ["Ya existe un cultivo con esa clave."] };
    }
    throw error;
  }
}

export async function editarCultivoCatalogo(
  cultivoId: string,
  entrada: EntradaCultivoCatalogo,
): Promise<ResultadoAccionCultivo> {
  const admin = await requerirAdministrador();
  if (!esUuidValido(cultivoId)) {
    notFound();
  }

  const [actual] = await db.select().from(cultivo).where(eq(cultivo.id, cultivoId)).limit(1);
  if (!actual) {
    notFound();
  }

  // La clave no cambia después de creada.
  const validacion = validarEntradaCultivo({ ...entrada, clave: actual.clave });
  if (!validacion.valido) {
    return { ok: false, errores: validacion.errores };
  }

  const { datos } = validacion;

  if (actual.estado === "publicado") {
    const chequeo = validarPublicacionCultivo(datos, datos.periodos);
    if (!chequeo.puedePublicar) {
      return {
        ok: false,
        errores: [
          `Este cultivo está publicado y no puede quedar incompleto. Falta: ${chequeo.faltantes.join(", ")}.`,
        ],
      };
    }
  }

  const periodosAnteriores = await db
    .select()
    .from(cultivoEcorregion)
    .where(eq(cultivoEcorregion.cultivoId, actual.id));

  await db.transaction(async (tx) => {
    await tx
      .update(cultivo)
      .set({
        nombre: datos.nombre,
        activo: datos.activo,
        dependenciaPolinizacion: datos.dependenciaPolinizacion,
        tipoPolinizacion: datos.tipoPolinizacion,
        polinizadoresNecesarios: datos.polinizadoresNecesarios,
        fuenteTipo: datos.fuenteTipo,
        fuenteDetalle: datos.fuenteDetalle,
        validadoPor: datos.validadoPor,
        actualizadoEn: new Date(),
      })
      .where(eq(cultivo.id, actual.id));

    await tx.delete(cultivoEcorregion).where(eq(cultivoEcorregion.cultivoId, actual.id));

    if (datos.periodos.length > 0) {
      await tx.insert(cultivoEcorregion).values(
        datos.periodos.map((p) => ({
          cultivoId: actual.id,
          ecorregion: p.ecorregion,
          floracionSemanas: p.floracionSemanas,
          cosechaSemanas: p.cosechaSemanas,
        })),
      );
    }

    const registro = validarYPrepararCambioCatalogo({
      entidad: "cultivo",
      entidadId: actual.id,
      accion: "edicion",
      administradorId: admin.id,
      antes: { ...actual, periodos: periodosAnteriores },
      despues: { ...datos, estado: actual.estado },
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/cultivos");
  revalidatePath(`/admin/catalogo/cultivos/${actual.id}`);
  return { ok: true, cultivoId: actual.id };
}

export async function publicarCultivoCatalogo(cultivoId: string): Promise<ResultadoAccionCultivo> {
  const admin = await requerirAdministrador();
  if (!esUuidValido(cultivoId)) {
    notFound();
  }

  const [actual] = await db.select().from(cultivo).where(eq(cultivo.id, cultivoId)).limit(1);
  if (!actual) {
    notFound();
  }

  const periodos = await db
    .select()
    .from(cultivoEcorregion)
    .where(eq(cultivoEcorregion.cultivoId, actual.id));

  const chequeo = validarPublicacionCultivo(actual, periodos);
  if (!chequeo.puedePublicar) {
    return {
      ok: false,
      errores: chequeo.faltantes.map((f) => `Falta completar: ${f}.`),
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(cultivo)
      .set({ estado: "publicado", actualizadoEn: new Date() })
      .where(eq(cultivo.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "cultivo",
      entidadId: actual.id,
      accion: "publicacion",
      administradorId: admin.id,
      antes: { estado: actual.estado },
      despues: { estado: "publicado" },
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/cultivos");
  revalidatePath(`/admin/catalogo/cultivos/${actual.id}`);
  return { ok: true, cultivoId: actual.id };
}

export async function retirarCultivoCatalogo(
  cultivoId: string,
  motivo: string,
): Promise<ResultadoAccionCultivo> {
  const admin = await requerirAdministrador();
  if (!esUuidValido(cultivoId)) {
    notFound();
  }

  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    return { ok: false, errores: ["Indicá un motivo (al menos 5 caracteres) para retirar el cultivo."] };
  }

  const [actual] = await db.select().from(cultivo).where(eq(cultivo.id, cultivoId)).limit(1);
  if (!actual) {
    notFound();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(cultivo)
      .set({ estado: "retirado", actualizadoEn: new Date() })
      .where(eq(cultivo.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "cultivo",
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
  revalidatePath("/admin/catalogo/cultivos");
  revalidatePath(`/admin/catalogo/cultivos/${actual.id}`);
  return { ok: true, cultivoId: actual.id };
}
