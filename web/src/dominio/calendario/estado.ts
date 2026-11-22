// Cálculo de estados de tarea y validación del checklist (Esp. 06, §4.4, §5.3, CA-06-07 a 09).
import { esFechaIsoValida, sumarMesesIso } from "./fechas";
import {
  LIMITES_CALENDARIO,
  TIPOS_TAREA_INFORMATIVAS,
  type EstadoTarea,
  type TipoTarea,
} from "./tipos";

const SET_INFORMATIVAS = new Set<string>(TIPOS_TAREA_INFORMATIVAS);

export function esTareaInformativa(tipo: TipoTarea): boolean {
  return SET_INFORMATIVAS.has(tipo);
}

// Estado calculado según "hoy" en Jujuy, excepto "hecha" que se persiste (CA-06-07).
export function calcularEstadoTarea(
  tarea: { fechaInicio: string; fechaFin: string; hechaEn: string | null },
  hoyIso: string,
): EstadoTarea {
  if (tarea.hechaEn) return "hecha";
  if (hoyIso < tarea.fechaInicio) return "proxima";
  if (hoyIso > tarea.fechaFin) return "atrasada";
  return "en_curso";
}

export function validarMarcarTareaHecha(params: {
  tipo: TipoTarea;
  fechaHechaIso: string;
  nota: string | null | undefined;
  temporadaInicioIso: string;
  hoyIso: string;
}): { valido: true; fechaHecha: string; nota: string | null } | { valido: false; error: string } {
  // CA-06-09: los períodos informativos no se pueden marcar nunca.
  if (esTareaInformativa(params.tipo)) {
    return {
      valido: false,
      error: "Los períodos informativos no se pueden marcar como hechos.",
    };
  }

  if (!esFechaIsoValida(params.fechaHechaIso)) {
    return { valido: false, error: "La fecha ingresada no es válida." };
  }

  // CA-06-08 y §7: no puede ser futura ni anterior a 12 meses antes del inicio de la temporada.
  if (params.fechaHechaIso > params.hoyIso) {
    return { valido: false, error: "La fecha en que hiciste la tarea no puede ser futura." };
  }

  const limiteInferior = sumarMesesIso(params.temporadaInicioIso, -12);
  if (params.fechaHechaIso < limiteInferior) {
    return {
      valido: false,
      error: "La fecha ingresada es demasiado antigua para esta temporada.",
    };
  }

  const notaLimpia = params.nota?.trim() || null;
  if (notaLimpia && notaLimpia.length > LIMITES_CALENDARIO.notaMaxCaracteres) {
    return {
      valido: false,
      error: `La nota no puede superar los ${LIMITES_CALENDARIO.notaMaxCaracteres} caracteres.`,
    };
  }

  return { valido: true, fechaHecha: params.fechaHechaIso, nota: notaLimpia };
}
