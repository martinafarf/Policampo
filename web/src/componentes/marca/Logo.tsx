// Logo de PoliCampo: un círculo con dos surcos ondulados (el campo) y una flor encima (las franjas
// florales). Es un dibujo SVG propio, así escala sin perder calidad y no depende de emojis.
import Link from "next/link";

export function SimboloPoliCampo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#e3f6ef" />
      <path
        d="M4 26c5-3 10-3 16 0s11 3 16 0M5 31c5-3 10-3 15 0s10 3 15 0"
        fill="none"
        stroke="#597931"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <g fill="#ff9900">
        <circle cx="20" cy="10" r="3.6" />
        <circle cx="26" cy="15" r="3.6" />
        <circle cx="14" cy="15" r="3.6" />
        <circle cx="23.5" cy="21" r="3.6" />
        <circle cx="16.5" cy="21" r="3.6" />
      </g>
      <circle cx="20" cy="16.5" r="3.2" fill="#00cc99" />
    </svg>
  );
}

/**
 * Logo con el nombre, sin fondo. Lleva a la landing.
 * - Por defecto el nombre va en verde bosque; en el encabezado de la landing pasa a blanco (clase
 *   texto-encabezado, reglas en globals.css).
 * - `sobreFoto`: siempre en blanco con una sombra suave (por ejemplo, sobre la foto de las pantallas de cuentas).
 */
export function LogoPoliCampo({ sobreFoto = false }: { sobreFoto?: boolean }) {
  const colorTexto = sobreFoto ? "text-white [text-shadow:0_1px_10px_rgb(0_0_0/.4)]" : "texto-encabezado text-bosque";
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full py-1.5 sm:gap-2.5">
      <SimboloPoliCampo className="h-9 w-9 sm:h-10 sm:w-10" />
      <span className={`font-titulos text-xl font-extrabold tracking-tight sm:text-2xl ${colorTexto}`}>
        PoliCampo
      </span>
    </Link>
  );
}
