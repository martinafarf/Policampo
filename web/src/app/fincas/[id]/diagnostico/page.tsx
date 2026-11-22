// Ruta /fincas/[id]/diagnostico: último diagnóstico de la finca (Esp. 04, §5.2 y §6).
// Protegida por dueño (404 para lo ajeno, RS-02, CA-04-13) y envuelta en <Suspense>.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonSolicitarDiagnostico } from "@/componentes/diagnostico/BotonSolicitarDiagnostico";
import { VistaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { obtenerUltimoDiagnostico } from "@/dominio/diagnostico/entrada";
import { RUTA_EDICION_METODO } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoDiagnostico({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/diagnostico`);
  const datos = await obtenerUltimoDiagnostico(id, usuario.id);

  if (!datos) {
    notFound();
  }

  if (datos.diagnostico) {
    return (
      <VistaDiagnostico
        establecimientoId={datos.establecimiento.id}
        nombreEstablecimiento={datos.establecimiento.nombre}
        diagnostico={datos.diagnostico}
        desactualizado={datos.desactualizado}
      />
    );
  }

  const rutaMetodo = `/fincas/${datos.establecimiento.id}/${RUTA_EDICION_METODO[datos.establecimiento.metodoCaracterizacion]}`;

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

      <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
        <h1 className="text-2xl font-bold text-stone-900">Diagnóstico agroecológico</h1>
        <p className="text-sm text-stone-600">
          Todavía no calculaste un diagnóstico para <strong>{datos.establecimiento.nombre}</strong>.
          Evaluamos cuánta superficie con flores y vegetación natural tiene tu finca frente al 20 %
          recomendado.
        </p>

        {datos.requisitos.cumple ? (
          <div className="flex flex-wrap items-center gap-3">
            <BotonSolicitarDiagnostico
              establecimientoId={datos.establecimiento.id}
              texto="🔍 Solicitar diagnóstico"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Antes de pedir el diagnóstico: {datos.requisitos.mensajeFaltante}.
            </p>
            <Link
              href={rutaMetodo}
              className="inline-flex min-h-11 items-center justify-center self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Completar sectores de la finca →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function PaginaDiagnosticoFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando diagnóstico…</p>}>
        <ContenidoDiagnostico params={props.params} />
      </Suspense>
    </main>
  );
}
