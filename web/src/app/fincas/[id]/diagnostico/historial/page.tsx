// Ruta /fincas/[id]/diagnostico/historial: historial y evolución temporal (Esp. 04, §5.4, CA-04-11).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { GraficoEvolucion } from "@/componentes/diagnostico/GraficoEvolucion";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { listarHistorialDiagnosticos } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoHistorial({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/diagnostico/historial`);
  const datos = await listarHistorialDiagnosticos(id, usuario.id);

  if (!datos) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${datos.establecimiento.id}/diagnostico`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver al diagnóstico actual
        </Link>
        <Link
          href={`/fincas/${datos.establecimiento.id}`}
          className="font-medium text-stone-600 hover:underline"
        >
          · Ficha de {datos.establecimiento.nombre}
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">Historial de diagnósticos</h1>
        <p className="mt-1 text-sm text-stone-600">
          {datos.establecimiento.nombre} · Ordenados del más reciente al más antiguo. Cada uno
          conserva los datos exactos del momento en que se calculó.
        </p>
      </header>

      {datos.diagnosticos.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          Todavía no hay diagnósticos guardados para esta finca.
        </section>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {datos.diagnosticos.map((d, idx) => (
              <li
                key={d.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">
                      {formatearFechaDiagnostico(d.creadoEn)}
                    </span>
                    <BadgeNivelDiagnostico nivel={d.nivelRiesgo} />
                    {idx === 0 ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        Último
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-600">
                    <strong>{formatearNumeroEsAr(d.porcentajeFlores, 1, 1)} %</strong> con flores ·
                    A compensar:{" "}
                    <strong>{formatearNumeroEsAr(d.hectareasACompensar, 4, 1)} ha</strong> · Reglas
                    v{d.versionReglas}
                  </p>
                </div>

                <Link
                  href={`/fincas/${datos.establecimiento.id}/diagnostico/${d.id}`}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-emerald-700 px-3.5 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  Ver detalle →
                </Link>
              </li>
            ))}
          </ul>

          <GraficoEvolucion diagnosticos={datos.diagnosticos} />
        </>
      )}
    </div>
  );
}

export default function PaginaHistorialDiagnosticos(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando historial…</p>}>
        <ContenidoHistorial params={props.params} />
      </Suspense>
    </main>
  );
}
