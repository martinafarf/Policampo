// Servicios del servidor para generar, guardar, listar, elegir y borrar propuestas (Esp. 05, T3).
// Reglas: RN-07, RN-08, RN-09, RN-10, RN-13, RS-02, RS-06, CA-05-09, 14, 16, 17, 18, 19, 20.
import "server-only";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import type { ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  cultivoEcorregion,
  diagnostico,
  establecimiento,
  plantaServicio,
  plantaServicioEcorregion,
  propuesta,
  propuestaEspecie,
} from "@/db/schema";
import { formatearDecimalFijo1, formatearHaFijo4 } from "@/dominio/diagnostico";
import {
  esUuidValido,
  estaDiagnosticoDesactualizado,
  normalizarFilaDiagnostico,
  obtenerUltimoDiagnostico,
  type DiagnosticoNormalizado,
} from "@/dominio/diagnostico/entrada";
import { crearContornoCroquis, type PoligonoGeoJson } from "@/dominio/establecimientos";
import {
  generarPropuestaCuestionario,
  validarRepartoCuestionario,
  type SectorCuestionarioEntrada,
} from "./cuestionario";
import {
  calcularSuperficieAAgregarHa,
  generarAlternativasEspaciales,
  generarUnaDisposicionEspacial,
  validarObjetivoPct,
  validarYRecalcularFranjasEditadasAMano,
} from "./disposiciones";
import { elegirMezclaOptima, validarYEvaluarMezclaPersonalizada } from "./mezcla";
import {
  LIMITES_PROPUESTA,
  VERSION_REGLAS_PROPUESTA,
  type AlternativaEspacial,
  type AvisoPropuesta,
  type CultivoParaMezcla,
  type DisposicionPropuesta,
  type EntradaEspacialPropuesta,
  type EspecieEnMezcla,
  type EvaluacionFloracionMezcla,
  type FranjaPropuesta,
  type ParametrosDisposicion,
  type PlantaCandidataEntrada,
  type PropuestaCuestionario,
  type RepartoUbicacionItem,
  type ResultadoMezcla,
  type SectorEspacialEntrada,
} from "./tipos";

// Consulta el catálogo PUBLICADO para los cultivos de la finca y su ecorregión (RN-13, CA-05-10).
export async function consultarDatosMezclaDesdeCatalogo(diag: DiagnosticoNormalizado): Promise<{
  cultivosParaMezcla: CultivoParaMezcla[];
  plantasPublicadasEnEcorregion: PlantaCandidataEntrada[];
}> {
  const ecorregion = diag.entrada.ecorregion as ClaveEcorregion;
  const sectoresCultivo = diag.entrada.sectores.filter((s) => s.tipo === "cultivo");

  const clavesCatalogo = Array.from(
    new Set(
      sectoresCultivo
        .map((s) => s.cultivoClave)
        .filter((c): c is string => Boolean(c && c.trim())),
    ),
  );

  // 1. Cargar datos publicados de los cultivos de la finca y sus semanas de floración en la ecorregión.
  const filasCultivos =
    clavesCatalogo.length > 0
      ? await db
          .select({
            id: cultivo.id,
            clave: cultivo.clave,
            nombre: cultivo.nombre,
            estado: cultivo.estado,
            dependenciaPolinizacion: cultivo.dependenciaPolinizacion,
            floracionSemanas: cultivoEcorregion.floracionSemanas,
          })
          .from(cultivo)
          .leftJoin(
            cultivoEcorregion,
            and(
              eq(cultivoEcorregion.cultivoId, cultivo.id),
              eq(cultivoEcorregion.ecorregion, ecorregion),
            ),
          )
          .where(inArray(cultivo.clave, clavesCatalogo))
      : [];

  const mapaCultivosPorClave = new Map(filasCultivos.map((c) => [c.clave, c]));

  const cultivosParaMezcla: CultivoParaMezcla[] = sectoresCultivo.map((s, idx) => {
    const info = s.cultivoClave ? mapaCultivosPorClave.get(s.cultivoClave) : undefined;
    const publicado = info?.estado === "publicado";
    return {
      id: info?.id ?? `otro-${idx}-${(s.cultivoOtro ?? "otro").trim().toLowerCase()}`,
      clave: info?.clave ?? null,
      nombre: info?.nombre ?? s.cultivoNombre ?? s.cultivoOtro ?? "Otro cultivo",
      superficieHa: Number(s.superficieHa),
      dependenciaPolinizacion: publicado ? (info?.dependenciaPolinizacion ?? null) : null,
      floracionSemanas: publicado ? (info?.floracionSemanas ?? []) : [],
      tieneDatosPublicados: publicado,
    };
  });

  const idsCultivosPublicados = Array.from(
    new Set(
      filasCultivos.filter((c) => c.estado === "publicado").map((c) => c.id),
    ),
  );

  if (idsCultivosPublicados.length === 0) {
    return { cultivosParaMezcla, plantasPublicadasEnEcorregion: [] };
  }

  // 2. Plantas PUBLICADAS con período cargado para la ecorregión (RN-13, CA-05-10).
  const filasPlantas = await db
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
      necesidadAgua: plantaServicio.necesidadAgua,
      riesgoMaleza: plantaServicio.riesgoMaleza,
      manejoCorte: plantaServicio.manejoCorte,
      dosisSiembra: plantaServicio.dosisSiembra,
      fuenteTipo: plantaServicio.fuenteTipo,
      fuenteDetalle: plantaServicio.fuenteDetalle,
      validadoPor: plantaServicio.validadoPor,
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
        eq(plantaServicioEcorregion.ecorregion, ecorregion),
      ),
    )
    .where(eq(plantaServicio.estado, "publicado"))
    .orderBy(asc(plantaServicio.nombreComun));

  if (filasPlantas.length === 0) {
    return { cultivosParaMezcla, plantasPublicadasEnEcorregion: [] };
  }

  // 3. Compatibilidades PUBLICADAS entre esas plantas y los cultivos publicados de la finca.
  const filasCompat = await db
    .select({
      plantaId: compatibilidad.plantaId,
      cultivoId: compatibilidad.cultivoId,
      cultivoNombre: cultivo.nombre,
      grado: compatibilidad.grado,
      justificacion: compatibilidad.justificacion,
    })
    .from(compatibilidad)
    .innerJoin(cultivo, eq(cultivo.id, compatibilidad.cultivoId))
    .where(
      and(
        inArray(
          compatibilidad.plantaId,
          filasPlantas.map((p) => p.plantaId),
        ),
        inArray(compatibilidad.cultivoId, idsCultivosPublicados),
        eq(compatibilidad.estado, "publicado"),
      ),
    );

  const compatsPorPlanta = new Map<
    string,
    { cultivoId: string; cultivoNombre: string; grado: number; justificacion: string }[]
  >();
  for (const c of filasCompat) {
    const lista = compatsPorPlanta.get(c.plantaId) ?? [];
    lista.push({
      cultivoId: c.cultivoId,
      cultivoNombre: c.cultivoNombre,
      grado: c.grado,
      justificacion: c.justificacion,
    });
    compatsPorPlanta.set(c.plantaId, lista);
  }

  const plantasPublicadasEnEcorregion: PlantaCandidataEntrada[] = filasPlantas.map((p) => ({
    ...p,
    compatibilidades: compatsPorPlanta.get(p.plantaId) ?? [],
  }));

  return { cultivosParaMezcla, plantasPublicadasEnEcorregion };
}

function construirEntradaEspacialDesdeDiagnostico(
  diag: DiagnosticoNormalizado,
  objetivoPct: number,
): EntradaEspacialPropuesta | null {
  if (diag.entrada.metodo === "cuestionario") return null;

  const contorno: PoligonoGeoJson | null =
    diag.entrada.contorno ??
    (diag.entrada.metodo === "croquis" ? crearContornoCroquis(diag.superficieTotalHa) : null);

  if (!contorno) return null;

  const sectores: SectorEspacialEntrada[] = [];
  diag.entrada.sectores.forEach((s, idx) => {
    if (!s.geometria) return;
    sectores.push({
      id: s.id ?? `sector-${idx + 1}`,
      nombre: s.nombre ?? (s.tipo === "sector_flores" ? `Flores ${idx + 1}` : `Cultivo ${idx + 1}`),
      tipo: s.tipo,
      cultivoNombre: s.cultivoNombre ?? s.cultivoOtro ?? undefined,
      superficieHa: Number(s.superficieHa),
      geometria: s.geometria,
    });
  });

  return {
    metodo: diag.entrada.metodo,
    superficieTotalHa: diag.superficieTotalHa,
    superficieFloresActualHa: diag.superficieFloresHa,
    objetivoPct,
    contorno,
    superficieLibre: diag.superficieLibre,
    sectores,
  };
}

function construirSectoresCuestionario(diag: DiagnosticoNormalizado): SectorCuestionarioEntrada[] {
  return diag.entrada.sectores.map((s, idx) => ({
    id: s.id ?? `sector-${idx + 1}`,
    nombre: s.nombre ?? (s.tipo === "sector_flores" ? `Flores ${idx + 1}` : `Cultivo ${idx + 1}`),
    tipo: s.tipo,
    cultivoNombre: s.cultivoNombre ?? s.cultivoOtro ?? undefined,
    superficieHa: Number(s.superficieHa),
    ubicacionRelativa: s.ubicacionRelativa ?? null,
  }));
}

export type ResultadoPrepararPropuesta =
  | { estado: "no_encontrado" }
  | {
      estado: "requiere_diagnostico_vigente";
      establecimiento: typeof establecimiento.$inferSelect;
      motivo: string;
    }
  | {
      estado: "error_calculo";
      establecimiento: typeof establecimiento.$inferSelect;
      mensaje: string;
    }
  | {
      estado: "listo";
      establecimiento: typeof establecimiento.$inferSelect;
      diagnostico: DiagnosticoNormalizado;
      objetivoPct: number;
      superficieAAgregarHa: number;
      contorno: PoligonoGeoJson | null;
      alternativasEspaciales: AlternativaEspacial[];
      propuestaCuestionario: PropuestaCuestionario | null;
      mezcla: ResultadoMezcla;
    };

// Genera las alternativas y la mezcla en el servidor para /fincas/[id]/propuestas/nueva (§6.1).
export async function prepararGeneracionPropuesta(
  establecimientoId: string,
  usuarioId: string,
  objetivoPct: number = LIMITES_PROPUESTA.objetivoRecomendadoPct,
): Promise<ResultadoPrepararPropuesta> {
  const ultimo = await obtenerUltimoDiagnostico(establecimientoId, usuarioId);
  if (!ultimo) return { estado: "no_encontrado" };

  if (!ultimo.diagnostico) {
    return {
      estado: "requiere_diagnostico_vigente",
      establecimiento: ultimo.establecimiento,
      motivo: "Primero solicitá un diagnóstico para esta finca.",
    };
  }

  if (ultimo.desactualizado) {
    return {
      estado: "requiere_diagnostico_vigente",
      establecimiento: ultimo.establecimiento,
      motivo: "Tu diagnóstico está desactualizado porque la finca cambió. Actualizalo antes de generar una propuesta.",
    };
  }

  const validObj = validarObjetivoPct(objetivoPct);
  if (!validObj.valido) {
    return {
      estado: "error_calculo",
      establecimiento: ultimo.establecimiento,
      mensaje: validObj.error ?? "Objetivo inválido.",
    };
  }

  const diag = ultimo.diagnostico;
  const { cultivosParaMezcla, plantasPublicadasEnEcorregion } =
    await consultarDatosMezclaDesdeCatalogo(diag);

  const mezcla = elegirMezclaOptima({
    ecorregion: diag.entrada.ecorregion as ClaveEcorregion,
    cultivos: cultivosParaMezcla,
    plantasPublicadasEnEcorregion,
  });

  const superficieAAgregarHa = calcularSuperficieAAgregarHa(
    diag.superficieTotalHa,
    diag.superficieFloresHa,
    objetivoPct,
  );

  try {
    if (diag.entrada.metodo === "cuestionario") {
      const propuestaCuestionario = generarPropuestaCuestionario({
        superficieTotalHa: diag.superficieTotalHa,
        superficieFloresActualHa: diag.superficieFloresHa,
        objetivoPct,
        sectores: construirSectoresCuestionario(diag),
      });

      return {
        estado: "listo",
        establecimiento: ultimo.establecimiento,
        diagnostico: diag,
        objetivoPct,
        superficieAAgregarHa,
        contorno: null,
        alternativasEspaciales: [],
        propuestaCuestionario,
        mezcla,
      };
    }

    const entradaEspacial = construirEntradaEspacialDesdeDiagnostico(diag, objetivoPct);
    if (!entradaEspacial) {
      return {
        estado: "error_calculo",
        establecimiento: ultimo.establecimiento,
        mensaje: "No hay un contorno válido en el diagnóstico para generar disposiciones.",
      };
    }

    const alternativasEspaciales = generarAlternativasEspaciales(entradaEspacial);

    return {
      estado: "listo",
      establecimiento: ultimo.establecimiento,
      diagnostico: diag,
      objetivoPct,
      superficieAAgregarHa,
      contorno: entradaEspacial.contorno,
      alternativasEspaciales,
      propuestaCuestionario: null,
      mezcla,
    };
  } catch (err) {
    return {
      estado: "error_calculo",
      establecimiento: ultimo.establecimiento,
      mensaje:
        err instanceof Error
          ? err.message
          : "No se pudo generar la propuesta; probá con menos franjas o corredores.",
    };
  }
}

export async function recalcularDisposicionEnServidor(params: {
  establecimientoId: string;
  usuarioId: string;
  objetivoPct: number;
  disposicion: Exclude<DisposicionPropuesta, "texto">;
  parametros: ParametrosDisposicion;
}): Promise<{ ok: true; alternativa: AlternativaEspacial } | { ok: false; error: string }> {
  const ultimo = await obtenerUltimoDiagnostico(params.establecimientoId, params.usuarioId);
  if (!ultimo || !ultimo.diagnostico || ultimo.desactualizado) {
    return { ok: false, error: "Necesitás un diagnóstico vigente para recalcular la disposición." };
  }
  const validObj = validarObjetivoPct(params.objetivoPct);
  if (!validObj.valido) {
    return { ok: false, error: validObj.error ?? "Objetivo inválido." };
  }
  const entradaEspacial = construirEntradaEspacialDesdeDiagnostico(
    ultimo.diagnostico,
    params.objetivoPct,
  );
  if (!entradaEspacial) {
    return { ok: false, error: "Esta finca no usa croquis ni mapa." };
  }

  try {
    const alternativa = generarUnaDisposicionEspacial(
      entradaEspacial,
      params.disposicion,
      params.parametros,
    );
    if (!alternativa) {
      return { ok: false, error: "Esta disposición no aplica a la finca actual." };
    }
    return { ok: true, alternativa };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "No se pudo recalcular la disposición; probá con menos franjas o corredores.",
    };
  }
}

export interface PayloadGuardarPropuesta {
  nombre?: string | null;
  objetivoPct: number;
  disposicion: DisposicionPropuesta;
  parametros?: ParametrosDisposicion;
  editadaAMano?: boolean;
  franjas?: { id?: string; etiqueta?: string; subtipo?: string; geometria: unknown }[] | null;
  reparto?: RepartoUbicacionItem[] | null;
  plantaIds: string[];
}

export type ResultadoGuardarPropuesta =
  | { ok: true; propuestaId: string; elegida: boolean }
  | { ok: false; motivo: "no_encontrado" | "invalido"; errores: string[] };

// Guarda una propuesta recalculando TODO en el servidor (CA-05-08, 09, 14, 16, 17, 19).
export async function guardarPropuestaEnBase(params: {
  establecimientoId: string;
  usuarioId: string;
  payload: PayloadGuardarPropuesta;
}): Promise<ResultadoGuardarPropuesta> {
  const ultimo = await obtenerUltimoDiagnostico(params.establecimientoId, params.usuarioId);
  if (!ultimo) {
    return { ok: false, motivo: "no_encontrado", errores: ["Establecimiento no encontrado."] };
  }
  if (!ultimo.diagnostico || ultimo.desactualizado) {
    return {
      ok: false,
      motivo: "invalido",
      errores: ["Necesitás un diagnóstico vigente antes de guardar una propuesta."],
    };
  }

  const [{ totalExistentes }] = await db
    .select({ totalExistentes: count() })
    .from(propuesta)
    .where(eq(propuesta.establecimientoId, ultimo.establecimiento.id));

  if (Number(totalExistentes) >= LIMITES_PROPUESTA.maxPropuestasPorFinca) {
    return {
      ok: false,
      motivo: "invalido",
      errores: [
        `Ya alcanzaste el máximo de ${LIMITES_PROPUESTA.maxPropuestasPorFinca} propuestas guardadas en esta finca. Borrá alguna que no uses para guardar una nueva.`,
      ],
    };
  }

  const nombreLimpio = params.payload.nombre?.trim() || null;
  if (nombreLimpio && nombreLimpio.length > LIMITES_PROPUESTA.maxNombreLargo) {
    return {
      ok: false,
      motivo: "invalido",
      errores: [
        `El nombre de la propuesta no puede superar los ${LIMITES_PROPUESTA.maxNombreLargo} caracteres.`,
      ],
    };
  }

  const validObj = validarObjetivoPct(params.payload.objetivoPct);
  if (!validObj.valido) {
    return { ok: false, motivo: "invalido", errores: [validObj.error ?? "Objetivo inválido."] };
  }

  const diag = ultimo.diagnostico;

  // 1. Verificar y recalcular mezcla de especies estrictamente contra candidatas publicadas (CA-05-14).
  const { cultivosParaMezcla, plantasPublicadasEnEcorregion } =
    await consultarDatosMezclaDesdeCatalogo(diag);

  const validMezcla = validarYEvaluarMezclaPersonalizada({
    ecorregion: diag.entrada.ecorregion as ClaveEcorregion,
    cultivos: cultivosParaMezcla,
    plantasPublicadasEnEcorregion,
    plantaIdsSeleccionadas: params.payload.plantaIds,
  });
  if (!validMezcla.valido) {
    return { ok: false, motivo: "invalido", errores: [validMezcla.error] };
  }
  const mezclaFinal = validMezcla.resultado;

  // 2. Recalcular diseño espacial / cuestionario estrictamente en el servidor (CA-05-08, CA-05-09).
  let disposicionFinal: DisposicionPropuesta = params.payload.disposicion;
  let parametrosFinal: ParametrosDisposicion = params.payload.parametros ?? {};
  let franjasFinal: FranjaPropuesta[] | null = null;
  let repartoFinal: RepartoUbicacionItem[] | null = null;
  let editadaAMano = Boolean(params.payload.editadaAMano);
  let superficieFranjasHa = 0;
  let superficieLibreUsadaHa = 0;
  let porcentajeLogrado = diag.porcentajeFlores;
  let perdidaPorCultivo: AlternativaEspacial["perdidaPorCultivo"] = [];
  let avisosEspaciales: AvisoPropuesta[] = [];

  if (diag.entrada.metodo === "cuestionario") {
    disposicionFinal = "texto";
    const baseCuest = generarPropuestaCuestionario({
      superficieTotalHa: diag.superficieTotalHa,
      superficieFloresActualHa: diag.superficieFloresHa,
      objetivoPct: params.payload.objetivoPct,
      sectores: construirSectoresCuestionario(diag),
    });

    const repartoElegido = params.payload.reparto ?? baseCuest.reparto;
    const validReparto = validarRepartoCuestionario(repartoElegido, baseCuest.superficieAAgregarHa);
    if (!validReparto.valido) {
      return {
        ok: false,
        motivo: "invalido",
        errores: [validReparto.error ?? "El reparto del cuestionario es inválido."],
      };
    }

    repartoFinal = repartoElegido;
    superficieFranjasHa = baseCuest.superficieAAgregarHa;
    superficieLibreUsadaHa = Math.min(baseCuest.superficieAAgregarHa, diag.superficieSinAsignarHa);
    porcentajeLogrado = baseCuest.porcentajeLogrado;
    perdidaPorCultivo = baseCuest.perdidaPorCultivo;
    avisosEspaciales = baseCuest.avisos;
    parametrosFinal = {};
  } else {
    if (params.payload.disposicion === "texto") {
      return {
        ok: false,
        motivo: "invalido",
        errores: ["Seleccioná una disposición espacial válida para croquis o mapa."],
      };
    }

    const entradaEspacial = construirEntradaEspacialDesdeDiagnostico(
      diag,
      params.payload.objetivoPct,
    );
    if (!entradaEspacial) {
      return {
        ok: false,
        motivo: "invalido",
        errores: ["No hay un contorno válido para guardar la propuesta."],
      };
    }

    let alternativaRecalculada: AlternativaEspacial | null = null;

    if (editadaAMano) {
      const validFranjas = validarYRecalcularFranjasEditadasAMano({
        entrada: entradaEspacial,
        disposicion: params.payload.disposicion,
        parametros: parametrosFinal,
        franjasCrudas: params.payload.franjas ?? [],
      });
      if (!validFranjas.valido) {
        return { ok: false, motivo: "invalido", errores: validFranjas.errores };
      }
      alternativaRecalculada = validFranjas.alternativa;
    } else {
      try {
        alternativaRecalculada = generarUnaDisposicionEspacial(
          entradaEspacial,
          params.payload.disposicion,
          parametrosFinal,
        );
      } catch (err) {
        return {
          ok: false,
          motivo: "invalido",
          errores: [
            err instanceof Error
              ? err.message
              : "No se pudo recalcular la propuesta; probá con menos franjas o corredores.",
          ],
        };
      }
      if (!alternativaRecalculada) {
        return {
          ok: false,
          motivo: "invalido",
          errores: ["La disposición elegida no está disponible para esta finca."],
        };
      }
      editadaAMano = false;
    }

    franjasFinal = alternativaRecalculada.franjas;
    parametrosFinal = alternativaRecalculada.parametros;
    superficieFranjasHa = alternativaRecalculada.superficieFranjasHa;
    superficieLibreUsadaHa = alternativaRecalculada.superficieLibreUsadaHa;
    porcentajeLogrado = alternativaRecalculada.porcentajeLogrado;
    perdidaPorCultivo = alternativaRecalculada.perdidaPorCultivo;
    avisosEspaciales = alternativaRecalculada.avisos;
  }

  // Deduplicar avisos combinados de diseño espacial y mezcla.
  const avisosCombinados = [...avisosEspaciales, ...mezclaFinal.avisos];
  const fechaCreacion = new Date(
    Math.max(
      Date.now(),
      ultimo.establecimiento.actualizadoEn.getTime(),
      diag.creadoEn.getTime(),
    ),
  );

  // 3. Guardar en una transacción; si es la primera propuesta de la finca queda como Elegida (CA-05-16).
  const creada = await db.transaction(async (tx) => {
    const [{ existentes }] = await tx
      .select({ existentes: count() })
      .from(propuesta)
      .where(eq(propuesta.establecimientoId, ultimo.establecimiento.id));

    const seraElegida = Number(existentes) === 0;

    const [nueva] = await tx
      .insert(propuesta)
      .values({
        establecimientoId: ultimo.establecimiento.id,
        diagnosticoId: diag.id,
        creadoEn: fechaCreacion,
        nombre: nombreLimpio,
        versionReglas: VERSION_REGLAS_PROPUESTA,
        elegida: seraElegida,
        objetivoPct: formatearDecimalFijo1(params.payload.objetivoPct),
        disposicion: disposicionFinal,
        parametros: parametrosFinal,
        franjas: franjasFinal,
        reparto: repartoFinal,
        editadaAMano,
        superficieFranjasHa: formatearHaFijo4(superficieFranjasHa),
        superficieLibreUsadaHa: formatearHaFijo4(superficieLibreUsadaHa),
        porcentajeLogrado: formatearDecimalFijo1(porcentajeLogrado),
        perdidaPorCultivo,
        floracion: mezclaFinal.floracion,
        avisos: avisosCombinados,
      })
      .returning({ id: propuesta.id, elegida: propuesta.elegida });

    if (mezclaFinal.especies.length > 0) {
      await tx.insert(propuestaEspecie).values(
        mezclaFinal.especies.map((esp) => ({
          propuestaId: nueva.id,
          plantaId: esp.plantaId,
          proporcionPct: formatearDecimalFijo1(esp.proporcionPct),
          orden: esp.orden,
          copia: esp,
        })),
      );
    }

    return nueva;
  });

  return { ok: true, propuestaId: creada.id, elegida: creada.elegida };
}

export async function marcarPropuestaComoElegida(params: {
  establecimientoId: string;
  propuestaId: string;
  usuarioId: string;
}): Promise<boolean> {
  if (!esUuidValido(params.establecimientoId) || !esUuidValido(params.propuestaId)) return false;

  const [est] = await db
    .select({ id: establecimiento.id })
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.id, params.establecimientoId),
        eq(establecimiento.usuarioId, params.usuarioId),
      ),
    )
    .limit(1);
  if (!est) return false;

  const [existe] = await db
    .select({ id: propuesta.id })
    .from(propuesta)
    .where(and(eq(propuesta.id, params.propuestaId), eq(propuesta.establecimientoId, est.id)))
    .limit(1);
  if (!existe) return false;

  await db.transaction(async (tx) => {
    await tx
      .update(propuesta)
      .set({ elegida: false })
      .where(and(eq(propuesta.establecimientoId, est.id), eq(propuesta.elegida, true)));

    await tx.update(propuesta).set({ elegida: true }).where(eq(propuesta.id, existe.id));
  });

  return true;
}

export async function borrarPropuestaDeFinca(params: {
  establecimientoId: string;
  propuestaId: string;
  usuarioId: string;
}): Promise<boolean> {
  if (!esUuidValido(params.establecimientoId) || !esUuidValido(params.propuestaId)) return false;

  const [est] = await db
    .select({ id: establecimiento.id })
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.id, params.establecimientoId),
        eq(establecimiento.usuarioId, params.usuarioId),
      ),
    )
    .limit(1);
  if (!est) return false;

  const borradas = await db
    .delete(propuesta)
    .where(and(eq(propuesta.id, params.propuestaId), eq(propuesta.establecimientoId, est.id)))
    .returning({ id: propuesta.id });

  return borradas.length > 0;
}

export interface EstadoDesactualizadaPropuesta {
  desactualizada: boolean;
  motivos: string[];
}

// Regla §6.3 y CA-05-18: desactualizada si cambió la finca, hay diagnóstico más nuevo o una especie dejó de estar publicada.
export function calcularEstadoDesactualizadaPropuesta(params: {
  propuestaCreadoEn: Date;
  propuestaDiagnosticoId: string;
  establecimientoActualizadoEn: Date;
  ultimoDiagnostico: { id: string; creadoEn: Date } | null;
  especiesConEstadoActual: readonly { nombreComun: string; estadoActual: string | null }[];
}): EstadoDesactualizadaPropuesta {
  const motivos: string[] = [];

  if (estaDiagnosticoDesactualizado(params.propuestaCreadoEn, params.establecimientoActualizadoEn)) {
    motivos.push("La finca cambió después de crear esta propuesta.");
  }
  if (
    params.ultimoDiagnostico &&
    (params.ultimoDiagnostico.id !== params.propuestaDiagnosticoId ||
      params.ultimoDiagnostico.creadoEn.getTime() > params.propuestaCreadoEn.getTime())
  ) {
    motivos.push("Hay un diagnóstico más reciente que el usado en esta propuesta.");
  }

  const noPublicadas = params.especiesConEstadoActual
    .filter((e) => e.estadoActual !== "publicado")
    .map((e) => e.nombreComun);
  if (noPublicadas.length > 0) {
    motivos.push(
      `Alguna especie de la mezcla ya no está publicada en el catálogo (${noPublicadas.join(", ")}).`,
    );
  }

  return { desactualizada: motivos.length > 0, motivos };
}

export interface PropuestaNormalizada {
  id: string;
  establecimientoId: string;
  diagnosticoId: string;
  creadoEn: Date;
  nombre: string | null;
  versionReglas: string;
  elegida: boolean;
  objetivoPct: number;
  disposicion: DisposicionPropuesta;
  parametros: ParametrosDisposicion;
  franjas: FranjaPropuesta[] | null;
  reparto: RepartoUbicacionItem[] | null;
  editadaAMano: boolean;
  superficieFranjasHa: number;
  superficieLibreUsadaHa: number;
  porcentajeLogrado: number;
  perdidaPorCultivo: AlternativaEspacial["perdidaPorCultivo"];
  perdidaTotalCultivoHa: number;
  floracion: EvaluacionFloracionMezcla;
  avisos: AvisoPropuesta[];
  especies: EspecieEnMezcla[];
  desactualizada: boolean;
  motivosDesactualizada: string[];
}

function normalizarPropuesta(
  fila: typeof propuesta.$inferSelect,
  especies: EspecieEnMezcla[],
  estadoDesact: EstadoDesactualizadaPropuesta,
): PropuestaNormalizada {
  const perdidaTotalCultivoHa =
    Math.round(fila.perdidaPorCultivo.reduce((acc, p) => acc + p.ha, 0) * 10_000) / 10_000;

  return {
    id: fila.id,
    establecimientoId: fila.establecimientoId,
    diagnosticoId: fila.diagnosticoId,
    creadoEn: fila.creadoEn,
    nombre: fila.nombre,
    versionReglas: fila.versionReglas,
    elegida: fila.elegida,
    objetivoPct: Number(fila.objetivoPct),
    disposicion: fila.disposicion,
    parametros: fila.parametros,
    franjas: fila.franjas,
    reparto: fila.reparto,
    editadaAMano: fila.editadaAMano,
    superficieFranjasHa: Number(fila.superficieFranjasHa),
    superficieLibreUsadaHa: Number(fila.superficieLibreUsadaHa),
    porcentajeLogrado: Number(fila.porcentajeLogrado),
    perdidaPorCultivo: fila.perdidaPorCultivo,
    perdidaTotalCultivoHa,
    floracion: fila.floracion,
    avisos: fila.avisos,
    especies,
    desactualizada: estadoDesact.desactualizada,
    motivosDesactualizada: estadoDesact.motivos,
  };
}

export async function listarPropuestasDeFinca(establecimientoId: string, usuarioId: string) {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);
  if (!est) return null;

  const [filasPropuestas, [ultimoDiag]] = await Promise.all([
    db
      .select()
      .from(propuesta)
      .where(eq(propuesta.establecimientoId, est.id))
      .orderBy(desc(propuesta.elegida), desc(propuesta.creadoEn)),
    db
      .select({ id: diagnostico.id, creadoEn: diagnostico.creadoEn })
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, est.id))
      .orderBy(desc(diagnostico.creadoEn))
      .limit(1),
  ]);

  const idsProp = filasPropuestas.map((p) => p.id);
  const filasEspecies =
    idsProp.length > 0
      ? await db
          .select({
            propuestaId: propuestaEspecie.propuestaId,
            orden: propuestaEspecie.orden,
            copia: propuestaEspecie.copia,
            estadoActual: plantaServicio.estado,
          })
          .from(propuestaEspecie)
          .leftJoin(plantaServicio, eq(plantaServicio.id, propuestaEspecie.plantaId))
          .where(inArray(propuestaEspecie.propuestaId, idsProp))
          .orderBy(asc(propuestaEspecie.orden))
      : [];

  const porPropuesta = new Map<
    string,
    { copia: EspecieEnMezcla; estadoActual: string | null }[]
  >();
  for (const e of filasEspecies) {
    const lista = porPropuesta.get(e.propuestaId) ?? [];
    lista.push({ copia: e.copia, estadoActual: e.estadoActual });
    porPropuesta.set(e.propuestaId, lista);
  }

  const propuestas = filasPropuestas.map((fila) => {
    const listaEsp = porPropuesta.get(fila.id) ?? [];
    const estadoDesact = calcularEstadoDesactualizadaPropuesta({
      propuestaCreadoEn: fila.creadoEn,
      propuestaDiagnosticoId: fila.diagnosticoId,
      establecimientoActualizadoEn: est.actualizadoEn,
      ultimoDiagnostico: ultimoDiag ?? null,
      especiesConEstadoActual: listaEsp.map((e) => ({
        nombreComun: e.copia.nombreComun,
        estadoActual: e.estadoActual,
      })),
    });
    return normalizarPropuesta(
      fila,
      listaEsp.map((e) => e.copia),
      estadoDesact,
    );
  });

  return {
    establecimiento: est,
    tieneDiagnosticoVigente: Boolean(
      ultimoDiag && !estaDiagnosticoDesactualizado(ultimoDiag.creadoEn, est.actualizadoEn),
    ),
    propuestas,
  };
}

export async function obtenerDetallePropuesta(
  establecimientoId: string,
  propuestaId: string,
  usuarioId: string,
) {
  if (!esUuidValido(establecimientoId) || !esUuidValido(propuestaId)) return null;

  const [fila] = await db
    .select({
      propuesta,
      establecimiento,
      diagnostico,
    })
    .from(propuesta)
    .innerJoin(establecimiento, eq(establecimiento.id, propuesta.establecimientoId))
    .innerJoin(diagnostico, eq(diagnostico.id, propuesta.diagnosticoId))
    .where(
      and(
        eq(propuesta.id, propuestaId),
        eq(propuesta.establecimientoId, establecimientoId),
        eq(establecimiento.usuarioId, usuarioId),
      ),
    )
    .limit(1);

  if (!fila) return null;

  const [filasEsp, [ultimoDiag]] = await Promise.all([
    db
      .select({
        copia: propuestaEspecie.copia,
        estadoActual: plantaServicio.estado,
      })
      .from(propuestaEspecie)
      .leftJoin(plantaServicio, eq(plantaServicio.id, propuestaEspecie.plantaId))
      .where(eq(propuestaEspecie.propuestaId, fila.propuesta.id))
      .orderBy(asc(propuestaEspecie.orden)),
    db
      .select({ id: diagnostico.id, creadoEn: diagnostico.creadoEn })
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, fila.establecimiento.id))
      .orderBy(desc(diagnostico.creadoEn))
      .limit(1),
  ]);

  const estadoDesact = calcularEstadoDesactualizadaPropuesta({
    propuestaCreadoEn: fila.propuesta.creadoEn,
    propuestaDiagnosticoId: fila.propuesta.diagnosticoId,
    establecimientoActualizadoEn: fila.establecimiento.actualizadoEn,
    ultimoDiagnostico: ultimoDiag ?? null,
    especiesConEstadoActual: filasEsp.map((e) => ({
      nombreComun: e.copia.nombreComun,
      estadoActual: e.estadoActual,
    })),
  });

  return {
    establecimiento: fila.establecimiento,
    diagnostico: normalizarFilaDiagnostico(fila.diagnostico),
    propuesta: normalizarPropuesta(
      fila.propuesta,
      filasEsp.map((e) => e.copia),
      estadoDesact,
    ),
  };
}

// Resumen rápido de la propuesta elegida de una finca (para mostrar en la ficha, Esp. 05 §6.2).
export async function obtenerPropuestaElegidaDeFinca(establecimientoId: string) {
  const [fila] = await db
    .select({
      id: propuesta.id,
      nombre: propuesta.nombre,
      disposicion: propuesta.disposicion,
      porcentajeLogrado: propuesta.porcentajeLogrado,
      objetivoPct: propuesta.objetivoPct,
      creadoEn: propuesta.creadoEn,
    })
    .from(propuesta)
    .where(and(eq(propuesta.establecimientoId, establecimientoId), eq(propuesta.elegida, true)))
    .limit(1);

  if (!fila) return null;
  return {
    ...fila,
    porcentajeLogrado: Number(fila.porcentajeLogrado),
    objetivoPct: Number(fila.objetivoPct),
  };
}
