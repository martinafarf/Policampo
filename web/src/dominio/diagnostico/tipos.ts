// Tipos y constantes del dominio de diagnóstico agroecológico (especificación 04).
// Reglas: RN-01, RN-07, RD-02.
import type { MultiPolygon, Polygon } from "geojson";
import type { ClaveEcorregion } from "@/datos/jujuy";
import type {
  MetodoCaracterizacion,
  PoligonoGeoJson,
  SubtipoFlores,
  TipoSector,
  UbicacionRelativa,
} from "@/dominio/establecimientos";

// Versión de las reglas de cálculo (Esp. 04, 4.7). Si cambian umbrales o fórmulas, se sube.
export const VERSION_REGLAS_DIAGNOSTICO = "1" as const;

// Umbrales con nombre (Esp. 04, 4.3 y 4.5 — a validar con especialista, RN-07).
export const UMBRALES_DIAGNOSTICO = {
  adecuadoPct: 20, // % con flores >= 20 -> Adecuado (RN-01)
  moderadoPct: 10, // 10 <= % con flores < 20 -> Moderado; < 10 -> Crítico
  monocultivoPct: 80, // un mismo cultivo > 80 % de la superficie total
  sinAsignarAlertaPct: 1, // superficie sin asignar > 1 % de la superficie total
  maxDiagnosticosPorHora: 20, // límite anti-abuso (RS-06, CA-04-15)
} as const;

export const NIVELES_RIESGO = ["adecuado", "moderado", "critico"] as const;
export type NivelRiesgo = (typeof NIVELES_RIESGO)[number];

export type TipoAlertaDiagnostico =
  | "monocultivo"
  | "sin_flores"
  | "superficie_sin_asignar"
  | "cultivo_sin_datos";

export type AlertaDiagnostico =
  | {
      tipo: "monocultivo";
      datos: {
        cultivoNombre: string;
        porcentaje: number;
      };
    }
  | {
      tipo: "sin_flores";
      datos: Record<string, never>;
    }
  | {
      tipo: "superficie_sin_asignar";
      datos: {
        superficieSinAsignarHa: number;
      };
    }
  | {
      tipo: "cultivo_sin_datos";
      datos: {
        cultivoNombre: string;
      };
    };

export type GeometriaLibreGeoJson = Polygon | MultiPolygon;

export interface SectorEntradaDiagnostico {
  id?: string;
  nombre?: string;
  tipo: TipoSector;
  superficieHa: number | string;
  // Para sectores de cultivo:
  cultivoClave?: string | null;
  cultivoNombre?: string | null;
  cultivoOtro?: string | null;
  // Indica si el cultivo tiene datos publicados en el catálogo (Esp. 04, 4.1 y 4.5).
  tieneDatosPublicadosCatalogo?: boolean;
  // Para sectores de flores:
  subtipoFlores?: SubtipoFlores | null;
  // Según el método de caracterización:
  ubicacionRelativa?: UbicacionRelativa | null;
  geometria?: PoligonoGeoJson | null;
}

// Foto completa de la finca al momento de pedir el diagnóstico (Esp. 04, 4.1).
// Se guarda tal cual en diagnostico.entrada para trazabilidad (CA-04-07).
export interface EntradaDiagnostico {
  metodo: MetodoCaracterizacion;
  ecorregion: ClaveEcorregion;
  superficieTotalHa: number | string;
  contorno?: PoligonoGeoJson | null;
  sectores: readonly SectorEntradaDiagnostico[];
}

export interface AreasAptasDiagnostico {
  esOpcional: boolean;
  bordesLibres: UbicacionRelativa[];
  ubicacionesLibres: UbicacionRelativa[];
  textos: string[];
  superficieLibreHa: number | null;
}

export interface ResultadoDiagnostico {
  versionReglas: string;
  superficieTotalHa: number;
  superficieFloresHa: number;
  superficieCultivosHa: number;
  superficieSinAsignarHa: number;
  porcentajeFlores: number;
  deficitPp: number;
  hectareasACompensar: number;
  nivelRiesgo: NivelRiesgo;
  perimetroM: number | null;
  anchoFranjaM: number | null;
  areasAptas: AreasAptasDiagnostico;
  superficieLibre: GeometriaLibreGeoJson | null;
  alertas: AlertaDiagnostico[];
}
