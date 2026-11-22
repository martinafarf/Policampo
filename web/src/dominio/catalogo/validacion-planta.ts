// Validación pura y etiquetas en español para plantas de servicio (Esp. 03, 4.1, 4.2, CA-03-01).
import { esEcorregionValida, type ClaveEcorregion } from "@/datos/jujuy";
import { validarRangosSemanas } from "./semanas";
import {
  CICLOS_PLANTA,
  FUENTES_TIPO,
  FUNCIONES_PLANTA,
  NIVELES_AGUA,
  ORIGENES_PLANTA,
  RIESGOS_MALEZA,
  type CicloPlanta,
  type FuenteTipo,
  type FuncionPlanta,
  type NivelAgua,
  type OrigenPlanta,
  type RangoSemanas,
  type RiesgoMaleza,
} from "./tipos";

export const ETIQUETAS_FUNCION_PLANTA: Readonly<Record<FuncionPlanta, string>> = {
  atrae_polinizadores: "Atrae polinizadores",
  control_biologico: "Control biológico",
  cobertura_suelo: "Cobertura de suelo",
  aporta_fertilidad: "Aporta fertilidad",
  refugio: "Refugio",
};

export const ETIQUETAS_CICLO_PLANTA: Readonly<Record<CicloPlanta, string>> = {
  anual: "Anual",
  bianual: "Bianual",
  perenne: "Perenne",
};

export const ETIQUETAS_ORIGEN_PLANTA: Readonly<Record<OrigenPlanta, string>> = {
  nativa: "Nativa de la región",
  introducida: "Introducida",
  desconocido: "Desconocido",
};

export const ETIQUETAS_NIVEL_AGUA: Readonly<Record<NivelAgua, string>> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
};

export const ETIQUETAS_RIESGO_MALEZA: Readonly<Record<RiesgoMaleza, string>> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
};

export const ETIQUETAS_FUENTE_TIPO: Readonly<Record<FuenteTipo, string>> = {
  bibliografia: "Bibliografía",
  entrevista: "Entrevista",
  institucion: "Institución",
  observacion_propia: "Observación propia",
};

const REGEX_CLAVE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

export function esClaveCatalogoValida(clave: string): boolean {
  return clave.length >= 2 && clave.length <= 60 && REGEX_CLAVE.test(clave);
}

export interface EntradaPeriodoPlanta {
  ecorregion: string;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin?: number | null;
  semanasHastaFloracionMax?: number | null;
}

export interface PeriodoPlantaValidado {
  ecorregion: ClaveEcorregion;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin: number | null;
  semanasHastaFloracionMax: number | null;
}

export interface EntradaPlantaServicio {
  clave: string;
  nombreComun: string;
  nombreCientifico?: string | null;
  funciones: string[];
  ciclo: string;
  origen: string;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  polinizadoresQueAtrae?: string | null;
  beneficios?: string | null;
  necesidadAgua: string;
  manejoCorte?: string | null;
  riesgoMaleza: string;
  dosisSiembra?: string | null;
  costoReferenciaArsHa?: string | null;
  costoReferenciaFecha?: string | null;
  fuenteTipo?: string | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
  periodos: EntradaPeriodoPlanta[];
}

export interface PlantaServicioValidada {
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  origen: OrigenPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  polinizadoresQueAtrae: string | null;
  beneficios: string | null;
  necesidadAgua: NivelAgua;
  manejoCorte: string | null;
  riesgoMaleza: RiesgoMaleza;
  dosisSiembra: string | null;
  costoReferenciaArsHa: string | null;
  costoReferenciaFecha: string | null;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  periodos: PeriodoPlantaValidado[];
}

export type ResultadoValidacionPlanta =
  | { valido: true; datos: PlantaServicioValidada }
  | { valido: false; errores: string[] };

function limpiarOpcional(valor: string | null | undefined, max: number, etiqueta: string, errores: string[]): string | null {
  const limpio = valor?.trim() ?? "";
  if (limpio.length === 0) return null;
  if (limpio.length > max) {
    errores.push(`${etiqueta} no puede superar los ${max} caracteres.`);
  }
  return limpio;
}

export function validarEntradaPlantaServicio(
  entrada: EntradaPlantaServicio,
): ResultadoValidacionPlanta {
  const errores: string[] = [];

  const clave = entrada.clave.trim().toLowerCase();
  if (!esClaveCatalogoValida(clave)) {
    errores.push("La clave debe tener de 2 a 60 caracteres en minúsculas, números o guiones bajos (ej.: trigo_sarraceno).");
  }

  const nombreComun = entrada.nombreComun.trim();
  if (nombreComun.length < 2 || nombreComun.length > 80) {
    errores.push("El nombre común debe tener entre 2 y 80 caracteres.");
  }

  const nombreCientifico = limpiarOpcional(entrada.nombreCientifico, 120, "El nombre científico", errores);

  const funcionesValidas = Array.from(new Set(entrada.funciones)).filter((f): f is FuncionPlanta =>
    (FUNCIONES_PLANTA as readonly string[]).includes(f),
  );
  if (funcionesValidas.length === 0) {
    errores.push("Elegí al menos una función agroecológica.");
  }

  if (!(CICLOS_PLANTA as readonly string[]).includes(entrada.ciclo)) {
    errores.push("Elegí un ciclo válido (anual, bianual o perenne).");
  }

  if (!(ORIGENES_PLANTA as readonly string[]).includes(entrada.origen)) {
    errores.push("Elegí un origen válido.");
  }

  if (!entrada.esEspontanea && !entrada.enMercadoLocal) {
    errores.push("Indicá al menos una disponibilidad local: flora espontánea y/o mercado local (RN-12).");
  }

  if (!(NIVELES_AGUA as readonly string[]).includes(entrada.necesidadAgua)) {
    errores.push("Elegí una necesidad de agua válida.");
  }

  if (!(RIESGOS_MALEZA as readonly string[]).includes(entrada.riesgoMaleza)) {
    errores.push("Elegí un nivel de riesgo de maleza válido.");
  }

  const polinizadoresQueAtrae = limpiarOpcional(
    entrada.polinizadoresQueAtrae,
    300,
    "Polinizadores que atrae",
    errores,
  );
  const beneficios = limpiarOpcional(entrada.beneficios, 1000, "Beneficios", errores);
  const manejoCorte = limpiarOpcional(entrada.manejoCorte, 500, "Manejo y corte", errores);
  const dosisSiembra = limpiarOpcional(entrada.dosisSiembra, 120, "Dosis de siembra", errores);
  const fuenteDetalle = limpiarOpcional(entrada.fuenteDetalle, 300, "Descripción de la fuente", errores);
  const validadoPor = limpiarOpcional(entrada.validadoPor, 120, "Validado por", errores);

  let fuenteTipo: FuenteTipo | null = null;
  if (entrada.fuenteTipo && entrada.fuenteTipo.trim().length > 0) {
    if ((FUENTES_TIPO as readonly string[]).includes(entrada.fuenteTipo)) {
      fuenteTipo = entrada.fuenteTipo as FuenteTipo;
    } else {
      errores.push("El tipo de fuente elegido no es válido.");
    }
  }

  let costoReferenciaArsHa: string | null = null;
  const costoTexto = entrada.costoReferenciaArsHa?.trim().replace(",", ".") ?? "";
  if (costoTexto.length > 0) {
    const numero = Number(costoTexto);
    if (!Number.isFinite(numero) || numero < 0 || numero > 999_999_999) {
      errores.push("El costo de referencia debe ser un número positivo en pesos por hectárea.");
    } else {
      costoReferenciaArsHa = numero.toFixed(2);
    }
  }

  let costoReferenciaFecha: string | null = null;
  const fechaTexto = entrada.costoReferenciaFecha?.trim() ?? "";
  if (fechaTexto.length > 0) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
      errores.push("La fecha del costo de referencia debe tener formato AAAA-MM-DD.");
    } else {
      costoReferenciaFecha = fechaTexto;
    }
  }

  const ecorregionesVistas = new Set<string>();
  const periodosValidados: PeriodoPlantaValidado[] = [];

  for (const p of entrada.periodos) {
    if (!esEcorregionValida(p.ecorregion)) {
      errores.push(`La ecorregión «${p.ecorregion}» no es válida.`);
      continue;
    }
    if (ecorregionesVistas.has(p.ecorregion)) {
      errores.push(`La ecorregión «${p.ecorregion}» está repetida.`);
      continue;
    }
    ecorregionesVistas.add(p.ecorregion);

    for (const [etiqueta, rangos] of [
      ["siembra", p.siembraSemanas],
      ["floración", p.floracionSemanas],
      ["corte", p.corteSemanas],
    ] as const) {
      const chequeo = validarRangosSemanas(rangos);
      if (!chequeo.valido) {
        errores.push(`Período de ${etiqueta} (${p.ecorregion}): ${chequeo.error}`);
      }
    }

    const minSem = p.semanasHastaFloracionMin ?? null;
    const maxSem = p.semanasHastaFloracionMax ?? null;
    if (minSem !== null && (!Number.isInteger(minSem) || minSem < 1 || minSem > 52)) {
      errores.push(`Semanas mínimas hasta floración (${p.ecorregion}) debe ser un entero entre 1 y 52.`);
    }
    if (maxSem !== null && (!Number.isInteger(maxSem) || maxSem < 1 || maxSem > 52)) {
      errores.push(`Semanas máximas hasta floración (${p.ecorregion}) debe ser un entero entre 1 y 52.`);
    }
    if (minSem !== null && maxSem !== null && maxSem < minSem) {
      errores.push(`Semanas máximas hasta floración (${p.ecorregion}) no puede ser menor que las mínimas.`);
    }

    periodosValidados.push({
      ecorregion: p.ecorregion,
      siembraSemanas: p.siembraSemanas,
      floracionSemanas: p.floracionSemanas,
      corteSemanas: p.corteSemanas,
      semanasHastaFloracionMin: minSem,
      semanasHastaFloracionMax: maxSem,
    });
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    datos: {
      clave,
      nombreComun,
      nombreCientifico,
      funciones: funcionesValidas,
      ciclo: entrada.ciclo as CicloPlanta,
      origen: entrada.origen as OrigenPlanta,
      esEspontanea: entrada.esEspontanea,
      enMercadoLocal: entrada.enMercadoLocal,
      polinizadoresQueAtrae,
      beneficios,
      necesidadAgua: entrada.necesidadAgua as NivelAgua,
      manejoCorte,
      riesgoMaleza: entrada.riesgoMaleza as RiesgoMaleza,
      dosisSiembra,
      costoReferenciaArsHa,
      costoReferenciaFecha,
      fuenteTipo,
      fuenteDetalle,
      validadoPor,
      periodos: periodosValidados,
    },
  };
}
