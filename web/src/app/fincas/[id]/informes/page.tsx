// Ruta /fincas/[id]/informes: informes emitidos de una finca (Esp. 07 §5.4).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { BotonEmitirInforme } from "@/componentes/informe/BotonEmitirInforme";
import { listarInformesDeFinca } from "@/dominio/informe/foto";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ borrado?: string }>;
}

async function ContenidoInformesFinca({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/informes`);
  const [{ borrado }, datos] = await Promise.all([
    searchParams,
    listarInformesDeFinca(id, usuario.id),
  ]);

  if (!datos) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${datos.establecimiento.id}`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {datos.establecimiento.nombre}
        </Link>
        <Link href="/informes" className="font-medium text-stone-600 hover:underline">
          · Mis informes
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Informes técnicos</h1>
        <p className="text-sm text-stone-600">
          {datos.establecimiento.nombre} · Cada informe guarda una foto fija del diagnóstico, la
          propuesta elegida y el calendario al momento de emitirse.
        </p>
        {datos.requisitos ? (
          <div className="self-start">
            <BotonEmitirInforme
              establecimientoId={datos.establecimiento.id}
              cumpleRequisitos={datos.requisitos.cumple}
              mensajeFaltante={datos.requisitos.mensajeFaltante}
              nombrePerfilCompleto={datos.requisitos.nombrePerfilCompleto}
            />
          </div>
        ) : null}
      </header>

      {borrado === "1" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se borró el informe seleccionado.
        </div>
      ) : null}

      {datos.informes.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Todavía no emitiste informes técnicos para esta finca.
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {datos.informes.map((inf) => (
            <li
              key={inf.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/fincas/${datos.establecimiento.id}/informes/${inf.id}`}
                    className="text-base font-bold text-emerald-900 hover:underline"
                  >
                    {inf.codigo}
                  </Link>
                  <BadgeNivelDiagnostico nivel={inf.contenido.diagnostico.nivelRiesgo} />
                </div>
                <p className="text-xs text-stone-600">
                  Emitido el {formatearFechaDiagnostico(inf.emitidoEn)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/fincas/${datos.establecimiento.id}/informes/${inf.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                >
                  Ver en pantalla
                </Link>
                <AccionesInforme
                  establecimientoId={datos.establecimiento.id}
                  informeId={inf.id}
                  codigo={inf.codigo}
                  volverA="finca"
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

export default function PaginaInformesFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando informes…</p>}>
        <ContenidoInformesFinca params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
