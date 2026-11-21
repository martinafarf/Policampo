// Ruta /fincas/[id]: ficha del establecimiento (Esp. 02, 5.4, CA-02-05, CA-02-19, CA-02-20).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerNombreEcorregion } from "@/datos/jujuy";
import {
  BOTON_EDICION_METODO,
  ETIQUETAS_METODO,
  ETIQUETAS_SUBTIPO_FLORES,
  RUTA_EDICION_METODO,
  calcularMetricasEstablecimiento,
  formatearSuperficieCompleta,
  type UbicacionRelativa,
} from "@/dominio/establecimientos";
import { obtenerEstablecimientoDelUsuario } from "../_lib/consultas";
import { exigirUsuarioActual } from "../_lib/sesion";
import { MenuMasFicha } from "./MenuMasFicha";
import { VistaPreviaDibujo } from "./VistaPreviaDibujo";

const ETIQUETAS_UBICACION: Readonly<Record<UbicacionRelativa, string>> = {
  arriba_izquierda: "Arriba a la izquierda",
  arriba_centro: "Arriba al centro",
  arriba_derecha: "Arriba a la derecha",
  centro_izquierda: "Centro a la izquierda",
  centro: "Centro",
  centro_derecha: "Centro a la derecha",
  abajo_izquierda: "Abajo a la izquierda",
  abajo_centro: "Abajo al centro",
  abajo_derecha: "Abajo a la derecha",
};

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}

async function ContenidoFicha({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await exigirUsuarioActual(`/fincas/${id}`);
  const [{ aviso }, finca] = await Promise.all([
    searchParams,
    obtenerEstablecimientoDelUsuario(id, usuario.id),
  ]);

  if (!finca) {
    notFound();
  }

  const metricas = calcularMetricasEstablecimiento(
    finca.superficieTotalHa,
    finca.sectores.map((s) => ({ tipo: s.tipo, superficieHa: s.superficieHa })),
  );

  const rutaMetodo = `/fincas/${finca.id}/${RUTA_EDICION_METODO[finca.metodoCaracterizacion]}`;
  const etiquetaMetodo = ETIQUETAS_METODO[finca.metodoCaracterizacion];

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link href="/fincas" className="font-semibold text-emerald-800 hover:underline">
          ← Volver a Mis fincas
        </Link>
      </nav>

      {aviso === "datos-guardados" ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se guardaron los datos generales de la finca.
        </div>
      ) : null}

      {aviso === "metodo-distinto" ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          Esta finca se carga con {etiquetaMetodo.toLowerCase()}.
        </div>
      ) : null}

      <header className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
              Método: {etiquetaMetodo}
            </span>
            <h1 className="mt-1.5 text-2xl font-bold text-stone-900">{finca.nombre}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {finca.direccion} · {finca.localidad}, {finca.departamento}
            </p>
            <p className="text-sm text-stone-600">
              Ecorregión: <strong className="text-stone-800">{obtenerNombreEcorregion(finca.ecorregion)}</strong>
            </p>
          </div>
          <MenuMasFicha establecimientoId={finca.id} nombreEstablecimiento={finca.nombre} />
        </div>

        {/* Único botón de edición de sectores según el método (RN-03, CA-02-19) */}
        <div className="flex flex-col gap-2.5 border-t border-stone-100 pt-4 sm:flex-row">
          <Link
            href={rutaMetodo}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {BOTON_EDICION_METODO[finca.metodoCaracterizacion]}
          </Link>
          <Link
            href={`/fincas/${finca.id}/datos`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Editar datos generales
          </Link>
        </div>
      </header>

      {/* Métricas de superficie y referencia del 20 % (CA-02-19) */}
      <section aria-labelledby="titulo-metricas" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="titulo-metricas" className="sr-only">
          Métricas de superficie
        </h2>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Superficie total</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {metricas.superficieTotalHa !== null
              ? formatearSuperficieCompleta(metricas.superficieTotalHa)
              : "Se calcula al dibujar"}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Distribuida</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {formatearSuperficieCompleta(metricas.superficieDistribuidaHa)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Restante</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {metricas.superficieRestanteHa !== null
              ? formatearSuperficieCompleta(metricas.superficieRestanteHa)
              : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-medium text-stone-500">Superficie con flores</p>
          <p className="mt-1 text-base font-bold text-stone-900">
            {metricas.porcentajeFlores !== null
              ? `${metricas.porcentajeFlores.toLocaleString("es-AR")} %`
              : "—"}
          </p>
          {metricas.porcentajeFlores !== null ? (
            <p
              className={`mt-1 text-xs font-semibold ${
                metricas.llegaAl20PorCiento ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {metricas.llegaAl20PorCiento
                ? "Llega al 20 % recomendado"
                : "Por debajo del 20 % recomendado"}
            </p>
          ) : null}
        </div>
      </section>

      <VistaPreviaDibujo
        metodo={finca.metodoCaracterizacion}
        superficieTotalHa={finca.superficieTotalHa}
        contorno={finca.contorno}
        sectores={finca.sectores}
      />

      {/* Lista de sectores cargados */}
      <section aria-labelledby="titulo-sectores" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="titulo-sectores" className="text-lg font-bold text-stone-900">
            Sectores ({finca.sectores.length})
          </h2>
        </div>

        {finca.sectores.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
            Todavía no hay sectores cargados en esta finca.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {finca.sectores.map((s) => {
              const esFlores = s.tipo === "sector_flores";
              const detalleTipo = esFlores
                ? s.subtipoFlores
                  ? ETIQUETAS_SUBTIPO_FLORES[s.subtipoFlores]
                  : "Sector de flores"
                : s.cultivoNombre ?? (s.cultivoOtro ? `Otro: ${s.cultivoOtro}` : "Cultivo");

              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          esFlores
                            ? "bg-purple-100 text-purple-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {esFlores ? "🌼 Flores" : "🌱 Cultivo"}
                      </span>
                      <span className="font-semibold text-stone-900">{s.nombre}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-600">
                      {detalleTipo}
                      {s.ubicacionRelativa
                        ? ` · ${ETIQUETAS_UBICACION[s.ubicacionRelativa]}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">
                    {formatearSuperficieCompleta(s.superficieHa)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Bloque "Solicitar diagnóstico" desactivado hasta el módulo 04 (CA-02-19) */}
      <section className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-800">Diagnóstico agroecológico</h2>
          <p className="text-sm text-stone-600">
            Evaluá el déficit de biodiversidad y recibí recomendaciones de franjas florales.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg bg-stone-300 px-4 py-2 text-sm font-semibold text-stone-600"
          >
            Solicitar diagnóstico
          </button>
          <span className="text-xs font-medium text-stone-500">Disponible próximamente</span>
        </div>
      </section>
    </div>
  );
}

export default function PaginaFichaFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando ficha de la finca…</p>}>
        <ContenidoFicha params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
