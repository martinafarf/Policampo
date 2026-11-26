// Dos formas de esconder la explicación hasta que alguien la busque (para no intimidar con texto):
//
// - <Desplegable>: una caja con una pregunta ("¿Por qué 20 %?") que se abre debajo. Para explicaciones
//   de un párrafo o más.
// - <MasInfo>: un botón chico (ⓘ) al lado de una palabra técnica ("plantas de servicio") que abre una
//   explicación de una o dos frases.
//
// <Desplegable> usa <details>/<summary> de HTML: se abre y cierra sin JavaScript, funciona con teclado y
// los lectores de pantalla anuncian si está abierto o cerrado.
// <MasInfo> va DENTRO de una oración (adentro de un <p>), y ahí HTML no permite <details> ni <div>.
// Por eso es un <button> con un <span> que aparece al tocarlo (aria-expanded avisa si está abierto).
// Con mouse también se abre al pasar por encima (y se cierra al salir, salvo que se haya tocado: ahí queda
// fijo hasta tocar de nuevo, tocar afuera o apretar Escape). En el celular solo se abre al tocar.
"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconoChevron, IconoInfo } from "@/componentes/marca/Iconos";

export function Desplegable({
  pregunta,
  abierto = false,
  children,
}: {
  /** Escrita como la pregunta que se haría la persona: "¿Por qué 20 %?", "¿Cómo se calcula?". */
  pregunta: string;
  abierto?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={abierto} className="group rounded-2xl border-[1.5px] border-borde bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 font-semibold text-hoja hover:bg-menta [&::-webkit-details-marker]:hidden">
        <IconoInfo className="h-5 w-5 shrink-0" />
        <span className="flex-1">{pregunta}</span>
        <IconoChevron className="h-5 w-5 shrink-0 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-4 pt-1 pb-4 text-[0.95rem] text-tinta-suave">{children}</div>
    </details>
  );
}

export function MasInfo({
  sobre,
  ancho = false,
  children,
}: {
  /** De qué es la explicación; lo lee el lector de pantalla: "Más información sobre plantas de servicio". */
  sobre: string;
  /** Burbuja más ancha, para explicaciones de varios pasos. */
  ancho?: boolean;
  children: ReactNode;
}) {
  const [fijado, setFijado] = useState(false); // abierto con un toque o con el teclado
  const [alPasar, setAlPasar] = useState(false); // abierto solo porque el mouse está encima
  const abierto = fijado || alPasar;
  // Dónde se dibuja la burbuja, en coordenadas de la pantalla (ver el efecto de abajo).
  const [posicion, setPosicion] = useState<{ top: number; left: number } | null>(null);
  const raiz = useRef<HTMLSpanElement>(null);
  const burbuja = useRef<HTMLSpanElement>(null);
  const id = useId();

  // La burbuja usa position: fixed (se ubica respecto de la pantalla, no del panel donde está el ⓘ).
  // Así no la corta un panel con scroll (overflow), como el de la paleta del mapa: lo que se sale de una
  // caja con scroll queda tapado, pero lo "fixed" no. Se centra debajo del ⓘ y, si no entra, se corre lo
  // justo para quedar a 16 px del borde de la pantalla. Se recalcula si la página o un panel se scrollea.
  useLayoutEffect(() => {
    if (!abierto) return;
    const ubicar = () => {
      if (!raiz.current || !burbuja.current) return;
      const boton = raiz.current.getBoundingClientRect();
      const anchoBurbuja = burbuja.current.offsetWidth;
      const margen = 16;
      // clientWidth y no window.innerWidth: en el celular innerWidth crece si algo se sale de la pantalla.
      const anchoVisible = document.documentElement.clientWidth;
      const centrada = boton.left + boton.width / 2 - anchoBurbuja / 2;
      const left = Math.max(margen, Math.min(centrada, anchoVisible - margen - anchoBurbuja));
      setPosicion({ top: boton.bottom + 4, left });
    };
    ubicar();
    window.addEventListener("resize", ubicar);
    window.addEventListener("scroll", ubicar, true); // true: también cuando se scrollea un panel
    return () => {
      window.removeEventListener("resize", ubicar);
      window.removeEventListener("scroll", ubicar, true);
    };
  }, [abierto]);

  // Se cierra con Escape o tocando en cualquier otro lugar de la página.
  useEffect(() => {
    if (!abierto) return;
    const alTocarAfuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) {
        setFijado(false);
        setAlPasar(false);
      }
    };
    const alApretarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFijado(false);
        setAlPasar(false);
      }
    };
    document.addEventListener("pointerdown", alTocarAfuera);
    document.addEventListener("keydown", alApretarTecla);
    return () => {
      document.removeEventListener("pointerdown", alTocarAfuera);
      document.removeEventListener("keydown", alApretarTecla);
    };
  }, [abierto]);

  return (
    <span
      ref={raiz}
      className="relative inline-block align-middle"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setAlPasar(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setAlPasar(false);
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (fijado) {
            // Segundo toque: se cierra del todo (aunque el mouse siga encima).
            setFijado(false);
            setAlPasar(false);
          } else {
            setFijado(true);
          }
        }}
        aria-expanded={abierto}
        aria-controls={id}
        aria-label={`Más información sobre ${sobre}`}
        className="inline-grid h-8 w-8 place-items-center rounded-full text-hoja hover:bg-menta"
      >
        <IconoInfo className="h-5 w-5" />
      </button>
      <span
        ref={burbuja}
        id={id}
        role="note"
        hidden={!abierto}
        // Hasta medir dónde va, se dibuja invisible (para poder medir su ancho sin que se vea saltar)
        style={posicion ? { top: posicion.top, left: posicion.left } : { top: 0, left: 0, visibility: "hidden" }}
        className={`fixed z-50 block ${ancho ? "w-80" : "w-64"} before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] max-w-[calc(100vw-2rem)] rounded-2xl border-[1.5px] border-borde bg-white p-3 text-left text-sm font-normal text-tinta shadow-suave`}
      >
        {children}
      </span>
    </span>
  );
}
