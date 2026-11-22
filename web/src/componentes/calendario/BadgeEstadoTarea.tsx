// Insignia accesible de estado de tarea (ícono + texto, no depende solo del color — CA-06-17).
import {
  ETIQUETAS_ESTADO_TAREA,
  ICONOS_ESTADO_TAREA,
  type EstadoTarea,
} from "@/dominio/calendario";

const CLASES: Readonly<Record<EstadoTarea, string>> = {
  proxima: "border-stone-200 bg-stone-100 text-stone-800",
  en_curso: "border-emerald-200 bg-emerald-100 text-emerald-900",
  hecha: "border-sky-200 bg-sky-100 text-sky-900",
  atrasada: "border-red-200 bg-red-100 text-red-900",
};

export function BadgeEstadoTarea({ estado }: { estado: EstadoTarea }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLASES[estado]}`}
    >
      <span aria-hidden>{ICONOS_ESTADO_TAREA[estado]}</span>
      <span>{ETIQUETAS_ESTADO_TAREA[estado]}</span>
    </span>
  );
}
