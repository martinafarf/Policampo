// Botones de PoliCampo (DESIGN.md → Buttons). Todos son píldoras de 48 px de alto: fáciles de tocar
// con el dedo en el campo.
//
// Regla de uso (para que la pantalla se entienda sola): UNA sola acción "principal" por pantalla.
// Lo demás va como "contorno" (acciones secundarias) o "texto" (enlaces tipo "Ver más").
//
// Hay dos componentes porque en HTML no es lo mismo:
// - <Boton>: hace algo en la misma página (enviar, abrir, borrar). Es un <button>.
// - <BotonEnlace>: lleva a otra página. Es un <a> (Link de Next), así funciona "abrir en otra pestaña".
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";

export type VarianteBoton = "principal" | "contorno" | "peligro" | "texto";

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold " +
  "transition duration-200 disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTES: Record<VarianteBoton, string> = {
  // Oliva con texto blanco (5,0:1): la acción más importante de la pantalla.
  principal:
    "border-transparent bg-hoja text-white hover:-translate-y-0.5 hover:bg-hoja-oscura hover:shadow-chica",
  // Borde oliva: acciones secundarias (Editar, Volver, Descargar).
  contorno: "border-hoja bg-transparent text-hoja hover:-translate-y-0.5 hover:bg-white hover:shadow-chica",
  // Rojo: solo para borrar o dar de baja. Siempre con confirmación antes.
  peligro: "border-error bg-white text-error hover:bg-error-claro",
  // Sin borde: enlaces de menor peso ("Ver todas", "Ver en grande").
  texto: "border-transparent bg-transparent px-3 text-hoja hover:bg-menta hover:text-hoja-oscura",
};

/** Las clases de un botón, por si hace falta aplicarlas a otro elemento (por ejemplo, un <summary>). */
export function clasesBoton(variante: VarianteBoton = "principal", anchoCompleto = false): string {
  return `${BASE} ${VARIANTES[variante]}${anchoCompleto ? " w-full" : ""}`;
}

type PropsBoton = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBoton;
  /** Ocupa todo el ancho (útil en el celular y al final de un formulario). */
  anchoCompleto?: boolean;
  children: ReactNode;
};

export function Boton({ variante = "principal", anchoCompleto = false, className = "", type = "button", ...resto }: PropsBoton) {
  return <button type={type} className={`${clasesBoton(variante, anchoCompleto)} ${className}`} {...resto} />;
}

type PropsBotonEnlace = ComponentProps<typeof Link> & {
  variante?: VarianteBoton;
  anchoCompleto?: boolean;
};

export function BotonEnlace({ variante = "principal", anchoCompleto = false, className = "", ...resto }: PropsBotonEnlace) {
  return <Link className={`${clasesBoton(variante, anchoCompleto)} ${className}`} {...resto} />;
}
