// Destino después de ingresar (parámetro "volver"). Solo se aceptan rutas internas del sitio,
// para que nadie pueda armar un enlace que, después del login, lleve a otro sitio
// (redirección abierta, especificación 01 sección 8, CA-01-11).

export const DESTINO_POR_DEFECTO = "/inicio";

export function rutaInternaSegura(valor: string | null | undefined, porDefecto = DESTINO_POR_DEFECTO): string {
  if (!valor) return porDefecto;
  // Tiene que empezar con una sola "/": "//otro.com" y "/\otro.com" son URLs a otro sitio.
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) return porDefecto;
  // Sin caracteres de control (saltos de línea, tabulaciones), que algunos navegadores ignoran.
  if (/[\u0000-\u001f\u007f]/.test(valor)) return porDefecto;
  return valor;
}
