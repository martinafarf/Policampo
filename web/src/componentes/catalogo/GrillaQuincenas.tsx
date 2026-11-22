"use client";

// Grilla de 24 quincenas (enero a diciembre) accesible con teclado y celular-primero (Esp. 03, 6, CA-03-19).
// Reutilizable en plantas, cultivos y Guía de especies (modo lectura).
import {
  QUINCENAS,
  describirRangosEnMeses,
  quincenasARangosSemanas,
  rangosSemanasAQuincenas,
  type RangoSemanas,
} from "@/dominio/catalogo";

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

type ColorPeriodo = "siembra" | "floracion" | "corte" | "cosecha";

const ESTILOS_ACTIVO: Readonly<Record<ColorPeriodo, string>> = {
  siembra: "border-amber-600 bg-amber-500 text-white",
  floracion: "border-purple-700 bg-purple-600 text-white",
  corte: "border-rose-700 bg-rose-600 text-white",
  cosecha: "border-emerald-700 bg-emerald-600 text-white",
};

interface Props {
  etiqueta: string;
  tipo: ColorPeriodo;
  rangos: readonly RangoSemanas[];
  onCambiar?: (nuevosRangos: RangoSemanas[]) => void;
  soloLectura?: boolean;
}

export function GrillaQuincenas({
  etiqueta,
  tipo,
  rangos,
  onCambiar,
  soloLectura = false,
}: Props) {
  const quincenasActivas = new Set(rangosSemanasAQuincenas(rangos));
  const descripcion = describirRangosEnMeses(rangos);

  function alternarQuincena(numero: number) {
    if (soloLectura || !onCambiar) return;
    const siguiente = new Set(quincenasActivas);
    if (siguiente.has(numero)) {
      siguiente.delete(numero);
    } else {
      siguiente.add(numero);
    }
    onCambiar(quincenasARangosSemanas(Array.from(siguiente)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-stone-800">{etiqueta}</span>
        <span className="text-xs text-stone-600">
          {etiqueta}: <strong>{descripcion}</strong>
        </span>
      </div>

      {/* 6 meses por fila en celular (2 filas en 360 px) y 12 meses en fila en escritorio */}
      <div
        role="group"
        aria-label={`${etiqueta}: ${descripcion}`}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
      >
        {MESES_CORTOS.map((mesCorto, idxMes) => {
          const q1 = QUINCENAS[idxMes * 2];
          const q2 = QUINCENAS[idxMes * 2 + 1];

          return (
            <div key={mesCorto} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-stone-500">{mesCorto}</span>
              <div className="grid w-full grid-cols-2 gap-0.5">
                {[q1, q2].map((q) => {
                  const activa = quincenasActivas.has(q.numero);
                  return (
                    <button
                      key={q.numero}
                      type="button"
                      disabled={soloLectura}
                      aria-label={`${etiqueta} — ${q.etiqueta}`}
                      aria-pressed={activa}
                      onClick={() => alternarQuincena(q.numero)}
                      className={`h-8 w-full rounded-sm border text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                        activa
                          ? ESTILOS_ACTIVO[tipo]
                          : "border-stone-300 bg-stone-50 text-stone-400 hover:bg-stone-100"
                      } ${soloLectura ? "cursor-default" : "cursor-pointer"}`}
                    >
                      {q.mitad}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
