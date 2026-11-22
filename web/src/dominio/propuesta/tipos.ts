// Tipos y constantes del dominio de propuesta de rediseño y plantas de servicio (Esp. 05).
// Reglas: RN-01, RN-07, RN-08, RN-09, RN-10, RN-12, RS-06, RD-02.
import type { MultiPolygon, Polygon } from "geojson";
import type { ClaveEcorregion } from "@/datos/jujuy";
import type {
  CicloPlanta,
  DependenciaPolinizacion,
  FuenteTipo,
  FuncionPlanta,
  NivelAgua,
  OrigenPlanta,
  RangoSemanas,
  RiesgoMaleza,
} from "@/dominio/catalogo/tipos";
import type { GeometriaLibreGeoJson } from "@/dominio/diagnostico/tipos";
import type {
  MetodoCaracterizacion,
  PoligonoGeoJson,
  UbicacionRelativa,
} from "@/dominio/establecimientos/tipos";

export const VERSION_REGLAS_PROPUESTA = "1" as const;

export const DISPOSICIONES_PROPUESTA = [
  "superficie_libre",
  "perimetral",
  "transversal",
  "islas",
  "matriz",
  "texto",
] as const;
export type DisposicionPropuesta = (typeof DISPOSICIONES_PROPUESTA)[number];

export const ETIQUETAS_DISPOSICION: Readonly<Record<DisposicionPropuesta, string>> = {
  superficie_libre: "Usar la superficie libre",
  perimetral: "Cerco perimetral",
  transversal: "Corredores transversales",
  islas: "Islas centrales",
  matriz: "Diseño en matriz (perimetral + corredores)",
  texto: "Propuesta por ubicaciones (cuestionario)",
};

export const LIMITES_PROPUESTA = {
  objetivoMinPct: 10,
  objetivoRecomendadoPct: 20,
  objetivoMaxPct: 40,
  anchoMinM: 3,
  anchoMaxM: 30,
  toleranciaSuperficie: 0.01, // 1 % (CA-05-02, CA-05-05)
  maxIteracionesBiseccion: 50, // auditoría B-01
  maxTiempoCalculoMs: 10_000, // 10 s (auditoría B-01)
  maxFranjas: 20,
  maxPropuestasPorFinca: 30,
  maxBytesPeticion: 1_048_576, // 1 MB
  maxNombreLargo: 60,
  minCorredores: 1,
  maxCorredores: 6,
  minIslas: 1,
  maxIslas: 9,
  maxCandidatasEvaluadas: 15,
  minEspeciesMezcla: 2,
  maxEspeciesMezcla: 4,
  semanasAnticipacion: 1, // a validar (RN-10)
  coberturaFloracionMinPct: 80, // estrictamente > 80 % (RN-10)
} as const;

export type GeometriaFranja = Polygon | MultiPolygon;

export interface FranjaPropuesta {
  id: string;
  etiqueta: string;
  subtipo: string;
  geometria: GeometriaFranja;
}

export interface ParametrosDisposicion {
  cantidadCorredores?: number;
  anguloGrados?: number;
  cantidadIslas?: number;
  anchoResultanteM?: number | null;
}

export interface PerdidaCultivoItem {
  sectorId?: string;
  sector: string;
  cultivo: string;
  ha: number;
  pct: number;
}

export interface AvisoPropuesta {
  codigo:
    | "objetivo_bajo_20"
    | "no_llega_objetivo"
    | "ancho_fuera_rango"
    | "floracion_sin_cubrir"
    | "cultivo_sin_datos_floracion"
    | "una_sola_especie"
    | "sin_candidatas"
    | "ya_alcanza_objetivo";
  mensaje: string;
}

export interface AlternativaEspacial {
  disposicion: Exclude<DisposicionPropuesta, "texto">;
  titulo: string;
  parametros: ParametrosDisposicion;
  franjas: FranjaPropuesta[];
  superficieFranjasHa: number;
  superficieNuevaFloresHa: number;
  superficieLibreUsadaHa: number;
  porcentajeLogrado: number;
  anchoResultanteM: number | null;
  perimetroFranjasM: number;
  perdidaPorCultivo: PerdidaCultivoItem[];
  perdidaTotalCultivoHa: number;
  llegaAlObjetivo: boolean;
  anchoFueraDeRango: boolean;
  avisos: AvisoPropuesta[];
}

export interface SectorEspacialEntrada {
  id?: string;
  nombre: string;
  tipo: "cultivo" | "sector_flores";
  cultivoNombre?: string;
  superficieHa: number;
  geometria: PoligonoGeoJson;
}

export interface EntradaEspacialPropuesta {
  metodo: Extract<MetodoCaracterizacion, "croquis" | "mapa">;
  superficieTotalHa: number;
  superficieFloresActualHa: number;
  objetivoPct: number;
  contorno: PoligonoGeoJson;
  superficieLibre?: GeometriaLibreGeoJson | null;
  sectores: readonly SectorEspacialEntrada[];
  tiempoLimiteMs?: number;
}

// --- Cuestionario ---

export interface RepartoUbicacionItem {
  ubicacion: UbicacionRelativa | "bordes_cultivos";
  etiqueta: string;
  ha: number;
}

export interface PropuestaCuestionario {
  disposicionSugerida: "perimetral" | "corredores_entre_lotes";
  tituloDisposicion: string;
  superficieAAgregarHa: number;
  porcentajeLogrado: number;
  reparto: RepartoUbicacionItem[];
  ubicacionesResaltadas: UbicacionRelativa[];
  perdidaPorCultivo: PerdidaCultivoItem[];
  avisos: AvisoPropuesta[];
}

// --- Mezcla de plantas de servicio ---

export type PrioridadPolinizacion = "polinizadores" | "control_biologico";

export interface CultivoParaMezcla {
  id: string;
  clave: string | null;
  nombre: string;
  superficieHa: number;
  dependenciaPolinizacion: DependenciaPolinizacion | null;
  floracionSemanas: RangoSemanas[];
  tieneDatosPublicados: boolean;
}

export interface CompatibilidadPlantaCultivo {
  cultivoId: string;
  cultivoNombre: string;
  grado: number;
  justificacion: string;
}

export interface PlantaCandidataEntrada {
  plantaId: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  origen: OrigenPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  necesidadAgua: NivelAgua;
  riesgoMaleza: RiesgoMaleza;
  manejoCorte: string | null;
  dosisSiembra: string | null;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMin: number | null;
  semanasHastaFloracionMax: number | null;
  compatibilidades: CompatibilidadPlantaCultivo[];
}

export interface PlantaCandidataEvaluada extends PlantaCandidataEntrada {
  puntajeCompatibilidad: number;
}

export interface EvaluacionFloracionCultivo {
  cultivoId: string;
  cultivoNombre: string;
  obligatorio: boolean;
  semanasCultivo: number[];
  semanasAnticipacionRequeridas: number[];
  cumpleAnticipacion: boolean;
  coberturaPct: number;
  semanasDescubiertas: number[];
  cumple: boolean;
}

export interface EvaluacionFloracionMezcla {
  prioridad: PrioridadPolinizacion;
  semanasMezcla: number[];
  porCultivo: EvaluacionFloracionCultivo[];
  cultivosObligatoriosCumplidos: number;
  cultivosObligatoriosTotal: number;
  coberturaPromedioPct: number;
  cumpleTodoObligatorio: boolean;
}

export interface EspecieEnMezcla {
  plantaId: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  proporcionPct: number;
  orden: number;
  puntajeCompatibilidad: number;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  origen: OrigenPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  necesidadAgua: NivelAgua;
  riesgoMaleza: RiesgoMaleza;
  manejoCorte: string | null;
  dosisSiembra: string | null;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  compatibilidades: CompatibilidadPlantaCultivo[];
}

export interface ResultadoMezcla {
  prioridad: PrioridadPolinizacion;
  ecorregion: ClaveEcorregion;
  especies: EspecieEnMezcla[];
  candidatasDisponibles: PlantaCandidataEvaluada[];
  floracion: EvaluacionFloracionMezcla;
  avisos: AvisoPropuesta[];
}
