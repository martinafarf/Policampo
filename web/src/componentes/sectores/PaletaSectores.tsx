"use client";

// Paleta de sectores compartida por los métodos croquis (T4) y mapa (T5) (Esp. 02, 5.3 y 11).
// Es como una caja de lápices de colores: se elige con qué dibujar y se puede cambiar cuantas veces haga falta.
//
// Para que no parezca que hay que elegir UNA sola cosa (cultivo o flores), las opciones van en dos grupos
// con título ("Tus cultivos" y "Flores y vegetación"), una frase dice que se puede dibujar de todo, y arriba
// siempre se lee con qué se está dibujando ahora ("Estás dibujando: 🫐 Arándano"). Cada opción lleva el mismo
// color que después tiene el sector en el plano.
import { IconoOk } from "@/componentes/marca/Iconos";
import { MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
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
  /** Versión para un panel angosto al costado del plano: opciones más chicas y sin el párrafo de arriba (lo explica el ⓘ). */
  compacta?: boolean;
}

const CAMPO =
  "min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";

/** Una opción de la paleta: con el color del sector, y una tilde cuando es la elegida (no depende solo del color). */
function Ficha({
  activa,
  color,
  onClick,
  icono,
  compacta = false,
  children,
}: {
  activa: boolean;
  compacta?: boolean;
  color: { borde: string; relleno: string };
  onClick: () => void;
  icono: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      style={activa ? { borderColor: color.borde, backgroundColor: color.relleno } : undefined}
      className={`inline-flex items-center rounded-full border-2 font-bold transition ${
        compacta ? "min-h-9 gap-1.5 px-3 text-sm" : "min-h-12 gap-2 px-4 text-[0.95rem]"
      } ${
        activa ? "text-tinta" : "border-borde bg-white text-tinta-suave hover:border-hoja hover:text-tinta"
      }`}
    >
      <span aria-hidden="true">{icono}</span>
      {children}
      {activa && <IconoOk className="h-5 w-5 shrink-0" />}
    </button>
  );
}

export function PaletaSectores({ cultivos, seleccion, onCambiar, compacta = false }: Props) {
  const cultivosActivos = cultivos.filter((c) => c.activo);
  const esOtroCultivo = seleccion.tipo === "cultivo" && seleccion.cultivoId === null;
  const esFlores = seleccion.tipo === "sector_flores";

  // Con qué se está dibujando ahora (para el cartel de arriba).
  const cultivoElegido = cultivosActivos.find((c) => c.id === seleccion.cultivoId);
  const iconoActual = esFlores ? "🌼" : cultivoElegido ? (ICONOS_CULTIVO[cultivoElegido.clave] ?? "🌱") : "🌱";
  const nombreActual = esFlores
    ? "Sector de flores"
    : (cultivoElegido?.nombre ?? (seleccion.cultivoOtro.trim() || "Otro cultivo"));

  return (
    <Tarjeta
      compacta={compacta}
      titulo="¿Qué vas a dibujar?"
      extra={
        <MasInfo sobre="cómo dibujar varios sectores">
          Podés dibujar todos los sectores que tengas. Elegí un cultivo (o flores), marcalo en el plano y después
          elegí otro para seguir. Cada sector es de una sola cosa.
        </MasInfo>
      }
    >
      {compacta ? null : (
        <p className="text-tinta-suave">
          Elegí uno y dibujalo en el plano. Después elegí otro: podés dibujar todos los que tengas.
        </p>
      )}

      <p
        aria-live="polite"
        className={`rounded-2xl bg-menta font-semibold text-bosque ${compacta ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-[0.95rem]"}`}
      >
        Estás dibujando:{" "}
        <span className="font-bold">
          <span aria-hidden="true">{iconoActual}</span> {nombreActual}
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <h3 className="text-[0.95rem] font-bold text-bosque">Tus cultivos</h3>
        <div className="flex flex-wrap gap-2">
          {cultivosActivos.map((c) => {
            const activo = seleccion.tipo === "cultivo" && seleccion.cultivoId === c.id;
            return (
              <Ficha
                key={c.id}
                compacta={compacta}
                activa={activo}
                color={colorDeSector("cultivo", c.clave)}
                icono={ICONOS_CULTIVO[c.clave] ?? "🌱"}
                onClick={() =>
                  onCambiar({
                    tipo: "cultivo",
                    cultivoId: c.id,
                    cultivoOtro: "",
                    subtipoFlores: null,
                    etiqueta: c.nombre,
                  })
                }
              >
                {c.nombre}
              </Ficha>
            );
          })}
          <Ficha
            compacta={compacta}
            activa={esOtroCultivo}
            color={colorDeSector("cultivo")}
            icono="🌱"
            onClick={() =>
              onCambiar({
                tipo: "cultivo",
                cultivoId: null,
                cultivoOtro: seleccion.cultivoOtro || "",
                subtipoFlores: null,
                etiqueta: seleccion.cultivoOtro || "Otro cultivo",
              })
            }
          >
            Otro cultivo
          </Ficha>
        </div>
      </div>

      {esOtroCultivo ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="paleta-cultivo-otro" className="text-[0.95rem] font-semibold text-tinta">
            ¿Qué cultivo es?
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
            className={CAMPO}
          />
          <p className="text-sm text-tinta-suave">
            Se guarda igual, pero para un cultivo que no está en la lista no podemos recomendar plantas.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <h3 className="text-[0.95rem] font-bold text-bosque">Flores y vegetación</h3>
        <div className="flex flex-wrap gap-2">
          <Ficha
            compacta={compacta}
            activa={esFlores}
            color={colorDeSector("sector_flores")}
            icono="🌼"
            onClick={() =>
              onCambiar({
                tipo: "sector_flores",
                cultivoId: null,
                cultivoOtro: "",
                subtipoFlores: seleccion.subtipoFlores,
                etiqueta: "Sector de flores",
              })
            }
          >
            Sector de flores
          </Ficha>
        </div>
      </div>

      {esFlores ? (
        <div className="flex flex-col gap-1.5 sm:max-w-sm">
          <label htmlFor="paleta-subtipo-flores" className="text-[0.95rem] font-semibold text-tinta">
            ¿Qué tipo de flores o vegetación?
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
            className={CAMPO}
          >
            <option value="">No sé / sin especificar</option>
            {SUBTIPOS_FLORES.map((subtipo) => (
              <option key={subtipo} value={subtipo}>
                {ETIQUETAS_SUBTIPO_FLORES[subtipo]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </Tarjeta>
  );
}
