// Validaciones de geometrías en el servidor para croquis y mapa (RN-05, RS-06, CA-02-10 a 13).
// Funciones puras sin acceso a la base de datos.
import { polygon as turfPolygon } from "@turf/helpers";
import kinks from "@turf/kinks";
import type { MultiPolygon, Polygon } from "geojson";
import { LIMITES_JUJUY } from "@/datos/jujuy";
import { intersectarSeguro, restarSeguro } from "@/dominio/geometria-segura";
import {
  calcularAreaGeograficaHa,
  calcularAreaGeograficaM2,
  calcularAreaPlanaHa,
  calcularAreaPlanaM2,
  calcularLadoCroquisMetros,
  validarSumaSuperficies,
} from "./superficies";
import { LIMITES_ESTABLECIMIENTO, type PoligonoGeoJson, type Posicion2D } from "./tipos";

export type SistemaGeometria = "croquis" | "mapa";

export interface ResultadoValidacion {
  valido: boolean;
  error?: string;
}

// Construye el contorno cuadrado [0, lado] × [0, lado] en metros para el croquis (CA-02-13).
export function crearContornoCroquis(superficieTotalHa: number): PoligonoGeoJson {
  const lado = calcularLadoCroquisMetros(superficieTotalHa);
  return {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [lado, 0],
        [lado, lado],
        [0, lado],
        [0, 0],
      ],
    ],
  };
}

function esPosicionValida(punto: unknown): punto is Posicion2D {
  return (
    Array.isArray(punto) &&
    punto.length >= 2 &&
    typeof punto[0] === "number" &&
    typeof punto[1] === "number" &&
    Number.isFinite(punto[0]) &&
    Number.isFinite(punto[1])
  );
}

function puntosIguales(a: Posicion2D, b: Posicion2D): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

// Valida la estructura GeoJSON Polygon, cantidad de vértices (3 a 500), cierre y ausencia de autointersección.
export function validarPoligonoBasico(
  valor: unknown,
  sistema: SistemaGeometria,
): ResultadoValidacion {
  if (!valor || typeof valor !== "object") {
    return { valido: false, error: "La geometría debe ser un polígono GeoJSON válido." };
  }

  const candidato = valor as Partial<PoligonoGeoJson>;
  if (candidato.type !== "Polygon" || !Array.isArray(candidato.coordinates) || candidato.coordinates.length === 0) {
    return { valido: false, error: "La geometría debe ser un GeoJSON de tipo Polygon." };
  }

  // En esta versión los sectores y contornos son polígonos simples (un único anillo exterior).
  if (candidato.coordinates.length !== 1 || !Array.isArray(candidato.coordinates[0])) {
    return { valido: false, error: "El polígono debe tener un único anillo exterior sin huecos." };
  }

  const anillo = candidato.coordinates[0];
  if (anillo.length < LIMITES_ESTABLECIMIENTO.minVerticesPoligono + 1) {
    return {
      valido: false,
      error: `El polígono debe tener al menos ${LIMITES_ESTABLECIMIENTO.minVerticesPoligono} vértices.`,
    };
  }

  for (const punto of anillo) {
    if (!esPosicionValida(punto)) {
      return { valido: false, error: "El polígono contiene coordenadas inválidas." };
    }
  }

  const primero = anillo[0];
  const ultimo = anillo[anillo.length - 1];
  if (!puntosIguales(primero, ultimo)) {
    return { valido: false, error: "El polígono debe estar cerrado (el último punto debe coincidir con el primero)." };
  }

  const cantidadVertices = anillo.length - 1;
  if (cantidadVertices > LIMITES_ESTABLECIMIENTO.maxVerticesPoligono) {
    return {
      valido: false,
      error: `El polígono supera el máximo de ${LIMITES_ESTABLECIMIENTO.maxVerticesPoligono} vértices.`,
    };
  }

  const poligono = candidato as PoligonoGeoJson;
  const autointersecciones = kinks(turfPolygon(poligono.coordinates));
  if (autointersecciones.features.length > 0) {
    return { valido: false, error: "El polígono se cruza consigo mismo." };
  }

  const areaM2 =
    sistema === "mapa" ? calcularAreaGeograficaM2(poligono) : calcularAreaPlanaM2(poligono);
  if (areaM2 <= 0) {
    return { valido: false, error: "El polígono tiene superficie nula." };
  }

  return { valido: true };
}

// Verifica que todas las coordenadas [lng, lat] caigan dentro de Jujuy con margen (Esp. 02, 4.3).
export function validarCoordenadasEnJujuy(poligono: PoligonoGeoJson): ResultadoValidacion {
  for (const anillo of poligono.coordinates) {
    for (const [lng, lat] of anillo) {
      if (
        lat < LIMITES_JUJUY.latMin ||
        lat > LIMITES_JUJUY.latMax ||
        lng < LIMITES_JUJUY.lngMin ||
        lng > LIMITES_JUJUY.lngMax
      ) {
        return {
          valido: false,
          error: "Las coordenadas del polígono están fuera de la provincia de Jujuy.",
        };
      }
    }
  }
  return { valido: true };
}

function calcularAreaM2SegunSistema(
  geometria: PoligonoGeoJson | Polygon | MultiPolygon,
  sistema: SistemaGeometria,
): number {
  return sistema === "mapa" ? calcularAreaGeograficaM2(geometria) : calcularAreaPlanaM2(geometria);
}

// Verifica que un sector esté contenido dentro del contorno del terreno (tolerancia 1 % de su superficie).
export function validarSectorDentroDelContorno(
  sectorPoligono: PoligonoGeoJson,
  contornoPoligono: PoligonoGeoJson,
  sistema: SistemaGeometria,
): ResultadoValidacion {
  const areaSector = calcularAreaM2SegunSistema(sectorPoligono, sistema);
  if (areaSector <= 0) {
    return { valido: false, error: "El sector tiene superficie nula." };
  }

  // Resta segura: si la librería de polígonos falla por decimales, se toma «no sobresale nada»
  // (un dibujo correcto nunca se rechaza por eso).
  const parteFuera = restarSeguro(
    turfPolygon(sectorPoligono.coordinates),
    turfPolygon(contornoPoligono.coordinates),
    { siFalla: "nada" },
  );

  if (!parteFuera) {
    return { valido: true };
  }

  const areaFuera = calcularAreaM2SegunSistema(parteFuera.geometry, sistema);
  const proporcionFuera = areaFuera / areaSector;

  if (proporcionFuera > LIMITES_ESTABLECIMIENTO.toleranciaGeometria) {
    return {
      valido: false,
      error: "El sector sobresale del contorno del establecimiento.",
    };
  }

  return { valido: true };
}

// Verifica que ningún par de sectores se superponga en más del 1 % de la superficie del sector más chico.
export function validarSectoresSinSuperposicion(
  sectores: readonly PoligonoGeoJson[],
  sistema: SistemaGeometria,
): ResultadoValidacion {
  const areas = sectores.map((poligono) => calcularAreaM2SegunSistema(poligono, sistema));

  for (let i = 0; i < sectores.length; i += 1) {
    for (let j = i + 1; j < sectores.length; j += 1) {
      // Intersección segura: si la librería falla por decimales, se toma «no se superponen»
      const superposicion = intersectarSeguro(
        turfPolygon(sectores[i].coordinates),
        turfPolygon(sectores[j].coordinates),
      );

      if (!superposicion) continue;

      const areaSuperpuesta = calcularAreaM2SegunSistema(superposicion.geometry, sistema);
      const areaReferencia = Math.min(areas[i], areas[j]);

      if (areaReferencia > 0 && areaSuperpuesta / areaReferencia > LIMITES_ESTABLECIMIENTO.toleranciaGeometria) {
        return {
          valido: false,
          error: `Los sectores ${i + 1} y ${j + 1} se superponen entre sí.`,
        };
      }
    }
  }

  return { valido: true };
}

export interface EntradaSectorConDibujo {
  geometria: unknown;
  // Si el navegador envía una superficie, el servidor la ignora y la recalcula (RN-05, CA-02-10).
  superficieHaIgnorada?: number;
}

export interface EntradaValidacionDibujo {
  metodo: SistemaGeometria;
  // Obligatoria en croquis; ignorada y recalculada desde "contorno" en mapa.
  superficieTotalHa?: number | null;
  // Obligatorio en mapa; en croquis se construye automáticamente como cuadrado a escala.
  contorno?: unknown;
  sectores: readonly EntradaSectorConDibujo[];
}

export interface ResultadoValidacionDibujo {
  valido: boolean;
  errores: string[];
  superficieTotalHa?: number;
  contornoValidado?: PoligonoGeoJson;
  sectoresCalculados?: {
    geometria: PoligonoGeoJson;
    superficieHa: number;
  }[];
}

// Validación completa del lado del servidor para guardar sectores en croquis o mapa.
// Recalcula todas las superficies desde las geometrías (RN-05, CA-02-10, 11, 12, 13).
export function validarYRecalcularDibujo(entrada: EntradaValidacionDibujo): ResultadoValidacionDibujo {
  const errores: string[] = [];

  if (entrada.sectores.length > LIMITES_ESTABLECIMIENTO.maxSectores) {
    errores.push(`No se pueden guardar más de ${LIMITES_ESTABLECIMIENTO.maxSectores} sectores por establecimiento.`);
    return { valido: false, errores };
  }

  let contornoValidado: PoligonoGeoJson;
  let superficieTotalCalculadaHa: number;

  if (entrada.metodo === "mapa") {
    const validacionContorno = validarPoligonoBasico(entrada.contorno, "mapa");
    if (!validacionContorno.valido) {
      errores.push(`Contorno del terreno: ${validacionContorno.error}`);
      return { valido: false, errores };
    }
    contornoValidado = entrada.contorno as PoligonoGeoJson;

    const validacionJujuy = validarCoordenadasEnJujuy(contornoValidado);
    if (!validacionJujuy.valido) {
      errores.push(`Contorno del terreno: ${validacionJujuy.error}`);
      return { valido: false, errores };
    }

    superficieTotalCalculadaHa = calcularAreaGeograficaHa(contornoValidado);
    if (superficieTotalCalculadaHa <= 0) {
      errores.push("El contorno dibujado tiene superficie nula.");
      return { valido: false, errores };
    }
  } else {
    const sup = entrada.superficieTotalHa;
    if (
      sup === null ||
      sup === undefined ||
      !Number.isFinite(sup) ||
      sup < LIMITES_ESTABLECIMIENTO.superficieMinHa ||
      sup > LIMITES_ESTABLECIMIENTO.superficieMaxHa
    ) {
      errores.push(
        `La superficie total debe estar entre ${LIMITES_ESTABLECIMIENTO.superficieMinHa} y ${LIMITES_ESTABLECIMIENTO.superficieMaxHa} ha.`,
      );
      return { valido: false, errores };
    }
    superficieTotalCalculadaHa = sup;
    contornoValidado = crearContornoCroquis(sup);
  }

  const poligonosSectores: PoligonoGeoJson[] = [];
  const sectoresCalculados: { geometria: PoligonoGeoJson; superficieHa: number }[] = [];

  for (let i = 0; i < entrada.sectores.length; i += 1) {
    const sector = entrada.sectores[i];
    const numero = i + 1;

    const validacionBasica = validarPoligonoBasico(sector.geometria, entrada.metodo);
    if (!validacionBasica.valido) {
      errores.push(`Sector ${numero}: ${validacionBasica.error}`);
      continue;
    }

    const poligono = sector.geometria as PoligonoGeoJson;

    if (entrada.metodo === "mapa") {
      const enJujuy = validarCoordenadasEnJujuy(poligono);
      if (!enJujuy.valido) {
        errores.push(`Sector ${numero}: ${enJujuy.error}`);
        continue;
      }
    }

    const dentro = validarSectorDentroDelContorno(poligono, contornoValidado, entrada.metodo);
    if (!dentro.valido) {
      errores.push(`Sector ${numero}: ${dentro.error}`);
      continue;
    }

    const superficieHa =
      entrada.metodo === "mapa" ? calcularAreaGeograficaHa(poligono) : calcularAreaPlanaHa(poligono);

    if (superficieHa <= 0) {
      errores.push(`Sector ${numero}: la superficie calculada debe ser mayor que 0 ha.`);
      continue;
    }

    poligonosSectores.push(poligono);
    sectoresCalculados.push({ geometria: poligono, superficieHa });
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  const sinSuperposicion = validarSectoresSinSuperposicion(poligonosSectores, entrada.metodo);
  if (!sinSuperposicion.valido && sinSuperposicion.error) {
    errores.push(sinSuperposicion.error);
    return { valido: false, errores };
  }

  const suma = validarSumaSuperficies(
    superficieTotalCalculadaHa,
    sectoresCalculados.map((s) => s.superficieHa),
  );
  if (!suma.valida && suma.mensaje) {
    errores.push(suma.mensaje);
    return { valido: false, errores };
  }

  return {
    valido: true,
    errores: [],
    superficieTotalHa: superficieTotalCalculadaHa,
    contornoValidado,
    sectoresCalculados,
  };
}
