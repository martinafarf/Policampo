"use client";

// Vista interactiva del calendario de una finca: Lista por mes (por defecto) + Grilla 12 meses + checklist (Esp. 06 §5.2, §5.3, §6).
import { useMemo, useState, useTransition } from "react";
import {
  desmarcarTareaAccion,
  marcarTareaHechaAccion,
} from "@/app/fincas/[id]/calendario/acciones";
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

const COLORES_BARRA_TIPO: Readonly<Record<TipoTarea, string>> = {
  siembra: "bg-emerald-600",
  limite_siembra: "bg-red-600",
  corte: "bg-amber-600",
  no_pulverizar: "bg-pink-600",
  info_floracion_cultivo: "bg-lime-500/80",
  info_cosecha_cultivo: "bg-yellow-500/80",
  info_floracion_planta: "bg-purple-500/80",
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

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3">
        <div role="tablist" aria-label="Modo de visualización" className="inline-flex rounded-lg bg-stone-100 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={vista === "lista"}
            onClick={() => setVista("lista")}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold ${
              vista === "lista" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600"
            }`}
          >
            Lista por mes
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vista === "meses"}
            onClick={() => setVista("meses")}
            className={`min-h-9 rounded-md px-3 text-xs font-semibold ${
              vista === "meses" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600"
            }`}
          >
            Grilla 12 meses
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
          <input
            type="checkbox"
            checked={mostrarInformativas}
            onChange={(e) => setMostrarInformativas(e.target.checked)}
          />
          Mostrar períodos informativos
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {vista === "lista" ? (
        <div className="flex flex-col gap-5">
          {gruposMes.map(([mesClave, lista]) => (
            <section key={mesClave} className="flex flex-col gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-stone-600">
                {nombreMesAnio(mesClave)}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {lista.map((t) => (
                  <li
                    key={t.id}
                    className={`flex flex-col gap-2.5 rounded-xl border p-4 shadow-xs ${
                      t.esInformativa
                        ? "border-stone-200 bg-stone-50/70"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                            {t.esInformativa ? "ℹ️ " : ""}
                            {ETIQUETAS_TIPO_TAREA[t.tipo]}
                          </span>
                          {!t.esInformativa ? <BadgeEstadoTarea estado={t.estado} /> : null}
                          {t.estimada ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                              Fecha estimada
                            </span>
                          ) : null}
                        </div>
                        <h3 className="text-base font-bold text-stone-900">{t.titulo}</h3>
                      </div>

                      <p className="text-xs font-semibold text-stone-600">
                        {t.fechaInicio === t.fechaFin
                          ? formatearFechaCortaEsAr(t.fechaInicio)
                          : `${formatearFechaCortaEsAr(t.fechaInicio)} – ${formatearFechaCortaEsAr(t.fechaFin)}`}
                      </p>
                    </div>

                    <p className="text-xs text-stone-700">{t.descripcion}</p>

                    {t.hechaEn ? (
                      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                        <p>
                          <strong>Hecha el {formatearFechaCortaEsAr(t.hechaEn)}.</strong>
                        </p>
                        {t.nota ? <p className="mt-0.5 text-sky-900">Nota: {t.nota}</p> : null}
                      </div>
                    ) : null}

                    {/* Controles de checklist (solo para tareas accionables, CA-06-09) */}
                    {!t.esInformativa ? (
                      <div className="flex flex-col gap-2 pt-1">
                        {!t.hechaEn && tareaEditandoId !== t.id ? (
                          <button
                            type="button"
                            onClick={() => abrirPanelMarcar(t.id)}
                            className="inline-flex min-h-11 items-center justify-center self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                          >
                            Marcar hecha
                          </button>
                        ) : null}

                        {!t.hechaEn && tareaEditandoId === t.id ? (
                          <div className="flex flex-col gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-800">
                              Fecha en que la hiciste
                              <input
                                type="date"
                                max={hoyIso}
                                value={fechaHecha}
                                onChange={(e) => setFechaHecha(e.target.value)}
                                className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal"
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-800">
                              Nota opcional (hasta {LIMITES_CALENDARIO.notaMaxCaracteres} caracteres)
                              <textarea
                                rows={2}
                                maxLength={LIMITES_CALENDARIO.notaMaxCaracteres}
                                value={nota}
                                onChange={(e) => setNota(e.target.value)}
                                placeholder="Ej.: sembramos con suelo húmedo después de la lluvia"
                                className="rounded-lg border border-stone-300 bg-white p-2 text-sm font-normal"
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={pendiente}
                                onClick={() => confirmarMarcar(t.id)}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                              >
                                {pendiente ? "Guardando…" : "Guardar como hecha"}
                              </button>
                              <button
                                type="button"
                                disabled={pendiente}
                                onClick={() => setTareaEditandoId(null)}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700"
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
                            className="self-start text-xs font-semibold text-stone-600 underline hover:text-stone-900"
                          >
                            Desmarcar
                          </button>
                        ) : null}

                        {t.hechaEn && confirmandoDesmarcarId === t.id ? (
                          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
                            <span className="font-medium text-amber-950">
                              ¿Desmarcar esta tarea? Se borrará la fecha y la nota.
                            </span>
                            <button
                              type="button"
                              disabled={pendiente}
                              onClick={() => confirmarDesmarcar(t.id)}
                              className="rounded-md bg-amber-700 px-2.5 py-1 font-semibold text-white"
                            >
                              Sí, desmarcar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoDesmarcarId(null)}
                              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-semibold text-stone-700"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        /* Grilla de 12 meses con scroll horizontal dentro del contenedor (CA-06-17) */
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white p-3">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[190px_repeat(12,minmax(0,1fr))] gap-1 border-b border-stone-200 pb-2 text-center text-[11px] font-bold text-stone-600">
              <span className="text-left">Tarea / período</span>
              {meses.map((m) => (
                <span key={m.clave} className="capitalize">
                  {m.etiqueta}
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
                    className="grid grid-cols-[190px_repeat(12,minmax(0,1fr))] items-center gap-1 text-xs"
                  >
                    <span className="truncate pr-2 font-medium text-stone-800" title={t.titulo}>
                      {t.esInformativa ? "ℹ️ " : ""}
                      {t.titulo}
                    </span>
                    {meses.map((m) => {
                      const activa = m.clave >= iniMes && m.clave <= finMes;
                      return (
                        <span
                          key={m.clave}
                          title={`${t.titulo}: ${t.fechaInicio} a ${t.fechaFin}`}
                          className={`h-4 rounded-xs ${
                            activa ? COLORES_BARRA_TIPO[t.tipo] : "bg-stone-100"
                          } ${t.hechaEn && activa ? "opacity-45" : ""}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
