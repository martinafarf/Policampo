// Única puerta de acceso al catálogo para el motor de reglas (módulos 04 a 06) y la Guía de especies.
// Reglas RN-07, RN-08, RN-12, RN-13, RS-02 y CA-03-10: devuelve EXCLUSIVAMENTE registros publicados.
import "server-only";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  cultivoEcorregion,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import type {
  CicloPlanta,
  DependenciaPolinizacion,
  FuenteTipo,
  FuncionPlanta,
  NivelAgua,
  OrigenPlanta,
  RangoSemanas,
  RiesgoMaleza,
} from "./tipos";

export interface PlantaCompatiblePublicada {
  plantaId: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  origen: OrigenPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  beneficios: string | null;
  necesidadAgua: NivelAgua;
  manejoCorte: string | null;
  riesgoMaleza: RiesgoMaleza;
  dosisSiembra: string | null;
  grado: number;
  justificacion: string;
  ecorregion: ClaveEcorregion;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin: number | null;
  semanasHastaFloracionMax: number | null;
}

// Consulta CA-03-10: "plantas para la ecorregión X y el cultivo Y".
// Devuelve SOLO plantas publicadas, aptas en X, con cultivo publicado y compatibilidad publicada
// con grado > 0, ordenadas por grado descendente.
export async function consultarPlantasCompatiblesPublicadas(params: {
  ecorregion: ClaveEcorregion;
  cultivoId: string;
}): Promise<PlantaCompatiblePublicada[]> {
  const filas = await db
    .select({
      plantaId: plantaServicio.id,
      clave: plantaServicio.clave,
      nombreComun: plantaServicio.nombreComun,
      nombreCientifico: plantaServicio.nombreCientifico,
      funciones: plantaServicio.funciones,
      ciclo: plantaServicio.ciclo,
      origen: plantaServicio.origen,
      esEspontanea: plantaServicio.esEspontanea,
      enMercadoLocal: plantaServicio.enMercadoLocal,
      beneficios: plantaServicio.beneficios,
      necesidadAgua: plantaServicio.necesidadAgua,
      manejoCorte: plantaServicio.manejoCorte,
      riesgoMaleza: plantaServicio.riesgoMaleza,
      dosisSiembra: plantaServicio.dosisSiembra,
      grado: compatibilidad.grado,
      justificacion: compatibilidad.justificacion,
      ecorregion: plantaServicioEcorregion.ecorregion,
      siembraSemanas: plantaServicioEcorregion.siembraSemanas,
      floracionSemanas: plantaServicioEcorregion.floracionSemanas,
      corteSemanas: plantaServicioEcorregion.corteSemanas,
      semanasHastaFloracionMin: plantaServicioEcorregion.semanasHastaFloracionMin,
      semanasHastaFloracionMax: plantaServicioEcorregion.semanasHastaFloracionMax,
    })
    .from(plantaServicio)
    .innerJoin(
      plantaServicioEcorregion,
      and(
        eq(plantaServicioEcorregion.plantaId, plantaServicio.id),
        eq(plantaServicioEcorregion.ecorregion, params.ecorregion),
      ),
    )
    .innerJoin(
      compatibilidad,
      and(
        eq(compatibilidad.plantaId, plantaServicio.id),
        eq(compatibilidad.cultivoId, params.cultivoId),
        eq(compatibilidad.estado, "publicado"),
        gt(compatibilidad.grado, 0),
      ),
    )
    .innerJoin(
      cultivo,
      and(eq(cultivo.id, compatibilidad.cultivoId), eq(cultivo.estado, "publicado")),
    )
    .where(eq(plantaServicio.estado, "publicado"))
    .orderBy(desc(compatibilidad.grado), asc(plantaServicio.nombreComun));

  return filas.map((f) => ({
    ...f,
    ecorregion: f.ecorregion as ClaveEcorregion,
  }));
}

export interface PlantaCandidataFinca {
  plantaId: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  gradoMaximo: number;
  gradoPromedio: number;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin: number | null;
  semanasHastaFloracionMax: number | null;
  compatibilidades: { cultivoId: string; grado: number; justificacion: string }[];
}

// Regla RN-08 para una finca con varios cultivos:
// candidata = planta publicada, apta en la ecorregión, con grado > 0 publicado con al menos un cultivo
// de la finca y NINGÚN grado negativo (< 0) publicado con ninguno de ellos.
export async function consultarPlantasCandidatasParaFinca(params: {
  ecorregion: ClaveEcorregion;
  cultivoIds: readonly string[];
}): Promise<PlantaCandidataFinca[]> {
  const idsUnicos = Array.from(new Set(params.cultivoIds));
  if (idsUnicos.length === 0) return [];

  const filas = await db
    .select({
      plantaId: plantaServicio.id,
      clave: plantaServicio.clave,
      nombreComun: plantaServicio.nombreComun,
      nombreCientifico: plantaServicio.nombreCientifico,
      funciones: plantaServicio.funciones,
      siembraSemanas: plantaServicioEcorregion.siembraSemanas,
      floracionSemanas: plantaServicioEcorregion.floracionSemanas,
      corteSemanas: plantaServicioEcorregion.corteSemanas,
      semanasHastaFloracionMin: plantaServicioEcorregion.semanasHastaFloracionMin,
      semanasHastaFloracionMax: plantaServicioEcorregion.semanasHastaFloracionMax,
      cultivoId: compatibilidad.cultivoId,
      grado: compatibilidad.grado,
      justificacion: compatibilidad.justificacion,
    })
    .from(plantaServicio)
    .innerJoin(
      plantaServicioEcorregion,
      and(
        eq(plantaServicioEcorregion.plantaId, plantaServicio.id),
        eq(plantaServicioEcorregion.ecorregion, params.ecorregion),
      ),
    )
    .innerJoin(
      compatibilidad,
      and(
        eq(compatibilidad.plantaId, plantaServicio.id),
        inArray(compatibilidad.cultivoId, idsUnicos),
        eq(compatibilidad.estado, "publicado"),
      ),
    )
    .innerJoin(
      cultivo,
      and(eq(cultivo.id, compatibilidad.cultivoId), eq(cultivo.estado, "publicado")),
    )
    .where(eq(plantaServicio.estado, "publicado"));

  const agrupadas = new Map<
    string,
    {
      base: Omit<PlantaCandidataFinca, "gradoMaximo" | "gradoPromedio" | "compatibilidades">;
      compatibilidades: { cultivoId: string; grado: number; justificacion: string }[];
    }
  >();

  for (const fila of filas) {
    let grupo = agrupadas.get(fila.plantaId);
    if (!grupo) {
      grupo = {
        base: {
          plantaId: fila.plantaId,
          clave: fila.clave,
          nombreComun: fila.nombreComun,
          nombreCientifico: fila.nombreCientifico,
          funciones: fila.funciones,
          siembraSemanas: fila.siembraSemanas,
          floracionSemanas: fila.floracionSemanas,
          corteSemanas: fila.corteSemanas,
          semanasHastaFloracionMin: fila.semanasHastaFloracionMin,
          semanasHastaFloracionMax: fila.semanasHastaFloracionMax,
        },
        compatibilidades: [],
      };
      agrupadas.set(fila.plantaId, grupo);
    }
    grupo.compatibilidades.push({
      cultivoId: fila.cultivoId,
      grado: fila.grado,
      justificacion: fila.justificacion,
    });
  }

  const candidatas: PlantaCandidataFinca[] = [];
  for (const { base, compatibilidades } of agrupadas.values()) {
    const tieneNegativa = compatibilidades.some((c) => c.grado < 0);
    const tienePositiva = compatibilidades.some((c) => c.grado > 0);
    if (tieneNegativa || !tienePositiva) continue;

    const grados = compatibilidades.map((c) => c.grado);
    const gradoMaximo = Math.max(...grados);
    const gradoPromedio = grados.reduce((a, b) => a + b, 0) / grados.length;

    candidatas.push({
      ...base,
      gradoMaximo,
      gradoPromedio,
      compatibilidades,
    });
  }

  return candidatas.sort(
    (a, b) =>
      b.gradoPromedio - a.gradoPromedio ||
      b.gradoMaximo - a.gradoMaximo ||
      a.nombreComun.localeCompare(b.nombreComun, "es-AR"),
  );
}

export interface CultivoPublicadoMotor {
  id: string;
  clave: string;
  nombre: string;
  dependenciaPolinizacion: DependenciaPolinizacion | null;
  tipoPolinizacion: string | null;
  polinizadoresNecesarios: string | null;
  floracionSemanas: RangoSemanas[];
  cosechaSemanas: RangoSemanas[];
}

export async function consultarCultivosPublicadosParaMotor(
  cultivoIds: readonly string[],
  ecorregion: ClaveEcorregion,
): Promise<CultivoPublicadoMotor[]> {
  const idsUnicos = Array.from(new Set(cultivoIds));
  if (idsUnicos.length === 0) return [];

  const filas = await db
    .select({
      id: cultivo.id,
      clave: cultivo.clave,
      nombre: cultivo.nombre,
      dependenciaPolinizacion: cultivo.dependenciaPolinizacion,
      tipoPolinizacion: cultivo.tipoPolinizacion,
      polinizadoresNecesarios: cultivo.polinizadoresNecesarios,
      floracionSemanas: cultivoEcorregion.floracionSemanas,
      cosechaSemanas: cultivoEcorregion.cosechaSemanas,
    })
    .from(cultivo)
    .leftJoin(
      cultivoEcorregion,
      and(
        eq(cultivoEcorregion.cultivoId, cultivo.id),
        eq(cultivoEcorregion.ecorregion, ecorregion),
      ),
    )
    .where(and(inArray(cultivo.id, idsUnicos), eq(cultivo.estado, "publicado")));

  return filas.map((f) => ({
    ...f,
    floracionSemanas: f.floracionSemanas ?? [],
    cosechaSemanas: f.cosechaSemanas ?? [],
  }));
}

export interface ResumenPlantaGuia {
  id: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  necesidadAgua: NivelAgua;
  riesgoMaleza: RiesgoMaleza;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
}

// Consulta para la Guía de especies pública para usuarios con sesión (CA-03-17, RS-02).
export async function consultarPlantasPublicadasParaGuia(filtros?: {
  ecorregion?: ClaveEcorregion;
  funcion?: FuncionPlanta;
}): Promise<ResumenPlantaGuia[]> {
  const condiciones = [eq(plantaServicio.estado, "publicado")];

  if (filtros?.funcion) {
    condiciones.push(sql`${filtros.funcion}::"funcion_planta" = ANY(${plantaServicio.funciones})`);
  }

  if (filtros?.ecorregion) {
    const filas = await db
      .select({
        id: plantaServicio.id,
        clave: plantaServicio.clave,
        nombreComun: plantaServicio.nombreComun,
        nombreCientifico: plantaServicio.nombreCientifico,
        funciones: plantaServicio.funciones,
        ciclo: plantaServicio.ciclo,
        esEspontanea: plantaServicio.esEspontanea,
        enMercadoLocal: plantaServicio.enMercadoLocal,
        necesidadAgua: plantaServicio.necesidadAgua,
        riesgoMaleza: plantaServicio.riesgoMaleza,
        fuenteTipo: plantaServicio.fuenteTipo,
        fuenteDetalle: plantaServicio.fuenteDetalle,
      })
      .from(plantaServicio)
      .innerJoin(
        plantaServicioEcorregion,
        and(
          eq(plantaServicioEcorregion.plantaId, plantaServicio.id),
          eq(plantaServicioEcorregion.ecorregion, filtros.ecorregion),
        ),
      )
      .where(and(...condiciones))
      .orderBy(asc(plantaServicio.nombreComun));

    return filas;
  }

  return db
    .select({
      id: plantaServicio.id,
      clave: plantaServicio.clave,
      nombreComun: plantaServicio.nombreComun,
      nombreCientifico: plantaServicio.nombreCientifico,
      funciones: plantaServicio.funciones,
      ciclo: plantaServicio.ciclo,
      esEspontanea: plantaServicio.esEspontanea,
      enMercadoLocal: plantaServicio.enMercadoLocal,
      necesidadAgua: plantaServicio.necesidadAgua,
      riesgoMaleza: plantaServicio.riesgoMaleza,
      fuenteTipo: plantaServicio.fuenteTipo,
      fuenteDetalle: plantaServicio.fuenteDetalle,
    })
    .from(plantaServicio)
    .where(and(...condiciones))
    .orderBy(asc(plantaServicio.nombreComun));
}
