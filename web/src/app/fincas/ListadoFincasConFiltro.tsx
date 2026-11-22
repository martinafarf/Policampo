"use client";

// Listado interactivo de Mis fincas con buscador y filtro por estado de diagnóstico (RD-03, CA-04-18).
import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import type { NivelRiesgo } from "@/dominio/diagnostico";
import {
  ETIQUETAS_METODO,
  formatearSuperficieCompleta,
  type MetodoCaracterizacion,
} from "@/dominio/establecimientos";

export interface FincaEnListado {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  superficieTotalHa: number | null;
  metodoCaracterizacion: MetodoCaracterizacion;
  cantidadSectores: number;
  diagnostico: {
    nivelRiesgo: NivelRiesgo;
    porcentajeFlores: number;
    desactualizado: boolean;
  } | null;
}

type FiltroEstadoDiagnostico =
  | "todos"
  | "sin_diagnostico"
  | "adecuado"
  | "moderado"
  | "critico"
  | "desactualizado";

interface Props {
  fincas: readonly FincaEnListado[];
  enfoqueDiagnostico?: boolean;
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ListadoFincasConFiltro({ fincas, enfoqueDiagnostico = false }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoDiag, setEstadoDiag] = useState<FiltroEstadoDiagnostico>("todos");

  const fincasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda);

    return fincas.filter((finca) => {
      if (termino) {
        const campos = normalizarTexto(`${finca.nombre} ${finca.localidad} ${finca.departamento}`);
        if (!campos.includes(termino)) return false;
      }

      if (estadoDiag === "sin_diagnostico") {
        return finca.diagnostico === null;
      }
      if (estadoDiag === "desactualizado") {
        return Boolean(finca.diagnostico?.desactualizado);
      }
      if (estadoDiag === "adecuado" || estadoDiag === "moderado" || estadoDiag === "critico") {
        return (
          finca.diagnostico !== null &&
          !finca.diagnostico.desactualizado &&
          finca.diagnostico.nivelRiesgo === estadoDiag
        );
      }
      return true;
    });
  }, [fincas, busqueda, estadoDiag]);

  const hayFiltroActivo = busqueda.trim().length > 0 || estadoDiag !== "todos";

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de búsqueda y filtro */}
      <section
        aria-label="Filtrar fincas"
        className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-3.5 shadow-xs sm:grid-cols-3"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700 sm:col-span-2">
          Buscar finca
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre de la finca, localidad o departamento…"
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal text-stone-900 placeholder:text-stone-400 focus:border-emerald-700 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
          Estado del diagnóstico
          <select
            value={estadoDiag}
            onChange={(e) => setEstadoDiag(e.target.value as FiltroEstadoDiagnostico)}
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal text-stone-900 focus:border-emerald-700 focus:outline-none"
          >
            <option value="todos">Todas las fincas</option>
            <option value="sin_diagnostico">Sin diagnóstico</option>
            <option value="adecuado">Adecuado (≥ 20 %)</option>
            <option value="moderado">Moderado (10–19 %)</option>
            <option value="critico">Crítico (&lt; 10 %)</option>
            <option value="desactualizado">Desactualizado</option>
          </select>
        </label>

        {hayFiltroActivo ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2 text-xs text-stone-600 sm:col-span-3">
            <span>
              Mostrando <strong>{fincasFiltradas.length}</strong> de {fincas.length}{" "}
              {fincas.length === 1 ? "finca" : "fincas"}
            </span>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setEstadoDiag("todos");
              }}
              className="font-semibold text-emerald-800 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </section>

      {fincasFiltradas.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center">
          <p className="text-base font-semibold text-stone-900">
            No encontramos fincas con ese filtro
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Probá con otro nombre o limpiá los filtros para ver todas tus fincas.
          </p>
          <button
            type="button"
            onClick={() => {
              setBusqueda("");
              setEstadoDiag("todos");
            }}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 px-4 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Ver todas las fincas
          </button>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fincasFiltradas.map((finca) => (
            <li
              key={finca.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 break-words text-lg font-bold text-stone-900">
                    {finca.nombre}
                  </h2>
                  <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                    {ETIQUETAS_METODO[finca.metodoCaracterizacion]}
                  </span>
                </div>
                <p className="text-sm text-stone-600">
                  {finca.localidad}, {finca.departamento}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {finca.diagnostico ? (
                    <BadgeNivelDiagnostico
                      nivel={finca.diagnostico.nivelRiesgo}
                      desactualizado={finca.diagnostico.desactualizado}
                    />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-600">
                      Sin diagnóstico
                    </span>
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-stone-100 pt-2.5 text-xs text-stone-600">
                  <div>
                    <dt className="font-medium text-stone-500">Superficie total</dt>
                    <dd className="mt-0.5 font-semibold text-stone-900">
                      {finca.superficieTotalHa !== null
                        ? formatearSuperficieCompleta(finca.superficieTotalHa)
                        : "Se calcula al dibujar el terreno"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-stone-500">Sectores</dt>
                    <dd className="mt-0.5 font-semibold text-stone-900">
                      {finca.cantidadSectores}{" "}
                      {finca.cantidadSectores === 1 ? "sector" : "sectores"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/fincas/${finca.id}`}
                  className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold ${
                    enfoqueDiagnostico
                      ? "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                      : "border border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50"
                  }`}
                >
                  Ver ficha
                </Link>
                <Link
                  href={`/fincas/${finca.id}/diagnostico`}
                  className={`inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold ${
                    enfoqueDiagnostico
                      ? "bg-emerald-700 text-white hover:bg-emerald-800"
                      : "border border-stone-300 bg-stone-50 text-stone-800 hover:bg-stone-100"
                  }`}
                >
                  Diagnóstico →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
