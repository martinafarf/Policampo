"use client";
// Abeja que persigue el cursor en la portada de la landing (solo en computadora).
//
// - Se monta adentro de la portada y escucha el mouse de su contenedor (la <section>), así que solo
//   reacciona dentro de ese sector.
// - Sin el cursor en la portada, revolotea en un punto de reposo (junto a la hoja que flota).
// - Se mueve con "interpolación": en cada cuadro avanza una fracción del camino que le falta, así el
//   vuelo es suave y con un poco de retraso, como un insecto de verdad. Se inclina y mira hacia donde va.
// - No usa estado de React por cuadro: mueve el elemento directamente (style.transform) para no
//   re-renderizar 60 veces por segundo.
// - Solo con mouse y pantalla ancha, nunca con "reducir movimiento"; y solo anima mientras la
//   portada está en pantalla. Es decorativa: aria-hidden y no bloquea los clics (pointer-events: none).
import { useEffect, useRef } from "react";
import { sinAnimaciones } from "./movimiento";

/** Punto de reposo, en proporción del ancho y alto de la portada (cerca de la hoja que flota). */
const REPOSO = { x: 0.6, y: 0.3 };
/** Para que la abeja quede al costado del cursor y no lo tape. */
const DESFASE = { x: -38, y: -30 };
/** Qué fracción de la distancia que falta recorre en cada cuadro (más alto = más rápida). */
const SUAVIDAD = 0.07;

export function AbejaCursor() {
  const capa = useRef<HTMLDivElement>(null);
  const abeja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const contenedor = capa.current?.parentElement;
    const el = abeja.current;
    if (!contenedor || !el) return;
    const conMouse = matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    if (!conMouse.matches || sinAnimaciones()) return;

    const caja = () => contenedor.getBoundingClientRect();
    const reposo = () => ({ x: caja().width * REPOSO.x, y: caja().height * REPOSO.y });

    let pos = reposo();
    let objetivo = { ...pos };
    let persiguiendo = false;
    let mirandoIzquierda = false;
    let cuadro = 0;
    let visible = false;

    el.style.opacity = "1";

    const alMover = (e: PointerEvent) => {
      const r = caja();
      objetivo = { x: e.clientX - r.left + DESFASE.x, y: e.clientY - r.top + DESFASE.y };
      persiguiendo = true;
    };
    const alSalir = () => {
      persiguiendo = false;
      objetivo = reposo();
    };

    const animar = (t: number) => {
      const dx = objetivo.x - pos.x;
      const dy = objetivo.y - pos.y;
      pos = { x: pos.x + dx * SUAVIDAD, y: pos.y + dy * SUAVIDAD };

      // Revoloteo: un vaivén suave que nunca se detiene (más amplio en reposo).
      const amplitud = persiguiendo ? 4 : 9;
      const flotaX = Math.sin(t / 420) * amplitud;
      const flotaY = Math.cos(t / 300) * amplitud * 0.8;

      // Mira hacia donde va (con un margen para que no "tiemble" al quedarse quieta).
      if (dx < -2) mirandoIzquierda = true;
      else if (dx > 2) mirandoIzquierda = false;
      // Se inclina según la velocidad, con un límite.
      const inclinacion = Math.max(-25, Math.min(25, dy * 0.25 + dx * 0.05));

      el.style.transform =
        `translate(${pos.x + flotaX}px, ${pos.y + flotaY}px) ` +
        `rotate(${inclinacion}deg) scaleX(${mirandoIzquierda ? -1 : 1})`;
      cuadro = requestAnimationFrame(animar);
    };

    // Solo anima mientras la portada se ve.
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting && !visible) {
        visible = true;
        cuadro = requestAnimationFrame(animar);
      } else if (!entrada.isIntersecting && visible) {
        visible = false;
        cancelAnimationFrame(cuadro);
      }
    });
    observador.observe(contenedor);
    contenedor.addEventListener("pointermove", alMover);
    contenedor.addEventListener("pointerleave", alSalir);

    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
      contenedor.removeEventListener("pointermove", alMover);
      contenedor.removeEventListener("pointerleave", alSalir);
    };
  }, []);

  return (
    <div ref={capa} className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {/* Empieza invisible: solo aparece si el efecto decide animarla (computadora con mouse). */}
      <div ref={abeja} className="absolute top-0 left-0 opacity-0 transition-opacity duration-500 will-change-transform">
        <DibujoAbeja />
      </div>
    </div>
  );
}

/**
 * Abeja en estilo "dibujo a mano" (como la referencia que eligió el grupo): contorno grueso y redondeado,
 * cuerpo ovalado inclinado con dos rayas, alas redondas atrás, antena curva y una estela punteada.
 * Colores de la paleta: contorno y rayas bosque, cuerpo naranja, alas blancas.
 * Las alas aletean con CSS (clase ala-abeja, en globals.css).
 */
function DibujoAbeja() {
  const TRAZO = { stroke: "var(--color-bosque)", strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg
      viewBox="0 0 70 54"
      className="h-[54px] w-[70px] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_3px_5px_rgb(0_0_0/.3)]"
    >
      <defs>
        {/* Las rayas se recortan con la forma del cuerpo para que no se salgan del contorno */}
        <clipPath id="cuerpo-abeja">
          <ellipse cx="38" cy="33" rx="17" ry="13" transform="rotate(-18 38 33)" />
        </clipPath>
      </defs>

      {/* Estela punteada (el "camino" que deja al volar) */}
      <path d="M3 44c4-2 8-2 12 0" fill="none" {...TRAZO} strokeWidth={2.6} strokeDasharray="0.5 6" />

      {/* Alas redondas, detrás del cuerpo */}
      <g className="ala-abeja" fill="#fff" {...TRAZO}>
        <circle cx="30" cy="15" r="9" />
        <circle cx="40" cy="12" r="8" />
      </g>

      {/* Cuerpo naranja, inclinado */}
      <ellipse cx="38" cy="33" rx="17" ry="13" transform="rotate(-18 38 33)" fill="var(--color-naranja)" />
      {/* Dos rayas gruesas */}
      <g clipPath="url(#cuerpo-abeja)" stroke="var(--color-bosque)" strokeWidth="5.5">
        <path d="M30 16 37 50" />
        <path d="M40 13 47 47" />
      </g>
      {/* Contorno del cuerpo (después de las rayas, para que quede encima) */}
      <ellipse cx="38" cy="33" rx="17" ry="13" transform="rotate(-18 38 33)" fill="none" {...TRAZO} />

      {/* Aguijón */}
      <path d="M21.5 39 16 42" {...TRAZO} />
      {/* Ojo */}
      <circle cx="50" cy="27" r="2.1" fill="var(--color-bosque)" />
      {/* Antena curva con la punta enrulada */}
      <path d="M48 20c1-6 5-10 10-10 3 0 4 3 2 4" fill="none" {...TRAZO} strokeWidth={2.6} />
    </svg>
  );
}
