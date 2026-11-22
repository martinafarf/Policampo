// Cálculos de superficies y reglas RN-05 / RN-06 (especificación 02, CA-02-08, 10, 12, 13, 19).
// Todas las superficies del dominio se manejan en hectáreas (ha) con hasta 4 decimales.
import turfArea from "@turf/area";
import type { MultiPolygon, Polygon } from "geojson";
import { LIMITES_ESTABLECIMIENTO, type PoligonoGeoJson, type Posicion2D, type TipoSector } from "./tipos";

const M2_POR_HECTAREA = 10_000;
const FACTOR_DECIMALES_HA = 10_000; // 4 decimales

export function redondearHectareas(ha: number): number {
  return Math.round(ha * FACTOR_DECIMALES_HA) / FACTOR_DECIMALES_HA;
}

export function metrosCuadradosAHectareas(m2: number): number {
  return redondearHectareas(m2 / M2_POR_HECTAREA);
}

export function hectareasAMetrosCuadrados(ha: number): number {
  return Math.round(ha * M2_POR_HECTAREA * 100) / 100;
}

// Lado en metros del plano cuadrado a escala para el método croquis (CA-02-13): √(ha × 10.000).
export function calcularLadoCroquisMetros(superficieTotalHa: number): number {
  if (!Number.isFinite(superficieTotalHa) || superficieTotalHa <= 0) {
    throw new Error("La superficie total debe ser mayor que cero para armar el croquis.");
  }
  return Math.sqrt(superficieTotalHa * M2_POR_HECTAREA);
}

// Fórmula del polígono (Shoelace) sobre un anillo plano en metros [x, y].
function calcularAreaAnilloPlanaM2(anillo: readonly Posicion2D[]): number {
  if (anillo.length < 4) return 0;
  let suma = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    const [x1, y1] = anillo[i];
    const [x2, y2] = anillo[i + 1];
    suma += x1 * y2 - x2 * y1;
  }
  return Math.abs(suma) / 2;
}

// Área plana en m² para Polygon o MultiPolygon en coordenadas locales en metros (croquis).
// Resta el área de eventuales huecos (anillos interiores) al anillo exterior.
export function calcularAreaPlanaM2(geometria: PoligonoGeoJson | Polygon | MultiPolygon): number {
  if (geometria.type === "Polygon") {
    const [exterior, ...huecos] = geometria.coordinates as Posicion2D[][];
    if (!exterior) return 0;
    const areaExterior = calcularAreaAnilloPlanaM2(exterior);
    const areaHuecos = huecos.reduce((acum, hueco) => acum + calcularAreaAnilloPlanaM2(hueco), 0);
    return Math.max(0, areaExterior - areaHuecos);
  }

  let total = 0;
  for (const poligono of geometria.coordinates) {
    const [exterior, ...huecos] = poligono as Posicion2D[][];
    if (!exterior) continue;
    const areaExterior = calcularAreaAnilloPlanaM2(exterior);
    const areaHuecos = huecos.reduce((acum, hueco) => acum + calcularAreaAnilloPlanaM2(hueco), 0);
    total += Math.max(0, areaExterior - areaHuecos);
  }
  return total;
}

export function calcularAreaPlanaHa(poligono: PoligonoGeoJson): number {
  return metrosCuadradosAHectareas(calcularAreaPlanaM2(poligono));
}

// Área geográfica en m² usando Turf.js sobre coordenadas WGS 84 [lng, lat] (método mapa).
export function calcularAreaGeograficaM2(geometria: PoligonoGeoJson | Polygon | MultiPolygon): number {
  return turfArea(geometria);
}

export function calcularAreaGeograficaHa(poligono: PoligonoGeoJson): number {
  return metrosCuadradosAHectareas(calcularAreaGeograficaM2(poligono));
}

export interface ResultadoSumaSuperficies {
  valida: boolean;
  sumaHa: number;
  excesoHa: number;
  mensaje?: string;
}

// Regla RN-06 y CA-02-08: todas las superficies son mayores que 0 y su suma no puede superar
// la superficie total del establecimiento (con tolerancia de 0,5 % por redondeo del dibujo).
export function validarSumaSuperficies(
  superficieTotalHa: number,
  superficiesSectoresHa: readonly number[],
): ResultadoSumaSuperficies {
  if (!Number.isFinite(superficieTotalHa) || superficieTotalHa <= 0) {
    return {
      valida: false,
      sumaHa: 0,
      excesoHa: 0,
      mensaje: "La superficie total del establecimiento debe ser mayor que 0 ha.",
    };
  }

  for (let i = 0; i < superficiesSectoresHa.length; i += 1) {
    const sup = superficiesSectoresHa[i];
    if (!Number.isFinite(sup) || sup <= 0) {
      return {
        valida: false,
        sumaHa: 0,
        excesoHa: 0,
        mensaje: `El sector ${i + 1} debe tener una superficie mayor que 0 ha.`,
      };
    }
  }

  const sumaExacta = superficiesSectoresHa.reduce((acum, sup) => acum + sup, 0);
  const sumaHa = redondearHectareas(sumaExacta);
  const maximoPermitido = superficieTotalHa * (1 + LIMITES_ESTABLECIMIENTO.toleranciaSumaSectores);

  if (sumaExacta > maximoPermitido) {
    const excesoHa = redondearHectareas(sumaExacta - superficieTotalHa);
    return {
      valida: false,
      sumaHa,
      excesoHa,
      mensaje: `La suma de los sectores (${sumaHa} ha) supera la superficie total (${redondearHectareas(superficieTotalHa)} ha) en ${excesoHa} ha.`,
    };
  }

  return { valida: true, sumaHa, excesoHa: 0 };
}

export interface MetricasEstablecimiento {
  superficieTotalHa: number | null;
  superficieDistribuidaHa: number;
  superficieRestanteHa: number | null;
  superficieFloresHa: number;
  porcentajeFlores: number | null;
  llegaAl20PorCiento: boolean;
}

export interface SectorParaMetricas {
  tipo: TipoSector;
  superficieHa: number;
}

// Métricas informativas de la ficha (sección 4.2 y CA-02-19).
export function calcularMetricasEstablecimiento(
  superficieTotalHa: number | null,
  sectores: readonly SectorParaMetricas[],
): MetricasEstablecimiento {
  const distribuida = redondearHectareas(sectores.reduce((acum, s) => acum + s.superficieHa, 0));
  const flores = redondearHectareas(
    sectores.filter((s) => s.tipo === "sector_flores").reduce((acum, s) => acum + s.superficieHa, 0),
  );

  if (superficieTotalHa === null || superficieTotalHa <= 0) {
    return {
      superficieTotalHa,
      superficieDistribuidaHa: distribuida,
      superficieRestanteHa: null,
      superficieFloresHa: flores,
      porcentajeFlores: null,
      llegaAl20PorCiento: false,
    };
  }

  const restante = redondearHectareas(Math.max(0, superficieTotalHa - distribuida));
  const porcentajeFlores = Math.round((flores / superficieTotalHa) * 100 * 100) / 100;

  return {
    superficieTotalHa: redondearHectareas(superficieTotalHa),
    superficieDistribuidaHa: distribuida,
    superficieRestanteHa: restante,
    superficieFloresHa: flores,
    porcentajeFlores,
    llegaAl20PorCiento: porcentajeFlores >= LIMITES_ESTABLECIMIENTO.objetivoFloresPct,
  };
}
