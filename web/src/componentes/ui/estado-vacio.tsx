// Estado vacío: lo que se muestra cuando todavía no hay nada cargado (fincas, tareas, informes).
// En vez de una pantalla en blanco, dice en UNA frase qué falta y ofrece UN botón para hacerlo.
// Ejemplo: "Todavía no tenés fincas" + "Cargar mi primera finca".
import type { ComponentType, ReactNode } from "react";

type Props = {
  Icono: ComponentType<{ className?: string }>;
  titulo: string;
  /** Opcional: una frase corta que explique por qué conviene hacerlo. */
  texto?: string;
  /** El botón que resuelve el vacío (normalmente un BotonEnlace principal). */
  accion?: ReactNode;
};

export function EstadoVacio({ Icono, titulo, texto, accion }: Props) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-[28px] border-2 border-borde bg-white px-6 py-12 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-menta text-hoja">
        <Icono className="h-8 w-8" />
      </span>
      <h2 className="text-xl font-bold text-bosque">{titulo}</h2>
      {texto && <p className="max-w-[40ch] text-tinta-suave">{texto}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </section>
  );
}
