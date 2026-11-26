"use client";

// Paleta de sectores compartida por los métodos croquis (T4) y mapa (T5) (Esp. 02, 5.3 y 11).
// Es como una caja de lápices de colores: se elige con qué dibujar y se puede cambiar cuantas veces haga falta.
//
// Hay dos versiones:
// - PaletaSectores (croquis): todas las opciones a la vista, en dos grupos con título ("Tus cultivos" y "Flores y
//   vegetación"), una frase que dice que se puede dibujar de todo y arriba "Estás dibujando: 🫐 Arándano".
// - PaletaAgrupada (mapa): con un buscador y grupos que se abren y se cierran (Frutales, Hortalizas, Otros cultivos,
//   Flores y vegetación), para que la lista no se haga larga y se encuentre rápido lo que se busca.
// En las dos, cada opción lleva el mismo color que después tiene el sector en el dibujo.
import { useState } from "react";
import { IconoChevron, IconoLupa, IconoOk } from "@/componentes/marca/Iconos";
import { MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { colorDeSector } from "./colores";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  SUBTIPOS_FLORES,
  type CultivoCatalogoItem,
  type SubtipoFlores,
  type TipoSector,
} from "@/dominio/establecimientos";

// Se sigue exportando desde acá para no cambiar los import del croquis y del mapa.
export { colorDeSector };

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

/** El emoji de un cultivo del catálogo (🌱 si no tiene uno propio). */
export function iconoDeCultivo(clave: string | undefined): string {
  return (clave ? ICONOS_CULTIVO[clave] : undefined) ?? "🌱";
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
  llena = false,
  children,
}: {
  activa: boolean;
  compacta?: boolean;
  /** Ocupa todo el ancho de su casillero (para armar columnas parejas). */
  llena?: boolean;
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
        compacta ? (llena ? "min-h-9 gap-1 px-2 text-[0.82rem]" : "min-h-9 gap-1.5 px-3 text-sm") : "min-h-12 gap-2 px-4 text-[0.95rem]"
      } ${llena ? "w-full justify-start" : ""} ${
        activa ? "text-tinta" : "border-borde bg-white text-tinta-suave hover:border-hoja hover:text-tinta"
      }`}
    >
      <span aria-hidden="true">{icono}</span>
      <span className={llena ? "min-w-0 flex-1 text-left leading-tight" : ""}>{children}</span>
      {activa && <IconoOk className={llena ? "h-4 w-4 shrink-0" : "h-5 w-5 shrink-0"} />}
    </button>
  );
}

/** Cuando se elige «Otro cultivo»: el nombre del cultivo, que se guarda igual aunque no esté en la lista. */
function CampoOtroCultivo({
  seleccion,
  onCambiar,
}: {
  seleccion: SeleccionPaleta;
  onCambiar: (nueva: SeleccionPaleta) => void;
}) {
  return (
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
  );
}

/** Cuando se elige «Sector de flores»: qué tipo de flores o vegetación (opcional). */
function CampoSubtipoFlores({
  seleccion,
  onCambiar,
}: {
  seleccion: SeleccionPaleta;
  onCambiar: (nueva: SeleccionPaleta) => void;
}) {
  return (
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
  );
}

export function PaletaSectores({ cultivos, seleccion, onCambiar, compacta = false }: Props) {
  const cultivosActivos = cultivos.filter((c) => c.activo);
  const esOtroCultivo = seleccion.tipo === "cultivo" && seleccion.cultivoId === null;
  const esFlores = seleccion.tipo === "sector_flores";

  // Con qué se está dibujando ahora (para el cartel de arriba).
  const cultivoElegido = cultivosActivos.find((c) => c.id === seleccion.cultivoId);
  const iconoActual = esFlores ? "🌼" : iconoDeCultivo(cultivoElegido?.clave);
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
                icono={iconoDeCultivo(c.clave)}
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

      {esOtroCultivo ? <CampoOtroCultivo seleccion={seleccion} onCambiar={onCambiar} /> : null}

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

      {esFlores ? <CampoSubtipoFlores seleccion={seleccion} onCambiar={onCambiar} /> : null}
    </Tarjeta>
  );
}

// ───────────────────────────── Versión con buscador y grupos (mapa) ─────────────────────────────

type IdGrupo = "frutales" | "hortalizas" | "otros" | "flores";

const GRUPOS: readonly { id: IdGrupo; titulo: string; icono: string; claves: readonly string[] }[] = [
  { id: "frutales", titulo: "Frutales", icono: "🍎", claves: ["arandano", "durazno", "citricos", "palta", "frutilla"] },
  { id: "hortalizas", titulo: "Hortalizas", icono: "🥕", claves: ["tomate", "pimiento", "zapallo", "horticolas"] },
  { id: "otros", titulo: "Otros cultivos", icono: "🌱", claves: [] },
  { id: "flores", titulo: "Flores y vegetación", icono: "🌼", claves: [] },
];

/** Sin tildes ni mayúsculas, para que «arandano» encuentre «Arándano». */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function grupoDeSeleccion(seleccion: SeleccionPaleta, cultivos: readonly CultivoCatalogoItem[]): IdGrupo {
  if (seleccion.tipo === "sector_flores") return "flores";
  const cultivo = cultivos.find((c) => c.id === seleccion.cultivoId);
  const grupo = GRUPOS.find((g) => cultivo && g.claves.includes(cultivo.clave));
  return grupo?.id ?? "otros";
}

export function PaletaAgrupada({ cultivos, seleccion, onCambiar }: Omit<Props, "compacta">) {
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState<ReadonlySet<IdGrupo>>(
    () => new Set<IdGrupo>([grupoDeSeleccion(seleccion, cultivos)]),
  );
  const cultivosActivos = cultivos.filter((c) => c.activo);
  const esOtroCultivo = seleccion.tipo === "cultivo" && seleccion.cultivoId === null;
  const esFlores = seleccion.tipo === "sector_flores";
  const q = normalizar(busqueda);
  const buscando = q.length > 0;

  function alternar(id: IdGrupo) {
    setAbiertos((previos) => {
      const siguiente = new Set(previos);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  const clavesConGrupo = new Set(GRUPOS.flatMap((g) => g.claves));
  const cultivosDelGrupo = (id: IdGrupo) =>
    cultivosActivos.filter((c) =>
      id === "otros" ? !clavesConGrupo.has(c.clave) : (GRUPOS.find((g) => g.id === id)?.claves ?? []).includes(c.clave),
    );

  const coincide = (nombre: string) => !buscando || normalizar(nombre).includes(q);
  const hayResultados = GRUPOS.some(
    (g) =>
      cultivosDelGrupo(g.id).some((c) => coincide(c.nombre)) ||
      (g.id === "otros" && coincide("Otro cultivo")) ||
      (g.id === "flores" && coincide("Sector de flores")),
  );

  return (
    <Tarjeta
      compacta
      titulo="Paso 1: Elegí un cultivo"
      extra={
        <MasInfo sobre="cómo dibujar varios sectores">
          Podés dibujar todos los sectores que tengas. Elegí un cultivo (o flores), marcalo en el mapa y después elegí
          otro para seguir. Cada sector es de una sola cosa.
        </MasInfo>
      }
    >
      <p className="-mt-1 text-sm text-tinta-suave">
        Seleccioná un cultivo: se usa para el próximo sector que dibujes en el mapa.
      </p>

      <div className="relative">
        <label htmlFor="paleta-buscar" className="sr-only">
          Buscar cultivo
        </label>
        <IconoLupa className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-tinta-suave" />
        <input
          id="paleta-buscar"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar cultivo…"
          className="min-h-10 w-full rounded-xl border-[1.5px] border-borde bg-white pr-3 pl-10 text-sm text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:ring-4 focus:ring-naranja/45"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {GRUPOS.map((grupo) => {
          const items = cultivosDelGrupo(grupo.id).filter((c) => coincide(c.nombre));
          const mostrarOtro = grupo.id === "otros" && coincide("Otro cultivo");
          const mostrarFlores = grupo.id === "flores" && coincide("Sector de flores");
          const cantidad = items.length + (mostrarOtro ? 1 : 0) + (mostrarFlores ? 1 : 0);
          if (buscando && cantidad === 0) return null;
          const abierto = buscando || abiertos.has(grupo.id);
          return (
            <section key={grupo.id} className="rounded-2xl bg-menta/60">
              <h3>
                <button
                  type="button"
                  aria-expanded={abierto}
                  onClick={() => alternar(grupo.id)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-2xl px-3 text-left font-bold text-bosque transition hover:bg-menta"
                >
                  <span aria-hidden="true">{grupo.icono}</span>
                  <span className="flex-1">{grupo.titulo}</span>
                  <IconoChevron
                    className={`h-5 w-5 shrink-0 text-hoja transition-transform ${abierto ? "rotate-90" : ""}`}
                  />
                </button>
              </h3>
              {abierto ? (
                <div className="flex flex-col gap-2 px-2 pb-2.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((c) => (
                      <Ficha
                        key={c.id}
                        compacta
                        llena
                        activa={seleccion.tipo === "cultivo" && seleccion.cultivoId === c.id}
                        color={colorDeSector("cultivo", c.clave)}
                        icono={iconoDeCultivo(c.clave)}
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
                    ))}
                    {mostrarOtro ? (
                      <Ficha
                        compacta
                        llena
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
                    ) : null}
                    {mostrarFlores ? (
                      <Ficha
                        compacta
                        llena
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
                    ) : null}
                  </div>
                  {grupo.id === "otros" && esOtroCultivo ? (
                    <CampoOtroCultivo seleccion={seleccion} onCambiar={onCambiar} />
                  ) : null}
                  {grupo.id === "flores" && esFlores ? (
                    <CampoSubtipoFlores seleccion={seleccion} onCambiar={onCambiar} />
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
        {buscando && !hayResultados ? (
          <p className="px-1 text-sm text-tinta-suave">No encontramos «{busqueda}». Probá con «Otro cultivo».</p>
        ) : null}
      </div>
    </Tarjeta>
  );
}
