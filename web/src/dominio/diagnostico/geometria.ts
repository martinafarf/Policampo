// Cálculos geométricos del diagnóstico: perímetro del contorno y superficie libre (Esp. 04, 4.4).
// Reutiliza @turf/difference y las funciones de superficie del módulo 02 (CA-04-03, CA-04-04).
import difference from "@turf/difference";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  calcularAreaGeograficaM2,
  calcularAreaPlanaM2,
  calcularLadoCroquisMetros,
  crearContornoCroquis,
  metrosCuadradosAHectareas,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";
import type { GeometriaLibreGeoJson } from "./tipos";

// Radio medio terrestre estándar usado por Turf.js (metros).
const RADIO_TIERRA_METROS = 6_371_008.8;

function gradosARadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// Distancia geodésica (Haversine) entre dos posiciones [lng, lat] en metros.
function distanciaGeodesicaMetros(a: Posicion2D, b: Posicion2D): number {
  const dLat = gradosARadianes(b[1] - a[1]);
  const dLng = gradosARadianes(b[0] - a[0]);
  const lat1 = gradosARadianes(a[1]);
  const lat2 = gradosARadianes(b[1]);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * RADIO_TIERRA_METROS * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

// Perímetro plano en metros para un anillo en coordenadas locales [x, y] (croquis).
export function calcularPerimetroPlanoMetros(poligono: PoligonoGeoJson): number {
  const anillo = poligono.coordinates[0];
  if (!anillo || anillo.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    const dx = anillo[i + 1][0] - anillo[i][0];
    const dy = anillo[i + 1][1] - anillo[i][1];
    total += Math.hypot(dx, dy);
  }
  return total;
}

// Perímetro geodésico en metros para un polígono WGS 84 [lng, lat] (mapa).
export function calcularPerimetroGeodesicoMetros(poligono: PoligonoGeoJson): number {
  const anillo = poligono.coordinates[0];
  if (!anillo || anillo.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    total += distanciaGeodesicaMetros(anillo[i], anillo[i + 1]);
  }
  return total;
}

// Calcula el perímetro del contorno en metros según el método (croquis o mapa).
export function calcularPerimetroContornoMetros(params: {
  metodo: "croquis" | "mapa";
  superficieTotalHa: number;
  contorno?: PoligonoGeoJson | null;
}): number | null {
  if (params.metodo === "croquis") {
    if (params.contorno) {
      return calcularPerimetroPlanoMetros(params.contorno);
    }
    return 4 * calcularLadoCroquisMetros(params.superficieTotalHa);
  }

  if (!params.contorno) return null;
  return calcularPerimetroGeodesicoMetros(params.contorno);
}

// Calcula la superficie libre: contorno menos la unión de todos los sectores dibujados (CA-04-04).
export function calcularSuperficieLibre(params: {
  metodo: "croquis" | "mapa";
  superficieTotalHa: number;
  contorno?: PoligonoGeoJson | null;
  geometriasSectores: readonly PoligonoGeoJson[];
}): { geometria: GeometriaLibreGeoJson | null; superficieHa: number | null } {
  const contornoEfectivo =
    params.contorno ??
    (params.metodo === "croquis" ? crearContornoCroquis(params.superficieTotalHa) : null);

  if (!contornoEfectivo) {
    return { geometria: null, superficieHa: null };
  }

  let restante: Feature<Polygon | MultiPolygon> | null = turfPolygon(contornoEfectivo.coordinates);

  for (const sectorGeo of params.geometriasSectores) {
    if (!restante) break;
    const poligonoSector = turfPolygon(sectorGeo.coordinates);
    restante = difference(featureCollection([restante, poligonoSector]));
  }

  if (!restante) {
    return { geometria: null, superficieHa: 0 };
  }

  const areaM2 =
    params.metodo === "mapa"
      ? calcularAreaGeograficaM2(restante.geometry)
      : calcularAreaPlanaM2(restante.geometry);

  const superficieHa = metrosCuadradosAHectareas(areaM2);
  if (superficieHa <= 0) {
    return { geometria: null, superficieHa: 0 };
  }

  return {
    geometria: restante.geometry,
    superficieHa,
  };
}
