// Ruta /guia-especies: Guía de especies publicadas para usuarios con sesión (Esp. 03, 5.6, CA-03-17, 19).
// Nunca expone borradores, retirados ni historial (RS-02). Estética alineada con DESIGN.md.
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { IconoFlecha, IconoInfo, IconoVolver } from "@/componentes/marca/Iconos";
import {
  ECORREGIONES,
  esEcorregionValida,
  type ClaveEcorregion,
} from "@/datos/jujuy";
import { db } from "@/db";
import { cultivo } from "@/db/schema";
import {
  ETIQUETAS_CICLO_PLANTA,
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_RIESGO_MALEZA,
  FUNCIONES_PLANTA,
  type FuncionPlanta,
} from "@/dominio/catalogo";
import {
  consultarPlantasCompatiblesPublicadas,
  consultarPlantasPublicadasParaGuia,
} from "@/dominio/catalogo/consultas";
import { esUuidValido } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  searchParams: Promise<{
    ecorregion?: string;
    cultivo?: string;
    funcion?: string;
  }>;
}

const CLASE_SELECT =
  "min-h-12 rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-sm text-tinta transition focus:border-hoja focus:bg-white focus:outline-none";

async function ContenidoGuiaEspecies({ searchParams }: Props) {
  await requerirUsuario("/guia-especies");
  const filtros = await searchParams;

  const ecorregionFiltro =
    filtros.ecorregion && esEcorregionValida(filtros.ecorregion)
      ? (filtros.ecorregion as ClaveEcorregion)
      : undefined;
  const funcionFiltro = (FUNCIONES_PLANTA as readonly string[]).includes(filtros.funcion ?? "")
    ? (filtros.funcion as FuncionPlanta)
    : undefined;
  const cultivoFiltroId =
    filtros.cultivo && esUuidValido(filtros.cultivo) ? filtros.cultivo : undefined;

  const cultivosPublicados = await db
    .select({ id: cultivo.id, nombre: cultivo.nombre })
    .from(cultivo)
    .where(eq(cultivo.estado, "publicado"))
    .orderBy(asc(cultivo.nombre));

  // Si hay filtro de cultivo + ecorregión, usamos la consulta ordenada por grado descendente (CA-03-17).
  let tarjetas: {
    clave: string;
    nombreComun: string;
    nombreCientifico: string | null;
    funciones: FuncionPlanta[];
    ciclo: "anual" | "bianual" | "perenne";
    esEspontanea: boolean;
    enMercadoLocal: boolean;
    necesidadAgua: "baja" | "media" | "alta";
    riesgoMaleza: "bajo" | "medio" | "alto";
    grado?: number;
    justificacion?: string;
  }[] = [];

  if (cultivoFiltroId) {
    const ecorregionesABuscar: ClaveEcorregion[] = ecorregionFiltro
      ? [ecorregionFiltro]
      : ECORREGIONES.map((e) => e.clave);

    const porClave = new Map<string, (typeof tarjetas)[number]>();
    for (const eco of ecorregionesABuscar) {
      const filas = await consultarPlantasCompatiblesPublicadas({
        ecorregion: eco,
        cultivoId: cultivoFiltroId,
      });
      for (const f of filas) {
        if (funcionFiltro && !f.funciones.includes(funcionFiltro)) continue;
        const existente = porClave.get(f.clave);
        if (!existente || (existente.grado ?? -99) < f.grado) {
          porClave.set(f.clave, {
            clave: f.clave,
            nombreComun: f.nombreComun,
            nombreCientifico: f.nombreCientifico,
            funciones: f.funciones,
            ciclo: f.ciclo,
            esEspontanea: f.esEspontanea,
            enMercadoLocal: f.enMercadoLocal,
            necesidadAgua: f.necesidadAgua,
            riesgoMaleza: f.riesgoMaleza,
            grado: f.grado,
            justificacion: f.justificacion,
          });
        }
      }
    }
    tarjetas = Array.from(porClave.values()).sort(
      (a, b) => (b.grado ?? 0) - (a.grado ?? 0) || a.nombreComun.localeCompare(b.nombreComun, "es-AR"),
    );
  } else {
    tarjetas = await consultarPlantasPublicadasParaGuia({
      ecorregion: ecorregionFiltro,
      funcion: funcionFiltro,
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <Link
          href="/inicio"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-hoja hover:text-hoja-oscura hover:underline"
        >
          <IconoVolver />
          Volver a Inicio
        </Link>
        <h1 className="titulo-onda mt-1 text-3xl font-bold text-bosque sm:text-4xl">
          Guía de especies
        </h1>
        <p className="max-w-[56ch] text-base text-tinta-suave">
          Plantas de servicio validadas para atraer polinizadores, favorecer el control biológico y
          proteger el suelo en Jujuy.
        </p>
      </header>

      {/* Filtros responsive (360 px) */}
      <form className="grid grid-cols-1 gap-3 rounded-[28px] border-2 border-borde bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <select
          name="ecorregion"
          defaultValue={ecorregionFiltro ?? ""}
          aria-label="Filtrar por ecorregión"
          className={CLASE_SELECT}
        >
          <option value="">Todas las ecorregiones</option>
          {ECORREGIONES.map((eco) => (
            <option key={eco.clave} value={eco.clave}>
              {eco.nombre}
            </option>
          ))}
        </select>

        <select
          name="cultivo"
          defaultValue={cultivoFiltroId ?? ""}
          aria-label="Filtrar por cultivo compatible"
          className={CLASE_SELECT}
        >
          <option value="">Todos los cultivos</option>
          {cultivosPublicados.map((c) => (
            <option key={c.id} value={c.id}>
              Compatible con {c.nombre}
            </option>
          ))}
        </select>

        <select
          name="funcion"
          defaultValue={funcionFiltro ?? ""}
          aria-label="Filtrar por función"
          className={CLASE_SELECT}
        >
          <option value="">Todas las funciones</option>
          {FUNCIONES_PLANTA.map((f) => (
            <option key={f} value={f}>
              {ETIQUETAS_FUNCION_PLANTA[f]}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="min-h-12 rounded-full bg-hoja px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-hoja-oscura hover:shadow-chica"
        >
          Aplicar filtros
        </button>
      </form>

      {tarjetas.length === 0 ? (
        <section className="rounded-[28px] border-2 border-dashed border-borde bg-white p-10 text-center text-sm text-tinta-suave">
          Todavía no hay plantas publicadas que coincidan con esos filtros.
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {tarjetas.map((planta) => (
            <li
              key={planta.clave}
              className="flex flex-col justify-between gap-4 rounded-[28px] border-2 border-borde bg-white p-6 transition hover:-translate-y-1 hover:shadow-suave"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 break-words">
                    <h2 className="text-xl font-bold text-bosque">{planta.nombreComun}</h2>
                    {planta.nombreCientifico ? (
                      <p className="text-sm italic text-tinta-suave">{planta.nombreCientifico}</p>
                    ) : null}
                  </div>
                  {planta.grado !== undefined ? (
                    <span className="shrink-0 rounded-full bg-turquesa px-3 py-1 text-xs font-bold text-bosque">
                      Compatibilidad +{planta.grado}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap gap-2">
                  {planta.funciones.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-menta px-3 py-1 text-xs font-semibold text-bosque"
                    >
                      {ETIQUETAS_FUNCION_PLANTA[f]}
                    </span>
                  ))}
                </div>

                {planta.justificacion ? (
                  <p className="mt-1 rounded-2xl bg-menta/60 px-4 py-3 text-sm text-bosque">
                    {planta.justificacion}
                  </p>
                ) : null}

                <p className="mt-1 text-sm text-tinta-suave">
                  Ciclo: <strong className="text-tinta">{ETIQUETAS_CICLO_PLANTA[planta.ciclo]}</strong>{" "}
                  · Agua: <strong className="text-tinta">{ETIQUETAS_NIVEL_AGUA[planta.necesidadAgua]}</strong>{" "}
                  · Riesgo maleza:{" "}
                  <strong className="text-tinta">{ETIQUETAS_RIESGO_MALEZA[planta.riesgoMaleza]}</strong>
                </p>
                <p className="text-xs text-tinta-suave">
                  {[
                    planta.esEspontanea ? "Flora espontánea" : null,
                    planta.enMercadoLocal ? "Disponible en mercado local" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <Link
                href={`/guia-especies/${planta.clave}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-hoja px-6 text-sm font-semibold text-hoja transition hover:-translate-y-0.5 hover:bg-menta/50 hover:shadow-chica"
              >
                Ver ficha y calendario
                <IconoFlecha className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Aviso fijo obligatorio (Esp. 03, 5.6, CA-03-18) */}
      <aside className="flex items-start gap-3 rounded-[28px] bg-menta p-5 text-sm text-bosque">
        <IconoInfo className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
        <p>Información orientativa. Consultá con un ingeniero agrónomo antes de implementar.</p>
      </aside>
    </div>
  );
}

export default function PaginaGuiaEspecies(props: Props) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando Guía de especies…</p>}>
        <ContenidoGuiaEspecies searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
