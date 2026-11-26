"use client";

// Listado global "Mis tareas" de todas las fincas del usuario con filtros y checklist (Esp. 06 §5.2, CA-06-12).
//
// Pensado para abrir desde el celular y ver qué hay que hacer: arriba, botones grandes para filtrar por estado
// (Pendientes, Atrasadas, Hechas, Todas); la finca y el tipo, en listas desplegables solo si hacen falta. Cada
// tarea es una tarjeta con la fecha grande, la finca y «Marcar hecha hoy».
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  desmarcarTareaAccion,
  marcarTareaHechaAccion,
} from "@/app/fincas/[id]/calendario/acciones";
import { IconoChevron, IconoFinca, IconoOk } from "@/componentes/marca/Iconos";
import { clasesBoton } from "@/componentes/ui/boton";
import { Aviso } from "@/componentes/ui/formulario";
import {
  ETIQUETAS_TIPO_TAREA,
  TIPOS_TAREA_ACCIONABLES,
  formatearFechaCortaEsAr,
  type EstadoTarea,
  type TipoTarea,
} from "@/dominio/calendario";
import type { TareaConEstado } from "@/dominio/calendario/servicio";
import { BadgeEstadoTarea } from "./BadgeEstadoTarea";
import { COLORES_TIPO, diaYMes } from "./VistaCalendarioFinca";

interface Props {
  tareas: readonly TareaConEstado[];
  hoyIso: string;
}

type FiltroEstado = "pendientes" | "todas" | EstadoTarea;

const FILTROS_ESTADO: readonly { valor: FiltroEstado; texto: string }[] = [
  { valor: "pendientes", texto: "Pendientes" },
  { valor: "atrasada", texto: "Atrasadas" },
  { valor: "hecha", texto: "Hechas" },
  { valor: "todas", texto: "Todas" },
];

const CLASE_SELECT =
  "min-h-11 rounded-full border-[1.5px] border-borde bg-white px-4 font-semibold text-tinta outline-none focus:border-hoja focus:ring-4 focus:ring-naranja/45";

export function ListadoMisTareas({ tareas, hoyIso }: Props) {
  const [filtroFinca, setFiltroFinca] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("pendientes");
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

  // Cuántas hay en cada estado, para mostrarlo en los botones del filtro
  const accionables = useMemo(() => tareas.filter((t) => !t.esInformativa), [tareas]);
  const cantidad = (f: FiltroEstado) =>
    accionables.filter((t) =>
      f === "pendientes" ? t.estado !== "hecha" : f === "todas" ? true : t.estado === f,
    ).length;

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
    <div className="flex flex-col gap-5">
      {/* Filtros: el estado con botones grandes; la finca y el tipo, en listas */}
      <section aria-label="Filtrar tareas" className="flex flex-col gap-3">
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => {
            const activo = filtroEstado === f.valor;
            return (
              <button
                key={f.valor}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltroEstado(f.valor)}
                className={`min-h-10 rounded-full border-[1.5px] px-4 text-[0.95rem] font-semibold transition ${
                  activo ? "border-hoja bg-hoja text-white" : "border-borde bg-white text-tinta hover:bg-menta"
                }`}
              >
                {f.texto} ({cantidad(f.valor)})
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {fincas.length > 1 ? (
            <label className="flex items-center gap-2">
              <span className="sr-only">Finca</span>
              <select value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)} className={CLASE_SELECT}>
                <option value="todas">Todas las fincas</option>
                {fincas.map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="sr-only">Tipo de tarea</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as "todos" | TipoTarea)}
              className={CLASE_SELECT}
            >
              <option value="todos">Todos los tipos</option>
              {TIPOS_TAREA_ACCIONABLES.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ETIQUETAS_TIPO_TAREA[tipo]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? <Aviso tipo="error">{error}</Aviso> : null}

      {filtradas.length === 0 ? (
        <p className="rounded-[28px] border-2 border-borde bg-white px-6 py-10 text-center text-tinta-suave">
          {filtroEstado === "pendientes"
            ? "¡No tenés tareas pendientes!"
            : "No hay tareas con estos filtros."}
        </p>
      ) : (
        // Tarjetas verticales, 3 por fila en la computadora (2 en tablet, 1 en el celular). A la vista solo lo
        // necesario (fecha, qué hacer, dónde); la explicación larga queda en «Detalles», que se abre al tocarlo.
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtradas.map((t) => {
            const { dia, mes } = diaYMes(t.fechaInicio);
            return (
              <li
                key={t.id}
                className={`flex flex-col gap-3 rounded-3xl border-2 p-4 ${
                  t.hechaEn ? "border-menta-fuerte bg-menta/60" : "border-borde bg-white"
                }`}
              >
                {/* Arriba: la fecha grande y, al lado, el tipo y el estado */}
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-menta text-bosque">
                    <span className="font-titulos text-2xl leading-none font-extrabold">{dia}</span>
                    <span className="text-sm font-semibold">{mes}</span>
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-1.5">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-tinta-suave">
                      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORES_TIPO[t.tipo].punto}`} />
                      {ETIQUETAS_TIPO_TAREA[t.tipo]}
                    </span>
                    <BadgeEstadoTarea estado={t.estado} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-lg leading-snug font-bold text-bosque">{t.titulo}</h3>
                  <Link
                    href={`/fincas/${t.establecimientoId}/calendario`}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-hoja underline-offset-4 hover:underline"
                  >
                    <IconoFinca className="h-4 w-4" />
                    {t.establecimientoNombre}
                  </Link>
                </div>

                {/* Detalles: cerrado; adentro, las fechas y la explicación */}
                <details className="group rounded-2xl bg-papel text-[0.95rem]">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-3 font-semibold text-hoja hover:bg-menta [&::-webkit-details-marker]:hidden">
                    Detalles
                    <IconoChevron className="h-5 w-5 shrink-0 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="flex flex-col gap-1.5 px-3 pb-3">
                    {t.fechaInicio !== t.fechaFin ? (
                      <p className="text-sm font-semibold text-tinta-suave">
                        Del {formatearFechaCortaEsAr(t.fechaInicio)} al {formatearFechaCortaEsAr(t.fechaFin)}
                      </p>
                    ) : null}
                    <p className="text-tinta">{t.descripcion}</p>
                  </div>
                </details>

                {/* Abajo de todo (mt-auto): así los botones quedan alineados aunque las tarjetas tengan distinto alto */}
                <div className="mt-auto pt-1">
                  {!t.hechaEn ? (
                    <button
                      type="button"
                      disabled={pendiente}
                      onClick={() => marcarRapido(t)}
                      className={`${clasesBoton("contorno", true)} min-h-11`}
                    >
                      <IconoOk className="h-5 w-5" />
                      Marcar hecha hoy
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 font-semibold text-bosque">
                        <IconoOk className="h-5 w-5 text-hoja" />
                        Hecha el {formatearFechaCortaEsAr(t.hechaEn)}
                      </span>
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => desmarcarRapido(t)}
                        className="text-sm font-semibold text-tinta-suave underline underline-offset-4 hover:text-bosque"
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
