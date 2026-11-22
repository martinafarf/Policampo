// Conversión reversible entre quincenas, semanas del año (1 a 52) y meses (Esp. 03, 4.2, CA-03-02 y CA-03-03).
// Es la única fuente de verdad para carga en backoffice, Guía de especies, calendario e importación CSV.
import { LIMITES_CATALOGO, type RangoSemanas } from "./tipos";

export interface DefinicionQuincena {
  readonly numero: number; // 1..24
  readonly mes: number; // 1..12
  readonly nombreMes: string;
  readonly mitad: 1 | 2;
  readonly etiqueta: string;
  readonly semanaInicio: number;
  readonly semanaFin: number;
}

export const NOMBRES_MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

// Partición exacta y sin solapamientos de las 52 semanas en 24 quincenas (13 semanas por trimestre).
// Q1 (1ª quincena de enero) = semanas 1 y 2 (ejemplo explícito en CA-03-03).
export const QUINCENAS: readonly DefinicionQuincena[] = [
  { numero: 1, mes: 1, nombreMes: "enero", mitad: 1, etiqueta: "1ª quincena de enero", semanaInicio: 1, semanaFin: 2 },
  { numero: 2, mes: 1, nombreMes: "enero", mitad: 2, etiqueta: "2ª quincena de enero", semanaInicio: 3, semanaFin: 4 },
  { numero: 3, mes: 2, nombreMes: "febrero", mitad: 1, etiqueta: "1ª quincena de febrero", semanaInicio: 5, semanaFin: 6 },
  { numero: 4, mes: 2, nombreMes: "febrero", mitad: 2, etiqueta: "2ª quincena de febrero", semanaInicio: 7, semanaFin: 8 },
  { numero: 5, mes: 3, nombreMes: "marzo", mitad: 1, etiqueta: "1ª quincena de marzo", semanaInicio: 9, semanaFin: 10 },
  { numero: 6, mes: 3, nombreMes: "marzo", mitad: 2, etiqueta: "2ª quincena de marzo", semanaInicio: 11, semanaFin: 13 },
  { numero: 7, mes: 4, nombreMes: "abril", mitad: 1, etiqueta: "1ª quincena de abril", semanaInicio: 14, semanaFin: 15 },
  { numero: 8, mes: 4, nombreMes: "abril", mitad: 2, etiqueta: "2ª quincena de abril", semanaInicio: 16, semanaFin: 17 },
  { numero: 9, mes: 5, nombreMes: "mayo", mitad: 1, etiqueta: "1ª quincena de mayo", semanaInicio: 18, semanaFin: 19 },
  { numero: 10, mes: 5, nombreMes: "mayo", mitad: 2, etiqueta: "2ª quincena de mayo", semanaInicio: 20, semanaFin: 21 },
  { numero: 11, mes: 6, nombreMes: "junio", mitad: 1, etiqueta: "1ª quincena de junio", semanaInicio: 22, semanaFin: 23 },
  { numero: 12, mes: 6, nombreMes: "junio", mitad: 2, etiqueta: "2ª quincena de junio", semanaInicio: 24, semanaFin: 26 },
  { numero: 13, mes: 7, nombreMes: "julio", mitad: 1, etiqueta: "1ª quincena de julio", semanaInicio: 27, semanaFin: 28 },
  { numero: 14, mes: 7, nombreMes: "julio", mitad: 2, etiqueta: "2ª quincena de julio", semanaInicio: 29, semanaFin: 30 },
  { numero: 15, mes: 8, nombreMes: "agosto", mitad: 1, etiqueta: "1ª quincena de agosto", semanaInicio: 31, semanaFin: 32 },
  { numero: 16, mes: 8, nombreMes: "agosto", mitad: 2, etiqueta: "2ª quincena de agosto", semanaInicio: 33, semanaFin: 34 },
  { numero: 17, mes: 9, nombreMes: "septiembre", mitad: 1, etiqueta: "1ª quincena de septiembre", semanaInicio: 35, semanaFin: 36 },
  { numero: 18, mes: 9, nombreMes: "septiembre", mitad: 2, etiqueta: "2ª quincena de septiembre", semanaInicio: 37, semanaFin: 39 },
  { numero: 19, mes: 10, nombreMes: "octubre", mitad: 1, etiqueta: "1ª quincena de octubre", semanaInicio: 40, semanaFin: 41 },
  { numero: 20, mes: 10, nombreMes: "octubre", mitad: 2, etiqueta: "2ª quincena de octubre", semanaInicio: 42, semanaFin: 43 },
  { numero: 21, mes: 11, nombreMes: "noviembre", mitad: 1, etiqueta: "1ª quincena de noviembre", semanaInicio: 44, semanaFin: 45 },
  { numero: 22, mes: 11, nombreMes: "noviembre", mitad: 2, etiqueta: "2ª quincena de noviembre", semanaInicio: 46, semanaFin: 47 },
  { numero: 23, mes: 12, nombreMes: "diciembre", mitad: 1, etiqueta: "1ª quincena de diciembre", semanaInicio: 48, semanaFin: 49 },
  { numero: 24, mes: 12, nombreMes: "diciembre", mitad: 2, etiqueta: "2ª quincena de diciembre", semanaInicio: 50, semanaFin: 52 },
];

export interface ResultadoValidacionRangos {
  valido: boolean;
  error?: string;
}

// Valida una lista de rangos de semanas [inicio, fin] (CA-03-02):
// - acepta rangos entre 1 y 52 (incluyendo varios rangos para cruzar el fin de año, ej. [[40, 52], [1, 4]]);
// - rechaza valores fuera de 1..52, no enteros o con inicio > fin dentro de un mismo rango.
export function validarRangosSemanas(rangos: unknown): ResultadoValidacionRangos {
  if (!Array.isArray(rangos)) {
    return { valido: false, error: "Los períodos deben ser una lista de rangos de semanas." };
  }

  for (let i = 0; i < rangos.length; i += 1) {
    const rango = rangos[i];
    if (!Array.isArray(rango) || rango.length !== 2) {
      return { valido: false, error: `El rango ${i + 1} debe tener inicio y fin.` };
    }
    const [inicio, fin] = rango;
    if (
      typeof inicio !== "number" ||
      typeof fin !== "number" ||
      !Number.isInteger(inicio) ||
      !Number.isInteger(fin)
    ) {
      return { valido: false, error: `El rango ${i + 1} debe contener semanas enteras.` };
    }
    if (
      inicio < LIMITES_CATALOGO.semanaMin ||
      inicio > LIMITES_CATALOGO.semanaMax ||
      fin < LIMITES_CATALOGO.semanaMin ||
      fin > LIMITES_CATALOGO.semanaMax
    ) {
      return {
        valido: false,
        error: `El rango ${i + 1} tiene semanas fuera del rango 1 a 52.`,
      };
    }
    if (inicio > fin) {
      return {
        valido: false,
        error: `En el rango ${i + 1}, la semana de inicio (${inicio}) no puede ser mayor que la de fin (${fin}). Para cruzar fin de año usá dos rangos, por ejemplo [40, 52] y [1, 4].`,
      };
    }
  }

  return { valido: true };
}

export function expandirRangosASemanas(rangos: readonly RangoSemanas[]): Set<number> {
  const semanas = new Set<number>();
  for (const [inicio, fin] of rangos) {
    for (let s = inicio; s <= fin; s += 1) {
      semanas.add(s);
    }
  }
  return semanas;
}

export function compactarSemanasARangos(semanas: Iterable<number>): RangoSemanas[] {
  const ordenadas = Array.from(new Set(semanas))
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= 52)
    .sort((a, b) => a - b);

  if (ordenadas.length === 0) return [];

  const rangos: RangoSemanas[] = [];
  let inicio = ordenadas[0];
  let fin = ordenadas[0];

  for (let i = 1; i < ordenadas.length; i += 1) {
    if (ordenadas[i] === fin + 1) {
      fin = ordenadas[i];
    } else {
      rangos.push([inicio, fin]);
      inicio = ordenadas[i];
      fin = ordenadas[i];
    }
  }
  rangos.push([inicio, fin]);
  return rangos;
}

// Convierte una lista de números de quincena (1..24) a rangos compactos de semanas (1..52).
export function quincenasARangosSemanas(quincenas: readonly number[]): RangoSemanas[] {
  const semanas: number[] = [];
  for (const q of quincenas) {
    const def = QUINCENAS[q - 1];
    if (!def) {
      throw new Error(`Número de quincena inválido: ${q}. Debe estar entre 1 y 24.`);
    }
    for (let s = def.semanaInicio; s <= def.semanaFin; s += 1) {
      semanas.push(s);
    }
  }
  return compactarSemanasARangos(semanas);
}

// Convierte rangos de semanas (1..52) a los números de quincena (1..24) que cubren.
// Reversible con quincenasARangosSemanas para cualquier selección de quincenas (CA-03-03).
export function rangosSemanasAQuincenas(rangos: readonly RangoSemanas[]): number[] {
  const semanas = expandirRangosASemanas(rangos);
  const resultado: number[] = [];
  for (const def of QUINCENAS) {
    let tieneAlguna = false;
    for (let s = def.semanaInicio; s <= def.semanaFin; s += 1) {
      if (semanas.has(s)) {
        tieneAlguna = true;
        break;
      }
    }
    if (tieneAlguna) {
      resultado.push(def.numero);
    }
  }
  return resultado;
}

export function semanaAMes(semana: number): number {
  const def = QUINCENAS.find((q) => semana >= q.semanaInicio && semana <= q.semanaFin);
  if (!def) {
    throw new Error(`Semana fuera de rango: ${semana}.`);
  }
  return def.mes;
}

export function rangosSemanasAMeses(rangos: readonly RangoSemanas[]): number[] {
  const semanas = expandirRangosASemanas(rangos);
  const meses = new Set<number>();
  for (const s of semanas) {
    meses.add(semanaAMes(s));
  }
  return Array.from(meses).sort((a, b) => a - b);
}

export function mesesARangosSemanas(meses: readonly number[]): RangoSemanas[] {
  const quincenas: number[] = [];
  for (const m of meses) {
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new Error(`Mes inválido: ${m}. Debe estar entre 1 y 12.`);
    }
    quincenas.push((m - 1) * 2 + 1, (m - 1) * 2 + 2);
  }
  return quincenasARangosSemanas(quincenas);
}

// Texto accesible de los períodos por mes (Esp. 03, sección 6), ej. "octubre a enero".
export function describirRangosEnMeses(rangos: readonly RangoSemanas[]): string {
  const meses = rangosSemanasAMeses(rangos);
  if (meses.length === 0) return "Sin datos";
  if (meses.length === 12) return "todo el año";

  // Agrupar meses consecutivos (contemplando cruce diciembre -> enero).
  const bloques: number[][] = [];
  let actual = [meses[0]];
  for (let i = 1; i < meses.length; i += 1) {
    if (meses[i] === meses[i - 1] + 1) {
      actual.push(meses[i]);
    } else {
      bloques.push(actual);
      actual = [meses[i]];
    }
  }
  bloques.push(actual);

  if (bloques.length > 1 && bloques[0][0] === 1 && bloques.at(-1)?.at(-1) === 12) {
    const ultimo = bloques.pop()!;
    const primero = bloques.shift()!;
    bloques.unshift([...ultimo, ...primero]);
  }

  return bloques
    .map((b) =>
      b.length === 1
        ? NOMBRES_MESES[b[0] - 1]
        : `${NOMBRES_MESES[b[0] - 1]} a ${NOMBRES_MESES[b[b.length - 1] - 1]}`,
    )
    .join(", ");
}

// Formato CSV de rangos de semanas (Esp. 03, 5.4), ej. "40-52;1-4".
export function formatearRangosCsv(rangos: readonly RangoSemanas[]): string {
  return rangos.map(([inicio, fin]) => `${inicio}-${fin}`).join(";");
}

export function parsearRangosCsv(texto: string): { valido: true; rangos: RangoSemanas[] } | { valido: false; error: string } {
  const limpio = texto.trim();
  if (limpio.length === 0) {
    return { valido: true, rangos: [] };
  }

  const partes = limpio.split(";").map((p) => p.trim()).filter(Boolean);
  const rangos: RangoSemanas[] = [];

  for (const parte of partes) {
    const coincidencia = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(parte);
    if (!coincidencia) {
      return {
        valido: false,
        error: `Formato de rango inválido («${parte}»). Usá el formato inicio-fin, por ejemplo 40-52;1-4.`,
      };
    }
    rangos.push([Number(coincidencia[1]), Number(coincidencia[2])]);
  }

  const chequeo = validarRangosSemanas(rangos);
  if (!chequeo.valido) {
    return { valido: false, error: chequeo.error ?? "Rango de semanas inválido." };
  }

  return { valido: true, rangos };
}
