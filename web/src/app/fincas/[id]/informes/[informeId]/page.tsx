// Ruta /fincas/[id]/informes/[informeId]: vista en pantalla de las 7 secciones del informe (Esp. 07 §5.3, CA-07-15).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeEstadoTarea } from "@/componentes/calendario/BadgeEstadoTarea";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
import { ETIQUETAS_TIPO_TAREA, formatearFechaCortaEsAr } from "@/dominio/calendario";
import {
  construirTextoAlerta,
  formatearNumeroEsAr,
  obtenerMensajeNivelRiesgo,
} from "@/dominio/diagnostico";
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
  }).format(new Date(iso));
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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${inf.establecimientoId}/informes`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Informes de {inf.establecimientoNombre}
        </Link>
        <Link href="/informes" className="font-medium text-stone-600 hover:underline">
          · Mis informes
        </Link>
      </nav>

      {/* Sección 1: Portada y resumen ejecutivo */}
      <header className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
              PoliCampo · {foto.codigo}
            </span>
            <h1 className="mt-1.5 text-2xl font-bold text-stone-900">
              Informe técnico de rediseño agroecológico
            </h1>
            <p className="mt-1 text-sm font-semibold text-stone-800">{foto.finca.nombre}</p>
            <p className="text-xs text-stone-600">
              {foto.finca.localidad}, {foto.finca.departamento} · {foto.finca.ecorregionNombre}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              Emitido el {formatearFechaEmision(foto.emitidoEnIso)}
            </p>
            {foto.preparadoPara ? (
              <p className="mt-1 text-sm font-semibold text-emerald-900">
                Preparado para: {foto.preparadoPara}
              </p>
            ) : null}
          </div>

          <AccionesInforme
            establecimientoId={inf.establecimientoId}
            informeId={inf.id}
            codigo={foto.codigo}
          />
        </div>

        {foto.desactualizado.hayAviso ? (
          <div
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950"
          >
            <p className="font-bold">
              ⚠️ Basado en datos del {formatearFechaEmision(foto.desactualizado.fechaReferenciaIso)};
              la finca cambió después.
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-xs sm:grid-cols-3">
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">Nivel de riesgo</dt>
            <dd className="mt-1">
              <BadgeNivelDiagnostico nivel={foto.diagnostico.nivelRiesgo} />
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">Flores actuales / Objetivo</dt>
            <dd className="mt-1 text-sm font-bold text-stone-900">
              {formatearNumeroEsAr(foto.diagnostico.porcentajeFlores, 1, 1)} % /{" "}
              {formatearNumeroEsAr(foto.propuesta.objetivoPct, 1, 0)} %
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">A compensar</dt>
            <dd className="mt-1 text-sm font-bold text-stone-900">
              {formatearNumeroEsAr(foto.diagnostico.hectareasACompensar, 4, 1)} ha
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">Disposición</dt>
            <dd className="mt-1 text-sm font-bold text-stone-900">
              {ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">% logrado</dt>
            <dd className="mt-1 text-sm font-bold text-emerald-900">
              {formatearNumeroEsAr(foto.propuesta.porcentajeLogrado, 1, 1)} %
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2.5">
            <dt className="text-stone-500">Próxima tarea</dt>
            <dd className="mt-1 font-bold text-stone-900">
              {foto.calendario?.proximaTarea
                ? `${foto.calendario.proximaTarea.titulo} (${formatearFechaCortaEsAr(foto.calendario.proximaTarea.fechaInicio)})`
                : "Sin tareas pendientes"}
            </dd>
          </div>
        </dl>
      </header>

      {/* Sección 2: Datos de la finca */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">2. Datos de la finca</h2>
        <p className="text-xs text-stone-600">
          Método: <strong>{ETIQUETAS_METODO[foto.finca.metodo]}</strong> · Superficie total:{" "}
          <strong>{formatearNumeroEsAr(foto.finca.superficieTotalHa, 4, 1)} ha</strong>.
        </p>
        <ul className="flex flex-col gap-2">
          {foto.finca.sectores.map((s, idx) => (
            <li
              key={idx}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs"
            >
              <div>
                <span className="font-bold text-stone-900">{s.nombre}</span>{" "}
                <span className="text-stone-600">
                  ({s.tipo === "sector_flores" ? "Flores" : "Cultivo"} · {s.detalleTipo})
                </span>
              </div>
              <span className="font-semibold text-stone-900">
                {formatearNumeroEsAr(s.superficieHa, 4, 2)} ha (
                {formatearNumeroEsAr(s.porcentajeTotal, 1, 1)} %)
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Sección 3: Diagnóstico */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">3. Diagnóstico</h2>
        <p className="text-sm font-medium text-stone-800">
          {obtenerMensajeNivelRiesgo(
            foto.diagnostico.nivelRiesgo,
            foto.diagnostico.hectareasACompensar,
          )}
        </p>
        <p className="text-xs text-stone-600">
          Cultivos: {formatearNumeroEsAr(foto.diagnostico.superficieCultivosHa, 4, 1)} ha · Flores:{" "}
          {formatearNumeroEsAr(foto.diagnostico.superficieFloresHa, 4, 1)} ha · Sin asignar:{" "}
          {formatearNumeroEsAr(foto.diagnostico.superficieSinAsignarHa, 4, 1)} ha · Déficit:{" "}
          {formatearNumeroEsAr(foto.diagnostico.deficitPp, 1, 1)} pp · A compensar:{" "}
          {formatearNumeroEsAr(foto.diagnostico.hectareasACompensar, 4, 1)} ha (
          {formatearNumeroEsAr(compM2, 0, 0)} m²).
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-700">
          {foto.diagnostico.areasAptas.textos.map((txt, idx) => (
            <li key={idx}>{txt}</li>
          ))}
        </ul>
        {foto.diagnostico.alertas.length > 0 ? (
          <ul className="space-y-1.5">
            {foto.diagnostico.alertas.map((al, idx) => {
              const t = construirTextoAlerta(al);
              return (
                <li
                  key={idx}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                >
                  <strong>⚠️ {t.titulo}:</strong> {t.descripcion}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* Sección 4: Propuesta de rediseño */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">4. Propuesta de rediseño</h2>
        <p className="text-xs text-stone-600">
          <strong>{foto.propuesta.nombre ?? ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]}</strong>{" "}
          · Franjas nuevas: {formatearNumeroEsAr(foto.propuesta.superficieFranjasHa, 4, 2)} ha ·
          Pérdida de cultivo: {formatearNumeroEsAr(foto.propuesta.perdidaTotalCultivoHa, 4, 2)} ha
          {foto.propuesta.editadaAMano ? " · Editada a mano" : ""}.
        </p>

        {foto.finca.metodo === "cuestionario" ? (
          <EsquemaCuestionario3x3
            reparto={foto.propuesta.reparto ?? []}
            ocupadasPorSectores={foto.finca.sectores}
          />
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
          <ul className="space-y-1 text-xs text-stone-700">
            {foto.propuesta.perdidaPorCultivo.map((p, i) => (
              <li key={i}>
                <strong>{p.sector}</strong> ({p.cultivo}): {formatearNumeroEsAr(p.ha, 4, 2)} ha (
                {formatearNumeroEsAr(p.pct, 1, 1)} %)
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Sección 5: Mezcla de plantas de servicio */}
      <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">5. Mezcla de plantas de servicio</h2>
        <GraficoFloracionSemanas floracion={foto.propuesta.floracion} />
        {foto.propuesta.especies.length === 0 ? (
          <p className="text-sm text-stone-600">Sin especies compatibles registradas al emitir.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {foto.propuesta.especies.map((esp) => (
              <TarjetaEspecieMezcla key={esp.plantaId} especie={esp} />
            ))}
          </div>
        )}
      </section>

      {/* Sección 6: Calendario */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">6. Calendario agroecológico</h2>
        {!foto.calendario ? (
          <p className="text-sm text-stone-600">Calendario no generado.</p>
        ) : (
          <>
            <p className="text-xs text-stone-600">
              Temporada del {formatearFechaCortaEsAr(foto.calendario.temporadaInicio)} al{" "}
              {formatearFechaCortaEsAr(foto.calendario.temporadaFin)}.
            </p>
            <ul className="flex flex-col gap-2">
              {foto.calendario.tareas.map((t, idx) => (
                <li
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-stone-500">
                      {ETIQUETAS_TIPO_TAREA[t.tipo]} ·{" "}
                    </span>
                    <strong className="text-stone-900">{t.titulo}</strong>
                    <p className="text-stone-600">
                      {t.fechaInicio === t.fechaFin
                        ? formatearFechaCortaEsAr(t.fechaInicio)
                        : `${formatearFechaCortaEsAr(t.fechaInicio)} – ${formatearFechaCortaEsAr(t.fechaFin)}`}
                    </p>
                  </div>
                  <BadgeEstadoTarea estado={t.estadoAlEmitir} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Sección 7: Cómo se calculó, fuentes y aviso legal */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">7. Cómo se calculó, fuentes y aviso</h2>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-stone-700">
          {foto.diagnostico.pasosCalculo.map((paso, i) => (
            <li key={i}>{paso}</li>
          ))}
        </ol>
        <div className="border-t border-stone-100 pt-3">
          <p className="text-xs font-bold text-stone-800">Fuentes</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-stone-600">
            {foto.fuentes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          {AVISO_LEGAL_INFORME}
        </p>
      </section>
    </div>
  );
}

export default function PaginaDetalleInforme(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando informe…</p>}>
        <ContenidoInforme params={props.params} />
      </Suspense>
    </main>
  );
}
