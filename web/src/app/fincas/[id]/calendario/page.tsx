// Ruta /fincas/[id]/calendario: calendario activo de la finca (Esp. 06 §5.1, §5.2, §5.4, §5.5).
//
// Arriba, el encabezado común con la temporada; si todavía no hay calendario, un estado vacío con UNA acción
// (elegir una propuesta o armar el calendario). Los avisos van en carteles cortos y la lista de tareas debajo.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonGenerarCalendario } from "@/componentes/calendario/BotonGenerarCalendario";
import { VistaCalendarioFinca } from "@/componentes/calendario/VistaCalendarioFinca";
import { IconoAlerta, IconoCalendario, IconoFlor } from "@/componentes/marca/Iconos";
import { BotonEnlace, clasesBoton } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { DesplegableAtencion } from "@/componentes/ui/mas-info";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { obtenerCalendarioActivoDeFinca } from "@/dominio/calendario/servicio";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoCalendarioFinca({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/calendario`);
  const datos = await obtenerCalendarioActivoDeFinca(id, usuario.id);

  if (!datos) {
    notFound();
  }

  const { establecimiento, propuestaElegida, calendario } = datos;
  const rutaFinca = `/fincas/${establecimiento.id}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Calendario"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: establecimiento.nombre, href: rutaFinca },
        ]}
        datos={
          calendario
            ? [
                `Temporada del ${formatearFechaCortaEsAr(calendario.temporadaInicio)} al ${formatearFechaCortaEsAr(calendario.temporadaFin)}`,
              ]
            : undefined
        }
        acciones={
          <>
            {calendario ? (
              // Descarga un archivo .ics: es un enlace común (no de Next) para que el navegador lo baje
              <a href={`${rutaFinca}/calendario/ics`} className={clasesBoton("contorno")}>
                <IconoCalendario className="h-5 w-5" />
                Pasar a mi celular
              </a>
            ) : null}
            <BotonEnlace href={`${rutaFinca}/calendario/historial`} variante="texto">
              Temporadas anteriores
            </BotonEnlace>
          </>
        }
      />

      {/* Si todavía no hay calendario activo: una sola acción */}
      {!calendario ? (
        !propuestaElegida ? (
          <EstadoVacio
            Icono={IconoFlor}
            titulo="Primero elegí una propuesta"
            texto="El calendario se arma con las plantas de la propuesta que elijas para tu finca."
            accion={<BotonEnlace href={`${rutaFinca}/propuestas`}>Ver mis propuestas</BotonEnlace>}
          />
        ) : !datos.propuestaElegidaTienePlantas ? (
          // Sin plantas no hay qué sembrar ni cortar: se avisa antes y se ofrece completar ese paso
          <EstadoVacio
            Icono={IconoFlor}
            titulo="Tu propuesta no tiene plantas"
            texto="El calendario se arma con las plantas que vas a sembrar. Elegí las plantas de tu propuesta y después armás el calendario."
            accion={
              <BotonEnlace href={`${rutaFinca}/propuestas/nueva?desde=${propuestaElegida.id}&paso=plantas`}>
                Elegir plantas
              </BotonEnlace>
            }
          />
        ) : (
          <EstadoVacio
            Icono={IconoCalendario}
            titulo="Armá tu calendario"
            texto={`Con tu propuesta «${propuestaElegida.nombre ?? ETIQUETAS_DISPOSICION[propuestaElegida.disposicion]}» armamos 12 meses de tareas: cuándo sembrar, cuándo cortar y cuándo no fumigar.`}
            accion={
              <BotonGenerarCalendario establecimientoId={establecimiento.id} modo="nuevo" texto="Armar mi calendario" />
            }
          />
        )
      ) : (
        <>
          {/* Cambió la propuesta elegida (§5.4, CA-06-10) */}
          {datos.propuestaCambioDesdeCalendario ? (
            <section
              role="status"
              className="flex flex-col gap-3 rounded-[28px] border-2 border-[#f3d3a3] bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-start gap-2.5 text-[#7a4100]">
                <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  Elegiste otra propuesta. Podés rehacer el calendario con ella: las tareas que ya hiciste se
                  guardan en las temporadas anteriores.
                </span>
              </p>
              <div className="shrink-0">
                <BotonGenerarCalendario
                  establecimientoId={establecimiento.id}
                  modo="regenerar"
                  texto="Rehacer el calendario"
                  pedirConfirmacion
                />
              </div>
            </section>
          ) : null}

          {/* La propuesta elegida quedó desactualizada (§5.4) */}
          {datos.propuestaDesactualizada && propuestaElegida ? (
            <section
              role="status"
              className="flex flex-col gap-3 rounded-[28px] border-2 border-[#f3d3a3] bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5 text-[#7a4100]">
                <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Tu finca cambió después de la propuesta elegida</p>
                  <p className="text-[0.95rem]">{datos.motivosPropuestaDesactualizada.join(" ")}</p>
                </div>
              </div>
              <BotonEnlace
                href={`${rutaFinca}/propuestas/${propuestaElegida.id}`}
                variante="contorno"
                className="shrink-0"
              >
                Ver la propuesta
              </BotonEnlace>
            </section>
          ) : null}

          {/* Falta menos de un mes para que termine la temporada (§5.5, CA-06-11) */}
          {datos.puedeGenerarProximaTemporada ? (
            <section className="flex flex-col gap-3 rounded-[28px] border-2 border-menta-fuerte bg-menta p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-bosque">
                <strong>La temporada está por terminar.</strong> Ya podés armar los próximos 12 meses.
              </p>
              <div className="shrink-0">
                <BotonGenerarCalendario
                  establecimientoId={establecimiento.id}
                  modo="proxima_temporada"
                  texto="Armar la próxima temporada"
                />
              </div>
            </section>
          ) : null}

          {/* Avisos agronómicos de la temporada (§4.3): cerrados, con la cantidad a la vista */}
          {calendario.avisos.length > 0 ? (
            <DesplegableAtencion titulo={`Para revisar (${calendario.avisos.length})`}>
              <ul className="flex flex-col gap-3">
                {calendario.avisos.map((av, i) => (
                  <li key={`${av.codigo}-${i}`} className="rounded-2xl bg-white p-3.5 text-[0.95rem] text-tinta">
                    {av.mensaje}
                  </li>
                ))}
              </ul>
            </DesplegableAtencion>
          ) : null}

          {/* Las tareas: por mes o el año completo, con «Marcar hecha» */}
          <VistaCalendarioFinca
            establecimientoId={establecimiento.id}
            temporadaInicio={calendario.temporadaInicio}
            temporadaFin={calendario.temporadaFin}
            hoyIso={datos.hoyIso}
            tareas={datos.tareas}
          />
        </>
      )}
    </div>
  );
}

export default function PaginaCalendarioFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando calendario…</p>}>
        <ContenidoCalendarioFinca params={props.params} />
      </Suspense>
    </main>
  );
}
