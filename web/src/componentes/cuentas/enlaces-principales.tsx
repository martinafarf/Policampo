"use client";
// "Inicio" y "Herramientas" del encabezado, con un subrayado que se desliza hasta el que corresponde a la
// página donde está la persona:
// - Inicio: la landing ("/").
// - Herramientas: el panel y todas sus pantallas (fincas, guía de especies, tareas, informes...).
// - Ninguno en "Mi perfil", que se abre desde el círculo de perfil.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const LINK =
  "texto-encabezado hover-encabezado inline-flex min-h-10 items-center rounded-full px-2.5 font-semibold whitespace-nowrap text-bosque hover:bg-menta sm:px-3";

function seccionActual(ruta: string): "inicio" | "herramientas" | null {
  if (ruta === "/") return "inicio";
  if (ruta === "/perfil" || ruta.startsWith("/perfil/")) return null;
  return "herramientas";
}

export function EnlacesPrincipales() {
  const ruta = usePathname();
  const actual = seccionActual(ruta);
  const contenedor = useRef<HTMLDivElement>(null);
  const raya = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const caja = contenedor.current;
    const el = raya.current;
    if (!caja || !el) return;
    const colocar = () => {
      const enlace = actual ? caja.querySelector<HTMLElement>(`[data-principal="${actual}"]`) : null;
      if (!enlace) {
        el.style.opacity = "0";
        return;
      }
      // La raya mide lo mismo que el texto (sin el relleno de la píldora del enlace).
      const relleno = parseFloat(getComputedStyle(enlace).paddingLeft) || 0;
      el.style.width = `${enlace.offsetWidth - relleno * 2}px`;
      el.style.transform = `translateX(${enlace.offsetLeft + relleno}px)`;
      el.style.opacity = "1";
    };
    colocar();
    // Si cambia el ancho (girar el celular, cargar la tipografía), se vuelve a medir.
    const observador = new ResizeObserver(colocar);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [actual]);

  return (
    <div ref={contenedor} className="relative flex items-center gap-1 sm:gap-2">
      <Link href="/" data-principal="inicio" aria-current={actual === "inicio" ? "page" : undefined} className={LINK}>
        Inicio
      </Link>
      <Link
        href="/inicio"
        data-principal="herramientas"
        aria-current={actual === "herramientas" ? "page" : undefined}
        className={LINK}
      >
        Herramientas
      </Link>
      <span
        ref={raya}
        aria-hidden="true"
        className="subrayado-seccion subrayado-principal pointer-events-none absolute bottom-1 left-0 h-[3px] rounded-full"
        style={{ width: 0, opacity: 0 }}
      />
    </div>
  );
}
