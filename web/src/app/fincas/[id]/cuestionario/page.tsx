// Ruta /fincas/[id]/cuestionario: carga y edición de sectores por cuestionario (Esp. 02, T3).
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { listarCultivosParaFinca } from "../../_lib/cultivos";
import { FormularioCuestionario } from "./FormularioCuestionario";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoCuestionario({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/cuestionario`);
  const finca = await obtenerEstablecimientoDelUsuario(id, usuario.id);

  if (!finca) {
    notFound();
  }

  // RN-03 y CA-02-15: si la finca usa otro método, redirige a la ficha con aviso.
  if (finca.metodoCaracterizacion !== "cuestionario") {
    redirect(`/fincas/${finca.id}?aviso=metodo-distinto`);
  }

  const idsYaAsignados = finca.sectores
    .map((s) => s.cultivoId)
    .filter((cultivoId): cultivoId is string => cultivoId !== null);

  const cultivos = await listarCultivosParaFinca(idsYaAsignados);

  return (
    <FormularioCuestionario
      establecimientoId={finca.id}
      nombreEstablecimiento={finca.nombre}
      superficieTotalHa={finca.superficieTotalHa ?? 0}
      versionInicial={finca.version}
      actualizadoEnIso={finca.actualizadoEn.toISOString()}
      cultivos={cultivos}
      sectoresIniciales={finca.sectores.map((s) => ({
        tipo: s.tipo,
        cultivoId: s.cultivoId,
        cultivoOtro: s.cultivoOtro,
        subtipoFlores: s.subtipoFlores,
        nombre: s.nombre,
        superficieHa: s.superficieHa,
        ubicacionRelativa: s.ubicacionRelativa,
      }))}
    />
  );
}

export default function PaginaCuestionario(props: Props) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando cuestionario…</p>}>
        <ContenidoCuestionario params={props.params} />
      </Suspense>
    </main>
  );
}
