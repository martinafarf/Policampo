"use client";

// Paleta de sectores compartida por los métodos croquis (T4) y mapa (T5) (Esp. 02, 5.3 y 11).
// Ofrece una ficha por cada cultivo activo, "Otro cultivo" y "🌼 Sector de flores".
import {
  ETIQUETAS_SUBTIPO_FLORES,
  SUBTIPOS_FLORES,
  type CultivoCatalogoItem,
  type SubtipoFlores,
  type TipoSector,
} from "@/dominio/establecimientos";

export interface SeleccionPaleta {
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string;
  subtipoFlores: SubtipoFlores | null;
  etiqueta: string;
}

const ICONOS_CULTIVO: Readonly<Record<string, string>> = {
  frutilla: "🍓",
  arandano: "🫐",
  durazno: "🍑",
  tomate: "🍅",
  pimiento: "🫑",
  palta: "🥑",
  citricos: "🍊",
  zapallo: "🎃",
  horticolas: "🥬",
};

export function colorDeSector(tipo: TipoSector, claveCultivo?: string): {
  borde: string;
  relleno: string;
} {
  if (tipo === "sector_flores") {
    return { borde: "#7e22ce", relleno: "rgba(147, 51, 234, 0.34)" };
  }
  const coloresPorCultivo: Readonly<Record<string, { borde: string; relleno: string }>> = {
    frutilla: { borde: "#be123c", relleno: "rgba(225, 29, 72, 0.28)" },
    arandano: { borde: "#4338ca", relleno: "rgba(79, 70, 229, 0.28)" },
    durazno: { borde: "#c2410c", relleno: "rgba(234, 88, 12, 0.28)" },
    tomate: { borde: "#b91c1c", relleno: "rgba(220, 38, 38, 0.28)" },
    pimiento: { borde: "#15803d", relleno: "rgba(22, 163, 74, 0.30)" },
    palta: { borde: "#166534", relleno: "rgba(21, 128, 61, 0.30)" },
    citricos: { borde: "#a16207", relleno: "rgba(202, 138, 4, 0.28)" },
    zapallo: { borde: "#b45309", relleno: "rgba(217, 119, 6, 0.28)" },
    horticolas: { borde: "#0f766e", relleno: "rgba(13, 148, 136, 0.28)" },
  };
  return (
    (claveCultivo ? coloresPorCultivo[claveCultivo] : undefined) ?? {
      borde: "#15803d",
      relleno: "rgba(22, 163, 74, 0.30)",
    }
  );
}

interface Props {
  cultivos: readonly CultivoCatalogoItem[];
  seleccion: SeleccionPaleta;
  onCambiar: (nueva: SeleccionPaleta) => void;
}

export function PaletaSectores({ cultivos, seleccion, onCambiar }: Props) {
  const cultivosActivos = cultivos.filter((c) => c.activo);
  const esOtroCultivo = seleccion.tipo === "cultivo" && seleccion.cultivoId === null;

  return (
    <section
      aria-label="Paleta de sectores"
      className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Elegí qué vas a dibujar
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onCambiar({
              tipo: "sector_flores",
              cultivoId: null,
              cultivoOtro: "",
              subtipoFlores: seleccion.subtipoFlores,
              etiqueta: "Sector de flores",
            })
          }
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
            seleccion.tipo === "sector_flores"
              ? "border-purple-700 bg-purple-100 text-purple-950"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          🌼 Sector de flores
        </button>

        {cultivosActivos.map((c) => {
          const activo = seleccion.tipo === "cultivo" && seleccion.cultivoId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                onCambiar({
                  tipo: "cultivo",
                  cultivoId: c.id,
                  cultivoOtro: "",
                  subtipoFlores: null,
                  etiqueta: c.nombre,
                })
              }
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                activo
                  ? "border-emerald-700 bg-emerald-100 font-semibold text-emerald-950"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span aria-hidden="true">{ICONOS_CULTIVO[c.clave] ?? "🌱"}</span>
              {c.nombre}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            onCambiar({
              tipo: "cultivo",
              cultivoId: null,
              cultivoOtro: seleccion.cultivoOtro || "",
              subtipoFlores: null,
              etiqueta: seleccion.cultivoOtro || "Otro cultivo",
            })
          }
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
            esOtroCultivo
              ? "border-emerald-700 bg-emerald-100 font-semibold text-emerald-950"
              : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          🌱 Otro cultivo
        </button>
      </div>

      {esOtroCultivo ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="paleta-cultivo-otro" className="text-xs font-semibold text-stone-700">
            Nombre del cultivo («Otro»)
          </label>
          <input
            id="paleta-cultivo-otro"
            type="text"
            maxLength={80}
            value={seleccion.cultivoOtro}
            onChange={(e) =>
              onCambiar({
                ...seleccion,
                cultivoOtro: e.target.value,
                etiqueta: e.target.value.trim() || "Otro cultivo",
              })
            }
            placeholder="Ej.: Quinua, papa andina…"
            className="min-h-10 w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900"
          />
          <p className="text-xs text-amber-800">
            Se guarda el sector, pero no se podrán recomendar plantas de servicio para un cultivo
            fuera del catálogo.
          </p>
        </div>
      ) : null}

      {seleccion.tipo === "sector_flores" ? (
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <label htmlFor="paleta-subtipo-flores" className="text-xs font-semibold text-stone-700">
            Subtipo de vegetación (opcional)
          </label>
          <select
            id="paleta-subtipo-flores"
            value={seleccion.subtipoFlores ?? ""}
            onChange={(e) =>
              onCambiar({
                ...seleccion,
                subtipoFlores: (e.target.value || null) as SubtipoFlores | null,
              })
            }
            className="min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
          >
            <option value="">Sin especificar</option>
            {SUBTIPOS_FLORES.map((subtipo) => (
              <option key={subtipo} value={subtipo}>
                {ETIQUETAS_SUBTIPO_FLORES[subtipo]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </section>
  );
}
