// Ruta /fincas/[id]/diagnostico/[diagnosticoId]: diagnóstico puntual del historial (Esp. 04, §5.4).
// Valida pertenencia de finca y dueño (404 para lo ajeno, CA-04-13, RS-02).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VistaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { obtenerDiagnosticoPorId } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string; diagnosticoId: string }>;
}

async function ContenidoDiagnosticoHistorico({ params }: Props) {
  const { id, diagnosticoId } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/diagnostico/${diagnosticoId}`);
  const datos = await obtenerDiagnosticoPorId(id, diagnosticoId, usuario.id);

  if (!datos) {
    notFound();
  }

  return (
    <VistaDiagnostico
      establecimientoId={datos.establecimiento.id}
      nombreEstablecimiento={datos.establecimiento.nombre}
      diagnostico={datos.diagnostico}
      desactualizado={datos.desactualizado}
      esHistorico
    />
  );
}

export default function PaginaDiagnosticoHistorico(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando diagnóstico guardado…</p>}>
        <ContenidoDiagnosticoHistorico params={props.params} />
      </Suspense>
    </main>
  );
}
