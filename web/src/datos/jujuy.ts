// Datos geográficos de la provincia de Jujuy y catálogos base de la especificación 02.
// Migrado desde mapa/static/mapa/js/policampo_common.js y campos/models.py de la v1.

export const ECORREGIONES = [
  { clave: "valles_templados", nombre: "Valles Templados" },
  { clave: "quebrada_de_humahuaca", nombre: "Quebrada de Humahuaca" },
  { clave: "yungas", nombre: "Yungas" },
  { clave: "puna", nombre: "Puna" },
  { clave: "chaco_seco", nombre: "Chaco Seco" },
] as const;

export type ClaveEcorregion = (typeof ECORREGIONES)[number]["clave"];

export const CLAVES_ECORREGION: readonly ClaveEcorregion[] = ECORREGIONES.map(
  (ecorregion) => ecorregion.clave,
);

export interface LocalidadJujuy {
  readonly nombre: string;
  readonly lat: number;
  readonly lng: number;
  readonly zoom: number;
}

export interface DepartamentoJujuyInfo {
  readonly nombre: NombreDepartamentoJujuy;
  readonly ecorregionSugerida: ClaveEcorregion;
  readonly localidades: readonly LocalidadJujuy[];
}

export const NOMBRES_DEPARTAMENTOS_JUJUY = [
  "El Carmen",
  "Dr. Manuel Belgrano",
  "Palpalá",
  "San Antonio",
  "San Pedro",
  "Ledesma",
  "Santa Bárbara",
  "Tilcara",
  "Tumbaya",
  "Humahuaca",
  "Valle Grande",
  "Cochinoca",
  "Yavi",
  "Susques",
  "Rinconada",
  "Santa Catalina",
] as const;

export type NombreDepartamentoJujuy = (typeof NOMBRES_DEPARTAMENTOS_JUJUY)[number];

// Los 16 departamentos de Jujuy con localidades principales, coordenadas (WGS 84) y ecorregión sugerida.
export const DEPARTAMENTOS_JUJUY: Readonly<Record<NombreDepartamentoJujuy, DepartamentoJujuyInfo>> = {
  "El Carmen": {
    nombre: "El Carmen",
    ecorregionSugerida: "valles_templados",
    localidades: [
      { nombre: "Perico", lat: -24.3833, lng: -65.1167, zoom: 14 },
      { nombre: "Monterrico", lat: -24.4397, lng: -65.1619, zoom: 14 },
      { nombre: "El Carmen", lat: -24.3878, lng: -65.2603, zoom: 14 },
      { nombre: "Pampa Blanca", lat: -24.5333, lng: -65.0667, zoom: 14 },
      { nombre: "Aguas Calientes", lat: -24.5975, lng: -65.1583, zoom: 14 },
      { nombre: "Puesto Viejo", lat: -24.4833, lng: -65.0167, zoom: 14 },
    ],
  },
  "Dr. Manuel Belgrano": {
    nombre: "Dr. Manuel Belgrano",
    ecorregionSugerida: "valles_templados",
    localidades: [
      { nombre: "San Salvador de Jujuy", lat: -24.1858, lng: -65.2995, zoom: 13 },
      { nombre: "Yala", lat: -24.12, lng: -65.405, zoom: 14 },
      { nombre: "Lozano", lat: -24.08, lng: -65.41, zoom: 14 },
      { nombre: "Reyes", lat: -24.155, lng: -65.375, zoom: 14 },
      { nombre: "Guerrero", lat: -24.19, lng: -65.45, zoom: 14 },
    ],
  },
  Palpalá: {
    nombre: "Palpalá",
    ecorregionSugerida: "valles_templados",
    localidades: [
      { nombre: "Palpalá", lat: -24.2567, lng: -65.2116, zoom: 14 },
      { nombre: "Río Blanco", lat: -24.228, lng: -65.235, zoom: 14 },
      { nombre: "Forestal", lat: -24.305, lng: -65.18, zoom: 14 },
      { nombre: "Carahunco", lat: -24.3167, lng: -65.1167, zoom: 14 },
    ],
  },
  "San Antonio": {
    nombre: "San Antonio",
    ecorregionSugerida: "valles_templados",
    localidades: [
      { nombre: "San Antonio", lat: -24.3667, lng: -65.3333, zoom: 14 },
      { nombre: "Los Alisos", lat: -24.2833, lng: -65.3, zoom: 14 },
    ],
  },
  "San Pedro": {
    nombre: "San Pedro",
    ecorregionSugerida: "yungas",
    localidades: [
      { nombre: "San Pedro de Jujuy", lat: -24.2314, lng: -64.8661, zoom: 14 },
      { nombre: "La Esperanza", lat: -24.225, lng: -64.838, zoom: 14 },
      { nombre: "La Mendieta", lat: -24.3167, lng: -64.9667, zoom: 14 },
      { nombre: "Arrayanal", lat: -24.1667, lng: -64.8667, zoom: 14 },
      { nombre: "Rodeíto", lat: -24.2833, lng: -64.7833, zoom: 14 },
    ],
  },
  Ledesma: {
    nombre: "Ledesma",
    ecorregionSugerida: "yungas",
    localidades: [
      { nombre: "Libertador Gral. San Martín", lat: -23.8064, lng: -64.7875, zoom: 14 },
      { nombre: "Fraile Pintado", lat: -23.9408, lng: -64.7994, zoom: 14 },
      { nombre: "Calilegua", lat: -23.7736, lng: -64.7697, zoom: 14 },
      { nombre: "Yuto", lat: -23.6431, lng: -64.4719, zoom: 14 },
      { nombre: "Caimancito", lat: -23.7417, lng: -64.595, zoom: 14 },
    ],
  },
  "Santa Bárbara": {
    nombre: "Santa Bárbara",
    ecorregionSugerida: "yungas",
    localidades: [
      { nombre: "Palma Sola", lat: -23.975, lng: -64.3033, zoom: 14 },
      { nombre: "Santa Clara", lat: -24.3086, lng: -64.6617, zoom: 14 },
      { nombre: "El Talar", lat: -23.5467, lng: -64.355, zoom: 14 },
      { nombre: "Vinalito", lat: -23.7583, lng: -64.425, zoom: 14 },
    ],
  },
  Tilcara: {
    nombre: "Tilcara",
    ecorregionSugerida: "quebrada_de_humahuaca",
    localidades: [
      { nombre: "Tilcara", lat: -23.5776, lng: -65.394, zoom: 14 },
      { nombre: "Maimará", lat: -23.6236, lng: -65.405, zoom: 14 },
      { nombre: "Huacalera", lat: -23.4375, lng: -65.3514, zoom: 14 },
    ],
  },
  Tumbaya: {
    nombre: "Tumbaya",
    ecorregionSugerida: "quebrada_de_humahuaca",
    localidades: [
      { nombre: "Volcán", lat: -23.9167, lng: -65.4667, zoom: 14 },
      { nombre: "Tumbaya", lat: -23.8583, lng: -65.4667, zoom: 14 },
      { nombre: "Purmamarca", lat: -23.7469, lng: -65.4994, zoom: 14 },
    ],
  },
  Humahuaca: {
    nombre: "Humahuaca",
    ecorregionSugerida: "quebrada_de_humahuaca",
    localidades: [
      { nombre: "Humahuaca", lat: -23.2054, lng: -65.3505, zoom: 14 },
      { nombre: "Uquía", lat: -23.3056, lng: -65.3592, zoom: 14 },
      { nombre: "Tres Cruces", lat: -22.9186, lng: -65.5819, zoom: 14 },
    ],
  },
  "Valle Grande": {
    nombre: "Valle Grande",
    ecorregionSugerida: "yungas",
    localidades: [
      { nombre: "Valle Grande", lat: -23.475, lng: -64.95, zoom: 14 },
      { nombre: "San Francisco", lat: -23.6214, lng: -64.9469, zoom: 14 },
      { nombre: "Pampichuela", lat: -23.5431, lng: -65.0303, zoom: 14 },
    ],
  },
  Cochinoca: {
    nombre: "Cochinoca",
    ecorregionSugerida: "puna",
    localidades: [
      { nombre: "Abra Pampa", lat: -22.7205, lng: -65.697, zoom: 14 },
      { nombre: "Abdón Castro Tolay", lat: -23.3683, lng: -66.0914, zoom: 14 },
    ],
  },
  Yavi: {
    nombre: "Yavi",
    ecorregionSugerida: "puna",
    localidades: [
      { nombre: "La Quiaca", lat: -22.1024, lng: -65.593, zoom: 14 },
      { nombre: "Yavi", lat: -22.1306, lng: -65.4633, zoom: 14 },
    ],
  },
  Susques: {
    nombre: "Susques",
    ecorregionSugerida: "puna",
    localidades: [{ nombre: "Susques", lat: -23.4, lng: -66.3667, zoom: 14 }],
  },
  Rinconada: {
    nombre: "Rinconada",
    ecorregionSugerida: "puna",
    localidades: [{ nombre: "Rinconada", lat: -22.4408, lng: -66.1678, zoom: 14 }],
  },
  "Santa Catalina": {
    nombre: "Santa Catalina",
    ecorregionSugerida: "puna",
    localidades: [{ nombre: "Santa Catalina", lat: -21.9461, lng: -66.0519, zoom: 14 }],
  },
};

// Límites geográficos de Jujuy con margen para validar coordenadas en el método mapa (Esp. 02, 4.3).
export const LIMITES_JUJUY = {
  latMin: -25.0,
  latMax: -21.5,
  lngMin: -67.5,
  lngMax: -63.8,
} as const;

// Cultivos iniciales de la v1 cargados por migración (Esp. 02, sección 8).
export const CULTIVOS_INICIALES = [
  { clave: "frutilla", nombre: "Frutilla" },
  { clave: "arandano", nombre: "Arándano" },
  { clave: "durazno", nombre: "Durazno" },
  { clave: "tomate", nombre: "Tomate" },
  { clave: "pimiento", nombre: "Pimiento" },
  { clave: "palta", nombre: "Palta" },
  { clave: "citricos", nombre: "Cítricos" },
  { clave: "zapallo", nombre: "Zapallo y cucurbitáceas" },
  { clave: "horticolas", nombre: "Hortícolas mixtas" },
] as const;

export function esDepartamentoValido(valor: string): valor is NombreDepartamentoJujuy {
  return (NOMBRES_DEPARTAMENTOS_JUJUY as readonly string[]).includes(valor);
}

export function esEcorregionValida(valor: string): valor is ClaveEcorregion {
  return (CLAVES_ECORREGION as readonly string[]).includes(valor);
}

export function obtenerEcorregionSugerida(departamento: NombreDepartamentoJujuy): ClaveEcorregion {
  return DEPARTAMENTOS_JUJUY[departamento].ecorregionSugerida;
}

export function obtenerLocalidades(departamento: NombreDepartamentoJujuy): readonly LocalidadJujuy[] {
  return DEPARTAMENTOS_JUJUY[departamento].localidades;
}

export function obtenerNombreEcorregion(clave: ClaveEcorregion): string {
  const encontrada = ECORREGIONES.find((e) => e.clave === clave);
  return encontrada ? encontrada.nombre : clave;
}
