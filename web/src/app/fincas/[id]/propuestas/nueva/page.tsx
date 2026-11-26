// Ruta /fincas/[id]/propuestas/nueva: generación, comparación y ajuste de propuestas (Esp. 05 §6.1).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  consultarDatosMezclaDesdeCatalogo,
  obtenerDetallePropuesta,
  prepararGeneracionPropuesta,
} from "@/dominio/propuesta/servicio";
import { IconoLupa } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Aviso } from "@/componentes/ui/formulario";
import { requerirUsuario } from "@/lib/sesion";
import { ConstructorPropuesta } from "./ConstructorPropuesta";

interface Props {
  params: Promise<{ id: string }>;
  /** desde: propuesta a duplicar. paso=plantas: abrir directo en el paso de las plantas (para completarlas). */
  searchParams: Promise<{ desde?: string; paso?: string }>;
}

async function ContenidoNuevaPropuesta({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/propuestas/nueva`);
  const { desde, paso } = await searchParams;

  // Si viene de "Duplicar y editar" (?desde=<propuestaId>), cargamos sus parámetros iniciales (CA-05-17).
  const baseDuplicar = desde ? await obtenerDetallePropuesta(id, desde, usuario.id) : null;
  const objetivoInicial = baseDuplicar ? baseDuplicar.propuesta.objetivoPct : 20;
  const respetarCultivosInicial = Boolean(baseDuplicar?.propuesta.parametros.respetarCultivos);

  const prep = await prepararGeneracionPropuesta(
    id,
    usuario.id,
    objetivoInicial,
    respetarCultivosInicial,
  );

  if (prep.estado === "no_encontrado") {
    notFound();
  }

  if (prep.estado === "requiere_diagnostico_vigente") {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina titulo="Nueva propuesta" migas={[
    { texto: "Mis fincas", href: "/fincas" },
    { texto: prep.establecimiento.nombre, href: `/fincas/${prep.establecimiento.id}` },
    { texto: "Propuestas", href: `/fincas/${prep.establecimiento.id}/propuestas` },
  ]} />
        <EstadoVacio
          Icono={IconoLupa}
          titulo="Primero actualizá el diagnóstico"
          texto={prep.motivo}
          accion={<BotonEnlace href={`/fincas/${prep.establecimiento.id}/diagnostico`}>Ir al diagnóstico</BotonEnlace>}
        />
      </div>
    );
  }

  if (prep.estado === "error_calculo") {
    return (
      <div className="flex flex-col gap-6">
        <EncabezadoPagina titulo="Nueva propuesta" migas={[
    { texto: "Mis fincas", href: "/fincas" },
    { texto: prep.establecimiento.nombre, href: `/fincas/${prep.establecimiento.id}` },
    { texto: "Propuestas", href: `/fincas/${prep.establecimiento.id}/propuestas` },
  ]} />
        <Aviso tipo="error">{prep.mensaje}</Aviso>
      </div>
    );
  }

  const { cultivosParaMezcla } = await consultarDatosMezclaDesdeCatalogo(prep.diagnostico);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={baseDuplicar ? "Nueva propuesta (copia)" : "Nueva propuesta"}
        migas={[
    { texto: "Mis fincas", href: "/fincas" },
    { texto: prep.establecimiento.nombre, href: `/fincas/${prep.establecimiento.id}` },
    { texto: "Propuestas", href: `/fincas/${prep.establecimiento.id}/propuestas` },
  ]}
        bajada="Elegí dónde van las flores y qué plantas sembrar."
      />

      <ConstructorPropuesta
        establecimientoId={prep.establecimiento.id}
        metodo={prep.diagnostico.entrada.metodo}
        superficieTotalHa={prep.diagnostico.superficieTotalHa}
        superficieFloresActualHa={prep.diagnostico.superficieFloresHa}
        contorno={prep.contorno}
        sectores={prep.diagnostico.entrada.sectores}
        cultivosParaMezcla={cultivosParaMezcla}
        objetivoInicialPct={prep.objetivoPct}
        superficieAAgregarInicialHa={prep.superficieAAgregarHa}
        alternativasIniciales={prep.alternativasEspaciales}
        cuestionarioInicial={prep.propuestaCuestionario}
        mezclaInicial={prep.mezcla}
        nombreInicial={
          baseDuplicar?.propuesta.nombre ? `${baseDuplicar.propuesta.nombre} (copia)` : ""
        }
        disposicionInicial={baseDuplicar?.propuesta.disposicion}
        respetarCultivosInicial={respetarCultivosInicial}
        especiesInicialesIds={baseDuplicar?.propuesta.especies.map((e) => e.plantaId)}
        pasoInicial={paso === "plantas" ? 2 : 1}
      />
    </div>
  );
}

export default function PaginaNuevaPropuesta(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Armando las opciones para tu finca…</p>}>
        <ContenidoNuevaPropuesta params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
