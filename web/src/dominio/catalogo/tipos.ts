// Tipos y constantes del catálogo de especies y compatibilidades (especificación 03).
// Todos los términos siguen el glosario del proyecto (regla RD-02).

export const ESTADOS_CATALOGO = ["borrador", "publicado", "retirado"] as const;
export type EstadoCatalogo = (typeof ESTADOS_CATALOGO)[number];

export const FUENTES_TIPO = [
  "bibliografia",
  "entrevista",
  "institucion",
  "observacion_propia",
] as const;
export type FuenteTipo = (typeof FUENTES_TIPO)[number];

export const FUNCIONES_PLANTA = [
  "atrae_polinizadores",
  "control_biologico",
  "cobertura_suelo",
  "aporta_fertilidad",
  "refugio",
] as const;
export type FuncionPlanta = (typeof FUNCIONES_PLANTA)[number];

export const CICLOS_PLANTA = ["anual", "bianual", "perenne"] as const;
export type CicloPlanta = (typeof CICLOS_PLANTA)[number];

export const ORIGENES_PLANTA = ["nativa", "introducida", "desconocido"] as const;
export type OrigenPlanta = (typeof ORIGENES_PLANTA)[number];

export const NIVELES_AGUA = ["baja", "media", "alta"] as const;
export type NivelAgua = (typeof NIVELES_AGUA)[number];

export const RIESGOS_MALEZA = ["bajo", "medio", "alto"] as const;
export type RiesgoMaleza = (typeof RIESGOS_MALEZA)[number];

export const DEPENDENCIAS_POLINIZACION = ["alta", "media", "baja", "ninguna"] as const;
export type DependenciaPolinizacion = (typeof DEPENDENCIAS_POLINIZACION)[number];

export const ENTIDADES_CATALOGO = ["planta_servicio", "cultivo", "compatibilidad"] as const;
export type EntidadCatalogo = (typeof ENTIDADES_CATALOGO)[number];

export const ACCIONES_CATALOGO = [
  "alta",
  "edicion",
  "publicacion",
  "retiro",
  "borrado",
  "importacion",
] as const;
export type AccionCatalogo = (typeof ACCIONES_CATALOGO)[number];

// Rango inclusivo de semanas del año [inicio, fin], ambos entre 1 y 52 (Esp. 03, 4.2).
export type RangoSemanas = [number, number];

export const LIMITES_CATALOGO = {
  gradoMin: -5,
  gradoMax: 5,
  justificacionMin: 10,
  justificacionMax: 500,
  semanaMin: 1,
  semanaMax: 52,
  quincenaMin: 1,
  quincenaMax: 24,
  csvMaxBytes: 2 * 1024 * 1024, // 2 MB (CA-03-13)
  csvMaxFilas: 2000, // 2.000 filas (CA-03-13)
} as const;
