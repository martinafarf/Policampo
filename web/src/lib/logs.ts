// Logs sin datos personales (regla RS-05, criterio CA-01-24).
//
// Nuestro código ya registra solo ids y tipos de error. Pero Better Auth escribe algunos mensajes
// con datos de la persona (por ejemplo "Sign-up attempt for existing email: ana@…") y adjunta
// objetos de error que pueden traer la IP o el pedido completo. Por eso su registrador pasa por acá:
// se ocultan emails, IPs y tokens, y de cada objeto adjunto solo queda su tipo.

const OCULTO = "[oculto]";

const PATRONES: RegExp[] = [
  /[^\s@"'<>()[\]]+@[^\s@"'<>()[\]]+\.[^\s@"'<>()[\]]+/g, // emails
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IPv4
  /\b(?:[0-9a-f]{1,4}:){2,7}[0-9a-f]{0,4}\b/gi, // IPv6
  /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, // tokens JWT (enlaces de verificación)
  /\b[A-Za-z0-9_-]{24,}\b/g, // tokens largos (sesiones, recuperación)
];

/** Reemplaza emails, IPs y tokens de un texto por "[oculto]". */
export function ocultarDatosPersonales(texto: string): string {
  return PATRONES.reduce((resultado, patron) => resultado.replace(patron, OCULTO), texto);
}

/** De un dato adjunto al log solo se conserva lo que no puede identificar a nadie. */
function resumirAdjunto(adjunto: unknown): string {
  if (adjunto instanceof Error) return `${adjunto.name}: ${ocultarDatosPersonales(adjunto.message)}`;
  if (typeof adjunto === "string") return ocultarDatosPersonales(adjunto);
  if (typeof adjunto === "number" || typeof adjunto === "boolean") return String(adjunto);
  return `[${adjunto === null ? "null" : typeof adjunto}]`;
}

type Nivel = "debug" | "info" | "warn" | "error";

/** Registrador para Better Auth (opción `logger` en src/lib/auth.ts). */
export function registrarDeBetterAuth(nivel: Nivel, mensaje: string, ...adjuntos: unknown[]): void {
  const linea = [`[auth] ${ocultarDatosPersonales(mensaje)}`, ...adjuntos.map(resumirAdjunto)].join(" ");
  if (nivel === "error") console.error(linea);
  else if (nivel === "warn") console.warn(linea);
  else console.info(linea);
}
