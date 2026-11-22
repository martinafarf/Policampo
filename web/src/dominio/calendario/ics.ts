// Generador RFC 5545 de archivos .ics para descargar tareas a Google Calendar / Apple Calendar (Esp. 06 §5.7, CA-06-16, RS-07).
import { esTareaInformativa } from "./estado";
import { sumarDiasIso } from "./fechas";
import type { TipoTarea } from "./tipos";

export interface TareaParaIcs {
  id: string;
  tipo: TipoTarea;
  titulo: string;
  descripcion: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string; // YYYY-MM-DD
  fincaNombre?: string;
}

// Escapa caracteres especiales de texto RFC 5545 (\, ;, , y saltos de línea).
export function escaparTextoIcs(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

// Corta líneas a un máximo de 75 octetos UTF-8 con continuación "\r\n " según RFC 5545 §3.1.
export function plegarLineaIcs(linea: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(linea).byteLength <= 75) {
    return linea;
  }

  const partes: string[] = [];
  let actual = "";
  let bytesActuales = 0;
  let limite = 75;

  for (const ch of linea) {
    const b = encoder.encode(ch).byteLength;
    if (bytesActuales + b > limite && actual.length > 0) {
      partes.push(actual);
      actual = ch;
      bytesActuales = b;
      limite = 74; // el espacio inicial de la línea siguiente ocupa 1 octeto
    } else {
      actual += ch;
      bytesActuales += b;
    }
  }
  if (actual.length > 0) {
    partes.push(actual);
  }

  return partes.join("\r\n ");
}

function isoAFechaIcs(iso: string): string {
  return iso.replace(/-/g, "");
}

export function generarArchivoIcs(
  tareas: readonly TareaParaIcs[],
  nombreCalendario = "PoliCampo - Calendario agroecológico",
  dtstampUtc = "20260101T000000Z",
): string {
  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PoliCampo//Calendario Agroecologico v2//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTextoIcs(nombreCalendario)}`,
  ];

  for (const t of tareas) {
    const esInfo = esTareaInformativa(t.tipo);
    const prefijoFinca = t.fincaNombre ? `[${t.fincaNombre}] ` : "";
    const prefijoInfo = esInfo ? "ℹ️ " : "";
    const resumen = `${prefijoInfo}${prefijoFinca}${t.titulo}`;

    // En RFC 5545, DTEND para eventos de día completo (VALUE=DATE) es exclusivo: fechaFin + 1 día.
    const dtStart = isoAFechaIcs(t.fechaInicio);
    const dtEnd = isoAFechaIcs(sumarDiasIso(t.fechaFin, 1));

    lineas.push("BEGIN:VEVENT");
    lineas.push(`UID:policampo-tarea-${t.id}@policampo.app`);
    lineas.push(`DTSTAMP:${dtstampUtc}`);
    lineas.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lineas.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lineas.push(`SUMMARY:${escaparTextoIcs(resumen)}`);
    lineas.push(`DESCRIPTION:${escaparTextoIcs(t.descripcion)}`);
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");
  return `${lineas.map(plegarLineaIcs).join("\r\n")}\r\n`;
}
