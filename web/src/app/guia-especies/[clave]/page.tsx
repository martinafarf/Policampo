// Ruta /guia-especies/[clave]: ficha publicada de una planta de servicio (Esp. 03, 5.6, CA-03-18, 19).
// Si no existe o no está publicada, responde 404 (RS-02).
import { and, desc, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GrillaQuincenas } from "@/componentes/catalogo/GrillaQuincenas";
import { obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import {
  ETIQUETAS_CICLO_PLANTA,
  ETIQUETAS_FUENTE_TIPO,
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_ORIGEN_PLANTA,
  ETIQUETAS_RIESGO_MALEZA,
} from "@/dominio/catalogo";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ clave: string }>;
}

async function ContenidoFichaEspecie({ params }: Props) {
  const { clave } = await params;
  await requerirUsuario(`/guia-especies/${clave}`);

  const [planta] = await db
    .select()
    .from(plantaServicio)
    .where(and(eq(plantaServicio.clave, clave.toLowerCase()), eq(plantaServicio.estado, "publicado")))
    .limit(1);

  if (!planta) {
    notFound();
  }

  const [periodos, cultivosCompatibles] = await Promise.all([
    db
      .select()
      .from(plantaServicioEcorregion)
      .where(eq(plantaServicioEcorregion.plantaId, planta.id)),
    db
      .select({
        cultivoNombre: cultivo.nombre,
        grado: compatibilidad.grado,
        justificacion: compatibilidad.justificacion,
      })
      .from(compatibilidad)
      .innerJoin(
        cultivo,
        and(eq(cultivo.id, compatibilidad.cultivoId), eq(cultivo.estado, "publicado")),
      )
      .where(
        and(
          eq(compatibilidad.plantaId, planta.id),
          eq(compatibilidad.estado, "publicado"),
          gt(compatibilidad.grado, 0),
        ),
      )
      .orderBy(desc(compatibilidad.grado)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link href="/guia-especies" className="font-semibold text-emerald-800 hover:underline">
          ← Volver a la Guía de especies
        </Link>
      </nav>

      <header className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
        <h1 className="text-2xl font-bold text-stone-900">{planta.nombreComun}</h1>
        {planta.nombreCientifico ? (
          <p className="mt-0.5 text-sm italic text-stone-600">{planta.nombreCientifico}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {planta.funciones.map((f) => (
            <span
              key={f}
              className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900"
            >
              {ETIQUETAS_FUNCION_PLANTA[f]}
            </span>
          ))}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-stone-500">Ciclo</dt>
            <dd className="mt-0.5 font-semibold text-stone-900">
              {ETIQUETAS_CICLO_PLANTA[planta.ciclo]}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Origen</dt>
            <dd className="mt-0.5 font-semibold text-stone-900">
              {ETIQUETAS_ORIGEN_PLANTA[planta.origen]}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Necesidad de agua</dt>
            <dd className="mt-0.5 font-semibold text-stone-900">
              {ETIQUETAS_NIVEL_AGUA[planta.necesidadAgua]}
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Riesgo de maleza</dt>
            <dd className="mt-0.5 font-semibold text-stone-900">
              {ETIQUETAS_RIESGO_MALEZA[planta.riesgoMaleza]}
            </dd>
          </div>
        </dl>
      </header>

      {/* Beneficios, manejo y siembra */}
      <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
        {planta.beneficios ? (
          <div>
            <h2 className="text-sm font-bold text-stone-900">Beneficios agroecológicos</h2>
            <p className="mt-1 text-sm text-stone-700">{planta.beneficios}</p>
          </div>
        ) : null}

        {planta.polinizadoresQueAtrae ? (
          <div>
            <h2 className="text-sm font-bold text-stone-900">Polinizadores e insectos que atrae</h2>
            <p className="mt-1 text-sm text-stone-700">{planta.polinizadoresQueAtrae}</p>
          </div>
        ) : null}

        {planta.manejoCorte ? (
          <div>
            <h2 className="text-sm font-bold text-stone-900">Manejo y corte (RN-11)</h2>
            <p className="mt-1 text-sm text-stone-700">{planta.manejoCorte}</p>
          </div>
        ) : null}

        {planta.dosisSiembra ? (
          <div>
            <h2 className="text-sm font-bold text-stone-900">Dosis de siembra orientativa</h2>
            <p className="mt-1 text-sm text-stone-700">{planta.dosisSiembra}</p>
          </div>
        ) : null}
      </section>

      {/* Calendario visual por ecorregión (12 meses / 24 quincenas, CA-03-18 y CA-03-19) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-stone-900">Calendario por ecorregión</h2>
        {periodos.map((p) => (
          <div
            key={p.ecorregion}
            className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-stone-900">
                {obtenerNombreEcorregion(p.ecorregion as ClaveEcorregion)}
              </h3>
              {p.semanasHastaFloracionMin && p.semanasHastaFloracionMax ? (
                <span className="text-xs text-stone-600">
                  Tiempo hasta floración:{" "}
                  <strong>
                    {p.semanasHastaFloracionMin}–{p.semanasHastaFloracionMax} semanas
                  </strong>
                </span>
              ) : null}
            </div>
            <GrillaQuincenas etiqueta="Siembra" tipo="siembra" rangos={p.siembraSemanas} soloLectura />
            <GrillaQuincenas
              etiqueta="Floración"
              tipo="floracion"
              rangos={p.floracionSemanas}
              soloLectura
            />
            <GrillaQuincenas etiqueta="Corte" tipo="corte" rangos={p.corteSemanas} soloLectura />
          </div>
        ))}
      </section>

      {/* Cultivos compatibles con su justificación */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-stone-900">Cultivos compatibles</h2>
        {cultivosCompatibles.length === 0 ? (
          <p className="text-sm text-stone-600">
            Todavía no hay compatibilidades publicadas para esta especie.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {cultivosCompatibles.map((c) => (
              <li
                key={c.cultivoNombre}
                className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-stone-900">{c.cultivoNombre}</strong>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                    +{c.grado}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-700">{c.justificacion}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fuente y aviso orientativo fijo (CA-03-18) */}
      <footer className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700">
        {planta.fuenteDetalle ? (
          <p>
            <strong>
              Fuente ({planta.fuenteTipo ? ETIQUETAS_FUENTE_TIPO[planta.fuenteTipo] : "Referencia"}):
            </strong>{" "}
            {planta.fuenteDetalle}
          </p>
        ) : null}
        <p className="font-medium text-stone-800">
          Información orientativa. Consultá con un ingeniero agrónomo antes de implementar.
        </p>
      </footer>
    </div>
  );
}

export default function PaginaFichaEspecie(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando ficha de especie…</p>}>
        <ContenidoFichaEspecie params={props.params} />
      </Suspense>
    </main>
  );
}
