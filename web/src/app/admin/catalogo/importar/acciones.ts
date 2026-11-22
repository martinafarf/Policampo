"use server";

// Acciones de importación CSV en 2 pasos (vista previa + confirmación transaccional en Borrador).
// Reglas: RS-03, RS-06, CA-03-12, CA-03-13, CA-03-15, CA-03-16.
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  cambioCatalogo,
  compatibilidad,
  cultivo,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import {
  LIMITES_CATALOGO,
  parsearCsv,
  validarFilasCompatibilidadesCsv,
  validarFilasPeriodosCsv,
  validarFilasPlantasCsv,
  validarYPrepararCambioCatalogo,
  type ErrorFilaCsv,
  type TipoArchivoCsv,
} from "@/dominio/catalogo";
import { requerirAdministrador } from "@/lib/sesion";

export interface ResumenVistaPreviaCsv {
  ok: boolean;
  errorGeneral?: string;
  altas: string[];
  modificaciones: string[];
  errores: ErrorFilaCsv[];
}

export interface ResultadoConfirmarCsv {
  ok: boolean;
  errorGeneral?: string;
  altasAplicadas?: number;
  modificacionesAplicadas?: number;
}

const TIPOS_VALIDOS = new Set<TipoArchivoCsv>(["plantas", "periodos", "compatibilidades"]);

async function analizarArchivo(tipo: TipoArchivoCsv, contenido: string) {
  const bytes = new TextEncoder().encode(contenido).byteLength;
  if (bytes > LIMITES_CATALOGO.csvMaxBytes) {
    return { errorGeneral: "El archivo supera el máximo permitido de 2 MB." } as const;
  }

  const parseado = parsearCsv(contenido);
  if (!parseado.valido) {
    return { errorGeneral: parseado.error ?? "No se pudo leer el archivo CSV." } as const;
  }

  if (tipo === "plantas") {
    const { validas, errores } = validarFilasPlantasCsv(parseado.filas);
    const existentes = await db
      .select({ id: plantaServicio.id, clave: plantaServicio.clave, estado: plantaServicio.estado })
      .from(plantaServicio);
    const mapaExistentes = new Map(existentes.map((p) => [p.clave, p]));

    const altas: string[] = [];
    const modificaciones: string[] = [];
    for (const p of validas) {
      if (mapaExistentes.has(p.clave)) modificaciones.push(`${p.nombreComun} (${p.clave})`);
      else altas.push(`${p.nombreComun} (${p.clave})`);
    }
    return { tipo, validas, mapaExistentes, altas, modificaciones, errores } as const;
  }

  if (tipo === "periodos") {
    const plantas = await db
      .select({ id: plantaServicio.id, clave: plantaServicio.clave })
      .from(plantaServicio);
    const mapaPlantas = new Map(plantas.map((p) => [p.clave, p.id]));
    const periodosExistentes = await db
      .select({
        plantaId: plantaServicioEcorregion.plantaId,
        ecorregion: plantaServicioEcorregion.ecorregion,
      })
      .from(plantaServicioEcorregion);
    const paresExistentes = new Set(
      periodosExistentes.map((p) => `${p.plantaId}::${p.ecorregion}`),
    );

    const { validas, errores } = validarFilasPeriodosCsv(
      parseado.filas,
      new Set(mapaPlantas.keys()),
    );
    const altas: string[] = [];
    const modificaciones: string[] = [];
    for (const p of validas) {
      const pid = mapaPlantas.get(p.plantaClave)!;
      if (paresExistentes.has(`${pid}::${p.ecorregion}`)) {
        modificaciones.push(`${p.plantaClave} — ${p.ecorregion}`);
      } else {
        altas.push(`${p.plantaClave} — ${p.ecorregion}`);
      }
    }
    return { tipo, validas, mapaPlantas, paresExistentes, altas, modificaciones, errores } as const;
  }

  const [cultivos, plantas, compats] = await Promise.all([
    db.select({ id: cultivo.id, clave: cultivo.clave }).from(cultivo),
    db.select({ id: plantaServicio.id, clave: plantaServicio.clave }).from(plantaServicio),
    db
      .select({
        id: compatibilidad.id,
        cultivoId: compatibilidad.cultivoId,
        plantaId: compatibilidad.plantaId,
      })
      .from(compatibilidad),
  ]);
  const mapaCultivos = new Map(cultivos.map((c) => [c.clave, c.id]));
  const mapaPlantas = new Map(plantas.map((p) => [p.clave, p.id]));
  const mapaCompats = new Map(compats.map((c) => [`${c.cultivoId}::${c.plantaId}`, c.id]));

  const { validas, errores } = validarFilasCompatibilidadesCsv(
    parseado.filas,
    new Set(mapaCultivos.keys()),
    new Set(mapaPlantas.keys()),
  );
  const altas: string[] = [];
  const modificaciones: string[] = [];
  for (const c of validas) {
    const cid = mapaCultivos.get(c.cultivoClave)!;
    const pid = mapaPlantas.get(c.plantaClave)!;
    if (mapaCompats.has(`${cid}::${pid}`)) {
      modificaciones.push(`${c.cultivoClave} × ${c.plantaClave} (${c.grado})`);
    } else {
      altas.push(`${c.cultivoClave} × ${c.plantaClave} (${c.grado})`);
    }
  }
  return {
    tipo,
    validas,
    mapaCultivos,
    mapaPlantas,
    mapaCompats,
    altas,
    modificaciones,
    errores,
  } as const;
}

export async function previsualizarImportacionCsv(
  tipo: TipoArchivoCsv,
  contenido: string,
): Promise<ResumenVistaPreviaCsv> {
  await requerirAdministrador();
  if (!TIPOS_VALIDOS.has(tipo)) {
    return { ok: false, errorGeneral: "Tipo de archivo inválido.", altas: [], modificaciones: [], errores: [] };
  }

  const analisis = await analizarArchivo(tipo, contenido);
  if ("errorGeneral" in analisis) {
    return {
      ok: false,
      errorGeneral: analisis.errorGeneral,
      altas: [],
      modificaciones: [],
      errores: [],
    };
  }

  return {
    ok: analisis.errores.length === 0,
    altas: analisis.altas,
    modificaciones: analisis.modificaciones,
    errores: analisis.errores,
  };
}

// Aplica toda la importación en una sola transacción: todo entra/vuelve a Borrador (CA-03-12).
export async function confirmarImportacionCsv(
  tipo: TipoArchivoCsv,
  contenido: string,
): Promise<ResultadoConfirmarCsv> {
  const admin = await requerirAdministrador();
  if (!TIPOS_VALIDOS.has(tipo)) {
    return { ok: false, errorGeneral: "Tipo de archivo inválido." };
  }

  const analisis = await analizarArchivo(tipo, contenido);
  if ("errorGeneral" in analisis) {
    return { ok: false, errorGeneral: analisis.errorGeneral };
  }
  if (analisis.errores.length > 0) {
    return {
      ok: false,
      errorGeneral: "No se puede confirmar la importación mientras haya filas con errores.",
    };
  }

  await db.transaction(async (tx) => {
    if (analisis.tipo === "plantas") {
      for (const p of analisis.validas) {
        const existente = analisis.mapaExistentes.get(p.clave);
        if (existente) {
          await tx
            .update(plantaServicio)
            .set({
              nombreComun: p.nombreComun,
              nombreCientifico: p.nombreCientifico,
              funciones: p.funciones,
              ciclo: p.ciclo,
              origen: p.origen,
              esEspontanea: p.esEspontanea,
              enMercadoLocal: p.enMercadoLocal,
              polinizadoresQueAtrae: p.polinizadoresQueAtrae,
              beneficios: p.beneficios,
              necesidadAgua: p.necesidadAgua,
              manejoCorte: p.manejoCorte,
              riesgoMaleza: p.riesgoMaleza,
              dosisSiembra: p.dosisSiembra,
              costoReferenciaArsHa: p.costoReferenciaArsHa,
              costoReferenciaFecha: p.costoReferenciaFecha,
              fuenteTipo: p.fuenteTipo,
              fuenteDetalle: p.fuenteDetalle,
              validadoPor: p.validadoPor,
              estado: "borrador", // importar siempre deja en Borrador (CA-03-12)
              actualizadoEn: new Date(),
            })
            .where(eq(plantaServicio.id, existente.id));

          await tx.insert(cambioCatalogo).values(
            validarYPrepararCambioCatalogo({
              entidad: "planta_servicio",
              entidadId: existente.id,
              accion: "importacion",
              administradorId: admin.id,
              antes: { clave: existente.clave, estado: existente.estado },
              despues: { clave: p.clave, nombreComun: p.nombreComun, estado: "borrador" },
            }),
          );
        } else {
          const [creada] = await tx
            .insert(plantaServicio)
            .values({
              clave: p.clave,
              nombreComun: p.nombreComun,
              nombreCientifico: p.nombreCientifico,
              funciones: p.funciones,
              ciclo: p.ciclo,
              origen: p.origen,
              esEspontanea: p.esEspontanea,
              enMercadoLocal: p.enMercadoLocal,
              polinizadoresQueAtrae: p.polinizadoresQueAtrae,
              beneficios: p.beneficios,
              necesidadAgua: p.necesidadAgua,
              manejoCorte: p.manejoCorte,
              riesgoMaleza: p.riesgoMaleza,
              dosisSiembra: p.dosisSiembra,
              costoReferenciaArsHa: p.costoReferenciaArsHa,
              costoReferenciaFecha: p.costoReferenciaFecha,
              fuenteTipo: p.fuenteTipo,
              fuenteDetalle: p.fuenteDetalle,
              validadoPor: p.validadoPor,
              estado: "borrador",
            })
            .returning({ id: plantaServicio.id });

          await tx.insert(cambioCatalogo).values(
            validarYPrepararCambioCatalogo({
              entidad: "planta_servicio",
              entidadId: creada.id,
              accion: "importacion",
              administradorId: admin.id,
              antes: null,
              despues: { clave: p.clave, nombreComun: p.nombreComun, estado: "borrador" },
            }),
          );
        }
      }
    } else if (analisis.tipo === "periodos") {
      for (const p of analisis.validas) {
        const plantaId = analisis.mapaPlantas.get(p.plantaClave)!;
        const existe = analisis.paresExistentes.has(`${plantaId}::${p.ecorregion}`);

        if (existe) {
          await tx
            .update(plantaServicioEcorregion)
            .set({
              siembraSemanas: p.siembraSemanas,
              floracionSemanas: p.floracionSemanas,
              corteSemanas: p.corteSemanas,
              semanasHastaFloracionMin: p.semanasHastaFloracionMin,
              semanasHastaFloracionMax: p.semanasHastaFloracionMax,
              actualizadoEn: new Date(),
            })
            .where(
              and(
                eq(plantaServicioEcorregion.plantaId, plantaId),
                eq(plantaServicioEcorregion.ecorregion, p.ecorregion),
              ),
            );
        } else {
          await tx.insert(plantaServicioEcorregion).values({
            plantaId,
            ecorregion: p.ecorregion,
            siembraSemanas: p.siembraSemanas,
            floracionSemanas: p.floracionSemanas,
            corteSemanas: p.corteSemanas,
            semanasHastaFloracionMin: p.semanasHastaFloracionMin,
            semanasHastaFloracionMax: p.semanasHastaFloracionMax,
          });
        }

        // Al importar períodos de una planta, la planta vuelve a Borrador para revalidación.
        await tx
          .update(plantaServicio)
          .set({ estado: "borrador", actualizadoEn: new Date() })
          .where(eq(plantaServicio.id, plantaId));

        await tx.insert(cambioCatalogo).values(
          validarYPrepararCambioCatalogo({
            entidad: "planta_servicio",
            entidadId: plantaId,
            accion: "importacion",
            administradorId: admin.id,
            antes: null,
            despues: { ecorregion: p.ecorregion, estado: "borrador" },
          }),
        );
      }
    } else {
      for (const c of analisis.validas) {
        const cultivoId = analisis.mapaCultivos.get(c.cultivoClave)!;
        const plantaId = analisis.mapaPlantas.get(c.plantaClave)!;
        const existenteId = analisis.mapaCompats.get(`${cultivoId}::${plantaId}`);

        if (existenteId) {
          await tx
            .update(compatibilidad)
            .set({
              grado: c.grado,
              justificacion: c.justificacion,
              fuenteTipo: c.fuenteTipo,
              fuenteDetalle: c.fuenteDetalle,
              validadoPor: c.validadoPor,
              estado: "borrador",
              actualizadoEn: new Date(),
            })
            .where(eq(compatibilidad.id, existenteId));

          await tx.insert(cambioCatalogo).values(
            validarYPrepararCambioCatalogo({
              entidad: "compatibilidad",
              entidadId: existenteId,
              accion: "importacion",
              administradorId: admin.id,
              antes: null,
              despues: { cultivoClave: c.cultivoClave, plantaClave: c.plantaClave, grado: c.grado, estado: "borrador" },
            }),
          );
        } else {
          const [creada] = await tx
            .insert(compatibilidad)
            .values({
              cultivoId,
              plantaId,
              grado: c.grado,
              justificacion: c.justificacion,
              fuenteTipo: c.fuenteTipo,
              fuenteDetalle: c.fuenteDetalle,
              validadoPor: c.validadoPor,
              estado: "borrador",
            })
            .returning({ id: compatibilidad.id });

          await tx.insert(cambioCatalogo).values(
            validarYPrepararCambioCatalogo({
              entidad: "compatibilidad",
              entidadId: creada.id,
              accion: "importacion",
              administradorId: admin.id,
              antes: null,
              despues: { cultivoClave: c.cultivoClave, plantaClave: c.plantaClave, grado: c.grado, estado: "borrador" },
            }),
          );
        }
      }
    }
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/admin/catalogo/plantas");
  revalidatePath("/admin/catalogo/compatibilidades");
  revalidatePath("/admin/catalogo/historial");

  return {
    ok: true,
    altasAplicadas: analisis.altas.length,
    modificacionesAplicadas: analisis.modificaciones.length,
  };
}
