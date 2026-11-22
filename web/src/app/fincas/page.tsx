// Ruta /fincas: listado "Mis fincas" ordenado por última modificación (Esp. 02, 5.1 y CA-02-04).
import Link from "next/link";
import { Suspense } from "react";
import { ETIQUETAS_METODO, formatearSuperficieCompleta } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { listarEstablecimientosDelUsuario } from "./_lib/consultas";

interface Props {
  searchParams: Promise<{ borrada?: string }>;
}

async function ContenidoMisFincas({ searchParams }: Props) {
  const usuario = await requerirUsuario("/fincas");
  const [{ borrada }, fincas] = await Promise.all([
    searchParams,
    listarEstablecimientosDelUsuario(usuario.id),
  ]);
  const nombreBorrada = borrada?.trim().slice(0, 150) || null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mis fincas</h1>
          <p className="text-sm text-stone-600">
            Administrá tus establecimientos y el uso actual del terreno.
          </p>
        </div>
        <Link
          href="/fincas/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva finca
        </Link>
      </header>

      {nombreBorrada ? (
        <div
          role="status"
          className="break-words rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se borró la finca {nombreBorrada}.
        </div>
      ) : null}

      {fincas.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-stone-900">Todavía no cargaste fincas</p>
          <p className="max-w-md text-sm text-stone-600">
            Cargá tu primer establecimiento con cuestionario, croquis o mapa para ver su
            distribución y preparar el diagnóstico de biodiversidad.
          </p>
          <Link
            href="/fincas/nueva"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Cargar mi primera finca
          </Link>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fincas.map((finca) => (
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

              <Link
                href={`/fincas/${finca.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Ver ficha
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaMisFincas(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando tus fincas…</p>}>
        <ContenidoMisFincas searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
