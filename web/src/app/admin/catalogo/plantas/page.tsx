// Ruta /admin/catalogo/plantas: listado y filtros de plantas de servicio (Esp. 03, 5.1, CA-03-01, 16).
import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeEstadoCatalogo } from "@/componentes/catalogo/BadgeEstadoCatalogo";
import { ECORREGIONES, obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import { plantaServicio, plantaServicioEcorregion } from "@/db/schema";
import {
  ESTADOS_CATALOGO,
  ETIQUETAS_FUNCION_PLANTA,
  FUNCIONES_PLANTA,
  type EstadoCatalogo,
  type FuncionPlanta,
} from "@/dominio/catalogo";
import { requerirAdministrador } from "@/lib/sesion";

interface Props {
  searchParams: Promise<{
    estado?: string;
    ecorregion?: string;
    funcion?: string;
    q?: string;
  }>;
}

async function ContenidoListadoPlantas({ searchParams }: Props) {
  await requerirAdministrador();
  const filtros = await searchParams;

  const estadoFiltro = (ESTADOS_CATALOGO as readonly string[]).includes(filtros.estado ?? "")
    ? (filtros.estado as EstadoCatalogo)
    : null;
  const ecorregionFiltro = filtros.ecorregion?.trim() || null;
  const funcionFiltro = (FUNCIONES_PLANTA as readonly string[]).includes(filtros.funcion ?? "")
    ? (filtros.funcion as FuncionPlanta)
    : null;
  const busqueda = filtros.q?.trim().toLowerCase() || "";

  const [todasPlantas, todosPeriodos] = await Promise.all([
    estadoFiltro
      ? db
          .select()
          .from(plantaServicio)
          .where(eq(plantaServicio.estado, estadoFiltro))
          .orderBy(desc(plantaServicio.actualizadoEn), asc(plantaServicio.nombreComun))
      : db
          .select()
          .from(plantaServicio)
          .orderBy(desc(plantaServicio.actualizadoEn), asc(plantaServicio.nombreComun)),
    db
      .select({
        plantaId: plantaServicioEcorregion.plantaId,
        ecorregion: plantaServicioEcorregion.ecorregion,
      })
      .from(plantaServicioEcorregion),
  ]);

  const ecorregionesPorPlanta = new Map<string, ClaveEcorregion[]>();
  for (const p of todosPeriodos) {
    const lista = ecorregionesPorPlanta.get(p.plantaId) ?? [];
    lista.push(p.ecorregion as ClaveEcorregion);
    ecorregionesPorPlanta.set(p.plantaId, lista);
  }

  const filtradas = todasPlantas.filter((p) => {
    if (funcionFiltro && !p.funciones.includes(funcionFiltro)) return false;
    if (ecorregionFiltro) {
      const ecos = ecorregionesPorPlanta.get(p.id) ?? [];
      if (!ecos.includes(ecorregionFiltro as ClaveEcorregion)) return false;
    }
    if (busqueda) {
      const texto = `${p.nombreComun} ${p.nombreCientifico ?? ""} ${p.clave}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/catalogo"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← Volver al resumen del catálogo
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Plantas de servicio</h1>
        </div>
        <Link
          href="/admin/catalogo/plantas/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva planta
        </Link>
      </div>

      {/* Filtros GET (progresivos, funcionan sin JS) */}
      <form className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          name="q"
          defaultValue={filtros.q ?? ""}
          placeholder="Buscar por nombre…"
          aria-label="Buscar por nombre"
          className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900"
        />
        <select
          name="estado"
          defaultValue={estadoFiltro ?? ""}
          aria-label="Filtrar por estado"
          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="publicado">Publicado</option>
          <option value="retirado">Retirado</option>
        </select>
        <select
          name="ecorregion"
          defaultValue={ecorregionFiltro ?? ""}
          aria-label="Filtrar por ecorregión"
          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
        >
          <option value="">Todas las ecorregiones</option>
          {ECORREGIONES.map((eco) => (
            <option key={eco.clave} value={eco.clave}>
              {eco.nombre}
            </option>
          ))}
        </select>
        <select
          name="funcion"
          defaultValue={funcionFiltro ?? ""}
          aria-label="Filtrar por función"
          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
        >
          <option value="">Todas las funciones</option>
          {FUNCIONES_PLANTA.map((f) => (
            <option key={f} value={f}>
              {ETIQUETAS_FUNCION_PLANTA[f]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-10 rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-900"
        >
          Filtrar
        </button>
      </form>

      {filtradas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          No hay plantas que coincidan con los filtros elegidos.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtradas.map((planta) => {
            const ecos = ecorregionesPorPlanta.get(planta.id) ?? [];
            return (
              <li
                key={planta.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 break-words">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-stone-900">{planta.nombreComun}</h2>
                    <BadgeEstadoCatalogo estado={planta.estado} />
                  </div>
                  {planta.nombreCientifico ? (
                    <p className="text-xs italic text-stone-600">{planta.nombreCientifico}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-stone-600">
                    Funciones: {planta.funciones.map((f) => ETIQUETAS_FUNCION_PLANTA[f]).join(", ")}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Ecorregiones con períodos:{" "}
                    {ecos.length > 0
                      ? ecos.map((e) => obtenerNombreEcorregion(e)).join(", ")
                      : "Sin períodos cargados"}
                  </p>
                </div>

                <Link
                  href={`/admin/catalogo/plantas/${planta.id}`}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-emerald-700 px-4 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Editar
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function PaginaListadoPlantas(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando plantas…</p>}>
        <ContenidoListadoPlantas searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
