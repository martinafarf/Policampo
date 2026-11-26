// Ruta /fincas/[id]/informes/[informeId]: vista en pantalla de las 7 secciones del informe (Esp. 07 §5.3, CA-07-15).
//
// Se lee como un documento: arriba el resumen (lo importante en una sola tarjeta) y «Descargar PDF»; después las
// secciones numeradas, cada una en su tarjeta. Los datos técnicos siguen estando (es un informe para guardar o
// mostrarle a un ingeniero), pero con nombres simples.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeEstadoTarea } from "@/componentes/calendario/BadgeEstadoTarea";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { IconoAlerta, IconoFlor } from "@/componentes/marca/Iconos";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Desplegable, DesplegableAtencion } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { ETIQUETAS_TIPO_TAREA, formatearFechaCortaEsAr } from "@/dominio/calendario";
import { construirTextoAlerta, formatearNumeroEsAr, obtenerMensajeNivelRiesgo } from "@/dominio/diagnostico";
import { ETIQUETAS_METODO, hectareasAMetrosCuadrados } from "@/dominio/establecimientos";
import { AVISO_LEGAL_INFORME } from "@/dominio/informe";
import { obtenerInformePorId } from "@/dominio/informe/foto";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string; informeId: string }>;
}

function formatearFechaEmision(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Jujuy",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Hectáreas con hasta 2 decimales ("0,61 ha"). */
const ha = (valor: number) => `${formatearNumeroEsAr(valor, 2, 0)} ha`;

/** Una fila "nombre … valor" para las listas de datos del informe. */
function Fila({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-tinta-suave">{nombre}</dt>
      <dd className="text-right font-semibold text-tinta">{children}</dd>
    </div>
  );
}

async function ContenidoInforme({ params }: Props) {
  const { id, informeId } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/informes/${informeId}`);
  const inf = await obtenerInformePorId(id, informeId, usuario.id);

  if (!inf) {
    notFound();
  }

  const foto = inf.contenido;
  const compM2 = Math.round(hectareasAMetrosCuadrados(foto.diagnostico.hectareasACompensar));
  const rutaFinca = `/fincas/${inf.establecimientoId}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={`Informe ${foto.codigo}`}
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: inf.establecimientoNombre, href: rutaFinca },
          { texto: "Informes", href: `${rutaFinca}/informes` },
        ]}
        datos={[
          `Generado el ${formatearFechaEmision(foto.emitidoEnIso)}`,
          ...(foto.preparadoPara ? [`Preparado para: ${foto.preparadoPara}`] : []),
        ]}
        acciones={<AccionesInforme establecimientoId={inf.establecimientoId} informeId={inf.id} codigo={foto.codigo} />}
      />

      {foto.desactualizado.hayAviso ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-[28px] border-2 border-[#f3d3a3] bg-[#fff3df] p-5 text-[#7a4100]"
        >
          <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
          Este informe usa los datos del {formatearFechaEmision(foto.desactualizado.fechaReferenciaIso)}. Tu finca
          cambió después.
        </p>
      ) : null}

      {/* 1. Resumen: lo importante en una sola tarjeta */}
      <Tarjeta tono="menta" titulo="Resumen">
        <p className="-mt-2 text-tinta">
          <strong className="text-bosque">{foto.finca.nombre}</strong> · {foto.finca.localidad},{" "}
          {foto.finca.departamento} · {foto.finca.ecorregionNombre}
        </p>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Cómo está</dt>
            <dd>
              <BadgeNivelDiagnostico nivel={foto.diagnostico.nivelRiesgo} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Flores hoy</dt>
            <dd className="font-titulos text-xl font-bold text-bosque">
              {formatearNumeroEsAr(foto.diagnostico.porcentajeFlores, 1, 1)} %
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Con la propuesta</dt>
            <dd className="font-titulos text-xl font-bold text-bosque">
              {formatearNumeroEsAr(foto.propuesta.porcentajeLogrado, 1, 1)} %{" "}
              <span className="text-sm font-semibold text-tinta-suave">
                (meta {formatearNumeroEsAr(foto.propuesta.objetivoPct, 0, 0)} %)
              </span>
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Flores que faltaban</dt>
            <dd className="font-titulos text-xl font-bold text-bosque">{ha(foto.diagnostico.hectareasACompensar)}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Forma elegida</dt>
            <dd className="font-bold text-bosque">{ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]}</dd>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3">
            <dt className="text-sm font-semibold text-tinta-suave">Próxima tarea</dt>
            <dd className="font-bold text-bosque">
              {foto.calendario?.proximaTarea
                ? `${foto.calendario.proximaTarea.titulo} (${formatearFechaCortaEsAr(foto.calendario.proximaTarea.fechaInicio)})`
                : "Sin tareas pendientes"}
            </dd>
          </div>
        </dl>
      </Tarjeta>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* 2. Datos de la finca */}
        <Tarjeta titulo="2. La finca">
          <dl className="-mt-2 flex flex-col divide-y-[1.5px] divide-borde">
            <Fila nombre="Cargada con">{ETIQUETAS_METODO[foto.finca.metodo]}</Fila>
            <Fila nombre="Superficie total">{ha(foto.finca.superficieTotalHa)}</Fila>
          </dl>
          <ul className="flex flex-col divide-y-[1.5px] divide-borde">
            {foto.finca.sectores.map((s, idx) => (
              <li key={idx} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <strong className="text-tinta">{s.nombre}</strong>{" "}
                  <span className="text-tinta-suave">
                    ({s.tipo === "sector_flores" ? "Flores" : "Cultivo"} · {s.detalleTipo})
                  </span>
                </span>
                <span className="font-semibold text-tinta">
                  {ha(s.superficieHa)}{" "}
                  <span className="font-normal text-tinta-suave">
                    ({formatearNumeroEsAr(s.porcentajeTotal, 1, 1)} %)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        {/* 3. Diagnóstico */}
        <Tarjeta titulo="3. Diagnóstico">
          <p className="-mt-2 font-semibold text-tinta">
            {obtenerMensajeNivelRiesgo(foto.diagnostico.nivelRiesgo, foto.diagnostico.hectareasACompensar)}
          </p>
          <dl className="flex flex-col divide-y-[1.5px] divide-borde">
            <Fila nombre="Cultivos">{ha(foto.diagnostico.superficieCultivosHa)}</Fila>
            <Fila nombre="Flores">{ha(foto.diagnostico.superficieFloresHa)}</Fila>
            <Fila nombre="Sin cargar">{ha(foto.diagnostico.superficieSinAsignarHa)}</Fila>
            <Fila nombre="Diferencia con la meta">{formatearNumeroEsAr(foto.diagnostico.deficitPp, 1, 1)} puntos</Fila>
            <Fila nombre="Flores que faltan">
              {ha(foto.diagnostico.hectareasACompensar)}{" "}
              <span className="font-normal text-tinta-suave">({formatearNumeroEsAr(compM2, 0, 0)} m²)</span>
            </Fila>
          </dl>
          <ul className="flex flex-col gap-2 text-tinta">
            {foto.diagnostico.areasAptas.textos.map((txt, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <IconoFlor className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
                {txt}
              </li>
            ))}
          </ul>
          {foto.diagnostico.alertas.length > 0 ? (
            <DesplegableAtencion titulo={`Para revisar (${foto.diagnostico.alertas.length})`}>
              <ul className="flex flex-col gap-3">
                {foto.diagnostico.alertas.map((al, idx) => {
                  const t = construirTextoAlerta(al);
                  return (
                    <li key={idx} className="flex flex-col gap-1 rounded-2xl bg-white p-3.5">
                      <p className="font-bold text-[#7a4100]">{t.titulo}</p>
                      <p className="text-[0.95rem] text-tinta">{t.descripcion}</p>
                    </li>
                  );
                })}
              </ul>
            </DesplegableAtencion>
          ) : null}
        </Tarjeta>
      </div>

      {/* 4. Propuesta de rediseño */}
      <Tarjeta titulo="4. Propuesta de rediseño">
        <p className="-mt-2 text-tinta">
          <strong className="text-bosque">
            {foto.propuesta.nombre ?? ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]}
          </strong>{" "}
          · Flores nuevas: {ha(foto.propuesta.superficieFranjasHa)} · Le quita a los cultivos:{" "}
          {ha(foto.propuesta.perdidaTotalCultivoHa)}
          {foto.propuesta.editadaAMano ? " · Editada a mano" : ""}
        </p>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {foto.finca.metodo === "cuestionario" ? (
            <EsquemaCuestionario3x3 reparto={foto.propuesta.reparto ?? []} ocupadasPorSectores={foto.finca.sectores} />
          ) : (
            <VistaDibujoPropuesta
              metodo={foto.finca.metodo}
              superficieTotalHa={foto.finca.superficieTotalHa}
              contorno={foto.finca.contorno}
              sectores={foto.finca.sectores}
              franjas={foto.propuesta.franjas ?? []}
            />
          )}
          {foto.propuesta.perdidaPorCultivo.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-tinta">De qué cultivos sale el lugar:</p>
              <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                {foto.propuesta.perdidaPorCultivo.map((p, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      <strong className="text-tinta">{p.sector}</strong> ({p.cultivo})
                    </span>
                    <span className="font-semibold text-tinta">
                      {ha(p.ha)}{" "}
                      <span className="font-normal text-tinta-suave">({formatearNumeroEsAr(p.pct, 1, 1)} %)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Tarjeta>

      {/* 5. Plantas de servicio */}
      <Tarjeta titulo={`5. Plantas para sembrar (${foto.propuesta.especies.length})`}>
        {foto.propuesta.especies.length === 0 ? (
          <p className="-mt-2 text-tinta-suave">Al generar el informe, la propuesta no tenía plantas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {foto.propuesta.especies.map((esp) => (
              <TarjetaEspecieMezcla key={esp.plantaId} especie={esp} />
            ))}
          </div>
        )}
        <Desplegable pregunta="¿Cuándo florecen?">
          <GraficoFloracionSemanas floracion={foto.propuesta.floracion} />
        </Desplegable>
      </Tarjeta>

      {/* 6. Calendario */}
      <Tarjeta titulo="6. Calendario">
        {!foto.calendario ? (
          <p className="-mt-2 text-tinta-suave">Al generar el informe, todavía no había calendario.</p>
        ) : (
          <>
            <p className="-mt-2 text-tinta-suave">
              Temporada del {formatearFechaCortaEsAr(foto.calendario.temporadaInicio)} al{" "}
              {formatearFechaCortaEsAr(foto.calendario.temporadaFin)}.
            </p>
            <ul className="grid gap-x-6 md:grid-cols-2">
              {foto.calendario.tareas.map((t, idx) => (
                <li
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 border-b-[1.5px] border-borde py-2.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-tinta-suave">{ETIQUETAS_TIPO_TAREA[t.tipo]}</p>
                    <p className="font-semibold text-tinta">{t.titulo}</p>
                    <p className="text-sm text-tinta-suave">
                      {t.fechaInicio === t.fechaFin
                        ? formatearFechaCortaEsAr(t.fechaInicio)
                        : `Del ${formatearFechaCortaEsAr(t.fechaInicio)} al ${formatearFechaCortaEsAr(t.fechaFin)}`}
                    </p>
                  </div>
                  <BadgeEstadoTarea estado={t.estadoAlEmitir} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Tarjeta>

      {/* 7. Cómo se calculó, fuentes y aviso legal */}
      <Tarjeta titulo="7. Cómo se calculó y fuentes">
        <Desplegable pregunta="¿Cómo se calculó?">
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {foto.diagnostico.pasosCalculo.map((paso, i) => (
              <li key={i}>{paso}</li>
            ))}
          </ol>
        </Desplegable>
        <div>
          <p className="font-semibold text-tinta">Fuentes</p>
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-tinta-suave">
            {foto.fuentes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <p className="rounded-2xl bg-papel p-4 text-sm text-tinta-suave">{AVISO_LEGAL_INFORME}</p>
      </Tarjeta>
    </div>
  );
}

export default function PaginaDetalleInforme(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando informe…</p>}>
        <ContenidoInforme params={props.params} />
      </Suspense>
    </main>
  );
}
