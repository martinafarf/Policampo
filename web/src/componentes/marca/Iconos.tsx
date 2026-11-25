// Íconos propios de PoliCampo, todos con el mismo trazo (2 px, puntas redondeadas) para que se vean
// como una familia. Reemplazan a los emojis. Usan "currentColor": toman el color del texto.
type Props = { className?: string };

const TRAZO = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconoFinca({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="M3 20h18M5 20V10l7-5 7 5v10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function IconoLupa({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.5-4.5M8.5 11c0-1.5 1-2.5 2.5-2.5" />
    </svg>
  );
}

export function IconoFlor({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <circle cx="12" cy="8" r="2.5" />
      <path d="M12 5.5V3M14.5 8H17M12 10.5V13M9.5 8H7M12 13v8M12 17c-2 0-4-1-5-3 2 0 4 1 5 3Zm0 1c2 0 4-1 5-3-2 0-4 1-5 3Z" />
    </svg>
  );
}

export function IconoCalendario({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

export function IconoFlecha({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconoVolver({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO} strokeWidth={2.2}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

/** Guía de especies: libro abierto con silueta de hoja. */
export function IconoGuia({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22.5V5.5Z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 1 2.5 2.5V5.5Z" />
      <path d="M7.5 8.5h2M14.5 8.5h2M14.5 12h2" />
    </svg>
  );
}

/** Informe técnico descargable: hoja con líneas y marca de verificación. */
export function IconoDocumento({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M9 12h6M9 16h4" />
    </svg>
  );
}

export function IconoOk({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO} strokeWidth={2.2}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}

export function IconoAlerta({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO} strokeWidth={2.2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </svg>
  );
}

export function IconoInfo({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO} strokeWidth={2.2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </svg>
  );
}

/** Productor: sombrero de ala ancha. */
export function IconoProductor({ className = "h-7 w-7" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="M2.5 15.5c3 1.7 16 1.7 19 0" />
      <path d="M6.5 15.8c.3-5 2.3-8.3 5.5-8.3s5.2 3.3 5.5 8.3" />
      <path d="M7 12.5c3 .9 7 .9 10 0" />
    </svg>
  );
}

/** Ingeniero agrónomo: libreta de campo con una hoja. */
export function IconoIngeniero({ className = "h-7 w-7" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 7h6M12 17c0-3 1.5-5 4-5 0 3-1.5 5-4 5Zm0 0c0-2-1-3.5-3-3.5 0 2 1 3.5 3 3.5Z" />
    </svg>
  );
}

/** Hoja rellena, para decorar (flota en la portada y en la cita). */
export function Hoja({ className = "h-12 w-12" }: Props) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M6 42C6 20 20 6 42 6c0 22-14 36-36 36Z" fill="currentColor" />
      <path d="M8 40 34 14" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Flecha chica hacia la derecha: separa las "migas de pan" y abre desplegables (gira 90°). */
export function IconoChevron({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Candado: un paso que todavía no se puede hacer (falta uno anterior). */
export function IconoCandado({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Más: agregar algo nuevo (una finca, un sector). */
export function IconoMas({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...TRAZO}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
