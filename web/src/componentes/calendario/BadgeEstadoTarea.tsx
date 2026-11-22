// Insignia accesible de estado de tarea (ícono + texto, no depende solo del color — CA-06-17).
// Colores alineados con la paleta de marca de DESIGN.md.
import {
  ETIQUETAS_ESTADO_TAREA,
  ICONOS_ESTADO_TAREA,
  type EstadoTarea,
} from "@/dominio/calendario";

const CLASES: Readonly<Record<EstadoTarea, string>> = {
  proxima: "border-borde bg-papel text-tinta-suave",
  en_curso: "border-menta-fuerte bg-menta text-bosque",
  hecha: "border-turquesa/60 bg-turquesa/25 text-bosque",
  atrasada: "border-error/40 bg-error-claro text-error",
};

export function BadgeEstadoTarea({ estado }: { estado: EstadoTarea }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-xs font-semibold ${CLASES[estado]}`}
    >
      <span aria-hidden>{ICONOS_ESTADO_TAREA[estado]}</span>
      <span>{ETIQUETAS_ESTADO_TAREA[estado]}</span>
    </span>
  );
}
