// Ruta /guia-especies/[clave]: ficha publicada de una planta de servicio (Esp. 03, 5.6, CA-03-18, 19).
// Si no existe o no está publicada, responde 404 (RS-02). Estética alineada con DESIGN.md.
import { and, desc, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GrillaQuincenas } from "@/componentes/catalogo/GrillaQuincenas";
import { IconoInfo, IconoVolver } from "@/componentes/marca/Iconos";
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
    <div className="flex flex-col gap-7">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link
          href="/guia-especies"
          className="inline-flex items-center gap-1.5 font-semibold text-hoja hover:text-hoja-oscura hover:underline"
        >
          <IconoVolver />
          Volver a la Guía de especies
        </Link>
      </nav>

      <header className="rounded-[28px] border-2 border-borde bg-white p-6 sm:p-8">
        <h1 className="titulo-onda text-3xl font-bold text-bosque sm:text-4xl">
          {planta.nombreComun}
        </h1>
        {planta.nombreCientifico ? (
          <p className="mt-2 text-base italic text-tinta-suave">{planta.nombreCientifico}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {planta.funciones.map((f) => (
            <span
              key={f}
              className="rounded-full bg-menta px-3.5 py-1.5 text-xs font-semibold text-bosque"
            >
              {ETIQUETAS_FUNCION_PLANTA[f]}
            </span>
          ))}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-borde pt-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-tinta-suave">Ciclo</dt>
            <dd className="mt-0.5 font-semibold text-bosque">
              {ETIQUETAS_CICLO_PLANTA[planta.ciclo]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Origen</dt>
            <dd className="mt-0.5 font-semibold text-bosque">
              {ETIQUETAS_ORIGEN_PLANTA[planta.origen]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Necesidad de agua</dt>
            <dd className="mt-0.5 font-semibold text-bosque">
              {ETIQUETAS_NIVEL_AGUA[planta.necesidadAgua]}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-tinta-suave">Riesgo de maleza</dt>
            <dd className="mt-0.5 font-semibold text-bosque">
              {ETIQUETAS_RIESGO_MALEZA[planta.riesgoMaleza]}
            </dd>
          </div>
        </dl>
      </header>

      {/* Beneficios, manejo y siembra */}
      <section className="flex flex-col gap-5 rounded-[28px] border-2 border-borde bg-white p-6 sm:p-8">
        {planta.beneficios ? (
          <div>
            <h2 className="text-lg font-bold text-bosque">Beneficios agroecológicos</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta">{planta.beneficios}</p>
          </div>
        ) : null}

        {planta.polinizadoresQueAtrae ? (
          <div>
            <h2 className="text-lg font-bold text-bosque">Polinizadores e insectos que atrae</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta">{planta.polinizadoresQueAtrae}</p>
          </div>
        ) : null}

        {planta.manejoCorte ? (
          <div>
            <h2 className="text-lg font-bold text-bosque">Manejo y corte (RN-11)</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta">{planta.manejoCorte}</p>
          </div>
        ) : null}

        {planta.dosisSiembra ? (
          <div>
            <h2 className="text-lg font-bold text-bosque">Dosis de siembra orientativa</h2>
            <p className="mt-1 text-sm leading-relaxed text-tinta">{planta.dosisSiembra}</p>
          </div>
        ) : null}
      </section>

      {/* Calendario visual por ecorregión (12 meses / 24 quincenas, CA-03-18 y CA-03-19) */}
      <section className="flex flex-col gap-4">
        <h2 className="titulo-onda text-2xl font-bold text-bosque">Calendario por ecorregión</h2>
        {periodos.map((p) => (
          <div
            key={p.ecorregion}
            className="flex flex-col gap-4 rounded-[28px] border-2 border-borde bg-white p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-bosque">
                {obtenerNombreEcorregion(p.ecorregion as ClaveEcorregion)}
              </h3>
              {p.semanasHastaFloracionMin && p.semanasHastaFloracionMax ? (
                <span className="rounded-full bg-menta px-3 py-1 text-xs font-semibold text-bosque">
                  Tiempo hasta floración: {p.semanasHastaFloracionMin}–{p.semanasHastaFloracionMax}{" "}
                  semanas
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
      <section className="flex flex-col gap-4">
        <h2 className="titulo-onda text-2xl font-bold text-bosque">Cultivos compatibles</h2>
        {cultivosCompatibles.length === 0 ? (
          <p className="rounded-[28px] border-2 border-dashed border-borde bg-white p-6 text-sm text-tinta-suave">
            Todavía no hay compatibilidades publicadas para esta especie.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cultivosCompatibles.map((c) => (
              <li
                key={c.cultivoNombre}
                className="rounded-[28px] border-2 border-borde bg-white p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-base font-bold text-bosque">{c.cultivoNombre}</strong>
                  <span className="rounded-full bg-turquesa px-3 py-1 text-xs font-bold text-bosque">
                    +{c.grado}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-tinta">{c.justificacion}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fuente y aviso orientativo fijo (CA-03-18) */}
      <footer className="flex items-start gap-3 rounded-[28px] bg-menta p-6 text-sm text-bosque">
        <IconoInfo className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
        <div className="flex flex-col gap-1.5">
          {planta.fuenteDetalle ? (
            <p>
              <strong>
                Fuente ({planta.fuenteTipo ? ETIQUETAS_FUENTE_TIPO[planta.fuenteTipo] : "Referencia"}):
              </strong>{" "}
              {planta.fuenteDetalle}
            </p>
          ) : null}
          <p className="font-semibold">
            Información orientativa. Consultá con un ingeniero agrónomo antes de implementar.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function PaginaFichaEspecie(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando ficha de especie…</p>}>
        <ContenidoFichaEspecie params={props.params} />
      </Suspense>
    </main>
  );
}
