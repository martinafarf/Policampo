// Ruta /fincas/[id]/diagnostico/historial: historial y evolución temporal (Esp. 04, §5.4, CA-04-11).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconoLupa } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { GraficoEvolucion } from "@/componentes/diagnostico/GraficoEvolucion";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { listarHistorialDiagnosticos } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoHistorial({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/diagnostico/historial`);
  const datos = await listarHistorialDiagnosticos(id, usuario.id);

  if (!datos) {
    notFound();
  }

  const rutaFinca = `/fincas/${datos.establecimiento.id}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Diagnósticos anteriores"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: datos.establecimiento.nombre, href: rutaFinca },
          { texto: "Diagnóstico", href: `${rutaFinca}/diagnostico` },
        ]}
        bajada="Cada diagnóstico guarda cómo estaba tu finca el día que lo pediste."
      />

      {datos.diagnosticos.length === 0 ? (
        <EstadoVacio
          Icono={IconoLupa}
          titulo="Todavía no hay diagnósticos"
          accion={<BotonEnlace href={`${rutaFinca}/diagnostico`}>Ir al diagnóstico</BotonEnlace>}
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Tarjeta titulo={`Diagnósticos (${datos.diagnosticos.length})`}>
            <ul className="flex flex-col divide-y-[1.5px] divide-borde">
              {datos.diagnosticos.map((d, idx) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-tinta">{formatearFechaDiagnostico(d.creadoEn)}</span>
                      {idx === 0 ? <Etiqueta tono="ahora">Último</Etiqueta> : null}
                    </div>
                    <p className="flex flex-wrap items-center gap-2 text-tinta-suave">
                      <strong className="font-titulos text-lg text-bosque">
                        {formatearNumeroEsAr(d.porcentajeFlores, 1, 1)} %
                      </strong>
                      con flores
                      <BadgeNivelDiagnostico nivel={d.nivelRiesgo} />
                    </p>
                  </div>
                  <BotonEnlace
                    href={idx === 0 ? `${rutaFinca}/diagnostico` : `${rutaFinca}/diagnostico/${d.id}`}
                    variante="texto"
                  >
                    Ver
                  </BotonEnlace>
                </li>
              ))}
            </ul>
          </Tarjeta>

          <GraficoEvolucion diagnosticos={datos.diagnosticos} />
        </div>
      )}
    </div>
  );
}

export default function PaginaHistorialDiagnosticos(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando diagnósticos…</p>}>
        <ContenidoHistorial params={props.params} />
      </Suspense>
    </main>
  );
}
