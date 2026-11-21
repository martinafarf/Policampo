// Tipos de dominio para establecimientos y sectores (especificación 02).
// Los nombres siguen el glosario del proyecto (regla RD-02).

export const METODOS_CARACTERIZACION = ["cuestionario", "croquis", "mapa"] as const;
export type MetodoCaracterizacion = (typeof METODOS_CARACTERIZACION)[number];

export const TIPOS_SECTOR = ["cultivo", "sector_flores"] as const;
export type TipoSector = (typeof TIPOS_SECTOR)[number];

export const SUBTIPOS_FLORES = [
  "flora_espontanea",
  "borde_silvestre",
  "banda_implantada",
  "vegetacion_natural",
] as const;
export type SubtipoFlores = (typeof SUBTIPOS_FLORES)[number];

export const ETIQUETAS_SUBTIPO_FLORES: Readonly<Record<SubtipoFlores, string>> = {
  flora_espontanea: "Flora espontánea",
  borde_silvestre: "Borde o cerco silvestre",
  banda_implantada: "Banda floral implantada",
  vegetacion_natural: "Cortina forestal / vegetación natural",
};

export const UBICACIONES_RELATIVAS = [
  "arriba_izquierda",
  "arriba_centro",
  "arriba_derecha",
  "centro_izquierda",
  "centro",
  "centro_derecha",
  "abajo_izquierda",
  "abajo_centro",
  "abajo_derecha",
] as const;
export type UbicacionRelativa = (typeof UBICACIONES_RELATIVAS)[number];

export type Posicion2D = [number, number];

// GeoJSON Polygon almacenado en las columnas JSONB "contorno" y "geometria".
// En croquis las coordenadas están en metros locales [x, y] (origen arriba a la izquierda).
// En mapa las coordenadas están en WGS 84 [longitud, latitud].
export interface PoligonoGeoJson {
  type: "Polygon";
  coordinates: Posicion2D[][];
}

// Constantes de validación de la especificación 02 (secciones 4.1, 4.2, 4.3 y 7.2).
export const LIMITES_ESTABLECIMIENTO = {
  superficieMinHa: 0.01,
  superficieMaxHa: 100_000,
  maxSectores: 50,
  maxEstablecimientosPorUsuario: 100,
  maxBytesGuardado: 1_048_576, // 1 MB
  minVerticesPoligono: 3,
  maxVerticesPoligono: 500,
  toleranciaSumaSectores: 0.005, // 0,5 % (sección 4.2 y CA-02-08)
  toleranciaGeometria: 0.01, // 1 % para salida del contorno y superposición (sección 4.3 y CA-02-11)
  objetivoFloresPct: 20, // regla del 20 % (RN-01)
} as const;
