// Conversión determinística entre semanas del año (1..52) y fechas YYYY-MM-DD (Esp. 06, §4.2).
// Coincide exactamente con el módulo 03: semana n = día 7*(n-1)+1 a 7*n; semana 52 llega al 31/12.
// Todas las fechas son fechas civiles ISO (sin corrimientos por huso horario).
import type { RangoSemanas } from "@/dominio/catalogo/tipos";
import { ZONA_HORARIA_JUJUY } from "./tipos";

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaIsoValida(valor: string): boolean {
  if (!REGEX_FECHA_ISO.test(valor)) return false;
  const [anio, mes, dia] = valor.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia
  );
}

export function esAnioBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasEnAnio(anio: number): number {
  return esAnioBisiesto(anio) ? 366 : 365;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatearFechaIsoDesdeUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function parsearFechaIsoAUnc(iso: string): Date {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

export function sumarDiasIso(iso: string, dias: number): string {
  const d = parsearFechaIsoAUnc(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return formatearFechaIsoDesdeUtc(d);
}

export function sumarMesesIso(iso: string, meses: number): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDiaMes = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(dia, ultimoDiaMes));
  return formatearFechaIsoDesdeUtc(target);
}

export function diferenciaDiasIso(fechaMayorIso: string, fechaMenorIso: string): number {
  const ms =
    parsearFechaIsoAUnc(fechaMayorIso).getTime() - parsearFechaIsoAUnc(fechaMenorIso).getTime();
  return Math.round(ms / 86_400_000);
}

// Día del año (1 = 1 de enero, 365/366 = 31 de diciembre) -> YYYY-MM-DD.
export function diaDelAnioAFechaIso(anio: number, diaDelAnio: number): string {
  const d = new Date(Date.UTC(anio, 0, 1));
  d.setUTCDate(diaDelAnio);
  return formatearFechaIsoDesdeUtc(d);
}

// Semana 1..52 del año -> { inicio, fin } (CA-06-02: semana n = 7*(n-1)+1 .. 7*n; semana 52 -> 31/12).
export function semanaAFechas(anio: number, semana: number): { inicio: string; fin: string } {
  const s = Math.max(1, Math.min(52, Math.trunc(semana)));
  const diaInicio = 7 * (s - 1) + 1;
  const diaFin = s === 52 ? diasEnAnio(anio) : 7 * s;
  return {
    inicio: diaDelAnioAFechaIso(anio, diaInicio),
    fin: diaDelAnioAFechaIso(anio, diaFin),
  };
}

// Hoy en formato YYYY-MM-DD en la zona horaria America/Argentina/Jujuy (CA-06-07).
export function obtenerHoyJujuyIso(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_JUJUY,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

export function formatearFechaCortaEsAr(iso: string): string {
  if (!esFechaIsoValida(iso)) return iso;
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
}

export interface PeriodoContinuoSemanas {
  inicioSemana: number;
  finSemana: number;
  cruzaAnio: boolean;
}

// Normaliza una lista de rangos de semanas fusionando tramos consecutivos y el cruce 52 -> 1 (CA-06-02).
// Ej.: [[40, 52], [1, 4]] -> [{ inicioSemana: 40, finSemana: 4, cruzaAnio: true }].
export function agruparRangosSemanasContinuos(
  rangos: readonly RangoSemanas[],
): PeriodoContinuoSemanas[] {
  const activas = new Set<number>();
  for (const [a, b] of rangos) {
    const ini = Math.max(1, Math.min(52, Math.trunc(a)));
    const fin = Math.max(1, Math.min(52, Math.trunc(b)));
    if (ini <= fin) {
      for (let s = ini; s <= fin; s += 1) activas.add(s);
    } else {
      for (let s = ini; s <= 52; s += 1) activas.add(s);
      for (let s = 1; s <= fin; s += 1) activas.add(s);
    }
  }

  if (activas.size === 0) return [];
  if (activas.size === 52) {
    return [{ inicioSemana: 1, finSemana: 52, cruzaAnio: false }];
  }

  const ordenadas = Array.from(activas).sort((a, b) => a - b);
  const bloques: { inicioSemana: number; finSemana: number; cruzaAnio: boolean }[] = [];

  let inicio = ordenadas[0];
  let anterior = ordenadas[0];
  for (let i = 1; i < ordenadas.length; i += 1) {
    if (ordenadas[i] === anterior + 1) {
      anterior = ordenadas[i];
    } else {
      bloques.push({ inicioSemana: inicio, finSemana: anterior, cruzaAnio: false });
      inicio = ordenadas[i];
      anterior = ordenadas[i];
    }
  }
  bloques.push({ inicioSemana: inicio, finSemana: anterior, cruzaAnio: false });

  // Si hay un bloque que termina en 52 y otro que arranca en 1, se unen en uno solo que cruza año.
  if (
    bloques.length > 1 &&
    bloques[0].inicioSemana === 1 &&
    bloques[bloques.length - 1].finSemana === 52
  ) {
    const finAnio = bloques.pop()!;
    const inicioAnio = bloques.shift()!;
    bloques.push({
      inicioSemana: finAnio.inicioSemana,
      finSemana: inicioAnio.finSemana,
      cruzaAnio: true,
    });
  }

  return bloques;
}

// Convierte un período continuo de semanas a su próxima ocurrencia dentro de [temporadaInicio, temporadaFin] (§4.2).
export function proximaOcurrenciaEnTemporada(
  periodo: PeriodoContinuoSemanas,
  temporadaInicio: string,
  temporadaFin: string,
): { fechaInicio: string; fechaFin: string } | null {
  const anioBase = Number(temporadaInicio.slice(0, 4));
  const candidatos: { fechaInicio: string; fechaFin: string }[] = [];

  for (const anio of [anioBase - 1, anioBase, anioBase + 1]) {
    const fechaInicio = semanaAFechas(anio, periodo.inicioSemana).inicio;
    const anioFin = periodo.cruzaAnio ? anio + 1 : anio;
    const fechaFin = semanaAFechas(anioFin, periodo.finSemana).fin;

    if (fechaFin >= temporadaInicio && fechaInicio <= temporadaFin) {
      candidatos.push({ fechaInicio, fechaFin });
    }
  }

  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  return candidatos[0];
}
