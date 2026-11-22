// Ruta /fincas/[id]/calendario/historial: calendarios cerrados y sus tareas hechas (Esp. 06 §5.4).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { listarHistorialCalendariosDeFinca } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoHistorialCalendario({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/calendario/historial`);
  const datos = await listarHistorialCalendariosDeFinca(id, usuario.id);

  if (!datos) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link
          href={`/fincas/${datos.establecimiento.id}/calendario`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver al calendario activo
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">Historial de calendarios</h1>
        <p className="mt-1 text-sm text-stone-600">
          {datos.establecimiento.nombre} · Temporadas anteriores y tareas que marcaste como hechas.
        </p>
      </header>

      {datos.calendarios.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          Todavía no hay calendarios cerrados en el historial de esta finca.
        </section>
      ) : (
        <ul className="flex flex-col gap-4">
          {datos.calendarios.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-stone-900">
                  Temporada {formatearFechaCortaEsAr(c.temporadaInicio)} –{" "}
                  {formatearFechaCortaEsAr(c.temporadaFin)}
                </h2>
                <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
                  {c.tareasHechas.length} de {c.totalTareasAccionables} tareas hechas
                </span>
              </div>

              {c.tareasHechas.length === 0 ? (
                <p className="text-xs text-stone-500">No quedaron tareas marcadas como hechas.</p>
              ) : (
                <ul className="space-y-1.5 border-t border-stone-100 pt-2.5 text-xs">
                  {c.tareasHechas.map((t) => (
                    <li key={t.id} className="rounded-lg bg-sky-50/70 px-3 py-2 text-stone-800">
                      <strong>✅ {t.titulo}</strong> — hecha el{" "}
                      {t.hechaEn ? formatearFechaCortaEsAr(t.hechaEn) : ""}
                      {t.nota ? <p className="mt-0.5 text-stone-600">Nota: {t.nota}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaHistorialCalendario(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando historial…</p>}>
        <ContenidoHistorialCalendario params={props.params} />
      </Suspense>
    </main>
  );
}
