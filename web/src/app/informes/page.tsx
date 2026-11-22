// Ruta /informes: listado global "Mis informes" del usuario (Esp. 07 §5.4, CA-07-11).
import Link from "next/link";
import { Suspense } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { listarMisInformes } from "@/dominio/informe/foto";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Mis informes · PoliCampo" };

async function ContenidoMisInformes({
  searchParams,
}: {
  searchParams: Promise<{ borrado?: string }>;
}) {
  const usuario = await requerirUsuario("/informes");
  const [{ borrado }, informes] = await Promise.all([
    searchParams,
    listarMisInformes(usuario.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mis informes</h1>
          <p className="text-sm text-stone-600">
            Todos los informes técnicos en PDF emitidos para tus fincas, ordenados del más reciente
            al más antiguo.
          </p>
        </div>
        <Link
          href="/fincas"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Elegir finca para emitir
        </Link>
      </header>

      {borrado === "1" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se borró el informe seleccionado.
        </div>
      ) : null}

      {informes.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-stone-900">Todavía no emitiste informes</p>
          <p className="max-w-md text-sm text-stone-600">
            Entrá a una finca con diagnóstico y propuesta elegida y tocá{" "}
            <strong>Generar informe</strong> para crear tu primer PDF técnico.
          </p>
          <Link
            href="/fincas"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Ir a Mis fincas
          </Link>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {informes.map((inf) => (
            <li
              key={inf.id}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/fincas/${inf.establecimientoId}/informes/${inf.id}`}
                    className="text-base font-bold text-emerald-900 hover:underline"
                  >
                    {inf.codigo}
                  </Link>
                  <BadgeNivelDiagnostico nivel={inf.contenido.diagnostico.nivelRiesgo} />
                </div>
                <p className="text-xs text-stone-600">
                  <strong>{inf.establecimientoNombre}</strong> · Emitido el{" "}
                  {formatearFechaDiagnostico(inf.emitidoEn)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/fincas/${inf.establecimientoId}/informes/${inf.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                >
                  Ver
                </Link>
                <AccionesInforme
                  establecimientoId={inf.establecimientoId}
                  informeId={inf.id}
                  codigo={inf.codigo}
                  volverA="global"
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

export default function PaginaMisInformes({
  searchParams,
}: {
  searchParams: Promise<{ borrado?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando tus informes…</p>}>
        <ContenidoMisInformes searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
