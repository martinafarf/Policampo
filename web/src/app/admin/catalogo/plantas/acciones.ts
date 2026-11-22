"use server";

// Acciones de administración para plantas de servicio (Esp. 03, T2).
// Toda acción exige rol administrador (404 si no lo es, CA-03-16) y escribe cambio_catalogo
// en la misma transacción que el cambio (CA-03-15).
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  cambioCatalogo,
  compatibilidad,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import {
  validarEntradaPlantaServicio,
  validarPublicacionPlanta,
  validarYPrepararCambioCatalogo,
  type EntradaPlantaServicio,
} from "@/dominio/catalogo";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirAdministrador } from "@/lib/sesion";

export interface ResultadoAccionPlanta {
  ok: boolean;
  plantaId?: string;
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

export async function crearPlantaServicio(
  entrada: EntradaPlantaServicio,
): Promise<ResultadoAccionPlanta> {
  const admin = await requerirAdministrador();
  const validacion = validarEntradaPlantaServicio(entrada);

  if (!validacion.valido) {
    return { ok: false, errores: validacion.errores };
  }

  const { datos } = validacion;

  try {
    const creadaId = await db.transaction(async (tx) => {
      const [creada] = await tx
        .insert(plantaServicio)
        .values({
          clave: datos.clave,
          nombreComun: datos.nombreComun,
          nombreCientifico: datos.nombreCientifico,
          funciones: datos.funciones,
          ciclo: datos.ciclo,
          origen: datos.origen,
          esEspontanea: datos.esEspontanea,
          enMercadoLocal: datos.enMercadoLocal,
          polinizadoresQueAtrae: datos.polinizadoresQueAtrae,
          beneficios: datos.beneficios,
          necesidadAgua: datos.necesidadAgua,
          manejoCorte: datos.manejoCorte,
          riesgoMaleza: datos.riesgoMaleza,
          dosisSiembra: datos.dosisSiembra,
          costoReferenciaArsHa: datos.costoReferenciaArsHa,
          costoReferenciaFecha: datos.costoReferenciaFecha,
          estado: "borrador",
          fuenteTipo: datos.fuenteTipo,
          fuenteDetalle: datos.fuenteDetalle,
          validadoPor: datos.validadoPor,
        })
        .returning();

      if (datos.periodos.length > 0) {
        await tx.insert(plantaServicioEcorregion).values(
          datos.periodos.map((p) => ({
            plantaId: creada.id,
            ecorregion: p.ecorregion,
            siembraSemanas: p.siembraSemanas,
            floracionSemanas: p.floracionSemanas,
            corteSemanas: p.corteSemanas,
            semanasHastaFloracionMin: p.semanasHastaFloracionMin,
            semanasHastaFloracionMax: p.semanasHastaFloracionMax,
          })),
        );
      }

      const registro = validarYPrepararCambioCatalogo({
        entidad: "planta_servicio",
        entidadId: creada.id,
        accion: "alta",
        administradorId: admin.id,
        antes: null,
        despues: { ...datos, estado: "borrador" },
      });

      await tx.insert(cambioCatalogo).values(registro);
      return creada.id;
    });

    revalidatePath("/admin/catalogo");
    revalidatePath("/admin/catalogo/plantas");
    return { ok: true, plantaId: creadaId };
  } catch (error) {
    if (esErrorClaveDuplicada(error)) {
      return { ok: false, errores: ["Ya existe una planta de servicio con esa clave."] };
    }
    throw error;
  }
}

export async function editarPlantaServicio(
  plantaId: string,
  entrada: EntradaPlantaServicio,
): Promise<ResultadoAccionPlanta> {
  const admin = await requerirAdministrador();

  if (!esUuidValido(plantaId)) {
    notFound();
  }

  const [actual] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.id, plantaId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  // CA-03-01: la clave es única y no cambia después de creada.
  const validacion = validarEntradaPlantaServicio({ ...entrada, clave: actual.clave });
  if (!validacion.valido) {
    return { ok: false, errores: validacion.errores };
  }

  const { datos } = validacion;

  // Si la planta ya está publicada, los cambios deben seguir cumpliendo los requisitos de publicación.
  if (actual.estado === "publicado") {
    const chequeoPub = validarPublicacionPlanta(datos, datos.periodos);
    if (!chequeoPub.puedePublicar) {
      return {
        ok: false,
        errores: [
          `Esta planta está publicada y no puede quedar incompleta. Falta: ${chequeoPub.faltantes.join(", ")}.`,
        ],
      };
    }
  }

  const periodosAnteriores = await db
    .select()
    .from(plantaServicioEcorregion)
    .where(eq(plantaServicioEcorregion.plantaId, actual.id));

  await db.transaction(async (tx) => {
    await tx
      .update(plantaServicio)
      .set({
        nombreComun: datos.nombreComun,
        nombreCientifico: datos.nombreCientifico,
        funciones: datos.funciones,
        ciclo: datos.ciclo,
        origen: datos.origen,
        esEspontanea: datos.esEspontanea,
        enMercadoLocal: datos.enMercadoLocal,
        polinizadoresQueAtrae: datos.polinizadoresQueAtrae,
        beneficios: datos.beneficios,
        necesidadAgua: datos.necesidadAgua,
        manejoCorte: datos.manejoCorte,
        riesgoMaleza: datos.riesgoMaleza,
        dosisSiembra: datos.dosisSiembra,
        costoReferenciaArsHa: datos.costoReferenciaArsHa,
        costoReferenciaFecha: datos.costoReferenciaFecha,
        fuenteTipo: datos.fuenteTipo,
        fuenteDetalle: datos.fuenteDetalle,
        validadoPor: datos.validadoPor,
        actualizadoEn: new Date(),
      })
      .where(eq(plantaServicio.id, actual.id));

    await tx
      .delete(plantaServicioEcorregion)
      .where(eq(plantaServicioEcorregion.plantaId, actual.id));

    if (datos.periodos.length > 0) {
      await tx.insert(plantaServicioEcorregion).values(
        datos.periodos.map((p) => ({
          plantaId: actual.id,
          ecorregion: p.ecorregion,
          siembraSemanas: p.siembraSemanas,
          floracionSemanas: p.floracionSemanas,
          corteSemanas: p.corteSemanas,
          semanasHastaFloracionMin: p.semanasHastaFloracionMin,
          semanasHastaFloracionMax: p.semanasHastaFloracionMax,
        })),
      );
    }

    const registro = validarYPrepararCambioCatalogo({
      entidad: "planta_servicio",
      entidadId: actual.id,
      accion: "edicion",
      administradorId: admin.id,
      antes: { ...actual, periodos: periodosAnteriores },
      despues: { ...datos, estado: actual.estado },
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/plantas");
  revalidatePath(`/admin/catalogo/plantas/${actual.id}`);
  return { ok: true, plantaId: actual.id };
}

export async function publicarPlantaServicio(plantaId: string): Promise<ResultadoAccionPlanta> {
  const admin = await requerirAdministrador();

  if (!esUuidValido(plantaId)) {
    notFound();
  }

  const [actual] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.id, plantaId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  const periodos = await db
    .select()
    .from(plantaServicioEcorregion)
    .where(eq(plantaServicioEcorregion.plantaId, actual.id));

  const chequeo = validarPublicacionPlanta(actual, periodos);
  if (!chequeo.puedePublicar) {
    return {
      ok: false,
      errores: chequeo.faltantes.map((f) => `Falta completar: ${f}.`),
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(plantaServicio)
      .set({ estado: "publicado", actualizadoEn: new Date() })
      .where(eq(plantaServicio.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "planta_servicio",
      entidadId: actual.id,
      accion: "publicacion",
      administradorId: admin.id,
      antes: { estado: actual.estado },
      despues: { estado: "publicado" },
    });
    await tx.insert(cambioCatalogo).values(registro);
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/plantas");
  revalidatePath(`/admin/catalogo/plantas/${actual.id}`);
  return { ok: true, plantaId: actual.id };
}

export async function retirarPlantaServicio(
  plantaId: string,
  motivo: string,
): Promise<ResultadoAccionPlanta> {
  const admin = await requerirAdministrador();

  if (!esUuidValido(plantaId)) {
    notFound();
  }

  const motivoLimpio = motivo.trim();
  if (motivoLimpio.length < 5) {
    return {
      ok: false,
      errores: ["Indicá un motivo (al menos 5 caracteres) para retirar esta planta."],
    };
  }

  const [actual] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.id, plantaId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  await db.transaction(async (tx) => {
    await tx
      .update(plantaServicio)
      .set({ estado: "retirado", actualizadoEn: new Date() })
      .where(eq(plantaServicio.id, actual.id));

    const registro = validarYPrepararCambioCatalogo({
      entidad: "planta_servicio",
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
  revalidatePath("/admin/catalogo/plantas");
  revalidatePath(`/admin/catalogo/plantas/${actual.id}`);
  return { ok: true, plantaId: actual.id };
}

export async function borrarPlantaServicio(plantaId: string): Promise<ResultadoAccionPlanta> {
  const admin = await requerirAdministrador();

  if (!esUuidValido(plantaId)) {
    notFound();
  }

  const [actual] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.id, plantaId))
    .limit(1);

  if (!actual) {
    notFound();
  }

  // CA-03-08: solo se puede borrar en estado Borrador y si nunca se usó (sin compatibilidades).
  if (actual.estado !== "borrador") {
    return {
      ok: false,
      errores: ["Solo se pueden borrar plantas en estado Borrador. Usá la opción «Retirar»."],
    };
  }

  const [{ totalCompatibilidades }] = await db
    .select({ totalCompatibilidades: count(compatibilidad.id) })
    .from(compatibilidad)
    .where(eq(compatibilidad.plantaId, actual.id));

  if (Number(totalCompatibilidades) > 0) {
    return {
      ok: false,
      errores: [
        "Esta planta tiene compatibilidades cargadas y no puede borrarse. Usá la opción «Retirar».",
      ],
    };
  }

  await db.transaction(async (tx) => {
    const registro = validarYPrepararCambioCatalogo({
      entidad: "planta_servicio",
      entidadId: actual.id,
      accion: "borrado",
      administradorId: admin.id,
      antes: { clave: actual.clave, nombreComun: actual.nombreComun, estado: actual.estado },
      despues: null,
    });
    await tx.insert(cambioCatalogo).values(registro);
    await tx.delete(plantaServicio).where(eq(plantaServicio.id, actual.id));
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/plantas");
  return { ok: true };
}
