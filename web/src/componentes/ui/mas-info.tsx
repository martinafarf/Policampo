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

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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
  children,
}: {
  /** De qué es la explicación; lo lee el lector de pantalla: "Más información sobre plantas de servicio". */
  sobre: string;
  children: ReactNode;
}) {
  const [fijado, setFijado] = useState(false); // abierto con un toque o con el teclado
  const [alPasar, setAlPasar] = useState(false); // abierto solo porque el mouse está encima
  const abierto = fijado || alPasar;
  const [corrimiento, setCorrimiento] = useState(0);
  const raiz = useRef<HTMLSpanElement>(null);
  const burbuja = useRef<HTMLSpanElement>(null);
  const id = useId();

  // La burbuja se centra debajo del ⓘ; si el ⓘ está cerca de un borde de la pantalla (pasa en el
  // celular), se corre lo justo para no quedar cortada (16 px de margen).
  useEffect(() => {
    if (!abierto || !burbuja.current) return;
    const { left, right } = burbuja.current.getBoundingClientRect();
    const margen = 16;
    // clientWidth y no window.innerWidth: en el celular innerWidth crece si algo se sale de la pantalla.
    const anchoVisible = document.documentElement.clientWidth;
    if (left < margen) setCorrimiento((c) => c + (margen - left));
    else if (right > anchoVisible - margen) setCorrimiento((c) => c - (right - (anchoVisible - margen)));
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
          setCorrimiento(0);
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
        style={{ transform: `translateX(calc(-50% + ${corrimiento}px))` }}
        className="absolute top-9 left-1/2 z-30 block w-64 before:absolute before:-top-2 before:left-0 before:h-2 before:w-full before:content-[''] max-w-[calc(100vw-2rem)] rounded-2xl border-[1.5px] border-borde bg-white p-3 text-left text-sm font-normal text-tinta shadow-suave"
      >
        {children}
      </span>
    </span>
  );
}
