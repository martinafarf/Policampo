// Ruta /fincas/[id]/propuestas: listado de propuestas guardadas de la finca (Esp. 05 §6.2).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesPropuesta } from "@/componentes/propuesta/AccionesPropuesta";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import { listarPropuestasDeFinca } from "@/dominio/propuesta/servicio";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ borrada?: string }>;
}

async function ContenidoListadoPropuestas({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/propuestas`);
  const [{ borrada }, datos] = await Promise.all([
    searchParams,
    listarPropuestasDeFinca(id, usuario.id),
  ]);

  if (!datos) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link
          href={`/fincas/${datos.establecimiento.id}`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {datos.establecimiento.nombre}
        </Link>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Propuestas de rediseño</h1>
          <p className="text-sm text-stone-600">
            {datos.establecimiento.nombre} · Guardá varias alternativas y marcá una como{" "}
            <strong>Elegida</strong> para usarla en el calendario y el informe.
          </p>
        </div>

        <Link
          href={`/fincas/${datos.establecimiento.id}/propuestas/nueva`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva propuesta
        </Link>
      </header>

      {borrada === "1" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se borró la propuesta seleccionada.
        </div>
      ) : null}

      {datos.propuestas.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-stone-900">Todavía no guardaste propuestas</p>
          <p className="max-w-md text-sm text-stone-600">
            Generá alternativas de franjas florales y una mezcla de plantas de servicio adaptada a
            los cultivos y la ecorregión de tu finca.
          </p>
          <Link
            href={`/fincas/${datos.establecimiento.id}/propuestas/nueva`}
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Generar primera propuesta
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {datos.propuestas.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">
                      {p.nombre ?? ETIQUETAS_DISPOSICION[p.disposicion]}
                    </h2>
                    {p.elegida ? (
                      <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">
                        ★ Elegida
                      </span>
                    ) : null}
                    {p.desactualizada ? (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                        ↻ Desactualizada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-600">
                    {ETIQUETAS_DISPOSICION[p.disposicion]} · Guardada el{" "}
                    {formatearFechaDiagnostico(p.creadoEn)}
                  </p>
                </div>

                <Link
                  href={`/fincas/${datos.establecimiento.id}/propuestas/${p.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3.5 py-1.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
                >
                  Ver detalle →
                </Link>
              </div>

              <dl className="grid grid-cols-2 gap-2 border-t border-stone-100 pt-2.5 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-stone-500">% logrado</dt>
                  <dd className="font-bold text-stone-900">
                    {formatearNumeroEsAr(p.porcentajeLogrado, 1, 1)} %
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Franjas</dt>
                  <dd className="font-bold text-stone-900">
                    {formatearNumeroEsAr(p.superficieFranjasHa, 4, 2)} ha
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Pérdida cultivo</dt>
                  <dd className="font-bold text-stone-900">
                    {formatearNumeroEsAr(p.perdidaTotalCultivoHa, 4, 2)} ha
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Especies</dt>
                  <dd className="font-bold text-stone-900">{p.especies.length}</dd>
                </div>
              </dl>

              <div className="border-t border-stone-100 pt-2.5">
                <AccionesPropuesta
                  establecimientoId={datos.establecimiento.id}
                  propuestaId={p.id}
                  elegida={p.elegida}
                  compacto
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaPropuestasFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando propuestas…</p>}>
        <ContenidoListadoPropuestas params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
