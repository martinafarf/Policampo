// Ruta /fincas/[id]/informes: informes emitidos de una finca (Esp. 07 §5.4).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { BotonEmitirInforme } from "@/componentes/informe/BotonEmitirInforme";
import { IconoDocumento } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Aviso } from "@/componentes/ui/formulario";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { listarInformesDeFinca } from "@/dominio/informe/foto";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ borrado?: string }>;
}

async function ContenidoInformesFinca({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/informes`);
  const [{ borrado }, datos] = await Promise.all([searchParams, listarInformesDeFinca(id, usuario.id)]);

  if (!datos) {
    notFound();
  }

  const rutaFinca = `/fincas/${datos.establecimiento.id}`;
  const botonEmitir = datos.requisitos ? (
    <BotonEmitirInforme
      establecimientoId={datos.establecimiento.id}
      cumpleRequisitos={datos.requisitos.cumple}
      mensajeFaltante={datos.requisitos.mensajeFaltante}
      nombrePerfilCompleto={datos.requisitos.nombrePerfilCompleto}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Informes"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: datos.establecimiento.nombre, href: rutaFinca },
        ]}
        bajada="Un PDF con el diagnóstico, la propuesta elegida y el calendario, para guardar o compartir."
        acciones={datos.informes.length > 0 ? botonEmitir : undefined}
      />

      {borrado === "1" ? <Aviso tipo="exito">Se borró el informe.</Aviso> : null}

      {datos.informes.length === 0 ? (
        <EstadoVacio
          Icono={IconoDocumento}
          titulo="Todavía no generaste informes"
          texto="Cada informe guarda cómo estaba tu finca el día que lo generaste."
          accion={botonEmitir}
        />
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {datos.informes.map((inf) => (
            <li key={inf.id}>
              <Tarjeta
                compacta
                titulo={`Informe ${inf.codigo}`}
                extra={<BadgeNivelDiagnostico nivel={inf.contenido.diagnostico.nivelRiesgo} />}
              >
                <p className="-mt-2 text-tinta-suave">Generado el {formatearFechaDiagnostico(inf.emitidoEn)}</p>
                <div className="flex flex-wrap items-start gap-2">
                  <BotonEnlace href={`${rutaFinca}/informes/${inf.id}`} className="min-h-10 px-5">
                    Ver
                  </BotonEnlace>
                  <AccionesInforme
                    establecimientoId={datos.establecimiento.id}
                    informeId={inf.id}
                    codigo={inf.codigo}
                    volverA="finca"
                    compacto
                  />
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaInformesFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando informes…</p>}>
        <ContenidoInformesFinca params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
