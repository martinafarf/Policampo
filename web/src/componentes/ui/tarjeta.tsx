// Tarjeta: el contenedor de las pantallas internas (DESIGN.md → Cards / Containers).
// Blanca con borde suave y esquinas de 28 px, o menta para destacar algo ("Lo que sigue").
//
// Para no recargar la pantalla: adentro de una tarjeta NO van otras tarjetas. Las filas se separan con
// líneas finas (por ejemplo, una lista de tareas) y los grupos, con espacio.
import type { ReactNode } from "react";

type Props = {
  /** Título de la tarjeta (h2). Corto: "Flores en tu finca", "Tareas de esta semana". */
  titulo?: string;
  /** Algo chico a la derecha del título: un enlace "Ver todas", una etiqueta de estado. */
  extra?: ReactNode;
  tono?: "blanca" | "menta";
  /** Nivel del título: h2 por defecto; h3 si la tarjeta va dentro de una sección con su propio h2. */
  nivel?: 2 | 3;
  className?: string;
  children: ReactNode;
};

export function Tarjeta({ titulo, extra, tono = "blanca", nivel = 2, className = "", children }: Props) {
  const fondo = tono === "menta" ? "border-menta-fuerte bg-menta" : "border-borde bg-white";
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <section className={`flex flex-col gap-4 rounded-[28px] border-2 p-5 sm:p-6 ${fondo} ${className}`}>
      {(titulo || extra) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {titulo && <Titulo className="text-xl font-bold text-bosque">{titulo}</Titulo>}
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}
