"use client";

// Vista interactiva del calendario de una finca: Lista por mes (por defecto) + Grilla 12 meses + checklist (Esp. 06 §5.2, §5.3, §6).
//
// Pensada para el celular en el campo: cada tarea es una tarjeta con la fecha grande a la izquierda, qué hay que
// hacer en el medio y «Marcar hecha» bien visible. Las fechas de referencia (cuándo florece o se cosecha el
// cultivo) se ven más suaves, porque son para tener en cuenta y no algo que hacer.
import { useMemo, useState, useTransition } from "react";
import {
  desmarcarTareaAccion,
  marcarTareaHechaAccion,
} from "@/app/fincas/[id]/calendario/acciones";
import { IconoInfo, IconoOk } from "@/componentes/marca/Iconos";
import { clasesBoton } from "@/componentes/ui/boton";
import { Aviso } from "@/componentes/ui/formulario";
import {
  ETIQUETAS_TIPO_TAREA,
  LIMITES_CALENDARIO,
  formatearFechaCortaEsAr,
  type TipoTarea,
} from "@/dominio/calendario";
import type { TareaConEstado } from "@/dominio/calendario/servicio";
import { BadgeEstadoTarea } from "./BadgeEstadoTarea";

interface Props {
  establecimientoId: string;
  temporadaInicio: string;
  temporadaFin: string;
  hoyIso: string;
  tareas: readonly TareaConEstado[];
}

// Un color por tipo de tarea (el mismo en la tarjeta y en el año completo), con la paleta de la marca
const COLORES_TIPO: Readonly<Record<TipoTarea, { barra: string; punto: string }>> = {
  siembra: { barra: "bg-hoja", punto: "bg-hoja" },
  limite_siembra: { barra: "bg-error", punto: "bg-error" },
  corte: { barra: "bg-naranja", punto: "bg-naranja" },
  no_pulverizar: { barra: "bg-[#be185d]", punto: "bg-[#be185d]" },
  info_floracion_cultivo: { barra: "bg-turquesa/60", punto: "bg-turquesa" },
  info_cosecha_cultivo: { barra: "bg-[#e9c46a]", punto: "bg-[#e9c46a]" },
  info_floracion_planta: { barra: "bg-[#9333ea]/50", punto: "bg-[#9333ea]" },
};

function claveMes(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

function nombreMesAnio(yyyyMm: string): string {
  const [anio, mes] = yyyyMm.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(anio, mes - 1, 1)));
}

/** Día y mes corto de una fecha ISO, para el bloque de la fecha grande: { dia: "12", mes: "dic" }. */
function diaYMes(iso: string): { dia: string; mes: string } {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const nombreMes = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short" })
    .format(new Date(Date.UTC(anio, mes - 1, dia)))
    .replace(".", "");
  return { dia: String(dia), mes: nombreMes };
}

function mesesDeTemporada(inicioIso: string): { clave: string; etiqueta: string }[] {
  const [anioIni, mesIni] = inicioIso.split("-").map(Number);
  const lista: { clave: string; etiqueta: string }[] = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(anioIni, mesIni - 1 + i, 1));
    const clave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const etiqueta = new Intl.DateTimeFormat("es-AR", {
      timeZone: "UTC",
      month: "short",
    }).format(d);
    lista.push({ clave, etiqueta });
  }
  return lista;
}

export function VistaCalendarioFinca({
  establecimientoId,
  temporadaInicio,
  hoyIso,
  tareas,
}: Props) {
  const [vista, setVista] = useState<"lista" | "meses">("lista");
  const [mostrarInformativas, setMostrarInformativas] = useState(true);
  const [tareaEditandoId, setTareaEditandoId] = useState<string | null>(null);
  const [fechaHecha, setFechaHecha] = useState(hoyIso);
  const [nota, setNota] = useState("");
  const [confirmandoDesmarcarId, setConfirmandoDesmarcarId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const tareasVisibles = useMemo(
    () => (mostrarInformativas ? tareas : tareas.filter((t) => !t.esInformativa)),
    [tareas, mostrarInformativas],
  );

  const gruposMes = useMemo(() => {
    const mapa = new Map<string, TareaConEstado[]>();
    for (const t of tareasVisibles) {
      const k = claveMes(t.fechaInicio);
      const lista = mapa.get(k) ?? [];
      lista.push(t);
      mapa.set(k, lista);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tareasVisibles]);

  const meses = useMemo(() => mesesDeTemporada(temporadaInicio), [temporadaInicio]);
  const pendientes = tareas.filter((t) => !t.esInformativa && !t.hechaEn).length;

  function abrirPanelMarcar(tareaId: string) {
    setError(null);
    setConfirmandoDesmarcarId(null);
    setTareaEditandoId(tareaId);
    setFechaHecha(hoyIso);
    setNota("");
  }

  function confirmarMarcar(tareaId: string) {
    setError(null);
    iniciarTransicion(async () => {
      const res = await marcarTareaHechaAccion({
        tareaId,
        establecimientoId,
        fechaHechaIso: fechaHecha,
        nota,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo marcar la tarea.");
        return;
      }
      setTareaEditandoId(null);
      setNota("");
    });
  }

  function confirmarDesmarcar(tareaId: string) {
    setError(null);
    iniciarTransicion(async () => {
      const res = await desmarcarTareaAccion({ tareaId, establecimientoId });
      if (!res.ok) {
        setError(res.error ?? "No se pudo desmarcar la tarea.");
        return;
      }
      setConfirmandoDesmarcarId(null);
    });
  }

  const botonVista = (valor: "lista" | "meses", texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={vista === valor}
      onClick={() => setVista(valor)}
      className={`min-h-10 rounded-full px-4 text-sm font-bold transition ${
        vista === valor ? "bg-white text-bosque shadow-chica" : "text-tinta-suave hover:text-bosque"
      }`}
    >
      {texto}
    </button>
  );

  const campo =
    "rounded-2xl border-[1.5px] border-borde bg-white px-3 font-normal outline-none focus:border-hoja focus:ring-4 focus:ring-naranja/45";

  return (
    <div className="flex flex-col gap-5">
      {/* Cómo ver las tareas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-tinta-suave">
          {pendientes === 0 ? (
            "No tenés tareas pendientes."
          ) : (
            <>
              Tenés <strong className="text-tinta">{pendientes}</strong>{" "}
              {pendientes === 1 ? "tarea pendiente" : "tareas pendientes"} esta temporada.
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 font-semibold text-tinta">
            <input
              type="checkbox"
              checked={mostrarInformativas}
              onChange={(e) => setMostrarInformativas(e.target.checked)}
              className="h-5 w-5"
            />
            Fechas de referencia
          </label>
          <div role="tablist" aria-label="Cómo ver las tareas" className="inline-flex rounded-full bg-menta p-1">
            {botonVista("lista", "Por mes")}
            {botonVista("meses", "Año completo")}
          </div>
        </div>
      </div>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {vista === "lista" ? (
        <div className="flex flex-col gap-6">
          {gruposMes.length === 0 ? (
            <p className="rounded-2xl bg-papel p-5 text-tinta-suave">No hay tareas para mostrar.</p>
          ) : null}
          {gruposMes.map(([mesClave, lista]) => (
            <section key={mesClave} className="flex flex-col gap-3">
              <h2 className="font-titulos text-xl font-bold text-bosque first-letter:uppercase">
                {nombreMesAnio(mesClave)}
              </h2>
              <ul className="grid gap-3 lg:grid-cols-2">
                {lista.map((t) => {
                  const { dia, mes } = diaYMes(t.fechaInicio);
                  const rango =
                    t.fechaInicio === t.fechaFin
                      ? formatearFechaCortaEsAr(t.fechaInicio)
                      : `Del ${formatearFechaCortaEsAr(t.fechaInicio)} al ${formatearFechaCortaEsAr(t.fechaFin)}`;
                  return (
                    <li
                      key={t.id}
                      className={`flex gap-4 rounded-3xl border-2 p-4 ${
                        t.esInformativa
                          ? "border-dashed border-borde bg-white/50"
                          : t.hechaEn
                            ? "border-menta-fuerte bg-menta/60"
                            : "border-borde bg-white"
                      }`}
                    >
                      {/* La fecha, grande, para encontrarla de un vistazo */}
                      <div
                        className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl ${
                          t.esInformativa ? "bg-papel text-tinta-suave" : "bg-menta text-bosque"
                        }`}
                      >
                        <span className="font-titulos text-2xl leading-none font-extrabold">{dia}</span>
                        <span className="text-sm font-semibold">{mes}</span>
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-suave">
                            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${COLORES_TIPO[t.tipo].punto}`} />
                            {t.esInformativa ? <IconoInfo className="h-4 w-4" /> : null}
                            {ETIQUETAS_TIPO_TAREA[t.tipo]}
                          </span>
                          {!t.esInformativa ? <BadgeEstadoTarea estado={t.estado} /> : null}
                          {t.estimada ? (
                            <span className="rounded-full bg-[#fff3df] px-2.5 py-0.5 text-xs font-semibold text-[#7a4100]">
                              Fecha aproximada
                            </span>
                          ) : null}
                        </div>
                        <h3 className={`font-bold ${t.esInformativa ? "text-tinta" : "text-lg text-bosque"}`}>
                          {t.titulo}
                        </h3>
                        <p className="text-sm font-semibold text-tinta-suave">{rango}</p>
                        <p className="text-[0.95rem] text-tinta">{t.descripcion}</p>

                        {t.hechaEn ? (
                          <p className="flex items-start gap-1.5 font-semibold text-bosque">
                            <IconoOk className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
                            <span>
                              Hecha el {formatearFechaCortaEsAr(t.hechaEn)}.
                              {t.nota ? <span className="block font-normal text-tinta">Nota: {t.nota}</span> : null}
                            </span>
                          </p>
                        ) : null}

                        {/* Marcar como hecha (solo las tareas para hacer, CA-06-09) */}
                        {!t.esInformativa ? (
                          <div className="flex flex-col gap-2 pt-1">
                            {!t.hechaEn && tareaEditandoId !== t.id ? (
                              <button
                                type="button"
                                onClick={() => abrirPanelMarcar(t.id)}
                                className={`${clasesBoton("contorno")} min-h-11 self-start`}
                              >
                                <IconoOk className="h-5 w-5" />
                                Marcar hecha
                              </button>
                            ) : null}

                            {!t.hechaEn && tareaEditandoId === t.id ? (
                              <div className="flex flex-col gap-3 rounded-2xl bg-papel p-3.5">
                                <label className="flex flex-col gap-1.5 font-semibold text-tinta">
                                  ¿Qué día la hiciste?
                                  <input
                                    type="date"
                                    max={hoyIso}
                                    value={fechaHecha}
                                    onChange={(e) => setFechaHecha(e.target.value)}
                                    className={`${campo} min-h-11`}
                                  />
                                </label>
                                <label className="flex flex-col gap-1.5 font-semibold text-tinta">
                                  Nota (opcional)
                                  <textarea
                                    rows={2}
                                    maxLength={LIMITES_CALENDARIO.notaMaxCaracteres}
                                    value={nota}
                                    onChange={(e) => setNota(e.target.value)}
                                    placeholder="Ej.: sembramos con suelo húmedo después de la lluvia"
                                    className={`${campo} py-2`}
                                  />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={pendiente}
                                    onClick={() => confirmarMarcar(t.id)}
                                    className={clasesBoton("principal")}
                                  >
                                    {pendiente ? "Guardando…" : "Guardar como hecha"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={pendiente}
                                    onClick={() => setTareaEditandoId(null)}
                                    className={clasesBoton("texto")}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {t.hechaEn && confirmandoDesmarcarId !== t.id ? (
                              <button
                                type="button"
                                onClick={() => setConfirmandoDesmarcarId(t.id)}
                                className="self-start text-sm font-semibold text-tinta-suave underline underline-offset-4 hover:text-bosque"
                              >
                                Desmarcar
                              </button>
                            ) : null}

                            {t.hechaEn && confirmandoDesmarcarId === t.id ? (
                              <div className="flex flex-col gap-2 rounded-2xl bg-[#fff3df] p-3.5 text-[#7a4100]">
                                <span>¿Desmarcar esta tarea? Se borran la fecha y la nota.</span>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={pendiente}
                                    onClick={() => confirmarDesmarcar(t.id)}
                                    className={clasesBoton("principal")}
                                  >
                                    Sí, desmarcar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmandoDesmarcarId(null)}
                                    className={clasesBoton("texto")}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        /* Año completo: una fila por tarea y una columna por mes (con scroll de costado en el celular, CA-06-17) */
        <div className="overflow-x-auto rounded-[28px] border-2 border-borde bg-white p-4">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[200px_repeat(12,minmax(0,1fr))] gap-1 border-b-[1.5px] border-borde pb-2 text-center text-sm font-bold text-tinta-suave">
              <span className="text-left">Tarea</span>
              {meses.map((m) => (
                <span key={m.clave} className="capitalize">
                  {m.etiqueta.replace(".", "")}
                </span>
              ))}
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {tareasVisibles.map((t) => {
                const iniMes = claveMes(t.fechaInicio);
                const finMes = claveMes(t.fechaFin);
                return (
                  <div
                    key={t.id}
                    className="grid grid-cols-[200px_repeat(12,minmax(0,1fr))] items-center gap-1 text-sm"
                  >
                    <span
                      className={`truncate pr-2 ${t.esInformativa ? "text-tinta-suave" : "font-semibold text-tinta"}`}
                      title={t.titulo}
                    >
                      {t.titulo}
                    </span>
                    {meses.map((m) => {
                      const activa = m.clave >= iniMes && m.clave <= finMes;
                      return (
                        <span
                          key={m.clave}
                          title={`${t.titulo}: ${t.fechaInicio} a ${t.fechaFin}`}
                          className={`h-5 rounded-md ${activa ? COLORES_TIPO[t.tipo].barra : "bg-papel"} ${
                            t.hechaEn && activa ? "opacity-40" : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {/* Qué es cada color */}
            <div className="mt-4 flex flex-wrap gap-2 border-t-[1.5px] border-borde pt-3 text-sm font-semibold text-tinta-suave">
              {(Object.keys(COLORES_TIPO) as TipoTarea[]).map((tipo) => (
                <span
                  key={tipo}
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-borde px-3 py-1"
                >
                  <span aria-hidden className={`h-3 w-3 rounded-full ${COLORES_TIPO[tipo].punto}`} />
                  {ETIQUETAS_TIPO_TAREA[tipo]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
