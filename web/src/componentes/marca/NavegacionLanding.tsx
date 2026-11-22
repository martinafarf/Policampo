"use client";
// Navegación por secciones de la landing, con "seguimiento" de la sección en la que está la persona.
//
// - Pantallas anchas: enlaces en el encabezado y un subrayado que se desliza hasta la sección actual.
// - Celular: un botón "menú" que muestra el nombre de la sección actual; al tocarlo se despliega la
//   lista de secciones (la actual marcada "Estás acá") y, abajo, las opciones de cuenta (`cuenta`).
//
// Se monta en el layout de todas las páginas, pero solo se muestra en la landing (reglas en
// globals.css), y el seguimiento solo corre si la página tiene secciones.
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Secciones en el orden en que aparecen en la landing (page.tsx). */
const SECCIONES = [
  { id: "que-es", nombre: "Qué es" },
  { id: "beneficios", nombre: "Beneficios" },
  { id: "como-funciona", nombre: "Cómo funciona" },
  { id: "para-quien", nombre: "Para quién es" },
] as const;

type IdSeccion = (typeof SECCIONES)[number]["id"];

/**
 * Devuelve la sección en la que está la persona: la última cuyo comienzo ya pasó el 40 % superior
 * de la pantalla, mientras no se haya terminado. En la portada (y después de la última) es null.
 */
function useSeccionActual(): IdSeccion | null {
  const [actual, setActual] = useState<IdSeccion | null>(null);
  // Se vuelve a calcular al cambiar de ruta: las secciones solo están (visibles) en la landing.
  const ruta = usePathname();

  useEffect(() => {
    const elementos = SECCIONES.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (ruta !== "/" || elementos.length === 0) return; // no es la landing

    let cuadro = 0;
    const calcular = () => {
      cuadro = 0;
      const linea = window.innerHeight * 0.4;
      let encontrada: IdSeccion | null = null;
      for (const el of elementos) {
        const caja = el.getBoundingClientRect();
        if (caja.top <= linea && caja.bottom > linea) encontrada = el.id as IdSeccion;
      }
      setActual(encontrada);
    };
    // requestAnimationFrame: como mucho un cálculo por cuadro, aunque el scroll dispare muchos eventos.
    const alDesplazar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(calcular);
    };
    calcular();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    window.addEventListener("resize", alDesplazar);
    return () => {
      window.removeEventListener("scroll", alDesplazar);
      window.removeEventListener("resize", alDesplazar);
      cancelAnimationFrame(cuadro);
    };
  }, [ruta]);

  // Fuera de la landing no hay sección actual, aunque haya quedado guardada la última que se vio.
  return ruta === "/" ? actual : null;
}

export function NavegacionLanding({ cuenta }: { cuenta: ReactNode }) {
  const actual = useSeccionActual();
  const nombreActual = SECCIONES.find((s) => s.id === actual)?.nombre;

  return (
    <>
      <EnlacesConSubrayado actual={actual} />
      <MenuDesplegable actual={actual} nombreActual={nombreActual} cuenta={cuenta} />
    </>
  );
}

/** Pantallas anchas: enlaces con un subrayado que se mueve (posición y ancho) hasta el enlace activo. */
function EnlacesConSubrayado({ actual }: { actual: IdSeccion | null }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [subrayado, setSubrayado] = useState<{ izquierda: number; ancho: number } | null>(null);

  // useLayoutEffect: se mide antes de pintar, así el subrayado no "salta" un cuadro tarde.
  useLayoutEffect(() => {
    const medir = () => {
      const enlace = actual && contenedor.current?.querySelector<HTMLElement>(`[data-seccion="${actual}"]`);
      setSubrayado(enlace ? { izquierda: enlace.offsetLeft, ancho: enlace.offsetWidth } : null);
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [actual]);

  return (
    <nav aria-label="Secciones de la página" className="enlaces-landing">
      <div ref={contenedor} className="relative flex items-center gap-7 font-semibold">
        {SECCIONES.map((s) => (
          <a
            key={s.id}
            href={`/#${s.id}`}
            data-seccion={s.id}
            aria-current={s.id === actual ? "location" : undefined}
            className="py-2 transition-opacity hover:opacity-80"
          >
            {s.nombre}
          </a>
        ))}
        <span
          aria-hidden="true"
          className="subrayado-seccion pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full"
          style={{
            width: subrayado?.ancho ?? 0,
            transform: `translateX(${subrayado?.izquierda ?? 0}px)`,
            opacity: subrayado ? 1 : 0,
          }}
        />
      </div>
    </nav>
  );
}

/** Celular: botón que dice dónde estás y despliega las secciones y las opciones de cuenta. */
function MenuDesplegable({
  actual,
  nombreActual,
  cuenta,
}: {
  actual: IdSeccion | null;
  nombreActual: string | undefined;
  cuenta: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  // Se cierra con Escape o tocando afuera.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    const alTocar = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("pointerdown", alTocar);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("pointerdown", alTocar);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="menu-movil-landing">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((v) => !v)}
        className="texto-encabezado inline-flex min-h-11 items-center gap-2 rounded-full py-1.5 pl-2 font-semibold text-bosque"
      >
        {/* key: al cambiar de sección el nombre se vuelve a montar y repite la animación de entrada */}
        <span key={nombreActual ?? "menu"} className="nombre-seccion relative">
          {nombreActual ?? "Menú"}
        </span>
        <span className="sr-only">{abierto ? ", cerrar menú" : ", abrir menú"}</span>
        <span className="fondo-icono-menu grid h-9 w-9 place-items-center rounded-full bg-menta text-bosque" aria-hidden="true">
          <IconoHamburguesa abierto={abierto} />
        </span>
      </button>

      <div
        id={idPanel}
        hidden={!abierto}
        className="absolute inset-x-4 top-full mt-2 rounded-[24px] bg-white p-3 shadow-suave"
      >
        <nav aria-label="Secciones de la página">
          <ul className="flex flex-col">
            {SECCIONES.map((s) => {
              const esActual = s.id === actual;
              return (
                <li key={s.id}>
                  <a
                    href={`/#${s.id}`}
                    aria-current={esActual ? "location" : undefined}
                    onClick={() => setAbierto(false)}
                    className={`flex min-h-12 items-center justify-between rounded-2xl px-4 font-semibold ${
                      esActual ? "bg-menta text-bosque" : "text-tinta hover:bg-papel"
                    }`}
                  >
                    <span className={`subrayable relative ${esActual ? "activo" : ""}`}>{s.nombre}</span>
                    {esActual && <span className="text-sm font-semibold text-bosque">Estás acá</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-3 border-t border-borde pt-3" onClick={() => setAbierto(false)}>
          {cuenta}
        </div>
      </div>
    </div>
  );
}

function IconoHamburguesa({ abierto }: { abierto: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      {abierto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
