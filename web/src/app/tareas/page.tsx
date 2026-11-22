// Ruta /tareas: vista global "Mis tareas" de todas las fincas del usuario (Esp. 06 §5.2, CA-06-12).
import Link from "next/link";
import { Suspense } from "react";
import { ListadoMisTareas } from "@/componentes/calendario/ListadoMisTareas";
import { obtenerHoyJujuyIso } from "@/dominio/calendario";
import { listarMisTareas } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Mis tareas · PoliCampo" };

async function ContenidoMisTareas() {
  const usuario = await requerirUsuario("/tareas");
  const hoyIso = obtenerHoyJujuyIso();
  const tareas = await listarMisTareas(usuario.id, hoyIso);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mis tareas</h1>
          <p className="text-sm text-stone-600">
            Todas las tareas activas de tus fincas, ordenadas por fecha.
          </p>
        </div>

        {tareas.length > 0 ? (
          <a
            href="/tareas/ics"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            📅 Descargar .ics
          </a>
        ) : null}
      </header>

      {tareas.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-stone-900">Todavía no tenés tareas activas</p>
          <p className="max-w-md text-sm text-stone-600">
            Entrá a una de tus fincas, elegí una propuesta de rediseño y tocá{" "}
            <strong>Armar mi calendario</strong> para ver tus tareas de siembra y manejo.
          </p>
          <Link
            href="/fincas"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Ir a Mis fincas
          </Link>
        </section>
      ) : (
        <ListadoMisTareas tareas={tareas} hoyIso={hoyIso} />
      )}
    </div>
  );
}

export default function PaginaMisTareas() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando tus tareas…</p>}>
        <ContenidoMisTareas />
      </Suspense>
    </main>
  );
}
