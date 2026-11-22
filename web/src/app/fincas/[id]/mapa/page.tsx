// Ruta /fincas/[id]/mapa: editor satelital con Leaflet + Esri World Imagery (Esp. 02, T5).
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerLocalidades } from "@/datos/jujuy";
import { EditorMapa } from "@/componentes/mapa/EditorMapa";
import type { PoligonoGeoJson } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { listarCultivosParaFinca } from "../../_lib/cultivos";

interface Props {
  params: Promise<{ id: string }>;
}

const CENTRO_JUJUY_POR_DEFECTO = { lat: -24.1858, lng: -65.2995, zoom: 12 };

async function ContenidoMapa({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/mapa`);
  const finca = await obtenerEstablecimientoDelUsuario(id, usuario.id);

  if (!finca) {
    notFound();
  }

  // RN-03 y CA-02-15: redirigir a la ficha si el establecimiento usa otro método.
  if (finca.metodoCaracterizacion !== "mapa") {
    redirect(`/fincas/${finca.id}?aviso=metodo-distinto`);
  }

  const idsYaAsignados = finca.sectores
    .map((s) => s.cultivoId)
    .filter((cultivoId): cultivoId is string => cultivoId !== null);

  const cultivos = await listarCultivosParaFinca(idsYaAsignados);

  const localidadesDepto = obtenerLocalidades(finca.departamento);
  const localidadEncontrada =
    localidadesDepto.find((loc) => loc.nombre === finca.localidad) ?? localidadesDepto[0];
  const centroInicial = localidadEncontrada
    ? { lat: localidadEncontrada.lat, lng: localidadEncontrada.lng, zoom: localidadEncontrada.zoom }
    : CENTRO_JUJUY_POR_DEFECTO;

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
    <EditorMapa
      establecimientoId={finca.id}
      nombreEstablecimiento={finca.nombre}
      versionInicial={finca.version}
      actualizadoEnIso={finca.actualizadoEn.toISOString()}
      centroInicial={centroInicial}
      contornoInicial={finca.contorno}
      cultivos={cultivos}
      sectoresIniciales={sectoresIniciales}
    />
  );
}

export default function PaginaMapa(props: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-0 py-4 sm:px-4 sm:py-6">
      <Suspense fallback={<p className="px-4 text-sm text-stone-600">Cargando mapa…</p>}>
        <ContenidoMapa params={props.params} />
      </Suspense>
    </main>
  );
}
