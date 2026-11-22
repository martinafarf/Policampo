"use client";
// Hace aparecer suavemente su contenido cuando entra en pantalla al hacer scroll.
// Importante para la accesibilidad: el HTML llega visible desde el servidor. Solo cuando el JavaScript
// carga se marca "data-visto=no" (y recién ahí se oculta), así que sin JS o con lector de pantalla
// el contenido siempre se ve. La transición está en globals.css (.revelar).
import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { sinAnimaciones } from "./movimiento";

type Props = { children: ReactNode; className?: string; como?: ElementType };

export function Revelar({ children, className = "", como: Etiqueta = "div" }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || sinAnimaciones()) return;
    // Si ya está en pantalla al cargar, no se anima (evita que la página "parpadee").
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.visto = "no";
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          el.dataset.visto = "si";
          observador.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <Etiqueta ref={ref} className={`revelar ${className}`}>
      {children}
    </Etiqueta>
  );
}
