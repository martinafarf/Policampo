// Pasos de un proceso, en una barra con flechitas: "1 Delimitar finca ✓ › 2 Distribuir cultivos › 3 Guardar finca".
// Sirve para que, en una pantalla con varias etapas (como el mapa), la persona vea en cuál está, cuáles ya hizo y
// cuáles faltan. Cada paso se puede tocar para ir a esa etapa (si no está deshabilitado).
//
// En el celular solo se escribe el nombre del paso actual (los demás quedan como número), para que entre en una línea.

export type EstadoPaso = "hecho" | "actual" | "pendiente";

export interface PasoDeProceso {
  titulo: string;
  estado: EstadoPaso;
  onClick?: () => void;
  deshabilitado?: boolean;
}

const PUNTA = "14px";
// Forma de flecha: el primero va recto a la izquierda, el último recto a la derecha, el resto con muesca y punta.
function formaDelPaso(indice: number, total: number): string {
  if (indice === 0) {
    return `polygon(0 0, calc(100% - ${PUNTA}) 0, 100% 50%, calc(100% - ${PUNTA}) 100%, 0 100%)`;
  }
  if (indice === total - 1) {
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${PUNTA} 50%)`;
  }
  return `polygon(0 0, calc(100% - ${PUNTA}) 0, 100% 50%, calc(100% - ${PUNTA}) 100%, 0 100%, ${PUNTA} 50%)`;
}

// Colores según el estado (paleta de la landing):
// - actual: borde naranja grueso y fondo naranja suave, círculo naranja lleno.
// - hecho: borde naranja más claro y fondo blanco, con ✓ en naranja.
// - pendiente: borde gris verdoso (el de las tarjetas) y fondo blanco.
// El borde se hace con dos capas con la misma forma de flecha: la de atrás es el "borde" y la de adelante,
// un poquito más chica (inset), es el relleno. Con clip-path no se puede usar border común.
const ESTILOS: Record<EstadoPaso, { borde: string; relleno: string; texto: string; circulo: string }> = {
  actual: {
    borde: "bg-naranja",
    relleno: "bg-[#fff1db]",
    texto: "text-bosque",
    circulo: "border-naranja bg-naranja text-bosque",
  },
  hecho: {
    borde: "bg-naranja/55",
    relleno: "bg-white group-hover:bg-[#fff8ec]",
    texto: "text-bosque",
    circulo: "border-naranja bg-white text-naranja-oscuro",
  },
  pendiente: {
    borde: "bg-borde",
    relleno: "bg-white group-hover:bg-papel",
    texto: "text-tinta-suave",
    circulo: "border-tinta-suave/40",
  },
};

export function Pasos({ pasos, etiqueta }: { pasos: readonly PasoDeProceso[]; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta}>
      <ol className="flex">
        {pasos.map((paso, i) => {
          const actual = paso.estado === "actual";
          const hecho = paso.estado === "hecho";
          const estilo = ESTILOS[paso.estado];
          const forma = formaDelPaso(i, pasos.length);
          return (
            // -ml-2.5: cada flecha encaja en la muesca de la anterior, con un espacio finito entre las dos
            <li key={paso.titulo} className={`min-w-0 ${actual ? "flex-[2]" : "flex-1"} ${i > 0 ? "-ml-2.5" : ""}`}>
              <button
                type="button"
                onClick={paso.onClick}
                disabled={paso.deshabilitado}
                aria-current={actual ? "step" : undefined}
                style={{ clipPath: forma }}
                className={`group relative flex min-h-10 w-full items-center justify-center gap-2 px-6 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55 sm:text-[0.95rem] ${estilo.borde} ${estilo.texto}`}
              >
                {/* Relleno: misma flecha, 2 px (3 px en el paso actual) más adentro, así se ve el borde */}
                <span
                  aria-hidden
                  style={{ clipPath: forma }}
                  className={`absolute transition ${actual ? "inset-[3px]" : "inset-[2px]"} ${estilo.relleno}`}
                />
                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs font-extrabold ${estilo.circulo}`}
                >
                  {hecho ? "✓" : i + 1}
                  <span className="sr-only">{hecho ? ", hecho" : actual ? ", paso actual" : ""}</span>
                </span>
                <span className={`relative truncate ${actual ? "" : "max-sm:hidden"}`}>{paso.titulo}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
