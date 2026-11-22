// Motor espacial puro para propuestas de rediseño (Esp. 05, §4, CA-05-01 a 05, 08, 09).
// Genera las 5 disposiciones (superficie libre, perimetral, transversales, islas y matriz)
// tanto para croquis (metros) como para mapa (WGS 84), con tope de 50 iteraciones y 10 s (auditoría B-01).
import difference from "@turf/difference";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import intersect from "@turf/intersect";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import {
  calcularPerimetroGeodesicoMetros,
  calcularPerimetroPlanoMetros,
  calcularSuperficieLibre,
} from "@/dominio/diagnostico/geometria";
import {
  calcularAreaGeograficaM2,
  calcularAreaPlanaM2,
  metrosCuadradosAHectareas,
  redondearHectareas,
  validarCoordenadasEnJujuy,
  validarPoligonoBasico,
  validarSectorDentroDelContorno,
  validarSectoresSinSuperposicion,
  type PoligonoGeoJson,
  type Posicion2D,
  type SistemaGeometria,
} from "@/dominio/establecimientos";
import {
  ETIQUETAS_DISPOSICION,
  LIMITES_PROPUESTA,
  type AlternativaEspacial,
  type AvisoPropuesta,
  type DisposicionPropuesta,
  type EntradaEspacialPropuesta,
  type FranjaPropuesta,
  type GeometriaFranja,
  type ParametrosDisposicion,
  type PerdidaCultivoItem,
  type SectorEspacialEntrada,
} from "./tipos";

const M2_POR_HA = 10_000;
const METROS_POR_GRADO_LAT = 111_132.95;
const METROS_POR_GRADO_LNG_ECUADOR = 111_319.49;

export function validarObjetivoPct(objetivoPct: number): { valido: boolean; error?: string } {
  if (
    !Number.isFinite(objetivoPct) ||
    objetivoPct < LIMITES_PROPUESTA.objetivoMinPct ||
    objetivoPct > LIMITES_PROPUESTA.objetivoMaxPct
  ) {
    return {
      valido: false,
      error: `El objetivo debe estar entre ${LIMITES_PROPUESTA.objetivoMinPct} % y ${LIMITES_PROPUESTA.objetivoMaxPct} %.`,
    };
  }
  return { valido: true };
}

export function calcularSuperficieAAgregarHa(
  superficieTotalHa: number,
  superficieFloresActualHa: number,
  objetivoPct: number,
): number {
  const objetivoHa = (superficieTotalHa * objetivoPct) / 100;
  return redondearHectareas(Math.max(0, objetivoHa - superficieFloresActualHa));
}

// --- Proyección local en metros para operar igual en croquis y mapa ---

interface ProyeccionMetros {
  aMetros(p: Posicion2D): Posicion2D;
  aSistema(p: Posicion2D): Posicion2D;
}

function crearProyeccion(contorno: PoligonoGeoJson, sistema: SistemaGeometria): ProyeccionMetros {
  if (sistema === "croquis") {
    return {
      aMetros: (p) => [p[0], p[1]],
      aSistema: (p) => [p[0], p[1]],
    };
  }

  const anillo = contorno.coordinates[0] ?? [];
  const n = Math.max(1, anillo.length - 1);
  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < n; i += 1) {
    sumLng += anillo[i][0];
    sumLat += anillo[i][1];
  }
  const lng0 = sumLng / n;
  const lat0 = sumLat / n;
  const mPerLng = METROS_POR_GRADO_LNG_ECUADOR * Math.cos((lat0 * Math.PI) / 180);

  return {
    aMetros: ([lng, lat]) => [(lng - lng0) * mPerLng, (lat - lat0) * METROS_POR_GRADO_LAT],
    aSistema: ([x, y]) => [lng0 + x / mPerLng, lat0 + y / METROS_POR_GRADO_LAT],
  };
}

function proyectarAnillo(
  anillo: readonly Posicion2D[],
  fn: (p: Posicion2D) => Posicion2D,
): Posicion2D[] {
  return anillo.map(fn);
}

function proyectarGeometria(
  geo: GeometriaFranja,
  fn: (p: Posicion2D) => Posicion2D,
): GeometriaFranja {
  if (geo.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geo.coordinates.map((anillo) => proyectarAnillo(anillo as Posicion2D[], fn)),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geo.coordinates.map((poli) =>
      poli.map((anillo) => proyectarAnillo(anillo as Posicion2D[], fn)),
    ),
  };
}

function featureDesdeGeometria(geo: GeometriaFranja): Feature<Polygon | MultiPolygon> {
  return { type: "Feature", properties: {}, geometry: geo };
}

function areaM2(geo: GeometriaFranja, sistema: SistemaGeometria): number {
  return sistema === "mapa" ? calcularAreaGeograficaM2(geo) : calcularAreaPlanaM2(geo);
}

function perimetroGeometriaM(geo: GeometriaFranja, sistema: SistemaGeometria): number {
  const perimAnillo = (anillo: Posicion2D[]) => {
    const poli: PoligonoGeoJson = { type: "Polygon", coordinates: [anillo] };
    return sistema === "mapa"
      ? calcularPerimetroGeodesicoMetros(poli)
      : calcularPerimetroPlanoMetros(poli);
  };

  if (geo.type === "Polygon") {
    return geo.coordinates.reduce(
      (acc, anillo) => acc + perimAnillo(anillo as Posicion2D[]),
      0,
    );
  }
  let total = 0;
  for (const poli of geo.coordinates) {
    for (const anillo of poli) {
      total += perimAnillo(anillo as Posicion2D[]);
    }
  }
  return total;
}

function bboxAnillo(anillo: readonly Posicion2D[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of anillo) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function centroideAnillo(anillo: readonly Posicion2D[]): Posicion2D {
  const n = Math.max(1, anillo.length - 1);
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += anillo[i][0];
    sy += anillo[i][1];
  }
  return [sx / n, sy / n];
}

function rotarPunto(p: Posicion2D, centro: Posicion2D, grados: number): Posicion2D {
  const rad = (grados * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p[0] - centro[0];
  const dy = p[1] - centro[1];
  return [centro[0] + dx * cos - dy * sin, centro[1] + dx * sin + dy * cos];
}

function rectanguloGeo(x1: number, y1: number, x2: number, y2: number): PoligonoGeoJson {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
      ],
    ],
  };
}

function areaConSignoAnillo(anillo: readonly Posicion2D[]): number {
  let suma = 0;
  for (let i = 0; i < anillo.length - 1; i += 1) {
    suma += anillo[i][0] * anillo[i + 1][1] - anillo[i + 1][0] * anillo[i][1];
  }
  return suma / 2;
}

// Contrae un polígono plano en metros desplazando cada arista hacia adentro en `distanciaM`.
// Exacto en cuadrados/rectángulos y polígonos convexos (CA-05-05); cae a escala segura en casos cóncavos complejos.
function contraerPoligonoMetros(
  contornoMetros: PoligonoGeoJson,
  distanciaM: number,
): PoligonoGeoJson | null {
  if (distanciaM <= 0) return contornoMetros;
  const anillo = contornoMetros.coordinates[0];
  if (!anillo || anillo.length < 4) return null;

  const n = anillo.length - 1;
  const ccw = areaConSignoAnillo(anillo) >= 0;

  // Líneas desplazadas hacia adentro: punto + dirección unitaria
  const lineas: { p: Posicion2D; d: Posicion2D }[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = anillo[i];
    const b = anillo[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const largo = Math.hypot(dx, dy);
    if (largo < 1e-6) continue;
    // Normal interior: para CCW (-dy, dx)/L; para CW (dy, -dx)/L.
    const nx = ccw ? -dy / largo : dy / largo;
    const ny = ccw ? dx / largo : -dx / largo;
    lineas.push({
      p: [a[0] + nx * distanciaM, a[1] + ny * distanciaM],
      d: [dx / largo, dy / largo],
    });
  }

  if (lineas.length < 3) return null;

  const vertices: Posicion2D[] = [];
  for (let i = 0; i < lineas.length; i += 1) {
    const l1 = lineas[i];
    const l2 = lineas[(i + 1) % lineas.length];
    const denom = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0];
    if (Math.abs(denom) < 1e-6) {
      vertices.push(l2.p);
    } else {
      const rx = l2.p[0] - l1.p[0];
      const ry = l2.p[1] - l1.p[1];
      const t = (rx * l2.d[1] - ry * l2.d[0]) / denom;
      vertices.push([l1.p[0] + t * l1.d[0], l1.p[1] + t * l1.d[1]]);
    }
  }
  vertices.push([vertices[0][0], vertices[0][1]]);

  const candidato: PoligonoGeoJson = { type: "Polygon", coordinates: [vertices] };
  const areaOrig = calcularAreaPlanaM2(contornoMetros);
  const areaCand = calcularAreaPlanaM2(candidato);
  const signoOrig = areaConSignoAnillo(anillo) >= 0;
  const signoCand = areaConSignoAnillo(vertices) >= 0;

  if (
    areaCand > 1 &&
    areaCand < areaOrig &&
    signoCand === signoOrig &&
    validarPoligonoBasico(candidato, "croquis").valido
  ) {
    const fuera = difference(
      featureCollection([turfPolygon(candidato.coordinates), turfPolygon(contornoMetros.coordinates)]),
    );
    const areaFuera = fuera ? calcularAreaPlanaM2(fuera.geometry) : 0;
    if (areaFuera / areaCand <= 0.01) {
      return candidato;
    }
  }

  // Fallback para polígonos muy cóncavos: escalar respecto del centroide y recortar con el contorno.
  const box = bboxAnillo(anillo);
  const dimMin = Math.max(1, Math.min(box.maxX - box.minX, box.maxY - box.minY));
  const escala = 1 - (2 * distanciaM) / dimMin;
  if (escala <= 0.05) return null;

  const centro = centroideAnillo(anillo);
  const escaladoAnillo: Posicion2D[] = anillo.map(([x, y]) => [
    centro[0] + (x - centro[0]) * escala,
    centro[1] + (y - centro[1]) * escala,
  ]);
  const escalado: PoligonoGeoJson = { type: "Polygon", coordinates: [escaladoAnillo] };
  const inter = intersect(
    featureCollection([turfPolygon(contornoMetros.coordinates), turfPolygon(escalado.coordinates)]),
  );
  if (!inter || inter.geometry.type !== "Polygon") return null;
  return inter.geometry as PoligonoGeoJson;
}

// Resta los sectores de flores existentes a una lista de geometrías de franjas para obtener la superficie NUEVA (§4.2).
function calcularAreaNuevaFloresM2(
  franjas: readonly GeometriaFranja[],
  sectoresFlores: readonly PoligonoGeoJson[],
  sistema: SistemaGeometria,
): number {
  let totalM2 = 0;
  for (const franja of franjas) {
    let restante: Feature<Polygon | MultiPolygon> | null = featureDesdeGeometria(franja);
    for (const flor of sectoresFlores) {
      if (!restante) break;
      restante = difference(featureCollection([restante, turfPolygon(flor.coordinates)]));
    }
    if (restante) {
      totalM2 += areaM2(restante.geometry, sistema);
    }
  }
  return totalM2;
}

// Calcula la pérdida por cada sector de cultivo bajo las franjas propuestas (CA-05-04).
export function calcularPerdidaPorCultivo(
  franjas: readonly GeometriaFranja[],
  sectoresCultivo: readonly SectorEspacialEntrada[],
  sistema: SistemaGeometria,
): { items: PerdidaCultivoItem[]; totalHa: number } {
  const items: PerdidaCultivoItem[] = [];
  let totalHa = 0;

  for (const sector of sectoresCultivo) {
    const areaSectorM2 = areaM2(sector.geometria, sistema);
    if (areaSectorM2 <= 0) continue;

    // Restamos las franjas al sector para evitar contar dos veces si hubiese franjas adyacentes.
    let remanente: Feature<Polygon | MultiPolygon> | null = turfPolygon(sector.geometria.coordinates);
    for (const franja of franjas) {
      if (!remanente) break;
      remanente = difference(featureCollection([remanente, featureDesdeGeometria(franja)]));
    }

    const areaRemanenteM2 = remanente ? areaM2(remanente.geometry, sistema) : 0;
    const perdidaM2 = Math.max(0, areaSectorM2 - areaRemanenteM2);
    const perdidaHa = metrosCuadradosAHectareas(perdidaM2);

    if (perdidaHa > 0) {
      const pct = Math.min(100, Math.round((perdidaM2 / areaSectorM2) * 1000) / 10);
      totalHa = redondearHectareas(totalHa + perdidaHa);
      items.push({
        sectorId: sector.id,
        sector: sector.nombre,
        cultivo: sector.cultivoNombre ?? sector.nombre,
        ha: perdidaHa,
        pct,
      });
    }
  }

  return { items, totalHa };
}

// --- Generadores de cada disposición en metros locales ---

function construirFranjaPerimetralMetros(
  contornoMetros: PoligonoGeoJson,
  anchoM: number,
): { franja: GeometriaFranja; inner: PoligonoGeoJson } | null {
  const inner = contraerPoligonoMetros(contornoMetros, anchoM);
  if (!inner) return null;
  const diff = difference(
    featureCollection([turfPolygon(contornoMetros.coordinates), turfPolygon(inner.coordinates)]),
  );
  if (!diff || calcularAreaPlanaM2(diff.geometry) <= 1) return null;
  return { franja: diff.geometry, inner };
}

function construirTransversalesMetros(
  poligonoMetros: PoligonoGeoJson,
  cantidadCorredores: number,
  anguloGrados: number,
  anchoM: number,
): GeometriaFranja[] {
  const centro = centroideAnillo(poligonoMetros.coordinates[0]);
  const rotado: PoligonoGeoJson =
    anguloGrados !== 0
      ? {
          type: "Polygon",
          coordinates: [
            poligonoMetros.coordinates[0].map((p) => rotarPunto(p, centro, -anguloGrados)),
          ],
        }
      : poligonoMetros;

  const box = bboxAnillo(rotado.coordinates[0]);
  const anchoTotal = box.maxX - box.minX;
  const margenY = (box.maxY - box.minY) * 0.1 + 10;
  const paso = anchoTotal / cantidadCorredores;
  const poligonoRotadoFeat = turfPolygon(rotado.coordinates);

  const resultado: GeometriaFranja[] = [];
  for (let i = 0; i < cantidadCorredores; i += 1) {
    const cx = box.minX + (i + 0.5) * paso;
    const x1 = cx - anchoM / 2;
    const x2 = cx + anchoM / 2;
    const banda = rectanguloGeo(x1, box.minY - margenY, x2, box.maxY + margenY);
    const inter = intersect(featureCollection([poligonoRotadoFeat, turfPolygon(banda.coordinates)]));
    if (!inter || calcularAreaPlanaM2(inter.geometry) <= 1) continue;

    const devuelta =
      anguloGrados !== 0
        ? proyectarGeometria(inter.geometry, (p) => rotarPunto(p, centro, anguloGrados))
        : inter.geometry;
    resultado.push(devuelta);
  }
  return resultado;
}

function construirIslasMetros(
  contornoMetros: PoligonoGeoJson,
  cantidadIslas: number,
  escala: number,
): GeometriaFranja[] {
  const box = bboxAnillo(contornoMetros.coordinates[0]);
  const ancho = Math.max(1, box.maxX - box.minX);
  const alto = Math.max(1, box.maxY - box.minY);

  // Grilla con cantidad de celdas >= cantidadIslas siguiendo la relación de aspecto.
  const cols = Math.max(1, Math.ceil(Math.sqrt(cantidadIslas * (ancho / alto))));
  const rows = Math.max(1, Math.ceil(cantidadIslas / cols));
  const stepX = ancho / cols;
  const stepY = alto / rows;
  const contornoFeat = turfPolygon(contornoMetros.coordinates);

  const celdas: { geo: Polygon; area: number }[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x1 = box.minX + c * stepX;
      const y1 = box.minY + r * stepY;
      const celda = rectanguloGeo(x1, y1, x1 + stepX, y1 + stepY);
      const inter = intersect(featureCollection([contornoFeat, turfPolygon(celda.coordinates)]));
      if (inter && inter.geometry.type === "Polygon") {
        const a = calcularAreaPlanaM2(inter.geometry);
        if (a > 10) celdas.push({ geo: inter.geometry, area: a });
      }
    }
  }

  celdas.sort((a, b) => b.area - a.area);
  const elegidas = celdas.slice(0, cantidadIslas);

  const islas: GeometriaFranja[] = [];
  for (const celda of elegidas) {
    const anillo = celda.geo.coordinates[0] as Posicion2D[];
    const centro = centroideAnillo(anillo);
    const escalado: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        anillo.map(([x, y]) => [
          centro[0] + (x - centro[0]) * escala,
          centro[1] + (y - centro[1]) * escala,
        ]),
      ],
    };
    const segura = intersect(featureCollection([contornoFeat, turfPolygon(escalado.coordinates)]));
    if (segura && calcularAreaPlanaM2(segura.geometry) > 4) {
      islas.push(segura.geometry);
    }
  }
  return islas;
}

function verificarDeadline(inicioMs: number, limiteMs: number) {
  if (Date.now() - inicioMs > limiteMs) {
    throw new Error("No se pudo generar la propuesta; probá con menos franjas o corredores.");
  }
}

function empaquetarAlternativa(params: {
  disposicion: Exclude<DisposicionPropuesta, "texto">;
  parametros: ParametrosDisposicion;
  franjas: FranjaPropuesta[];
  anchoResultanteM: number | null;
  entrada: EntradaEspacialPropuesta;
  areaAAgregarM2: number;
  sectoresCultivo: readonly SectorEspacialEntrada[];
  sectoresFlores: readonly PoligonoGeoJson[];
}): AlternativaEspacial {
  const { entrada, franjas, sectoresCultivo, sectoresFlores, areaAAgregarM2 } = params;
  const geos = franjas.map((f) => f.geometria);

  const supFranjasM2 = geos.reduce((acc, g) => acc + areaM2(g, entrada.metodo), 0);
  const supNuevaM2 = calcularAreaNuevaFloresM2(geos, sectoresFlores, entrada.metodo);
  const perimetroM = geos.reduce((acc, g) => acc + perimetroGeometriaM(g, entrada.metodo), 0);
  const perdidas = calcularPerdidaPorCultivo(geos, sectoresCultivo, entrada.metodo);

  const superficieFranjasHa = metrosCuadradosAHectareas(supFranjasM2);
  const superficieNuevaFloresHa = metrosCuadradosAHectareas(supNuevaM2);
  const superficieLibreUsadaHa = redondearHectareas(
    Math.max(0, superficieNuevaFloresHa - perdidas.totalHa),
  );
  const porcentajeLogrado =
    entrada.superficieTotalHa > 0
      ? Math.round(
          ((entrada.superficieFloresActualHa + superficieNuevaFloresHa) /
            entrada.superficieTotalHa) *
            1000,
        ) / 10
      : 0;

  const llegaAlObjetivo =
    areaAAgregarM2 <= 0 || supNuevaM2 >= areaAAgregarM2 * (1 - LIMITES_PROPUESTA.toleranciaSuperficie);

  const anchoRedondeado =
    params.anchoResultanteM !== null ? Math.round(params.anchoResultanteM * 10) / 10 : null;
  const anchoFueraDeRango =
    anchoRedondeado !== null &&
    (anchoRedondeado < LIMITES_PROPUESTA.anchoMinM ||
      anchoRedondeado > LIMITES_PROPUESTA.anchoMaxM);

  const avisos: AvisoPropuesta[] = [];
  if (entrada.objetivoPct < LIMITES_PROPUESTA.objetivoRecomendadoPct) {
    avisos.push({
      codigo: "objetivo_bajo_20",
      mensaje: `El objetivo (${entrada.objetivoPct.toLocaleString("es-AR")} %) está por debajo del 20 % recomendado (RN-01).`,
    });
  }
  if (!llegaAlObjetivo) {
    avisos.push({
      codigo: "no_llega_objetivo",
      mensaje: `Esta disposición alcanza ${porcentajeLogrado.toLocaleString("es-AR")} % y no llega al objetivo del ${entrada.objetivoPct.toLocaleString("es-AR")} %.`,
    });
  }
  if (anchoFueraDeRango && anchoRedondeado !== null) {
    avisos.push({
      codigo: "ancho_fuera_rango",
      mensaje:
        anchoRedondeado < LIMITES_PROPUESTA.anchoMinM
          ? `El ancho resultante (${anchoRedondeado.toLocaleString("es-AR")} m) está por debajo del mínimo recomendado de ${LIMITES_PROPUESTA.anchoMinM} m.`
          : `El ancho resultante (${anchoRedondeado.toLocaleString("es-AR")} m) supera el máximo recomendado de ${LIMITES_PROPUESTA.anchoMaxM} m.`,
    });
  }

  return {
    disposicion: params.disposicion,
    titulo: ETIQUETAS_DISPOSICION[params.disposicion],
    parametros: { ...params.parametros, anchoResultanteM: anchoRedondeado },
    franjas,
    superficieFranjasHa,
    superficieNuevaFloresHa,
    superficieLibreUsadaHa,
    porcentajeLogrado,
    anchoResultanteM: anchoRedondeado,
    perimetroFranjasM: Math.round(perimetroM * 10) / 10,
    perdidaPorCultivo: perdidas.items,
    perdidaTotalCultivoHa: perdidas.totalHa,
    llegaAlObjetivo,
    anchoFueraDeRango,
    avisos,
  };
}

// Genera una disposición puntual con parámetros elegibles (usado tanto para comparar como al ajustar parámetros).
export function generarUnaDisposicionEspacial(
  entrada: EntradaEspacialPropuesta,
  disposicion: Exclude<DisposicionPropuesta, "texto">,
  parametros: ParametrosDisposicion = {},
): AlternativaEspacial | null {
  const inicioMs = Date.now();
  const limiteMs = entrada.tiempoLimiteMs ?? LIMITES_PROPUESTA.maxTiempoCalculoMs;

  const sectoresCultivo = entrada.sectores.filter((s) => s.tipo === "cultivo");
  const sectoresFlores = entrada.sectores
    .filter((s) => s.tipo === "sector_flores")
    .map((s) => s.geometria);

  const aAgregarHa = calcularSuperficieAAgregarHa(
    entrada.superficieTotalHa,
    entrada.superficieFloresActualHa,
    entrada.objetivoPct,
  );
  const areaAAgregarM2 = aAgregarHa * M2_POR_HA;

  // CA-05-01: si la finca ya llega al objetivo, no se generan franjas nuevas.
  if (areaAAgregarM2 <= 0) {
    const alt = empaquetarAlternativa({
      disposicion,
      parametros,
      franjas: [],
      anchoResultanteM: null,
      entrada,
      areaAAgregarM2: 0,
      sectoresCultivo,
      sectoresFlores,
    });
    alt.avisos.push({
      codigo: "ya_alcanza_objetivo",
      mensaje:
        "Tu finca ya alcanza el porcentaje objetivo: no se generan franjas nuevas, solo se recomienda la mezcla de especies.",
    });
    return alt;
  }

  const proy = crearProyeccion(entrada.contorno, entrada.metodo);
  const contornoMetros = proyectarGeometria(entrada.contorno, proy.aMetros) as PoligonoGeoJson;
  const boxM = bboxAnillo(contornoMetros.coordinates[0]);
  const dimMinM = Math.max(1, Math.min(boxM.maxX - boxM.minX, boxM.maxY - boxM.minY));
  const dimMaxM = Math.max(1, Math.max(boxM.maxX - boxM.minX, boxM.maxY - boxM.minY));

  const aSistema = (geos: GeometriaFranja[]) =>
    geos.map((g) => proyectarGeometria(g, proy.aSistema));

  // 1. USAR LA SUPERFICIE LIBRE (solo si alcanza para cubrir lo que falta — §4.2, CA-05-03)
  if (disposicion === "superficie_libre") {
    const libreGeo =
      entrada.superficieLibre ??
      calcularSuperficieLibre({
        metodo: entrada.metodo,
        superficieTotalHa: entrada.superficieTotalHa,
        contorno: entrada.contorno,
        geometriasSectores: entrada.sectores.map((s) => s.geometria),
      }).geometria;

    if (!libreGeo) return null;
    const areaLibreM2 = areaM2(libreGeo, entrada.metodo);
    if (areaLibreM2 < areaAAgregarM2 * (1 - LIMITES_PROPUESTA.toleranciaSuperficie)) {
      return null;
    }

    let elegidaGeo: GeometriaFranja = libreGeo;
    // Si sobra superficie libre, recortamos desde el borde hacia adentro por bisección (§4.2).
    if (areaLibreM2 > areaAAgregarM2 * (1 + LIMITES_PROPUESTA.toleranciaSuperficie)) {
      const libreMetros = proyectarGeometria(libreGeo, proy.aMetros);
      const libreFeat = featureDesdeGeometria(libreMetros);
      let lo = 0.5;
      let hi = dimMaxM / 2;
      let mejorGeo: GeometriaFranja = libreMetros;
      let mejorErr = Math.abs(areaLibreM2 - areaAAgregarM2);

      for (let i = 0; i < LIMITES_PROPUESTA.maxIteracionesBiseccion; i += 1) {
        verificarDeadline(inicioMs, limiteMs);
        const mid = (lo + hi) / 2;
        const perim = construirFranjaPerimetralMetros(contornoMetros, mid);
        let recorte: GeometriaFranja | null = null;
        if (perim) {
          const inter = intersect(featureCollection([libreFeat, featureDesdeGeometria(perim.franja)]));
          if (inter) recorte = inter.geometry;
        }
        const a = recorte ? calcularAreaPlanaM2(recorte) : areaLibreM2;
        const err = Math.abs(a - areaAAgregarM2);
        if (recorte && err < mejorErr) {
          mejorErr = err;
          mejorGeo = recorte;
        }
        if (err <= areaAAgregarM2 * 0.003) break;
        if (a < areaAAgregarM2) lo = mid;
        else hi = mid;
      }
      elegidaGeo = proyectarGeometria(mejorGeo, proy.aSistema);
    }

    return empaquetarAlternativa({
      disposicion: "superficie_libre",
      parametros: {},
      franjas: [
        {
          id: "franja-libre-1",
          etiqueta: "Superficie libre aprovechada",
          subtipo: "superficie_libre",
          geometria: elegidaGeo,
        },
      ],
      anchoResultanteM: null,
      entrada,
      areaAAgregarM2,
      sectoresCultivo,
      sectoresFlores,
    });
  }

  // 2. PERIMETRAL (CA-05-05)
  if (disposicion === "perimetral") {
    let lo = 0.5;
    let hi = Math.max(1, dimMinM * 0.49);
    let mejorFranja: GeometriaFranja | null = null;
    let mejorAncho = 0;
    let mejorErr = Infinity;

    for (let i = 0; i < LIMITES_PROPUESTA.maxIteracionesBiseccion; i += 1) {
      verificarDeadline(inicioMs, limiteMs);
      const mid = (lo + hi) / 2;
      const res = construirFranjaPerimetralMetros(contornoMetros, mid);
      if (!res) {
        hi = mid;
        continue;
      }
      const enSistema = proyectarGeometria(res.franja, proy.aSistema);
      const nuevaM2 = calcularAreaNuevaFloresM2([enSistema], sectoresFlores, entrada.metodo);
      const err = Math.abs(nuevaM2 - areaAAgregarM2);
      if (err < mejorErr) {
        mejorErr = err;
        mejorFranja = enSistema;
        mejorAncho = mid;
      }
      if (err <= areaAAgregarM2 * 0.0002) break;
      if (nuevaM2 < areaAAgregarM2) lo = mid;
      else hi = mid;
    }

    const franjas: FranjaPropuesta[] = mejorFranja
      ? [
          {
            id: "franja-perimetral-1",
            etiqueta: "Cerco perimetral floral",
            subtipo: "perimetral",
            geometria: mejorFranja,
          },
        ]
      : [];

    return empaquetarAlternativa({
      disposicion: "perimetral",
      parametros: {},
      franjas,
      anchoResultanteM: mejorAncho || null,
      entrada,
      areaAAgregarM2,
      sectoresCultivo,
      sectoresFlores,
    });
  }

  // 3. CORREDORES TRANSVERSALES (1..6 corredores, ángulo 0..180°)
  if (disposicion === "transversal") {
    const cantidadCorredores = Math.max(
      LIMITES_PROPUESTA.minCorredores,
      Math.min(LIMITES_PROPUESTA.maxCorredores, Math.trunc(parametros.cantidadCorredores ?? 2)),
    );
    const anguloGrados = Math.max(0, Math.min(180, Math.round(parametros.anguloGrados ?? 0)));

    let lo = 0.5;
    let hi = Math.max(2, dimMaxM / cantidadCorredores);
    let mejores: GeometriaFranja[] = [];
    let mejorAncho = 0;
    let mejorErr = Infinity;

    for (let i = 0; i < LIMITES_PROPUESTA.maxIteracionesBiseccion; i += 1) {
      verificarDeadline(inicioMs, limiteMs);
      const mid = (lo + hi) / 2;
      const geosM = construirTransversalesMetros(contornoMetros, cantidadCorredores, anguloGrados, mid);
      const geosS = aSistema(geosM);
      const nuevaM2 = calcularAreaNuevaFloresM2(geosS, sectoresFlores, entrada.metodo);
      const err = Math.abs(nuevaM2 - areaAAgregarM2);
      if (geosS.length > 0 && err < mejorErr) {
        mejorErr = err;
        mejores = geosS;
        mejorAncho = mid;
      }
      if (err <= areaAAgregarM2 * 0.0002) break;
      if (nuevaM2 < areaAAgregarM2) lo = mid;
      else hi = mid;
    }

    return empaquetarAlternativa({
      disposicion: "transversal",
      parametros: { cantidadCorredores, anguloGrados },
      franjas: mejores.map((g, idx) => ({
        id: `franja-transversal-${idx + 1}`,
        etiqueta: `Corredor transversal #${idx + 1}`,
        subtipo: "transversal",
        geometria: g,
      })),
      anchoResultanteM: mejorAncho || null,
      entrada,
      areaAAgregarM2,
      sectoresCultivo,
      sectoresFlores,
    });
  }

  // 4. ISLAS CENTRALES (1..9 islas)
  if (disposicion === "islas") {
    const cantidadIslas = Math.max(
      LIMITES_PROPUESTA.minIslas,
      Math.min(LIMITES_PROPUESTA.maxIslas, Math.trunc(parametros.cantidadIslas ?? 4)),
    );

    let lo = 0.05;
    let hi = 0.96;
    let mejores: GeometriaFranja[] = [];
    let mejorErr = Infinity;

    for (let i = 0; i < LIMITES_PROPUESTA.maxIteracionesBiseccion; i += 1) {
      verificarDeadline(inicioMs, limiteMs);
      const mid = (lo + hi) / 2;
      const geosM = construirIslasMetros(contornoMetros, cantidadIslas, mid);
      const geosS = aSistema(geosM);
      const nuevaM2 = calcularAreaNuevaFloresM2(geosS, sectoresFlores, entrada.metodo);
      const err = Math.abs(nuevaM2 - areaAAgregarM2);
      if (geosS.length > 0 && err < mejorErr) {
        mejorErr = err;
        mejores = geosS;
      }
      if (err <= areaAAgregarM2 * 0.0002) break;
      if (nuevaM2 < areaAAgregarM2) lo = mid;
      else hi = mid;
    }

    return empaquetarAlternativa({
      disposicion: "islas",
      parametros: { cantidadIslas },
      franjas: mejores.map((g, idx) => ({
        id: `franja-isla-${idx + 1}`,
        etiqueta: `Isla de biodiversidad #${idx + 1}`,
        subtipo: "isla",
        geometria: g,
      })),
      anchoResultanteM: null,
      entrada,
      areaAAgregarM2,
      sectoresCultivo,
      sectoresFlores,
    });
  }

  // 5. MATRIZ (Perimetral 50 % + Corredores internos 50 %)
  const cantidadCorredores = Math.max(
    LIMITES_PROPUESTA.minCorredores,
    Math.min(LIMITES_PROPUESTA.maxCorredores, Math.trunc(parametros.cantidadCorredores ?? 2)),
  );
  const anguloGrados = Math.max(0, Math.min(180, Math.round(parametros.anguloGrados ?? 0)));

  // Primero resolvemos el borde perimetral al 50 % del área a agregar.
  const objetivoMitadM2 = areaAAgregarM2 * 0.5;
  let loP = 0.5;
  let hiP = Math.max(1, dimMinM * 0.35);
  let mejorPerim: { franja: GeometriaFranja; inner: PoligonoGeoJson } | null = null;
  let anchoPerim = 0;
  let errP = Infinity;

  for (let i = 0; i < Math.min(25, LIMITES_PROPUESTA.maxIteracionesBiseccion); i += 1) {
    verificarDeadline(inicioMs, limiteMs);
    const mid = (loP + hiP) / 2;
    const res = construirFranjaPerimetralMetros(contornoMetros, mid);
    if (!res) {
      hiP = mid;
      continue;
    }
    const enS = proyectarGeometria(res.franja, proy.aSistema);
    const nuevaM2 = calcularAreaNuevaFloresM2([enS], sectoresFlores, entrada.metodo);
    const e = Math.abs(nuevaM2 - objetivoMitadM2);
    if (e < errP) {
      errP = e;
      mejorPerim = res;
      anchoPerim = mid;
    }
    if (e <= objetivoMitadM2 * 0.005) break;
    if (nuevaM2 < objetivoMitadM2) loP = mid;
    else hiP = mid;
  }

  const franjasMatriz: FranjaPropuesta[] = [];
  let cubiertoPerimM2 = 0;
  if (mejorPerim) {
    const perimS = proyectarGeometria(mejorPerim.franja, proy.aSistema);
    cubiertoPerimM2 = calcularAreaNuevaFloresM2([perimS], sectoresFlores, entrada.metodo);
    franjasMatriz.push({
      id: "franja-matriz-perimetro",
      etiqueta: "Cerco perimetral (matriz)",
      subtipo: "perimetral",
      geometria: perimS,
    });

    const restanteM2 = Math.max(0, areaAAgregarM2 - cubiertoPerimM2);
    if (restanteM2 > 10) {
      const innerBox = bboxAnillo(mejorPerim.inner.coordinates[0]);
      const innerDimMax = Math.max(
        1,
        Math.max(innerBox.maxX - innerBox.minX, innerBox.maxY - innerBox.minY),
      );
      let loC = 0.5;
      let hiC = Math.max(2, innerDimMax / cantidadCorredores);
      let mejoresC: GeometriaFranja[] = [];
      let errC = Infinity;

      for (let i = 0; i < Math.min(25, LIMITES_PROPUESTA.maxIteracionesBiseccion); i += 1) {
        verificarDeadline(inicioMs, limiteMs);
        const mid = (loC + hiC) / 2;
        const geosM = construirTransversalesMetros(
          mejorPerim.inner,
          cantidadCorredores,
          anguloGrados,
          mid,
        );
        const geosS = aSistema(geosM);
        const nuevaM2 = calcularAreaNuevaFloresM2(geosS, sectoresFlores, entrada.metodo);
        const e = Math.abs(nuevaM2 - restanteM2);
        if (geosS.length > 0 && e < errC) {
          errC = e;
          mejoresC = geosS;
        }
        if (e <= restanteM2 * 0.005) break;
        if (nuevaM2 < restanteM2) loC = mid;
        else hiC = mid;
      }

      mejoresC.forEach((g, idx) => {
        franjasMatriz.push({
          id: `franja-matriz-corredor-${idx + 1}`,
          etiqueta: `Corredor interno #${idx + 1}`,
          subtipo: "matriz_corredor",
          geometria: g,
        });
      });
    }
  }

  return empaquetarAlternativa({
    disposicion: "matriz",
    parametros: { cantidadCorredores, anguloGrados },
    franjas: franjasMatriz,
    anchoResultanteM: anchoPerim || null,
    entrada,
    areaAAgregarM2,
    sectoresCultivo,
    sectoresFlores,
  });
}

// Genera todas las alternativas aplicables y las ordena por menor pérdida de cultivo y menor perímetro (CA-05-02, 03).
export function generarAlternativasEspaciales(
  entrada: EntradaEspacialPropuesta,
): AlternativaEspacial[] {
  const validObj = validarObjetivoPct(entrada.objetivoPct);
  if (!validObj.valido) {
    throw new Error(validObj.error);
  }

  const aAgregarHa = calcularSuperficieAAgregarHa(
    entrada.superficieTotalHa,
    entrada.superficieFloresActualHa,
    entrada.objetivoPct,
  );

  // CA-05-01: si ya llega al objetivo, devolvemos una única alternativa sin franjas nuevas.
  if (aAgregarHa <= 0) {
    const unica = generarUnaDisposicionEspacial(entrada, "perimetral");
    return unica ? [unica] : [];
  }

  const candidatas: (AlternativaEspacial | null)[] = [
    generarUnaDisposicionEspacial(entrada, "superficie_libre"),
    generarUnaDisposicionEspacial(entrada, "perimetral"),
    generarUnaDisposicionEspacial(entrada, "transversal", { cantidadCorredores: 2, anguloGrados: 0 }),
    generarUnaDisposicionEspacial(entrada, "islas", { cantidadIslas: 4 }),
    generarUnaDisposicionEspacial(entrada, "matriz", { cantidadCorredores: 2, anguloGrados: 0 }),
  ];

  const validas = candidatas.filter((a): a is AlternativaEspacial => a !== null);

  // §4.2 y CA-05-03: ordenar por menor pérdida total de cultivo; a igualdad, menor perímetro de franjas.
  validas.sort(
    (a, b) =>
      a.perdidaTotalCultivoHa - b.perdidaTotalCultivoHa ||
      a.perimetroFranjasM - b.perimetroFranjasM,
  );

  return validas;
}

// --- Validación y recálculo de franjas editadas a mano en el servidor (§4.3, CA-05-08, CA-05-09) ---

// Ancho promedio de una franja poligonal: exacto para rectángulos (resuelve w*L=A y 2(w+L)=P)
// y aproximación segura 2*A/P para formas circulares.
export function calcularAnchoPromedioFranjaMetros(
  poligono: PoligonoGeoJson,
  sistema: SistemaGeometria,
): number {
  const area = areaM2(poligono, sistema);
  const perimetro = perimetroGeometriaM(poligono, sistema);
  if (area <= 0 || perimetro <= 0) return 0;

  const semiPerim = perimetro / 2;
  const discriminante = semiPerim * semiPerim - 4 * area;
  if (discriminante >= 0) {
    return (semiPerim - Math.sqrt(discriminante)) / 2;
  }
  return (2 * area) / perimetro;
}

export function validarYRecalcularFranjasEditadasAMano(params: {
  entrada: EntradaEspacialPropuesta;
  disposicion: Exclude<DisposicionPropuesta, "texto">;
  parametros: ParametrosDisposicion;
  franjasCrudas: readonly { id?: string; etiqueta?: string; subtipo?: string; geometria: unknown }[];
}):
  | { valido: true; alternativa: AlternativaEspacial }
  | { valido: false; errores: string[] } {
  const errores: string[] = [];

  if (params.franjasCrudas.length > LIMITES_PROPUESTA.maxFranjas) {
    return {
      valido: false,
      errores: [`Una propuesta puede tener como máximo ${LIMITES_PROPUESTA.maxFranjas} franjas.`],
    };
  }

  const poligonosValidos: PoligonoGeoJson[] = [];
  const franjasValidadas: FranjaPropuesta[] = [];

  params.franjasCrudas.forEach((f, idx) => {
    const numero = idx + 1;
    const basica = validarPoligonoBasico(f.geometria, params.entrada.metodo);
    if (!basica.valido) {
      errores.push(`Franja ${numero}: ${basica.error}`);
      return;
    }

    const poli = f.geometria as PoligonoGeoJson;
    if (params.entrada.metodo === "mapa") {
      const enJujuy = validarCoordenadasEnJujuy(poli);
      if (!enJujuy.valido) {
        errores.push(`Franja ${numero}: ${enJujuy.error}`);
        return;
      }
    }

    const dentro = validarSectorDentroDelContorno(
      poli,
      params.entrada.contorno,
      params.entrada.metodo,
    );
    if (!dentro.valido) {
      errores.push(`Franja ${numero}: sobresale del contorno del establecimiento.`);
      return;
    }

    const anchoProm = calcularAnchoPromedioFranjaMetros(poli, params.entrada.metodo);
    if (anchoProm < LIMITES_PROPUESTA.anchoMinM - 0.05) {
      errores.push(
        `Franja ${numero}: el ancho promedio (${anchoProm.toFixed(1)} m) es menor al mínimo de ${LIMITES_PROPUESTA.anchoMinM} m.`,
      );
      return;
    }

    poligonosValidos.push(poli);
    franjasValidadas.push({
      id: f.id?.trim() || `franja-manual-${numero}`,
      etiqueta: f.etiqueta?.trim() || `Franja #${numero}`,
      subtipo: f.subtipo?.trim() || "manual",
      geometria: poli,
    });
  });

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  const sinSuperp = validarSectoresSinSuperposicion(poligonosValidos, params.entrada.metodo);
  if (!sinSuperp.valido && sinSuperp.error) {
    return {
      valido: false,
      errores: [sinSuperp.error.replace("sectores", "franjas")],
    };
  }

  const sectoresCultivo = params.entrada.sectores.filter((s) => s.tipo === "cultivo");
  const sectoresFlores = params.entrada.sectores
    .filter((s) => s.tipo === "sector_flores")
    .map((s) => s.geometria);
  const areaAAgregarM2 =
    calcularSuperficieAAgregarHa(
      params.entrada.superficieTotalHa,
      params.entrada.superficieFloresActualHa,
      params.entrada.objetivoPct,
    ) * M2_POR_HA;

  const alternativa = empaquetarAlternativa({
    disposicion: params.disposicion,
    parametros: params.parametros,
    franjas: franjasValidadas,
    anchoResultanteM: null,
    entrada: params.entrada,
    areaAAgregarM2,
    sectoresCultivo,
    sectoresFlores,
  });

  return { valido: true, alternativa };
}
