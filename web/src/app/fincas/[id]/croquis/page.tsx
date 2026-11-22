// Ruta /fincas/[id]/croquis: editor de sectores en plano cuadrado a escala (Esp. 02, T4).
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EditorCroquis } from "@/componentes/croquis/EditorCroquis";
import type { PoligonoGeoJson } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { listarCultivosParaFinca } from "../../_lib/cultivos";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoCroquis({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/croquis`);
  const finca = await obtenerEstablecimientoDelUsuario(id, usuario.id);

  if (!finca) {
    notFound();
  }

  // RN-03 y CA-02-15: redirigir a la ficha si la finca usa otro método.
  if (finca.metodoCaracterizacion !== "croquis") {
    redirect(`/fincas/${finca.id}?aviso=metodo-distinto`);
  }

  const idsYaAsignados = finca.sectores
    .map((s) => s.cultivoId)
    .filter((cultivoId): cultivoId is string => cultivoId !== null);

  const cultivos = await listarCultivosParaFinca(idsYaAsignados);

  const sectoresIniciales = finca.sectores
    .filter((s): s is typeof s & { geometria: PoligonoGeoJson } => s.geometria !== null)
    .map((s) => ({
      tipo: s.tipo,
      cultivoId: s.cultivoId,
      cultivoOtro: s.cultivoOtro,
      subtipoFlores: s.subtipoFlores,
      nombre: s.nombre,
      geometria: s.geometria,
    }));

  return (
    <EditorCroquis
      establecimientoId={finca.id}
      nombreEstablecimiento={finca.nombre}
      superficieTotalHa={finca.superficieTotalHa ?? 1}
      versionInicial={finca.version}
      actualizadoEnIso={finca.actualizadoEn.toISOString()}
      cultivos={cultivos}
      sectoresIniciales={sectoresIniciales}
    />
  );
}

export default function PaginaCroquis(props: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando croquis…</p>}>
        <ContenidoCroquis params={props.params} />
      </Suspense>
    </main>
  );
}
