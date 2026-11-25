// Pasos de un proceso, en una barra con flechitas: "1 Delimitar finca ✓ › 2 Distribuir cultivos › 3 Revisar › 4 Guardar".
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

export function Pasos({ pasos, etiqueta }: { pasos: readonly PasoDeProceso[]; etiqueta: string }) {
  return (
    <nav aria-label={etiqueta}>
      <ol className="flex overflow-hidden rounded-full bg-[#e3eadc]">
        {pasos.map((paso, i) => {
          const actual = paso.estado === "actual";
          const hecho = paso.estado === "hecho";
          return (
            <li key={paso.titulo} className={`min-w-0 ${actual ? "flex-[2]" : "flex-1"} ${i > 0 ? "-ml-3" : ""}`}>
              <button
                type="button"
                onClick={paso.onClick}
                disabled={paso.deshabilitado}
                aria-current={actual ? "step" : undefined}
                style={{ clipPath: formaDelPaso(i, pasos.length) }}
                className={`flex min-h-11 w-full items-center justify-center gap-2 px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 sm:text-[0.95rem] ${
                  actual
                    ? "bg-bosque text-white"
                    : hecho
                      ? "bg-menta text-bosque hover:bg-menta-fuerte"
                      : "bg-[#eef3ea] text-tinta-suave hover:bg-white"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm ${
                    hecho
                      ? "border-hoja bg-hoja text-white"
                      : actual
                        ? "border-white text-white"
                        : "border-tinta-suave/50"
                  }`}
                >
                  {hecho ? "✓" : i + 1}
                  <span className="sr-only">{hecho ? ", hecho" : actual ? ", paso actual" : ""}</span>
                </span>
                <span className={`truncate ${actual ? "" : "max-sm:hidden"}`}>{paso.titulo}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
