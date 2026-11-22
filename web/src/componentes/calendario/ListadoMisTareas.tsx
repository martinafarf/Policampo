"use client";

// Listado global "Mis tareas" de todas las fincas del usuario con filtros y checklist (Esp. 06 §5.2, CA-06-12).
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  desmarcarTareaAccion,
  marcarTareaHechaAccion,
} from "@/app/fincas/[id]/calendario/acciones";
import {
  ETIQUETAS_TIPO_TAREA,
  TIPOS_TAREA_ACCIONABLES,
  formatearFechaCortaEsAr,
  type EstadoTarea,
  type TipoTarea,
} from "@/dominio/calendario";
import type { TareaConEstado } from "@/dominio/calendario/servicio";
import { BadgeEstadoTarea } from "./BadgeEstadoTarea";

interface Props {
  tareas: readonly TareaConEstado[];
  hoyIso: string;
}

export function ListadoMisTareas({ tareas, hoyIso }: Props) {
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState<"pendientes" | "todas" | EstadoTarea>(
    "pendientes",
  );
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoTarea>("todos");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  const fincas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const t of tareas) {
      mapa.set(t.establecimientoId, t.establecimientoNombre);
    }
    return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1], "es-AR"));
  }, [tareas]);

  const filtradas = useMemo(() => {
    return tareas.filter((t) => {
      if (t.esInformativa) return false;
      if (filtroFinca !== "todas" && t.establecimientoId !== filtroFinca) return false;
      if (filtroTipo !== "todos" && t.tipo !== filtroTipo) return false;
      if (filtroEstado === "pendientes") return t.estado !== "hecha";
      if (filtroEstado !== "todas") return t.estado === filtroEstado;
      return true;
    });
  }, [tareas, filtroFinca, filtroEstado, filtroTipo]);

  function marcarRapido(t: TareaConEstado) {
    setError(null);
    iniciarTransicion(async () => {
      const res = await marcarTareaHechaAccion({
        tareaId: t.id,
        establecimientoId: t.establecimientoId,
        fechaHechaIso: hoyIso,
      });
      if (!res.ok) setError(res.error ?? "No se pudo marcar la tarea.");
    });
  }

  function desmarcarRapido(t: TareaConEstado) {
    setError(null);
    iniciarTransicion(async () => {
      const res = await desmarcarTareaAccion({
        tareaId: t.id,
        establecimientoId: t.establecimientoId,
      });
      if (!res.ok) setError(res.error ?? "No se pudo desmarcar la tarea.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Filtros de tareas"
        className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs sm:grid-cols-3"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
          Finca
          <select
            value={filtroFinca}
            onChange={(e) => setFiltroFinca(e.target.value)}
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-normal"
          >
            <option value="todas">Todas las fincas</option>
            {fincas.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
          Estado
          <select
            value={filtroEstado}
            onChange={(e) =>
              setFiltroEstado(e.target.value as "pendientes" | "todas" | EstadoTarea)
            }
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-normal"
          >
            <option value="pendientes">Pendientes (atrasadas, en curso y próximas)</option>
            <option value="atrasada">Solo atrasadas</option>
            <option value="en_curso">Solo en curso</option>
            <option value="proxima">Solo próximas</option>
            <option value="hecha">Hechas</option>
            <option value="todas">Todas</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
          Tipo de tarea
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as "todos" | TipoTarea)}
            className="min-h-10 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-normal"
          >
            <option value="todos">Todos los tipos</option>
            {TIPOS_TAREA_ACCIONABLES.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETAS_TIPO_TAREA[tipo]}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {filtradas.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-600">
          No hay tareas que coincidan con estos filtros.
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtradas.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeEstadoTarea estado={t.estado} />
                  <Link
                    href={`/fincas/${t.establecimientoId}/calendario`}
                    className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 hover:underline"
                  >
                    {t.establecimientoNombre}
                  </Link>
                  <span className="text-xs text-stone-500">
                    {formatearFechaCortaEsAr(t.fechaInicio)}
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-900">{t.titulo}</p>
                <p className="text-xs text-stone-600">{t.descripcion}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {!t.hechaEn ? (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => marcarRapido(t)}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    Marcar hecha hoy
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => desmarcarRapido(t)}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Desmarcar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
