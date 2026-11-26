// Color de cada sector según su cultivo (o violeta si son flores). Es el mismo color en la paleta, en el croquis,
// en el mapa y en los dibujos de solo lectura (ficha, Mis fincas, diagnóstico), así cada cultivo se reconoce igual
// en todas las pantallas. Está en un archivo aparte (sin "use client") para que lo usen también los componentes
// que se dibujan en el servidor.
import type { TipoSector } from "@/dominio/establecimientos";

const COLORES_POR_CULTIVO: Readonly<Record<string, { borde: string; relleno: string }>> = {
  frutilla: { borde: "#be123c", relleno: "rgba(225, 29, 72, 0.28)" },
  arandano: { borde: "#4338ca", relleno: "rgba(79, 70, 229, 0.28)" },
  durazno: { borde: "#c2410c", relleno: "rgba(234, 88, 12, 0.28)" },
  tomate: { borde: "#b91c1c", relleno: "rgba(220, 38, 38, 0.28)" },
  pimiento: { borde: "#15803d", relleno: "rgba(22, 163, 74, 0.30)" },
  palta: { borde: "#166534", relleno: "rgba(21, 128, 61, 0.30)" },
  citricos: { borde: "#a16207", relleno: "rgba(202, 138, 4, 0.28)" },
  zapallo: { borde: "#b45309", relleno: "rgba(217, 119, 6, 0.28)" },
  horticolas: { borde: "#0f766e", relleno: "rgba(13, 148, 136, 0.28)" },
};

const COLOR_FLORES = { borde: "#7e22ce", relleno: "rgba(147, 51, 234, 0.34)" };
/** Para los cultivos que no tienen color propio (por ejemplo, los escritos a mano en «Otro cultivo»). */
const COLOR_OTRO_CULTIVO = { borde: "#15803d", relleno: "rgba(22, 163, 74, 0.30)" };

/** ¿Este cultivo del catálogo tiene un color propio? (si no, usa el verde de «otros cultivos») */
export function tieneColorPropio(claveCultivo: string | null | undefined): boolean {
  return !!claveCultivo && claveCultivo in COLORES_POR_CULTIVO;
}

export function colorDeSector(
  tipo: TipoSector,
  claveCultivo?: string | null,
): {
  borde: string;
  relleno: string;
} {
  if (tipo === "sector_flores") return COLOR_FLORES;
  return (claveCultivo ? COLORES_POR_CULTIVO[claveCultivo] : undefined) ?? COLOR_OTRO_CULTIVO;
}
