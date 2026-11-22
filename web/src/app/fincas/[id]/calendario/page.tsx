// Ruta /fincas/[id]/calendario: calendario activo de la finca (Esp. 06 §5.1, §5.2, §5.4, §5.5).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BotonGenerarCalendario } from "@/componentes/calendario/BotonGenerarCalendario";
import { VistaCalendarioFinca } from "@/componentes/calendario/VistaCalendarioFinca";
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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${establecimiento.id}`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {establecimiento.nombre}
        </Link>
        <Link href="/tareas" className="font-medium text-stone-600 hover:underline">
          · Mis tareas
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Calendario agroecológico</h1>
          <p className="mt-1 text-sm text-stone-600">
            {establecimiento.nombre}
            {calendario
              ? ` · Temporada del ${formatearFechaCortaEsAr(calendario.temporadaInicio)} al ${formatearFechaCortaEsAr(calendario.temporadaFin)}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {calendario ? (
            <a
              href={`/fincas/${establecimiento.id}/calendario/ics`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 bg-white px-3.5 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              📅 Agregar a mi calendario (.ics)
            </a>
          ) : null}
          <Link
            href={`/fincas/${establecimiento.id}/calendario/historial`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Historial
          </Link>
        </div>
      </header>

      {/* Si todavía no hay calendario activo */}
      {!calendario ? (
        <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xs">
          {!propuestaElegida ? (
            <>
              <h2 className="text-lg font-bold text-stone-900">Primero elegí una propuesta de rediseño</h2>
              <p className="text-sm text-stone-600">
                El calendario se arma automáticamente con las especies de la propuesta elegida de tu
                finca y los períodos de tu ecorregión.
              </p>
              <Link
                href={`/fincas/${establecimiento.id}/propuestas/nueva`}
                className="inline-flex min-h-11 items-center justify-center self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                🌼 Ir a propuestas de rediseño →
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-stone-900">Armá tu calendario de tareas</h2>
              <p className="text-sm text-stone-600">
                Basado en tu propuesta elegida:{" "}
                <strong>
                  {propuestaElegida.nombre ?? ETIQUETAS_DISPOSICION[propuestaElegida.disposicion]}
                </strong>
                . Generamos 12 meses con fechas de siembra, fecha límite, corte y avisos de no
                pulverizar.
              </p>
              <div className="self-start">
                <BotonGenerarCalendario
                  establecimientoId={establecimiento.id}
                  modo="nuevo"
                  texto="🗓️ Armar mi calendario"
                />
              </div>
            </>
          )}
        </section>
      ) : (
        <>
          {/* Aviso si cambió la propuesta elegida (§5.4, CA-06-10) */}
          {datos.propuestaCambioDesdeCalendario ? (
            <section
              role="status"
              className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-amber-950">
                ⚠️ Cambiaste la propuesta elegida de la finca. Podés regenerar el calendario con la
                nueva propuesta; las tareas ya hechas se conservan en el historial.
              </p>
              <div className="shrink-0">
                <BotonGenerarCalendario
                  establecimientoId={establecimiento.id}
                  modo="regenerar"
                  texto="Regenerar calendario"
                  pedirConfirmacion
                  variante="alerta"
                />
              </div>
            </section>
          ) : null}

          {/* Aviso si la propuesta elegida quedó desactualizada (§5.4) */}
          {datos.propuestaDesactualizada && propuestaElegida ? (
            <section
              role="status"
              className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-950 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">⚠️ La propuesta elegida está desactualizada</p>
                <p className="mt-0.5">{datos.motivosPropuestaDesactualizada.join(" ")}</p>
              </div>
              <Link
                href={`/fincas/${establecimiento.id}/propuestas/${propuestaElegida.id}`}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-amber-700 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100"
              >
                Ver propuesta →
              </Link>
            </section>
          ) : null}

          {/* Aviso de próxima temporada cuando falta menos de 1 mes (§5.5, CA-06-11) */}
          {datos.puedeGenerarProximaTemporada ? (
            <section className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-emerald-950">
                Falta menos de un mes para que termine esta temporada (o ya finalizó). Podés cerrar
                esta temporada en el historial y generar los próximos 12 meses.
              </p>
              <div className="shrink-0">
                <BotonGenerarCalendario
                  establecimientoId={establecimiento.id}
                  modo="proxima_temporada"
                  texto="Generar la próxima temporada"
                />
              </div>
            </section>
          ) : null}

          {/* Avisos agronómicos generados (§4.3) */}
          {calendario.avisos.length > 0 ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-bold text-amber-950">Avisos de la temporada</h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-amber-900">
                {calendario.avisos.map((av, i) => (
                  <li key={`${av.codigo}-${i}`}>{av.mensaje}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Vista Lista / Meses + Checklist */}
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
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando calendario…</p>}>
        <ContenidoCalendarioFinca params={props.params} />
      </Suspense>
    </main>
  );
}
