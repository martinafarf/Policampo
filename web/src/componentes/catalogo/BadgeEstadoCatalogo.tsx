// Etiqueta visual del estado de un registro del catálogo (Esp. 03, sección 6).
// Borrador (gris), Publicado (verde) y Retirado (tachado).
import type { EstadoCatalogo } from "@/dominio/catalogo";

const ESTILOS: Readonly<Record<EstadoCatalogo, { texto: string; clase: string }>> = {
  borrador: {
    texto: "Borrador",
    clase: "bg-stone-200 text-stone-800",
  },
  publicado: {
    texto: "Publicado",
    clase: "bg-emerald-100 text-emerald-900",
  },
  retirado: {
    texto: "Retirado",
    clase: "bg-stone-100 text-stone-500 line-through",
  },
};

export function BadgeEstadoCatalogo({ estado }: { estado: EstadoCatalogo }) {
  const config = ESTILOS[estado];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.clase}`}>
      {config.texto}
    </span>
  );
}
