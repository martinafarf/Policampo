// Etiqueta de estado: "Listo", "Te toca", "Falta diagnóstico", "Atrasada"...
// Siempre lleva TEXTO (y casi siempre un ícono): el color solo no alcanza, porque no todas las
// personas distinguen colores y al sol se ven peor.
import type { ComponentType, ReactNode } from "react";
import { IconoAlerta, IconoCandado, IconoOk } from "@/componentes/marca/Iconos";

export type TonoEtiqueta = "listo" | "ahora" | "espera" | "atencion" | "error";

const TONOS: Record<TonoEtiqueta, { clases: string; Icono: ComponentType<{ className?: string }> | null }> = {
  // Algo terminado o que está bien.
  listo: { clases: "bg-menta text-bosque", Icono: IconoOk },
  // Lo que la persona tiene que hacer ahora. Naranja con texto bosque (6,7:1).
  ahora: { clases: "bg-naranja text-bosque", Icono: null },
  // Todavía no se puede (falta un paso anterior).
  espera: { clases: "border-[1.5px] border-borde bg-papel text-tinta-suave", Icono: IconoCandado },
  // Algo a mejorar, sin ser un error ("Bajo", "Sin flores cerca"). Marrón sobre crema (7:1).
  atencion: { clases: "bg-[#fff3df] text-[#7a4100]", Icono: IconoAlerta },
  // Un problema real ("Atrasada", "No se pudo generar").
  error: { clases: "bg-error-claro text-error", Icono: IconoAlerta },
};

type Props = {
  tono: TonoEtiqueta;
  /** false para no mostrar el ícono (por ejemplo, si va en un lugar muy chico). */
  conIcono?: boolean;
  children: ReactNode;
};

export function Etiqueta({ tono, conIcono = true, children }: Props) {
  const { clases, Icono } = TONOS[tono];
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold ${clases}`}>
      {conIcono && Icono && <Icono className="h-4 w-4 shrink-0" />}
      {children}
    </span>
  );
}
