// Importación y exportación CSV del catálogo de especies (Esp. 03, 5.4, CA-03-11 a CA-03-14, RS-07).
// Parser y serializador RFC 4180 puro (sin dependencias externas), con protección contra inyección
// de fórmulas en Excel y topes de 2 MB / 2.000 filas.
import { esEcorregionValida, type ClaveEcorregion } from "@/datos/jujuy";
import { formatearRangosCsv, parsearRangosCsv } from "./semanas";
import { FUNCIONES_PLANTA, LIMITES_CATALOGO, type RangoSemanas } from "./tipos";
import {
  validarEntradaCompatibilidad,
  type CompatibilidadValidada,
} from "./validacion-cultivo-compat";
import {
  validarEntradaPlantaServicio,
  type PlantaServicioValidada,
} from "./validacion-planta";

export type TipoArchivoCsv = "plantas" | "periodos" | "compatibilidades";

export const COLUMNAS_PLANTAS = [
  "clave",
  "nombre_comun",
  "nombre_cientifico",
  "funciones",
  "ciclo",
  "origen",
  "es_espontanea",
  "en_mercado_local",
  "polinizadores_que_atrae",
  "beneficios",
  "necesidad_agua",
  "manejo_corte",
  "riesgo_maleza",
  "dosis_siembra",
  "costo_referencia_ars_ha",
  "costo_referencia_fecha",
  "fuente_tipo",
  "fuente_detalle",
  "validado_por",
] as const;

export const COLUMNAS_PERIODOS = [
  "planta_clave",
  "ecorregion",
  "siembra_semanas",
  "floracion_semanas",
  "corte_semanas",
  "semanas_hasta_floracion_min",
  "semanas_hasta_floracion_max",
] as const;

export const COLUMNAS_COMPATIBILIDADES = [
  "cultivo_clave",
  "planta_clave",
  "grado",
  "justificacion",
  "fuente_tipo",
  "fuente_detalle",
  "validado_por",
] as const;

const PREFIJOS_FORMULA = new Set(["=", "+", "-", "@", "\t", "\r"]);

// Protección contra inyección de fórmulas en Excel (RS-07, CA-03-14):
// toda celda que empieza con =, +, -, @, tabulación o retorno de carro sale con "'" adelante.
export function escaparCeldaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (texto.length > 0 && PREFIJOS_FORMULA.has(texto[0])) {
    texto = `'${texto}`;
  }
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function serializarCsv(
  encabezados: readonly string[],
  filas: readonly (readonly unknown[])[],
): string {
  const lineas = [encabezados.map(escaparCeldaCsv).join(",")];
  for (const fila of filas) {
    lineas.push(fila.map(escaparCeldaCsv).join(","));
  }
  return `${lineas.join("\r\n")}\r\n`;
}

export interface ResultadoParseoCsv {
  valido: boolean;
  error?: string;
  encabezados: string[];
  filas: Record<string, string>[];
}

// Parser CSV RFC 4180 con límites de 2 MB y 2.000 filas (CA-03-13, RS-06).
export function parsearCsv(contenidoCrudo: string): ResultadoParseoCsv {
  const bytes = new TextEncoder().encode(contenidoCrudo).byteLength;
  if (bytes > LIMITES_CATALOGO.csvMaxBytes) {
    return {
      valido: false,
      error: "El archivo supera el tamaño máximo permitido de 2 MB.",
      encabezados: [],
      filas: [],
    };
  }

  // Quitar BOM UTF-8 si viene de Excel.
  const texto = contenidoCrudo.startsWith("\uFEFF") ? contenidoCrudo.slice(1) : contenidoCrudo;
  if (texto.trim().length === 0) {
    return {
      valido: false,
      error: "El archivo CSV está vacío.",
      encabezados: [],
      filas: [],
    };
  }

  const registros: string[][] = [];
  let filaActual: string[] = [];
  let celdaActual = "";
  let enComillas = false;

  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto[i];
    if (enComillas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          celdaActual += '"';
          i += 1;
        } else {
          enComillas = false;
        }
      } else {
        celdaActual += ch;
      }
    } else if (ch === '"') {
      enComillas = true;
    } else if (ch === ",") {
      filaActual.push(celdaActual);
      celdaActual = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && texto[i + 1] === "\n") {
        i += 1;
      }
      filaActual.push(celdaActual);
      if (filaActual.some((c) => c.trim().length > 0)) {
        registros.push(filaActual);
      }
      filaActual = [];
      celdaActual = "";
    } else {
      celdaActual += ch;
    }
  }

  if (enComillas) {
    return {
      valido: false,
      error: "El archivo CSV tiene comillas sin cerrar.",
      encabezados: [],
      filas: [],
    };
  }

  if (celdaActual.length > 0 || filaActual.length > 0) {
    filaActual.push(celdaActual);
    if (filaActual.some((c) => c.trim().length > 0)) {
      registros.push(filaActual);
    }
  }

  if (registros.length < 2) {
    return {
      valido: false,
      error: "El archivo CSV debe incluir encabezados y al menos una fila de datos.",
      encabezados: [],
      filas: [],
    };
  }

  const encabezados = registros[0].map((h) => h.trim().toLowerCase());
  const filasDatos = registros.slice(1);

  if (filasDatos.length > LIMITES_CATALOGO.csvMaxFilas) {
    return {
      valido: false,
      error: `El archivo supera el máximo de ${LIMITES_CATALOGO.csvMaxFilas} filas.`,
      encabezados,
      filas: [],
    };
  }

  const filas = filasDatos.map((celdas) => {
    const obj: Record<string, string> = {};
    for (let i = 0; i < encabezados.length; i += 1) {
      obj[encabezados[i]] = (celdas[i] ?? "").trim();
    }
    return obj;
  });

  return { valido: true, encabezados, filas };
}

function parsearBooleanoCsv(valor: string): boolean | null {
  const norm = valor.trim().toLowerCase();
  if (["si", "sí", "true", "1"].includes(norm)) return true;
  if (["no", "false", "0", ""].includes(norm)) return false;
  return null;
}

function quitarComillaFormula(valor: string): string {
  return valor.startsWith("'") && valor.length > 1 && PREFIJOS_FORMULA.has(valor[1])
    ? valor.slice(1)
    : valor;
}

function parsearEnteroOpcional(valor: string): number | null | "invalido" {
  const limpio = quitarComillaFormula(valor.trim());
  if (limpio.length === 0) return null;
  if (!/^-?\d+$/.test(limpio)) return "invalido";
  return Number.parseInt(limpio, 10);
}

export interface ErrorFilaCsv {
  fila: number; // número de fila en el CSV (encabezado = 1, primer dato = 2)
  mensaje: string;
}

export interface FilaPeriodoCsvValidada {
  plantaClave: string;
  ecorregion: ClaveEcorregion;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin: number | null;
  semanasHastaFloracionMax: number | null;
}

export interface FilaCompatibilidadCsvValidada extends CompatibilidadValidada {
  cultivoClave: string;
  plantaClave: string;
}

export function validarFilasPlantasCsv(filas: readonly Record<string, string>[]): {
  validas: PlantaServicioValidada[];
  errores: ErrorFilaCsv[];
} {
  const validas: PlantaServicioValidada[] = [];
  const errores: ErrorFilaCsv[] = [];
  const clavesEnArchivo = new Set<string>();

  filas.forEach((f, idx) => {
    const numFila = idx + 2;
    const esp = parsearBooleanoCsv(f.es_espontanea ?? "");
    const merc = parsearBooleanoCsv(f.en_mercado_local ?? "");
    if (esp === null || merc === null) {
      errores.push({
        fila: numFila,
        mensaje: "Los campos es_espontanea y en_mercado_local deben ser si/no o true/false.",
      });
      return;
    }

    const funciones = (f.funciones ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    const funcionesInvalidas = funciones.filter(
      (fn) => !(FUNCIONES_PLANTA as readonly string[]).includes(fn),
    );
    if (funcionesInvalidas.length > 0) {
      errores.push({
        fila: numFila,
        mensaje: `Funciones inválidas: ${funcionesInvalidas.join(", ")}.`,
      });
      return;
    }

    const res = validarEntradaPlantaServicio({
      clave: f.clave ?? "",
      nombreComun: f.nombre_comun ?? "",
      nombreCientifico: f.nombre_cientifico ?? "",
      funciones,
      ciclo: f.ciclo ?? "",
      origen: f.origen || "desconocido",
      esEspontanea: esp,
      enMercadoLocal: merc,
      polinizadoresQueAtrae: f.polinizadores_que_atrae ?? "",
      beneficios: f.beneficios ?? "",
      necesidadAgua: f.necesidad_agua || "media",
      manejoCorte: f.manejo_corte ?? "",
      riesgoMaleza: f.riesgo_maleza || "bajo",
      dosisSiembra: f.dosis_siembra ?? "",
      costoReferenciaArsHa: f.costo_referencia_ars_ha ?? "",
      costoReferenciaFecha: f.costo_referencia_fecha ?? "",
      fuenteTipo: f.fuente_tipo ?? "",
      fuenteDetalle: f.fuente_detalle ?? "",
      validadoPor: f.validado_por ?? "",
      periodos: [],
    });

    if (!res.valido) {
      errores.push({ fila: numFila, mensaje: res.errores.join(" ") });
      return;
    }

    if (clavesEnArchivo.has(res.datos.clave)) {
      errores.push({
        fila: numFila,
        mensaje: `La clave «${res.datos.clave}» está repetida dentro del archivo.`,
      });
      return;
    }

    clavesEnArchivo.add(res.datos.clave);
    validas.push(res.datos);
  });

  return { validas, errores };
}

export function validarFilasPeriodosCsv(
  filas: readonly Record<string, string>[],
  clavesPlantasExistentes: ReadonlySet<string>,
): { validas: FilaPeriodoCsvValidada[]; errores: ErrorFilaCsv[] } {
  const validas: FilaPeriodoCsvValidada[] = [];
  const errores: ErrorFilaCsv[] = [];
  const paresVistos = new Set<string>();

  filas.forEach((f, idx) => {
    const numFila = idx + 2;
    const plantaClave = (f.planta_clave ?? "").trim().toLowerCase();
    const ecorregion = (f.ecorregion ?? "").trim();

    if (!clavesPlantasExistentes.has(plantaClave)) {
      errores.push({ fila: numFila, mensaje: `La planta «${plantaClave}» no existe en el catálogo.` });
      return;
    }
    if (!esEcorregionValida(ecorregion)) {
      errores.push({ fila: numFila, mensaje: `La ecorregión «${ecorregion}» no es válida.` });
      return;
    }

    const par = `${plantaClave}::${ecorregion}`;
    if (paresVistos.has(par)) {
      errores.push({ fila: numFila, mensaje: `El par (${plantaClave}, ${ecorregion}) está repetido.` });
      return;
    }

    const siembra = parsearRangosCsv(f.siembra_semanas ?? "");
    if (!siembra.valido) {
      errores.push({ fila: numFila, mensaje: `Siembra: ${siembra.error}` });
      return;
    }
    const floracion = parsearRangosCsv(f.floracion_semanas ?? "");
    if (!floracion.valido) {
      errores.push({ fila: numFila, mensaje: `Floración: ${floracion.error}` });
      return;
    }
    const corte = parsearRangosCsv(f.corte_semanas ?? "");
    if (!corte.valido) {
      errores.push({ fila: numFila, mensaje: `Corte: ${corte.error}` });
      return;
    }

    const minSem = parsearEnteroOpcional(f.semanas_hasta_floracion_min ?? "");
    const maxSem = parsearEnteroOpcional(f.semanas_hasta_floracion_max ?? "");
    if (minSem === "invalido" || maxSem === "invalido") {
      errores.push({
        fila: numFila,
        mensaje: "Las semanas hasta floración deben ser números enteros.",
      });
      return;
    }
    if (minSem !== null && (minSem < 1 || minSem > 52)) {
      errores.push({ fila: numFila, mensaje: "Semanas mínimas hasta floración fuera de 1..52." });
      return;
    }
    if (maxSem !== null && (maxSem < 1 || maxSem > 52)) {
      errores.push({ fila: numFila, mensaje: "Semanas máximas hasta floración fuera de 1..52." });
      return;
    }
    if (minSem !== null && maxSem !== null && maxSem < minSem) {
      errores.push({
        fila: numFila,
        mensaje: "Semanas máximas hasta floración no puede ser menor que las mínimas.",
      });
      return;
    }

    paresVistos.add(par);
    validas.push({
      plantaClave,
      ecorregion,
      siembraSemanas: siembra.rangos,
      floracionSemanas: floracion.rangos,
      corteSemanas: corte.rangos,
      semanasHastaFloracionMin: minSem,
      semanasHastaFloracionMax: maxSem,
    });
  });

  return { validas, errores };
}

export function validarFilasCompatibilidadesCsv(
  filas: readonly Record<string, string>[],
  clavesCultivosExistentes: ReadonlySet<string>,
  clavesPlantasExistentes: ReadonlySet<string>,
): { validas: FilaCompatibilidadCsvValidada[]; errores: ErrorFilaCsv[] } {
  const validas: FilaCompatibilidadCsvValidada[] = [];
  const errores: ErrorFilaCsv[] = [];
  const paresVistos = new Set<string>();

  filas.forEach((f, idx) => {
    const numFila = idx + 2;
    const cultivoClave = (f.cultivo_clave ?? "").trim().toLowerCase();
    const plantaClave = (f.planta_clave ?? "").trim().toLowerCase();

    if (!clavesCultivosExistentes.has(cultivoClave)) {
      errores.push({ fila: numFila, mensaje: `El cultivo «${cultivoClave}» no existe.` });
      return;
    }
    if (!clavesPlantasExistentes.has(plantaClave)) {
      errores.push({ fila: numFila, mensaje: `La planta «${plantaClave}» no existe.` });
      return;
    }

    const par = `${cultivoClave}::${plantaClave}`;
    if (paresVistos.has(par)) {
      errores.push({ fila: numFila, mensaje: `El par (${cultivoClave}, ${plantaClave}) está repetido.` });
      return;
    }

    const gradoNum = parsearEnteroOpcional(f.grado ?? "");
    if (gradoNum === null || gradoNum === "invalido") {
      errores.push({ fila: numFila, mensaje: "El grado debe ser un número entero entre -5 y +5." });
      return;
    }

    const res = validarEntradaCompatibilidad({
      grado: gradoNum,
      justificacion: f.justificacion ?? "",
      fuenteTipo: f.fuente_tipo ?? "",
      fuenteDetalle: f.fuente_detalle ?? "",
      validadoPor: f.validado_por ?? "",
    });
    if (!res.valido) {
      errores.push({ fila: numFila, mensaje: res.errores.join(" ") });
      return;
    }

    paresVistos.add(par);
    validas.push({
      cultivoClave,
      plantaClave,
      ...res.datos,
    });
  });

  return { validas, errores };
}

export function exportarPlantasCsv(
  plantas: readonly {
    clave: string;
    nombreComun: string;
    nombreCientifico: string | null;
    funciones: readonly string[];
    ciclo: string;
    origen: string;
    esEspontanea: boolean;
    enMercadoLocal: boolean;
    polinizadoresQueAtrae: string | null;
    beneficios: string | null;
    necesidadAgua: string;
    manejoCorte: string | null;
    riesgoMaleza: string;
    dosisSiembra: string | null;
    costoReferenciaArsHa: string | null;
    costoReferenciaFecha: string | null;
    fuenteTipo: string | null;
    fuenteDetalle: string | null;
    validadoPor: string | null;
  }[],
): string {
  return serializarCsv(
    COLUMNAS_PLANTAS,
    plantas.map((p) => [
      p.clave,
      p.nombreComun,
      p.nombreCientifico ?? "",
      p.funciones.join(";"),
      p.ciclo,
      p.origen,
      p.esEspontanea ? "si" : "no",
      p.enMercadoLocal ? "si" : "no",
      p.polinizadoresQueAtrae ?? "",
      p.beneficios ?? "",
      p.necesidadAgua,
      p.manejoCorte ?? "",
      p.riesgoMaleza,
      p.dosisSiembra ?? "",
      p.costoReferenciaArsHa ?? "",
      p.costoReferenciaFecha ?? "",
      p.fuenteTipo ?? "",
      p.fuenteDetalle ?? "",
      p.validadoPor ?? "",
    ]),
  );
}

export function exportarPeriodosCsv(
  periodos: readonly {
    plantaClave: string;
    ecorregion: string;
    siembraSemanas: readonly RangoSemanas[];
    floracionSemanas: readonly RangoSemanas[];
    corteSemanas: readonly RangoSemanas[];
    semanasHastaFloracionMin: number | null;
    semanasHastaFloracionMax: number | null;
  }[],
): string {
  return serializarCsv(
    COLUMNAS_PERIODOS,
    periodos.map((p) => [
      p.plantaClave,
      p.ecorregion,
      formatearRangosCsv(p.siembraSemanas),
      formatearRangosCsv(p.floracionSemanas),
      formatearRangosCsv(p.corteSemanas),
      p.semanasHastaFloracionMin ?? "",
      p.semanasHastaFloracionMax ?? "",
    ]),
  );
}

export function exportarCompatibilidadesCsv(
  compatibilidades: readonly {
    cultivoClave: string;
    plantaClave: string;
    grado: number;
    justificacion: string;
    fuenteTipo: string | null;
    fuenteDetalle: string | null;
    validadoPor: string | null;
  }[],
): string {
  return serializarCsv(
    COLUMNAS_COMPATIBILIDADES,
    compatibilidades.map((c) => [
      c.cultivoClave,
      c.plantaClave,
      c.grado,
      c.justificacion,
      c.fuenteTipo ?? "",
      c.fuenteDetalle ?? "",
      c.validadoPor ?? "",
    ]),
  );
}

export function ejemploCsv(tipo: TipoArchivoCsv): string {
  if (tipo === "plantas") {
    return serializarCsv(COLUMNAS_PLANTAS, [
      [
        "trigo_sarraceno",
        "Trigo sarraceno",
        "Fagopyrum esculentum",
        "atrae_polinizadores;cobertura_suelo",
        "anual",
        "introducida",
        "no",
        "si",
        "Abejas nativas y sírfidos",
        "Floración rápida y abundante con alta atracción de insectos benéficos.",
        "baja",
        "Corte al finalizar la floración antes de la maduración del grano.",
        "bajo",
        "25 kg/ha",
        "",
        "",
        "entrevista",
        "Entrevista al Especialista 1",
        "Analista de dominio (Integrante 2)",
      ],
    ]);
  }
  if (tipo === "periodos") {
    return serializarCsv(COLUMNAS_PERIODOS, [
      ["calendula", "valles_templados", "27-35", "36-52", "1-2", 8, 10],
    ]);
  }
  return serializarCsv(COLUMNAS_COMPATIBILIDADES, [
    [
      "tomate",
      "calendula",
      5,
      "Combate trips y mosca blanca mientras aporta floración continua.",
      "bibliografia",
      "Manual agroecológico",
      "Especialista 1",
    ],
  ]);
}
