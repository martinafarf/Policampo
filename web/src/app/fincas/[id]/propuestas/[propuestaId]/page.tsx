// Ruta /fincas/[id]/propuestas/[propuestaId]: detalle inmutable de una propuesta guardada (Esp. 05 §6.2, §6.3).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesPropuesta } from "@/componentes/propuesta/AccionesPropuesta";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${establecimiento.id}/propuestas`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Propuestas de {establecimiento.nombre}
        </Link>
        <Link
          href={`/fincas/${establecimiento.id}`}
          className="font-medium text-stone-600 hover:underline"
        >
          · Ficha de la finca
        </Link>
      </nav>

      {/* Aviso de Desactualizada con motivos (Esp. 05 §6.3, CA-05-18) */}
      {propuesta.desactualizada ? (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-bold text-amber-950">⚠️ Esta propuesta está desactualizada</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-amber-900">
              {propuesta.motivosDesactualizada.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <Link
            href={`/fincas/${establecimiento.id}/propuestas/nueva`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Generar una nueva
          </Link>
        </section>
      ) : null}

      <header className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-stone-900">
            {propuesta.nombre ?? ETIQUETAS_DISPOSICION[propuesta.disposicion]}
          </h1>
          {propuesta.elegida ? (
            <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white">
              ★ Elegida
            </span>
          ) : null}
          {propuesta.editadaAMano ? (
            <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              Editada a mano
            </span>
          ) : null}
        </div>
        <p className="text-sm text-stone-600">
          {ETIQUETAS_DISPOSICION[propuesta.disposicion]} · Guardada el {fechaTexto} · Reglas v
          {propuesta.versionReglas}
        </p>

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          {propuesta.elegida ? (
            <Link
              href={`/fincas/${establecimiento.id}/informes`}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              📄 Generar informe
            </Link>
          ) : null}
          <Link
            href={`/fincas/${establecimiento.id}/propuestas/nueva?desde=${propuesta.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Duplicar y editar
          </Link>
          <AccionesPropuesta
            establecimientoId={establecimiento.id}
            propuestaId={propuesta.id}
            elegida={propuesta.elegida}
          />
        </div>
      </header>

      {/* Números principales */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-3.5">
          <dt className="text-xs font-medium text-stone-500">Objetivo</dt>
          <dd className="mt-1 text-base font-bold text-stone-900">
            {formatearNumeroEsAr(propuesta.objetivoPct, 1, 1)} %
          </dd>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3.5">
          <dt className="text-xs font-medium text-stone-500">% logrado</dt>
          <dd className="mt-1 text-base font-bold text-emerald-900">
            {formatearNumeroEsAr(propuesta.porcentajeLogrado, 1, 1)} %
          </dd>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3.5">
          <dt className="text-xs font-medium text-stone-500">Franjas nuevas</dt>
          <dd className="mt-1 text-base font-bold text-stone-900">
            {formatearNumeroEsAr(propuesta.superficieFranjasHa, 4, 2)} ha
          </dd>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-3.5">
          <dt className="text-xs font-medium text-stone-500">Pérdida de cultivo</dt>
          <dd className="mt-1 text-base font-bold text-stone-900">
            {formatearNumeroEsAr(propuesta.perdidaTotalCultivoHa, 4, 2)} ha
          </dd>
        </div>
      </dl>

      {/* Dibujo o esquema 3x3 */}
      {propuesta.disposicion === "texto" ? (
        <section className="flex flex-col gap-3">
          <EsquemaCuestionario3x3
            reparto={propuesta.reparto ?? []}
            ocupadasPorSectores={diagnostico.entrada.sectores}
          />
          {propuesta.reparto && propuesta.reparto.length > 0 ? (
            <ul className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-white p-4 text-xs sm:grid-cols-2">
              {propuesta.reparto.map((r, idx) => (
                <li key={`${r.ubicacion}-${idx}`} className="flex justify-between gap-2">
                  <span className="text-stone-700">{r.etiqueta}</span>
                  <strong className="text-stone-900">{formatearNumeroEsAr(r.ha, 4, 2)} ha</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <VistaDibujoPropuesta
          metodo={diagnostico.entrada.metodo}
          superficieTotalHa={diagnostico.superficieTotalHa}
          contorno={diagnostico.entrada.contorno ?? null}
          sectores={diagnostico.entrada.sectores}
          franjas={propuesta.franjas ?? []}
        />
      )}

      {/* Pérdida detallada por cultivo */}
      {propuesta.perdidaPorCultivo.length > 0 ? (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-base font-bold text-stone-900">Superficie cedida por cultivo</h2>
          <ul className="mt-2 space-y-1 text-xs text-stone-700">
            {propuesta.perdidaPorCultivo.map((p, i) => (
              <li key={`${p.sector}-${i}`}>
                <strong>{p.sector}</strong> ({p.cultivo}): {formatearNumeroEsAr(p.ha, 4, 2)} ha (
                {formatearNumeroEsAr(p.pct, 1, 1)} % del sector)
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Avisos guardados */}
      {propuesta.avisos.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-bold text-amber-950">Avisos de la propuesta</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-amber-900">
            {propuesta.avisos.map((av, i) => (
              <li key={`${av.codigo}-${i}`}>{av.mensaje}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Mezcla y gráfico de floración (desde copia inmutable — CA-05-15, CA-05-18) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-stone-900">
          Mezcla de plantas de servicio ({propuesta.especies.length})
        </h2>

        <GraficoFloracionSemanas floracion={propuesta.floracion} />

        {propuesta.especies.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-sm text-stone-600">
            Esta propuesta se guardó sin mezcla de especies compatibles en el catálogo.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {propuesta.especies.map((esp) => (
              <TarjetaEspecieMezcla key={esp.plantaId} especie={esp} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PaginaDetallePropuesta(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando detalle de la propuesta…</p>}>
        <ContenidoDetallePropuesta params={props.params} />
      </Suspense>
    </main>
  );
}
