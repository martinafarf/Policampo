// Tipos y constantes del dominio de informes técnicos descargables (especificación 07).
// Reglas: RN-07, RS-02, RS-05, RS-06, RD-02.
import type { AvisoCalendario, EstadoTarea, TipoTarea } from "@/dominio/calendario/tipos";
import type {
  AlertaDiagnostico,
  AreasAptasDiagnostico,
  NivelRiesgo,
} from "@/dominio/diagnostico/tipos";
import type {
  MetodoCaracterizacion,
  PoligonoGeoJson,
  SubtipoFlores,
  TipoSector,
  UbicacionRelativa,
} from "@/dominio/establecimientos/tipos";
import type {
  AvisoPropuesta,
  DisposicionPropuesta,
  EspecieEnMezcla,
  EvaluacionFloracionMezcla,
  FranjaPropuesta,
  ParametrosDisposicion,
  PerdidaCultivoItem,
  RepartoUbicacionItem,
} from "@/dominio/propuesta/tipos";

export const VERSION_PLANTILLA_INFORME = "1" as const;

export const LIMITES_INFORME = {
  maxEmisionesPorHora: 20, // CA-07-13, RS-06
  maxDescargasPorHora: 60, // CA-07-13, RS-06
  maxInformesPorFinca: 50, // CA-07-13
  maxTiempoPdfMs: 10_000, // auditoría B-01
} as const;

// Aviso legal obligatorio en la sección 7 y pie de portada (Esp. 07 §4 y §9, RN-07).
export const AVISO_LEGAL_INFORME =
  "Informe orientativo generado automáticamente a partir de los datos cargados por el usuario y de un catálogo validado por especialistas. No reemplaza el asesoramiento de un ingeniero agrónomo." as const;

export interface SectorFotoInforme {
  nombre: string;
  tipo: TipoSector;
  detalleTipo: string;
  subtipoFlores: SubtipoFlores | null;
  superficieHa: number;
  porcentajeTotal: number;
  ubicacionRelativa: UbicacionRelativa | null;
  geometria: PoligonoGeoJson | null;
}

export interface TareaFotoInforme {
  tipo: TipoTarea;
  titulo: string;
  descripcion: string;
  plantaNombre: string | null;
  fechaInicio: string;
  fechaFin: string;
  estimada: boolean;
  estadoAlEmitir: EstadoTarea;
  hechaEn: string | null;
}

// Foto completa e inmutable guardada en informe.contenido (Esp. 07 §5.2, CA-07-09).
// El PDF y la vista en pantalla SOLO leen esta foto.
export interface FotoInforme {
  codigo: string;
  emitidoEnIso: string;
  versionPlantilla: string;
  preparadoPara: string | null;
  desactualizado: {
    hayAviso: boolean;
    fechaReferenciaIso: string;
    motivos: string[];
  };
  finca: {
    nombre: string;
    localidad: string;
    departamento: string;
    ecorregion: string;
    ecorregionNombre: string;
    metodo: MetodoCaracterizacion;
    superficieTotalHa: number;
    contorno: PoligonoGeoJson | null;
    sectores: SectorFotoInforme[];
  };
  diagnostico: {
    creadoEnIso: string;
    versionReglas: string;
    nivelRiesgo: NivelRiesgo;
    porcentajeFlores: number;
    deficitPp: number;
    superficieTotalHa: number;
    superficieCultivosHa: number;
    superficieFloresHa: number;
    superficieSinAsignarHa: number;
    hectareasACompensar: number;
    perimetroM: number | null;
    anchoFranjaM: number | null;
    areasAptas: AreasAptasDiagnostico;
    alertas: AlertaDiagnostico[];
    pasosCalculo: string[];
  };
  propuesta: {
    nombre: string | null;
    creadoEnIso: string;
    versionReglas: string;
    disposicion: DisposicionPropuesta;
    parametros: ParametrosDisposicion;
    objetivoPct: number;
    porcentajeLogrado: number;
    superficieFranjasHa: number;
    superficieLibreUsadaHa: number;
    editadaAMano: boolean;
    franjas: FranjaPropuesta[] | null;
    reparto: RepartoUbicacionItem[] | null;
    perdidaPorCultivo: PerdidaCultivoItem[];
    perdidaTotalCultivoHa: number;
    floracion: EvaluacionFloracionMezcla;
    avisos: AvisoPropuesta[];
    especies: EspecieEnMezcla[];
  };
  calendario: {
    temporadaInicio: string;
    temporadaFin: string;
    avisos: AvisoCalendario[];
    proximaTarea: { titulo: string; fechaInicio: string } | null;
    tareas: TareaFotoInforme[];
  } | null;
  fuentes: string[];
}
