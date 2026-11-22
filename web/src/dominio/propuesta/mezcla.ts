// Selección determinística de la mezcla de plantas de servicio (Esp. 05, §5, CA-05-10 a 14).
// Reglas: RN-07 (explicable), RN-08 (sin antagonismos), RN-09 (dependencia polinización), RN-10 (floración).
import { obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import type { RangoSemanas, RiesgoMaleza } from "@/dominio/catalogo/tipos";
import {
  LIMITES_PROPUESTA,
  type AvisoPropuesta,
  type CultivoParaMezcla,
  type EspecieEnMezcla,
  type EvaluacionFloracionCultivo,
  type EvaluacionFloracionMezcla,
  type PlantaCandidataEntrada,
  type PlantaCandidataEvaluada,
  type PrioridadPolinizacion,
  type ResultadoMezcla,
} from "./tipos";

const PESO_RIESGO_MALEZA: Readonly<Record<RiesgoMaleza, number>> = {
  bajo: 1,
  medio: 2,
  alto: 3,
};

export function expandirRangosASemanas(rangos: readonly RangoSemanas[]): Set<number> {
  const semanas = new Set<number>();
  for (const [inicio, fin] of rangos) {
    const a = Math.max(1, Math.min(52, Math.trunc(inicio)));
    const b = Math.max(1, Math.min(52, Math.trunc(fin)));
    if (a <= b) {
      for (let s = a; s <= b; s += 1) semanas.add(s);
    } else {
      for (let s = a; s <= 52; s += 1) semanas.add(s);
      for (let s = 1; s <= b; s += 1) semanas.add(s);
    }
  }
  return semanas;
}

export function semanaAnterior(semana: number): number {
  return semana <= 1 ? 52 : semana - 1;
}

// Regla RN-09 (§5.3): si algún cultivo tiene dependencia alta o media -> prioridad polinizadores;
// si todos tienen baja o ninguna -> control biológico y cobertura de suelo.
export function determinarPrioridadPolinizacion(
  cultivos: readonly CultivoParaMezcla[],
): PrioridadPolinizacion {
  const requierePolinizadores = cultivos.some(
    (c) => c.dependenciaPolinizacion === "alta" || c.dependenciaPolinizacion === "media",
  );
  return requierePolinizadores ? "polinizadores" : "control_biologico";
}

// Filtra candidatas y calcula puntaje de compatibilidad ponderado por superficie (§5.1, CA-05-10).
export function filtrarCandidatasMezcla(params: {
  cultivos: readonly CultivoParaMezcla[];
  plantasPublicadasEnEcorregion: readonly PlantaCandidataEntrada[];
}): {
  prioridad: PrioridadPolinizacion;
  candidatas: PlantaCandidataEvaluada[];
} {
  const prioridad = determinarPrioridadPolinizacion(params.cultivos);
  const superficieTotalCultivos = params.cultivos.reduce(
    (acc, c) => acc + Math.max(0, c.superficieHa),
    0,
  );
  const idsCultivosFinca = new Set(params.cultivos.map((c) => c.id));
  const pesoPorCultivo = new Map<string, number>();

  for (const c of params.cultivos) {
    const actual = pesoPorCultivo.get(c.id) ?? 0;
    const aporte = superficieTotalCultivos > 0 ? c.superficieHa / superficieTotalCultivos : 0;
    pesoPorCultivo.set(c.id, actual + aporte);
  }

  const candidatas: PlantaCandidataEvaluada[] = [];

  for (const planta of params.plantasPublicadasEnEcorregion) {
    // Compatibilidades relevantes para los cultivos de esta finca.
    const compatsFinca = planta.compatibilidades.filter((c) => idsCultivosFinca.has(c.cultivoId));

    // RN-08: grado > 0 con al menos un cultivo y NINGÚN grado negativo con ninguno.
    const tienePositiva = compatsFinca.some((c) => c.grado > 0);
    const tieneNegativa = compatsFinca.some((c) => c.grado < 0);
    if (!tienePositiva || tieneNegativa) continue;

    // §5.1 y CA-05-10: con prioridad control biológico, solo plantas con control_biologico o cobertura_suelo.
    if (prioridad === "control_biologico") {
      const sirveControl =
        planta.funciones.includes("control_biologico") ||
        planta.funciones.includes("cobertura_suelo");
      if (!sirveControl) continue;
    }

    // Puntaje ponderado por superficie de cada cultivo (§5.1).
    let puntaje = 0;
    for (const compat of compatsFinca) {
      puntaje += compat.grado * (pesoPorCultivo.get(compat.cultivoId) ?? 0);
    }

    candidatas.push({
      ...planta,
      compatibilidades: compatsFinca,
      puntajeCompatibilidad: Math.round(puntaje * 1000) / 1000,
    });
  }

  candidatas.sort(
    (a, b) =>
      b.puntajeCompatibilidad - a.puntajeCompatibilidad ||
      a.nombreComun.localeCompare(b.nombreComun, "es-AR"),
  );

  return { prioridad, candidatas };
}

// Evalúa anticipación (1 semana antes del inicio de cada floración) y cobertura (> 80 %) (RN-10, CA-05-11).
export function evaluarFloracionMezcla(params: {
  cultivos: readonly CultivoParaMezcla[];
  especies: readonly Pick<PlantaCandidataEntrada, "floracionSemanas">[];
  prioridad: PrioridadPolinizacion;
}): EvaluacionFloracionMezcla {
  const semanasMezclaSet = new Set<number>();
  for (const esp of params.especies) {
    for (const s of expandirRangosASemanas(esp.floracionSemanas)) {
      semanasMezclaSet.add(s);
    }
  }

  const porCultivo: EvaluacionFloracionCultivo[] = [];
  const cultivosEvaluadosVistos = new Set<string>();

  for (const c of params.cultivos) {
    if (cultivosEvaluadosVistos.has(c.id)) continue;
    cultivosEvaluadosVistos.add(c.id);

    if (!c.tieneDatosPublicados || c.floracionSemanas.length === 0) continue;

    const semanasCultivoSet = expandirRangosASemanas(c.floracionSemanas);
    if (semanasCultivoSet.size === 0) continue;

    // Semanas de inicio reales en espacio circular 1..52: una semana es inicio si su anterior no está en floración.
    // Ej.: [[40,52],[1,4]] tiene inicio en 40 (anticipa semana 39), NO un inicio artificial en semana 1.
    const inicios: number[] = [];
    for (const s of semanasCultivoSet) {
      if (!semanasCultivoSet.has(semanaAnterior(s))) {
        inicios.push(s);
      }
    }

    const semanasAnticipacionRequeridas = inicios.map((ini) => {
      let req = ini;
      for (let k = 0; k < LIMITES_PROPUESTA.semanasAnticipacion; k += 1) {
        req = semanaAnterior(req);
      }
      return req;
    });

    const cumpleAnticipacion =
      semanasAnticipacionRequeridas.length === 0
        ? semanasMezclaSet.size > 0
        : semanasAnticipacionRequeridas.every((s) => semanasMezclaSet.has(s));

    const semanasCultivo = Array.from(semanasCultivoSet).sort((a, b) => a - b);
    const semanasDescubiertas = semanasCultivo.filter((s) => !semanasMezclaSet.has(s));
    const cubiertas = semanasCultivo.length - semanasDescubiertas.length;
    const coberturaPct = Math.round((cubiertas / semanasCultivo.length) * 1000) / 10;

    // Estrictamente > 80 % (Esp. 05 §5.2 y CA-05-11).
    const cumpleCobertura =
      cubiertas * 100 > LIMITES_PROPUESTA.coberturaFloracionMinPct * semanasCultivo.length;

    const obligatorio =
      params.prioridad === "polinizadores" &&
      (c.dependenciaPolinizacion === "alta" || c.dependenciaPolinizacion === "media");

    porCultivo.push({
      cultivoId: c.id,
      cultivoNombre: c.nombre,
      obligatorio,
      semanasCultivo,
      semanasAnticipacionRequeridas,
      cumpleAnticipacion,
      coberturaPct,
      semanasDescubiertas,
      cumple: cumpleAnticipacion && cumpleCobertura,
    });
  }

  const obligatorios = porCultivo.filter((c) => c.obligatorio);
  const cultivosObligatoriosCumplidos = obligatorios.filter((c) => c.cumple).length;
  const coberturaPromedioPct =
    porCultivo.length > 0
      ? Math.round((porCultivo.reduce((acc, c) => acc + c.coberturaPct, 0) / porCultivo.length) * 10) /
        10
      : 0;

  return {
    prioridad: params.prioridad,
    semanasMezcla: Array.from(semanasMezclaSet).sort((a, b) => a - b),
    porCultivo,
    cultivosObligatoriosCumplidos,
    cultivosObligatoriosTotal: obligatorios.length,
    coberturaPromedioPct,
    cumpleTodoObligatorio: cultivosObligatoriosCumplidos === obligatorios.length,
  };
}

function generarCombinaciones<T>(items: readonly T[], k: number): T[][] {
  const resultado: T[][] = [];
  const actual: T[] = [];

  function backtrack(inicio: number) {
    if (actual.length === k) {
      resultado.push([...actual]);
      return;
    }
    for (let i = inicio; i <= items.length - (k - actual.length); i += 1) {
      actual.push(items[i]);
      backtrack(i + 1);
      actual.pop();
    }
  }

  backtrack(0);
  return resultado;
}

function armarEspeciesEnMezcla(seleccion: readonly PlantaCandidataEvaluada[]): EspecieEnMezcla[] {
  const n = seleccion.length;
  if (n === 0) return [];
  const proporcionBase = Math.round((100 / n) * 10) / 10;

  return seleccion.map((p, idx) => ({
    plantaId: p.plantaId,
    clave: p.clave,
    nombreComun: p.nombreComun,
    nombreCientifico: p.nombreCientifico,
    proporcionPct: proporcionBase,
    orden: idx + 1,
    puntajeCompatibilidad: p.puntajeCompatibilidad,
    funciones: p.funciones,
    ciclo: p.ciclo,
    origen: p.origen,
    esEspontanea: p.esEspontanea,
    enMercadoLocal: p.enMercadoLocal,
    necesidadAgua: p.necesidadAgua,
    riesgoMaleza: p.riesgoMaleza,
    manejoCorte: p.manejoCorte,
    dosisSiembra: p.dosisSiembra,
    fuenteTipo: p.fuenteTipo,
    fuenteDetalle: p.fuenteDetalle,
    validadoPor: p.validadoPor,
    siembraSemanas: p.siembraSemanas,
    floracionSemanas: p.floracionSemanas,
    corteSemanas: p.corteSemanas,
    compatibilidades: p.compatibilidades,
  }));
}

function armarAvisosFloracionYCultivos(
  cultivos: readonly CultivoParaMezcla[],
  floracion: EvaluacionFloracionMezcla,
): AvisoPropuesta[] {
  const avisos: AvisoPropuesta[] = [];

  // §5.2: cultivos sin datos publicados de floración.
  const vistos = new Set<string>();
  for (const c of cultivos) {
    const clave = c.nombre.trim().toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    if (!c.tieneDatosPublicados || c.floracionSemanas.length === 0) {
      avisos.push({
        codigo: "cultivo_sin_datos_floracion",
        mensaje: `No sabemos cuándo florece ${c.nombre}: la mezcla no está ajustada a su floración.`,
      });
    }
  }

  // §5.4: semanas descubiertas si no cumple floración obligatoria.
  for (const ev of floracion.porCultivo) {
    if (ev.obligatorio && !ev.cumple) {
      const partes: string[] = [];
      if (!ev.cumpleAnticipacion) {
        partes.push(
          `falta floración en la semana de anticipación (${ev.semanasAnticipacionRequeridas.join(", ")})`,
        );
      }
      if (ev.semanasDescubiertas.length > 0) {
        partes.push(`quedan descubiertas las semanas ${ev.semanasDescubiertas.join(", ")}`);
      }
      avisos.push({
        codigo: "floracion_sin_cubrir",
        mensaje: `Para ${ev.cultivoNombre} (cobertura ${ev.coberturaPct.toLocaleString("es-AR")} %): ${partes.join("; ")}.`,
      });
    }
  }

  return avisos;
}

// Elige la combinación óptima de 2 a 4 especies siguiendo estrictamente los 6 criterios de §5.4 (CA-05-12, CA-05-13).
export function elegirMezclaOptima(params: {
  ecorregion: ClaveEcorregion;
  cultivos: readonly CultivoParaMezcla[];
  plantasPublicadasEnEcorregion: readonly PlantaCandidataEntrada[];
}): ResultadoMezcla {
  const { prioridad, candidatas } = filtrarCandidatasMezcla({
    cultivos: params.cultivos,
    plantasPublicadasEnEcorregion: params.plantasPublicadasEnEcorregion,
  });

  // Caso 0 candidatas (CA-05-13)
  if (candidatas.length === 0) {
    const nombresCultivos = Array.from(new Set(params.cultivos.map((c) => c.nombre))).join(", ");
    const nombreEco = obtenerNombreEcorregion(params.ecorregion);
    const floracionVacia = evaluarFloracionMezcla({
      cultivos: params.cultivos,
      especies: [],
      prioridad,
    });
    return {
      prioridad,
      ecorregion: params.ecorregion,
      especies: [],
      candidatasDisponibles: [],
      floracion: floracionVacia,
      avisos: [
        {
          codigo: "sin_candidatas",
          mensaje: `No se encontraron cultivos de servicio compatibles para ${nombresCultivos || "los cultivos cargados"} en ${nombreEco}.`,
        },
        ...armarAvisosFloracionYCultivos(params.cultivos, floracionVacia),
      ],
    };
  }

  // Caso 1 sola candidata (§5.4)
  if (candidatas.length === 1) {
    const seleccion = [candidatas[0]];
    const floracion = evaluarFloracionMezcla({
      cultivos: params.cultivos,
      especies: seleccion,
      prioridad,
    });
    return {
      prioridad,
      ecorregion: params.ecorregion,
      especies: armarEspeciesEnMezcla(seleccion),
      candidatasDisponibles: candidatas,
      floracion,
      avisos: [
        {
          codigo: "una_sola_especie",
          mensaje:
            "Hay una sola planta compatible: conviene consultar con un ingeniero agrónomo.",
        },
        ...armarAvisosFloracionYCultivos(params.cultivos, floracion),
      ],
    };
  }

  // Tomar hasta las 15 de mayor puntaje (§5.4 paso 1) y evaluar combinaciones de 2, 3 y 4 especies.
  const topCandidatas = candidatas.slice(0, LIMITES_PROPUESTA.maxCandidatasEvaluadas);
  const maxK = Math.min(LIMITES_PROPUESTA.maxEspeciesMezcla, topCandidatas.length);

  interface EvaluacionCombo {
    combo: PlantaCandidataEvaluada[];
    floracion: EvaluacionFloracionMezcla;
    localesOEspontaneas: number;
    riesgoMalezaSumado: number;
    puntajeSumado: number;
  }

  let mejor: EvaluacionCombo | null = null;

  for (let k = LIMITES_PROPUESTA.minEspeciesMezcla; k <= maxK; k += 1) {
    const combos = generarCombinaciones(topCandidatas, k);
    for (const combo of combos) {
      const floracion = evaluarFloracionMezcla({
        cultivos: params.cultivos,
        especies: combo,
        prioridad,
      });
      const evaluacion: EvaluacionCombo = {
        combo,
        floracion,
        localesOEspontaneas: combo.filter((p) => p.esEspontanea || p.enMercadoLocal).length,
        riesgoMalezaSumado: combo.reduce((acc, p) => acc + PESO_RIESGO_MALEZA[p.riesgoMaleza], 0),
        puntajeSumado: combo.reduce((acc, p) => acc + p.puntajeCompatibilidad, 0),
      };

      if (!mejor || esMejorCombinacion(evaluacion, mejor)) {
        mejor = evaluacion;
      }
    }
  }

  const ganadora = mejor!;
  return {
    prioridad,
    ecorregion: params.ecorregion,
    especies: armarEspeciesEnMezcla(ganadora.combo),
    candidatasDisponibles: candidatas,
    floracion: ganadora.floracion,
    avisos: armarAvisosFloracionYCultivos(params.cultivos, ganadora.floracion),
  };
}

// Orden estricto de los 6 criterios de §5.4 (CA-05-12).
function esMejorCombinacion(
  a: {
    combo: PlantaCandidataEvaluada[];
    floracion: EvaluacionFloracionMezcla;
    localesOEspontaneas: number;
    riesgoMalezaSumado: number;
    puntajeSumado: number;
  },
  b: {
    combo: PlantaCandidataEvaluada[];
    floracion: EvaluacionFloracionMezcla;
    localesOEspontaneas: number;
    riesgoMalezaSumado: number;
    puntajeSumado: number;
  },
): boolean {
  // 1. Cumple floración obligatoria para más cultivos.
  if (a.floracion.cultivosObligatoriosCumplidos !== b.floracion.cultivosObligatoriosCumplidos) {
    return a.floracion.cultivosObligatoriosCumplidos > b.floracion.cultivosObligatoriosCumplidos;
  }
  // 2. Mayor cobertura promedio de floración.
  if (a.floracion.coberturaPromedioPct !== b.floracion.coberturaPromedioPct) {
    return a.floracion.coberturaPromedioPct > b.floracion.coberturaPromedioPct;
  }
  // 3. Menos especies (más simple de manejar).
  if (a.combo.length !== b.combo.length) {
    return a.combo.length < b.combo.length;
  }
  // 4. Más especies de flora espontánea o del mercado local.
  if (a.localesOEspontaneas !== b.localesOEspontaneas) {
    return a.localesOEspontaneas > b.localesOEspontaneas;
  }
  // 5. Menor riesgo de maleza sumado.
  if (a.riesgoMalezaSumado !== b.riesgoMalezaSumado) {
    return a.riesgoMalezaSumado < b.riesgoMalezaSumado;
  }
  // 6. Mayor puntaje de compatibilidad sumado.
  return a.puntajeSumado > b.puntajeSumado;
}

// Valida y recalcula una mezcla editada por el usuario (solo candidatas permitidas — §5.6, CA-05-14).
export function validarYEvaluarMezclaPersonalizada(params: {
  ecorregion: ClaveEcorregion;
  cultivos: readonly CultivoParaMezcla[];
  plantasPublicadasEnEcorregion: readonly PlantaCandidataEntrada[];
  plantaIdsSeleccionadas: readonly string[];
}): { valido: true; resultado: ResultadoMezcla } | { valido: false; error: string } {
  const { prioridad, candidatas } = filtrarCandidatasMezcla({
    cultivos: params.cultivos,
    plantasPublicadasEnEcorregion: params.plantasPublicadasEnEcorregion,
  });

  const idsUnicos = Array.from(new Set(params.plantaIdsSeleccionadas));

  if (candidatas.length === 0) {
    if (idsUnicos.length > 0) {
      return {
        valido: false,
        error: "No hay plantas candidatas compatibles para esta finca.",
      };
    }
    return {
      valido: true,
      resultado: elegirMezclaOptima(params),
    };
  }

  if (idsUnicos.length === 0) {
    return {
      valido: false,
      error: "Elegí al menos una planta candidata para la mezcla.",
    };
  }

  if (idsUnicos.length > LIMITES_PROPUESTA.maxEspeciesMezcla) {
    return {
      valido: false,
      error: `La mezcla puede tener hasta ${LIMITES_PROPUESTA.maxEspeciesMezcla} especies.`,
    };
  }

  const mapaCandidatas = new Map(candidatas.map((c) => [c.plantaId, c]));
  const seleccion: PlantaCandidataEvaluada[] = [];

  for (const id of idsUnicos) {
    const candidata = mapaCandidatas.get(id);
    if (!candidata) {
      return {
        valido: false,
        error:
          "Alguna de las plantas elegidas no es una candidata publicada y compatible para esta finca.",
      };
    }
    seleccion.push(candidata);
  }

  const floracion = evaluarFloracionMezcla({
    cultivos: params.cultivos,
    especies: seleccion,
    prioridad,
  });

  const avisos: AvisoPropuesta[] = [];
  if (seleccion.length === 1) {
    avisos.push({
      codigo: "una_sola_especie",
      mensaje: "Hay una sola planta en la mezcla: conviene consultar con un ingeniero agrónomo.",
    });
  }
  avisos.push(...armarAvisosFloracionYCultivos(params.cultivos, floracion));

  return {
    valido: true,
    resultado: {
      prioridad,
      ecorregion: params.ecorregion,
      especies: armarEspeciesEnMezcla(seleccion),
      candidatasDisponibles: candidatas,
      floracion,
      avisos,
    },
  };
}
