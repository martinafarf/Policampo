"use client";
// "Inicio", "Herramientas" y "Tareas" del encabezado, con un subrayado que se desliza hasta el que corresponde a la
// página donde está la persona:
// - Inicio: la landing ("/").
// - Herramientas: el panel y todas sus pantallas (fincas, guía de especies, informes...).
// - Tareas: la lista de tareas (/tareas). Lleva un número naranja si hay tareas atrasadas o en curso,
//   para que se note sin tener que entrar.
// - Ninguno en "Mi perfil", que se abre desde el círculo de perfil.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const LINK =
  "texto-encabezado hover-encabezado inline-flex min-h-10 items-center rounded-full px-2.5 font-semibold whitespace-nowrap text-bosque hover:bg-menta sm:px-3";

function seccionActual(ruta: string): "inicio" | "herramientas" | "tareas" | null {
  if (ruta === "/") return "inicio";
  if (ruta === "/tareas" || ruta.startsWith("/tareas/")) return "tareas";
  if (ruta === "/perfil" || ruta.startsWith("/perfil/")) return null;
  return "herramientas";
}

/** Circulito naranja con la cantidad de tareas para hacer ya. No se muestra si no hay ninguna. */
export function ContadorTareas({ cantidad }: { cantidad: number }) {
  if (cantidad <= 0) return null;
  return (
    <span className="ml-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-naranja px-1.5 text-xs font-bold text-bosque">
      {cantidad > 99 ? "99+" : cantidad}
      <span className="sr-only">{cantidad === 1 ? " tarea para hacer ahora" : " tareas para hacer ahora"}</span>
    </span>
  );
}

export function EnlacesPrincipales({ tareasAhora = 0 }: { tareasAhora?: number }) {
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
      // La raya mide lo mismo que la palabra (sin el relleno de la píldora ni el número de Tareas).
      // Los enlaces no tienen position, así que offsetLeft de la palabra se mide desde este contenedor.
      const palabra = enlace.querySelector<HTMLElement>("[data-palabra]") ?? enlace;
      el.style.width = `${palabra.offsetWidth}px`;
      el.style.transform = `translateX(${palabra.offsetLeft}px)`;
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
        <span data-palabra>Inicio</span>
      </Link>
      <Link
        href="/inicio"
        data-principal="herramientas"
        aria-current={actual === "herramientas" ? "page" : undefined}
        className={LINK}
      >
        <span data-palabra>Herramientas</span>
      </Link>
      <Link
        href="/tareas"
        data-principal="tareas"
        aria-current={actual === "tareas" ? "page" : undefined}
        className={LINK}
      >
        <span data-palabra>Tareas</span>
        <ContadorTareas cantidad={tareasAhora} />
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
