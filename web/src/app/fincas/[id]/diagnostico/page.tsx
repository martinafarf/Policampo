// Ruta /fincas/[id]/diagnostico: último diagnóstico de la finca (Esp. 04, §5.2 y §6).
// Protegida por dueño (404 para lo ajeno, RS-02, CA-04-13) y envuelta en <Suspense>.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconoLupa } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
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
  const rutaFinca = `/fincas/${datos.establecimiento.id}`;

  // Todavía no hay diagnóstico: un estado vacío con UNA acción (pedirlo, o completar lo que falta antes).
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Diagnóstico"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: datos.establecimiento.nombre, href: rutaFinca },
        ]}
      />
      <EstadoVacio
        Icono={IconoLupa}
        titulo="Todavía no tenés diagnóstico"
        texto={
          datos.requisitos.cumple
            ? "Te decimos cuántas flores tiene tu finca y cuántas le faltan para llegar al 20 % recomendado."
            : `Antes de pedirlo: ${datos.requisitos.mensajeFaltante}.`
        }
        accion={
          datos.requisitos.cumple ? (
            <BotonSolicitarDiagnostico establecimientoId={datos.establecimiento.id} texto="Pedir mi diagnóstico" />
          ) : (
            <BotonEnlace href={rutaMetodo}>Completar mi finca</BotonEnlace>
          )
        }
      />
    </div>
  );
}

export default function PaginaDiagnosticoFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando diagnóstico…</p>}>
        <ContenidoDiagnostico params={props.params} />
      </Suspense>
    </main>
  );
}
