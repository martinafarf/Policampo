// Ruta /fincas/[id]/propuestas/[propuestaId]: detalle inmutable de una propuesta guardada (Esp. 05 §6.2, §6.3).
//
// Ordenada para que se entienda de un vistazo: a la izquierda cómo quedaría la finca (el dibujo); a la derecha
// los números que importan (% con flores, flores nuevas, cuánto le quita a los cultivos) y lo que conviene
// revisar; abajo, las plantas para sembrar. Una sola acción principal arriba: elegirla o, si ya está elegida,
// armar el calendario.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { IconoAlerta, IconoOk } from "@/componentes/marca/Iconos";
import { BotonElegirPropuesta, MenuMasPropuesta } from "@/componentes/propuesta/AccionesPropuesta";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Desplegable, DesplegableAtencion } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import { obtenerDetallePropuesta } from "@/dominio/propuesta/servicio";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string; propuestaId: string }>;
}

async function ContenidoDetallePropuesta({ params }: Props) {
  const { id, propuestaId } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/propuestas/${propuestaId}`);
  const datos = await obtenerDetallePropuesta(id, propuestaId, usuario.id);

  if (!datos) {
    notFound();
  }

  const { establecimiento, diagnostico, propuesta } = datos;
  const fechaTexto = formatearFechaDiagnostico(propuesta.creadoEn);
  const rutaFinca = `/fincas/${establecimiento.id}`;
  const titulo = propuesta.nombre ?? ETIQUETAS_DISPOSICION[propuesta.disposicion];

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={titulo}
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: establecimiento.nombre, href: rutaFinca },
          { texto: "Propuestas", href: `${rutaFinca}/propuestas` },
        ]}
        ayuda={
          <span className="ml-1 flex flex-wrap gap-1.5">
            {propuesta.elegida ? <Etiqueta tono="ahora">Elegida</Etiqueta> : null}
            {propuesta.editadaAMano ? (
              <Etiqueta tono="espera" conIcono={false}>
                Editada a mano
              </Etiqueta>
            ) : null}
          </span>
        }
        datos={[
          ...(propuesta.nombre ? [ETIQUETAS_DISPOSICION[propuesta.disposicion]] : []),
          `Guardada el ${fechaTexto}`,
        ]}
        acciones={
          <>
            {/* Una sola acción principal: si ya es la elegida, armar el calendario; si no, elegirla */}
            {propuesta.elegida ? (
              <>
                <BotonEnlace href={`${rutaFinca}/calendario`}>Armar mi calendario</BotonEnlace>
                <BotonEnlace href={`${rutaFinca}/informes`} variante="contorno">
                  Generar informe
                </BotonEnlace>
              </>
            ) : (
              <BotonElegirPropuesta establecimientoId={establecimiento.id} propuestaId={propuesta.id} />
            )}
            <MenuMasPropuesta
              establecimientoId={establecimiento.id}
              propuestaId={propuesta.id}
              elegida={propuesta.elegida}
            />
          </>
        }
      />

      {/* Aviso de Desactualizada con motivos (Esp. 05 §6.3, CA-05-18) */}
      {propuesta.desactualizada ? (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-[28px] border-2 border-[#f3d3a3] bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5 text-[#7a4100]">
            <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-bold">Tu finca cambió después de esta propuesta</p>
              <ul className="mt-1 list-disc pl-5 text-[0.95rem]">
                {propuesta.motivosDesactualizada.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
          <BotonEnlace href={`${rutaFinca}/propuestas/nueva`} className="shrink-0">
            Armar una nueva
          </BotonEnlace>
        </section>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Izquierda: cómo quedaría la finca */}
        <Tarjeta titulo="Así quedaría tu finca">
          {propuesta.disposicion === "texto" ? (
            <div className="flex flex-col gap-3">
              <EsquemaCuestionario3x3
                reparto={propuesta.reparto ?? []}
                ocupadasPorSectores={diagnostico.entrada.sectores}
              />
              {propuesta.reparto && propuesta.reparto.length > 0 ? (
                <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                  {propuesta.reparto.map((r, idx) => (
                    <li key={`${r.ubicacion}-${idx}`} className="flex justify-between gap-2 py-2">
                      <span className="text-tinta">{r.etiqueta}</span>
                      <strong className="text-tinta">{formatearNumeroEsAr(r.ha, 2, 0)} ha</strong>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <VistaDibujoPropuesta
              metodo={diagnostico.entrada.metodo}
              superficieTotalHa={diagnostico.superficieTotalHa}
              contorno={diagnostico.entrada.contorno ?? null}
              sectores={diagnostico.entrada.sectores}
              franjas={propuesta.franjas ?? []}
            />
          )}
        </Tarjeta>

        {/* Derecha: los números y lo que conviene revisar */}
        <div className="flex flex-col gap-5">
          <Tarjeta compacta titulo="Con esta propuesta">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-titulos text-4xl font-extrabold text-bosque">
                {formatearNumeroEsAr(propuesta.porcentajeLogrado, 1, 1)} %
              </strong>
              <span className="text-tinta-suave">
                con flores (meta {formatearNumeroEsAr(propuesta.objetivoPct, 0, 0)} %)
              </span>
            </p>
            <dl className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 rounded-2xl bg-papel px-3 py-3">
                <dt className="text-sm font-semibold text-tinta-suave">Flores nuevas</dt>
                <dd className="font-titulos text-xl font-bold text-bosque">
                  {formatearNumeroEsAr(propuesta.superficieFranjasHa, 2, 0)} ha
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-2xl bg-papel px-3 py-3">
                <dt className="text-sm font-semibold text-tinta-suave">Le quita a tus cultivos</dt>
                <dd className="font-titulos text-xl font-bold text-bosque">
                  {formatearNumeroEsAr(propuesta.perdidaTotalCultivoHa, 2, 0)} ha
                </dd>
              </div>
            </dl>
            {propuesta.perdidaPorCultivo.length > 0 ? (
              <Desplegable pregunta="¿De qué cultivos sale?">
                <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                  {propuesta.perdidaPorCultivo.map((pc, i) => (
                    <li key={`${pc.sector}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                      <span>
                        <strong className="text-tinta">{pc.sector}</strong> ({pc.cultivo})
                      </span>
                      <span className="text-right font-semibold text-tinta">
                        {formatearNumeroEsAr(pc.ha, 2, 0)} ha
                        <span className="block text-sm font-normal text-tinta-suave">
                          {formatearNumeroEsAr(pc.pct, 1, 1)} % del sector
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Desplegable>
            ) : (
              <p className="flex items-center gap-2 font-semibold text-bosque">
                <IconoOk className="h-5 w-5 text-hoja" />
                No le quita lugar a tus cultivos.
              </p>
            )}
          </Tarjeta>

          {propuesta.avisos.length > 0 ? (
            <DesplegableAtencion titulo={`Para revisar (${propuesta.avisos.length})`}>
              <ul className="flex flex-col gap-3">
                {propuesta.avisos.map((av, i) => (
                  <li key={`${av.codigo}-${i}`} className="rounded-2xl bg-white p-3.5 text-[0.95rem] text-tinta">
                    {av.mensaje}
                  </li>
                ))}
              </ul>
            </DesplegableAtencion>
          ) : null}
        </div>
      </div>

      {/* Plantas para sembrar y cuándo florecen (desde copia inmutable — CA-05-15, CA-05-18) */}
      <Tarjeta titulo={`Plantas para sembrar (${propuesta.especies.length})`}>
        {propuesta.especies.length === 0 ? (
          <p className="text-tinta-suave">
            Para los cultivos de esta finca todavía no tenemos plantas recomendadas en el catálogo.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {propuesta.especies.map((esp) => (
              <TarjetaEspecieMezcla key={esp.plantaId} especie={esp} />
            ))}
          </div>
        )}
        <Desplegable pregunta="¿Cuándo florecen?">
          <GraficoFloracionSemanas floracion={propuesta.floracion} />
        </Desplegable>
      </Tarjeta>
    </div>
  );
}

export default function PaginaDetallePropuesta(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando la propuesta…</p>}>
        <ContenidoDetallePropuesta params={props.params} />
      </Suspense>
    </main>
  );
}
