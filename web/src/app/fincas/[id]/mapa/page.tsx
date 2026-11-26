// Ruta /fincas/[id]/mapa: editor satelital con Leaflet + Esri World Imagery (Esp. 02, T5).
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { obtenerLocalidades } from "@/datos/jujuy";
import { EditorMapa } from "@/componentes/mapa/EditorMapa";
import type { PoligonoGeoJson } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { listarCultivosParaFinca } from "../../_lib/cultivos";

export const metadata = { title: "Marcá tu finca en el mapa · PoliCampo" };

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
    <main className="mx-auto w-full max-w-[92rem] flex-1 px-4 py-3 sm:px-6 sm:py-4 lg:px-10 lg:py-5">
      <Suspense fallback={<p className="text-tinta-suave">Cargando tu mapa…</p>}>
        <ContenidoMapa params={props.params} />
      </Suspense>
    </main>
  );
}
