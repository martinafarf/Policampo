// Ruta /guia-especies: Guía de especies publicadas para usuarios con sesión (Esp. 03, 5.6, CA-03-17, 19).
// Nunca expone borradores, retirados ni historial (RS-02).
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
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
    // Recorrer ecorregiones seleccionadas (una o todas las 5) y deduplicar conservando el mayor grado.
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/inicio" className="text-sm font-semibold text-emerald-800 hover:underline">
          ← Volver a Inicio
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Guía de especies</h1>
        <p className="text-sm text-stone-600">
          Plantas de servicio validadas para atraer polinizadores, favorecer el control biológico y
          proteger el suelo en Jujuy.
        </p>
      </header>

      {/* Filtros responsive (360 px) */}
      <form className="grid grid-cols-1 gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <select
          name="ecorregion"
          defaultValue={ecorregionFiltro ?? ""}
          aria-label="Filtrar por ecorregión"
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
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
          className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Aplicar filtros
        </button>
      </form>

      {tarjetas.length === 0 ? (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-600">
          Todavía no hay plantas publicadas que coincidan con esos filtros.
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tarjetas.map((planta) => (
            <li
              key={planta.clave}
              className="flex flex-col justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 break-words">
                    <h2 className="text-lg font-bold text-stone-900">{planta.nombreComun}</h2>
                    {planta.nombreCientifico ? (
                      <p className="text-xs italic text-stone-600">{planta.nombreCientifico}</p>
                    ) : null}
                  </div>
                  {planta.grado !== undefined ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      Compatibilidad +{planta.grado}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap gap-1.5">
                  {planta.funciones.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700"
                    >
                      {ETIQUETAS_FUNCION_PLANTA[f]}
                    </span>
                  ))}
                </div>

                {planta.justificacion ? (
                  <p className="mt-1 rounded-lg bg-emerald-50/70 px-3 py-2 text-xs text-emerald-950">
                    {planta.justificacion}
                  </p>
                ) : null}

                <p className="mt-1 text-xs text-stone-600">
                  Ciclo: <strong>{ETIQUETAS_CICLO_PLANTA[planta.ciclo]}</strong> · Agua:{" "}
                  <strong>{ETIQUETAS_NIVEL_AGUA[planta.necesidadAgua]}</strong> · Riesgo maleza:{" "}
                  <strong>{ETIQUETAS_RIESGO_MALEZA[planta.riesgoMaleza]}</strong>
                </p>
                <p className="text-xs text-stone-500">
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
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Ver ficha y calendario
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Aviso fijo obligatorio (Esp. 03, 5.6, CA-03-18) */}
      <aside className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-700">
        Información orientativa. Consultá con un ingeniero agrónomo antes de implementar.
      </aside>
    </div>
  );
}

export default function PaginaGuiaEspecies(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando Guía de especies…</p>}>
        <ContenidoGuiaEspecies searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
