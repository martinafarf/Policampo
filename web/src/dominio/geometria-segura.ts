// Restar e intersectar polígonos sin que la propuesta se caiga.
//
// @turf/difference y @turf/intersect usan por dentro la librería polyclip-ts. Cuando dos figuras comparten un borde
// o una esquina en puntos casi iguales (diferencias de decimales muy chicas, típicas de un dibujo a mano), esa
// librería a veces falla con errores como «Unable to complete output ring…». No es un error de la persona: depende
// de cómo quedó dibujada la finca.
//
// Estas funciones prueban así:
//   1. La operación normal.
//   2. Si falla, de nuevo con las coordenadas redondeadas (así los puntos casi iguales pasan a ser iguales).
//   3. Si vuelve a fallar, un resultado seguro: al restar, la figura sin cambios; al intersectar, «no se tocan».
// Así una forma puede quedar un poco menos exacta, pero la pantalla nunca muestra el error técnico.
import difference from "@turf/difference";
import { featureCollection } from "@turf/helpers";
import intersect from "@turf/intersect";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

type FiguraPoligonal = Feature<Polygon | MultiPolygon>;

/** Decimales al redondear en el reintento: 7 alcanza para metros (croquis) y para grados (mapa, ~1 cm). */
const DECIMALES_REINTENTO = 7;

function redondearPosiciones(coordenadas: unknown, factor: number): unknown {
  if (Array.isArray(coordenadas) && typeof coordenadas[0] === "number") {
    return (coordenadas as Position).map((n) => Math.round(n * factor) / factor);
  }
  return (coordenadas as unknown[]).map((c) => redondearPosiciones(c, factor));
}

/** La misma figura con las coordenadas redondeadas a `decimales`. */
export function redondearFigura(figura: FiguraPoligonal, decimales = DECIMALES_REINTENTO): FiguraPoligonal {
  const factor = 10 ** decimales;
  return {
    ...figura,
    geometry: {
      ...figura.geometry,
      coordinates: redondearPosiciones(figura.geometry.coordinates, factor),
    } as Polygon | MultiPolygon,
  };
}

/**
 * Lo que queda de `a` después de sacarle `b` (o null si no queda nada).
 * Si la librería falla aun redondeando, devuelve `a` sin cambios; o null («no queda nada») si se pide
 * `siFalla: "nada"`. Por ejemplo, para validar que un sector no sobresale conviene «no sobresale nada»: así un
 * dibujo correcto nunca se rechaza por un problema de decimales.
 */
export function restarSeguro(
  a: FiguraPoligonal,
  b: FiguraPoligonal,
  opciones: { siFalla?: "sin cambios" | "nada" } = {},
): FiguraPoligonal | null {
  try {
    return difference(featureCollection([a, b]));
  } catch {
    try {
      return difference(featureCollection([redondearFigura(a), redondearFigura(b)]));
    } catch {
      return opciones.siFalla === "nada" ? null : a;
    }
  }
}

/**
 * La parte que comparten `a` y `b` (o null si no se tocan).
 * Si la librería falla aun redondeando, devuelve null.
 */
export function intersectarSeguro(a: FiguraPoligonal, b: FiguraPoligonal): FiguraPoligonal | null {
  try {
    return intersect(featureCollection([a, b]));
  } catch {
    try {
      return intersect(featureCollection([redondearFigura(a), redondearFigura(b)]));
    } catch {
      return null;
    }
  }
}
