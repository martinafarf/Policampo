// Tipos y constantes del dominio de calendario agroecológico (especificación 06).
// Reglas: RN-10, RN-11, RS-07, RD-02.
import type { RangoSemanas } from "@/dominio/catalogo/tipos";

export const VERSION_REGLAS_CALENDARIO = "1" as const;
export const ZONA_HORARIA_JUJUY = "America/Argentina/Jujuy" as const;

export const TIPOS_TAREA_ACCIONABLES = [
  "siembra",
  "limite_siembra",
  "corte",
  "no_pulverizar",
] as const;

export const TIPOS_TAREA_INFORMATIVAS = [
  "info_floracion_cultivo",
  "info_cosecha_cultivo",
  "info_floracion_planta",
] as const;

export const TIPOS_TAREA = [...TIPOS_TAREA_ACCIONABLES, ...TIPOS_TAREA_INFORMATIVAS] as const;
export type TipoTarea = (typeof TIPOS_TAREA)[number];

export const ETIQUETAS_TIPO_TAREA: Readonly<Record<TipoTarea, string>> = {
  siembra: "Siembra",
  limite_siembra: "Fecha límite de siembra",
  corte: "Corte / manejo",
  no_pulverizar: "No pulverizar",
  info_floracion_cultivo: "Floración de cultivo",
  info_cosecha_cultivo: "Cosecha de cultivo",
  info_floracion_planta: "Floración de franjas",
};

export const ESTADOS_TAREA = ["proxima", "en_curso", "hecha", "atrasada"] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const ETIQUETAS_ESTADO_TAREA: Readonly<Record<EstadoTarea, string>> = {
  proxima: "Próxima",
  en_curso: "En curso",
  hecha: "Hecha",
  atrasada: "Atrasada",
};

export const ICONOS_ESTADO_TAREA: Readonly<Record<EstadoTarea, string>> = {
  proxima: "⏳",
  en_curso: "🟢",
  hecha: "✅",
  atrasada: "⚠️",
};

export const LIMITES_CALENDARIO = {
  notaMaxCaracteres: 300,
  semanasAnticipacion: 1,
  diasAvisoProximaTemporada: 30,
  diasResumenSemanal: 14,
  mesesTemporada: 12,
  maxTareasInicio: 5,
} as const;

export interface AvisoCalendario {
  codigo:
    | "limite_antes_siembra"
    | "limite_pasado"
    | "sin_floracion_cultivos"
    | "sin_plantas_en_mezcla";
  mensaje: string;
}

export interface PlantaEntradaCalendario {
  nombreComun: string;
  dosisSiembra: string | null;
  manejoCorte: string | null;
  siembraSemanas: RangoSemanas[];
  floracionSemanas: RangoSemanas[];
  corteSemanas: RangoSemanas[];
  semanasHastaFloracionMax: number | null;
}

export interface CultivoEntradaCalendario {
  nombre: string;
  floracionSemanas: RangoSemanas[];
  cosechaSemanas: RangoSemanas[];
}

export interface EntradaGeneracionCalendario {
  hoyIso: string; // YYYY-MM-DD en America/Argentina/Jujuy
  temporadaFinIso?: string; // Opcional (al regenerar manteniendo fecha de fin de temporada, §5.4)
  plantas: readonly PlantaEntradaCalendario[];
  cultivos: readonly CultivoEntradaCalendario[];
}

export interface TareaGenerada {
  tipo: TipoTarea;
  plantaNombre: string | null;
  cultivoNombre: string | null;
  titulo: string;
  descripcion: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  estimada: boolean;
  orden: number;
}

export interface ResultadoGeneracionCalendario {
  versionReglas: string;
  temporadaInicio: string;
  temporadaFin: string;
  tareas: TareaGenerada[];
  avisos: AvisoCalendario[];
}
