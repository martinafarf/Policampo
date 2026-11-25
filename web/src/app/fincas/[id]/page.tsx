// Ruta /fincas/[id]: ficha del establecimiento (Esp. 02, 5.4, CA-02-05, CA-02-19, CA-02-20).
//
// Pensada para que se entienda sin conocer la plataforma (DESIGN.md → Pantallas internas):
// 1. Arriba: dónde estás (migas), el nombre y sus datos, y "Editar" + el menú "Más".
// 2. El camino de 5 pasos (Terreno → Diagnóstico → Rediseño → Calendario → Informe) con el estado de
//    cada uno y su botón. Solo el paso que te toca tiene el botón principal (oliva).
// 3. Cómo está la finca: el dibujo con sus sectores, y cuántas flores tiene frente al 20 %.
//
// En la computadora va en dos columnas: a la izquierda los pasos (cada botón en su renglón, centrado);
// a la derecha las flores y el dibujo, con el dibujo al lado de su lista. En el celular va una cosa
// debajo de la otra: pasos, flores, dibujo.
//
// Los requisitos (qué hace falta para pedir el diagnóstico, generar el informe, etc.) son los mismos
// de antes: solo cambia cómo se muestran.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { BotonSolicitarDiagnostico } from "@/componentes/diagnostico/BotonSolicitarDiagnostico";
import { BotonEmitirInforme } from "@/componentes/informe/BotonEmitirInforme";
import { IconoCandado, IconoFlecha, IconoOk } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Etiqueta, type TonoEtiqueta } from "@/componentes/ui/etiqueta";
import { Aviso } from "@/componentes/ui/formulario";
import { MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { obtenerNombreEcorregion } from "@/datos/jujuy";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import {
  BOTON_EDICION_METODO,
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  RUTA_EDICION_METODO,
  calcularMetricasEstablecimiento,
  type UbicacionRelativa,
} from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstadoDeFinca } from "../_lib/pasos-finca";
import { MenuMasFicha } from "./MenuMasFicha";
import type { EstadoPaso, Paso } from "./pasos";
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

/** Hectáreas cortas para leer rápido: "4,2 ha" (el detalle en m² queda en las pantallas de carga). */
function hectareas(ha: number): string {
  return `${formatearNumeroEsAr(ha, 2)} ha`;
}

/** Cómo se ve cada estado de paso: color de la etiqueta y del círculo con el número. */
const TONO_PASO: Record<EstadoPaso, TonoEtiqueta> = {
  listo: "listo",
  ahora: "ahora",
  atencion: "atencion",
  espera: "espera",
  disponible: "listo",
};

function CirculoPaso({ paso }: { paso: Paso }) {
  const base = "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-extrabold";
  if (paso.estado === "listo") {
    return (
      <span className={`${base} border-hoja bg-hoja text-white`}>
        <IconoOk className="h-5 w-5" />
        <span className="sr-only">Paso {paso.numero}, listo</span>
      </span>
    );
  }
  if (paso.estado === "espera") {
    return (
      <span className={`${base} border-borde bg-papel text-tinta-suave`}>
        <IconoCandado className="h-4 w-4" />
        <span className="sr-only">Paso {paso.numero}, todavía no disponible</span>
      </span>
    );
  }
  const actual = paso.estado === "ahora" || paso.estado === "atencion";
  return (
    <span className={`${base} ${actual ? "border-naranja bg-naranja text-bosque" : "border-hoja bg-white text-hoja"}`}>
      {paso.numero}
    </span>
  );
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}

async function ContenidoFicha({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}`);
  const [{ aviso }, estado] = await Promise.all([searchParams, obtenerEstadoDeFinca(id, usuario.id)]);

  if (!estado) {
    notFound();
  }
  const { finca, cantidadCultivos, resumenDiag, propuestaElegida, requisitosInforme, cantidadInformes, pasos } =
    estado;

  const metricas = calcularMetricasEstablecimiento(
    finca.superficieTotalHa,
    finca.sectores.map((s) => ({ tipo: s.tipo, superficieHa: s.superficieHa })),
  );

  const rutaMetodo = `/fincas/${finca.id}/${RUTA_EDICION_METODO[finca.metodoCaracterizacion]}`;
  const fincaId = finca.id; // constante: TypeScript la sigue viendo dentro de accionesDelPaso
  const base = `/fincas/${fincaId}`;

  /** Los botones de cada paso. El del paso que te toca es el único "principal" de la pantalla. */
  function accionesDelPaso(paso: Paso): ReactNode {
    const principal = paso.estado === "ahora" || paso.estado === "atencion";
    switch (paso.clave) {
      case "terreno":
        return paso.estado === "ahora" ? (
          <BotonEnlace href={rutaMetodo}>
            Completar mi terreno <IconoFlecha className="h-5 w-5" />
          </BotonEnlace>
        ) : null;
      case "diagnostico":
        if (paso.estado === "espera") return null;
        if (paso.estado === "ahora") {
          return <BotonSolicitarDiagnostico establecimientoId={fincaId} texto="Pedir mi diagnóstico" />;
        }
        if (paso.estado === "atencion") {
          return (
            <>
              <BotonEnlace href={`${base}/diagnostico`} variante="texto">
                Ver el anterior
              </BotonEnlace>
              <BotonSolicitarDiagnostico establecimientoId={fincaId} texto="Actualizar diagnóstico" />
            </>
          );
        }
        return (
          <BotonEnlace href={`${base}/diagnostico`} variante="contorno">
            Ver diagnóstico
          </BotonEnlace>
        );
      case "rediseno":
        if (propuestaElegida) {
          return (
            <>
              <BotonEnlace href={`${base}/propuestas`} variante="texto">
                Ver todas
              </BotonEnlace>
              <BotonEnlace href={`${base}/propuestas/${propuestaElegida.id}`} variante="contorno">
                Ver mi rediseño
              </BotonEnlace>
            </>
          );
        }
        return paso.estado === "espera" ? null : (
          <BotonEnlace href={`${base}/propuestas/nueva`} variante={principal ? "principal" : "contorno"}>
            Armar mi rediseño {principal && <IconoFlecha className="h-5 w-5" />}
          </BotonEnlace>
        );
      case "calendario":
        if (paso.estado === "espera") return null;
        return (
          <BotonEnlace href={`${base}/calendario`} variante={principal ? "principal" : "contorno"}>
            {paso.estado === "listo" ? "Ver calendario" : "Armar mi calendario"}
            {principal && <IconoFlecha className="h-5 w-5" />}
          </BotonEnlace>
        );
      case "informe":
        if (paso.estado === "espera" || !requisitosInforme) return null;
        return (
          <>
            {cantidadInformes > 0 && (
              <BotonEnlace href={`${base}/informes`} variante="texto">
                Ver informes
              </BotonEnlace>
            )}
            <BotonEmitirInforme
              establecimientoId={fincaId}
              cumpleRequisitos={requisitosInforme.cumple}
              mensajeFaltante={requisitosInforme.mensajeFaltante}
              nombrePerfilCompleto={requisitosInforme.nombrePerfilCompleto}
              principal={false}
            />
          </>
        );
    }
  }

  // Cuánto falta para llegar al 20 % de flores (en hectáreas), si se conoce la superficie total.
  const objetivo = LIMITES_ESTABLECIMIENTO.objetivoFloresPct;
  const faltaFloresHa =
    metricas.superficieTotalHa !== null
      ? Math.max(0, (metricas.superficieTotalHa * objetivo) / 100 - metricas.superficieFloresHa)
      : null;
  // La barra va de 0 a 40 % (o más si la finca ya tiene más flores), con una marca en el 20 %.
  const topeBarra = Math.max(40, Math.ceil(metricas.porcentajeFlores ?? 0));

  const datos = [
    ...(finca.direccion ? [finca.direccion] : []),
    `${finca.localidad}, ${finca.departamento}`,
    ...(metricas.superficieTotalHa !== null ? [hectareas(metricas.superficieTotalHa)] : []),
    cantidadCultivos === 1 ? "1 cultivo" : `${cantidadCultivos} cultivos`,
    obtenerNombreEcorregion(finca.ecorregion),
  ];

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        migas={[{ texto: "Mis fincas", href: "/fincas" }]}
        titulo={finca.nombre}
        datos={datos}
        acciones={
          <>
            <BotonEnlace href={rutaMetodo} variante="contorno">
              {BOTON_EDICION_METODO[finca.metodoCaracterizacion]}
            </BotonEnlace>
            <MenuMasFicha
              establecimientoId={fincaId}
              nombreEstablecimiento={finca.nombre}
              metodoActual={finca.metodoCaracterizacion}
              cantidadSectores={finca.sectores.length}
              superficieTotalHa={finca.superficieTotalHa}
              version={finca.version}
            />
          </>
        }
      />

      {aviso === "datos-guardados" && <Aviso tipo="exito">Se guardaron los datos de la finca.</Aviso>}
      {aviso === "sectores-guardados" && <Aviso tipo="exito">Se guardó tu terreno.</Aviso>}
      {aviso === "metodo-distinto" && (
        <Aviso>Esta finca se carga con {BOTON_EDICION_METODO[finca.metodoCaracterizacion].replace("Editar ", "")}.</Aviso>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Columna izquierda: los pasos */}
        <div className="flex flex-col gap-5">
          {/* Camino de pasos: qué hiciste, qué te toca y qué viene después */}
          <Tarjeta titulo="Tus pasos">
            <ol className="flex flex-col divide-y-[1.5px] divide-borde">
              {pasos.map((paso) => {
                const actual = paso.estado === "ahora" || paso.estado === "atencion";
                const acciones = accionesDelPaso(paso);
                return (
                  <li
                    key={paso.clave}
                    aria-current={actual ? "step" : undefined}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${actual ? "-mx-3 rounded-2xl border-0 bg-menta px-3" : ""}`}
                  >
                    <CirculoPaso paso={paso} />
                    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-lg font-bold ${paso.estado === "espera" ? "text-tinta-suave" : "text-bosque"}`}>
                          {paso.titulo}
                        </h3>
                        <Etiqueta tono={TONO_PASO[paso.estado]} conIcono={paso.estado !== "disponible"}>
                          {paso.etiqueta}
                        </Etiqueta>
                        {paso.clave === "diagnostico" && resumenDiag && !resumenDiag.desactualizado && (
                          <BadgeNivelDiagnostico nivel={resumenDiag.nivelRiesgo} />
                        )}
                      </div>
                      <p className="text-[0.95rem] text-tinta-suave">
                        {paso.clave === "rediseno" && propuestaElegida
                          ? `${propuestaElegida.nombre ?? ETIQUETAS_DISPOSICION[propuestaElegida.disposicion]}: llega al ${formatearNumeroEsAr(propuestaElegida.porcentajeLogrado, 1)} % de flores.`
                          : paso.detalle}
                      </p>
                    </div>
                    {/* Los botones van en su propio renglón, centrados, para que todos los pasos queden parejos */}
                    {acciones && (
                      <div className="flex basis-full flex-wrap items-center justify-center gap-2">{acciones}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Tarjeta>
        </div>

        {/* Columna derecha: las flores y el dibujo de la finca */}
        <div className="flex flex-col gap-5">
          {/* Flores en tu finca: el dato primero, la explicación escondida */}
          <Tarjeta
            titulo="Flores en tu finca"
            extra={
              <span className="flex items-center gap-1.5">
                {metricas.porcentajeFlores !== null &&
                  (metricas.llegaAl20PorCiento ? (
                    <Etiqueta tono="listo">Llega al {objetivo} %</Etiqueta>
                  ) : (
                    <Etiqueta tono="atencion">Bajo el {objetivo} %</Etiqueta>
                  ))}
                {/* El porqué del 20 %, escondido en una burbuja para que la tarjeta quede corta */}
                <MasInfo sobre={`por qué el ${objetivo} %`}>
                  Con al menos un {objetivo} % de la finca con flores y vegetación natural llegan más abejas y
                  bichos que se comen las plagas, y mejoran las cosechas (Garibaldi y otros).
                </MasInfo>
              </span>
            }
          >
            {metricas.porcentajeFlores === null ? (
              <p className="text-tinta-suave">Se calcula cuando cargues la superficie total de la finca.</p>
            ) : (
              <>
                <p className="flex items-baseline gap-2">
                  <strong className="font-titulos text-4xl font-extrabold text-bosque">
                    {formatearNumeroEsAr(metricas.porcentajeFlores, 1)} %
                  </strong>
                  <span className="text-tinta-suave">con flores</span>
                </p>

                {/* Barra: cuánto hay (naranja) y dónde está la meta del 20 % (marca bosque) */}
                <div className="relative pt-6" aria-hidden="true">
                  <span
                    className="absolute top-0 -translate-x-1/2 text-xs font-bold whitespace-nowrap text-bosque"
                    style={{ left: `${(objetivo / topeBarra) * 100}%` }}
                  >
                    Meta {objetivo} %
                  </span>
                  <div className="h-4 overflow-hidden rounded-full bg-menta">
                    <div
                      className="h-full rounded-full bg-naranja"
                      style={{ width: `${Math.min(100, (metricas.porcentajeFlores / topeBarra) * 100)}%` }}
                    />
                  </div>
                  <span
                    className="absolute top-5 bottom-[-4px] w-[3px] -translate-x-1/2 rounded-full bg-bosque"
                    style={{ left: `${(objetivo / topeBarra) * 100}%` }}
                  />
                </div>

                <p className="font-titulos text-lg font-bold text-bosque">
                  {faltaFloresHa !== null && faltaFloresHa > 0
                    ? `Te falta sumar ${hectareas(faltaFloresHa)} de flores.`
                    : "Tu finca ya tiene las flores recomendadas."}
                </p>
              </>
            )}
          </Tarjeta>
          {/* Así está tu finca: dibujo + sectores, con los mismos colores */}
          <Tarjeta
            titulo="Así está tu finca"
            extra={
              <BotonEnlace href={rutaMetodo} variante="texto">
                Editar
              </BotonEnlace>
            }
          >
            {/* Con dibujo (croquis o mapa), en pantallas anchas el dibujo va a la izquierda y la lista a la derecha */}
            <div
              className={
                finca.metodoCaracterizacion === "cuestionario"
                  ? "flex flex-col gap-4"
                  : "grid items-start gap-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
              }
            >
              <VistaPreviaDibujo
                metodo={finca.metodoCaracterizacion}
                superficieTotalHa={finca.superficieTotalHa}
                contorno={finca.contorno}
                sectores={finca.sectores}
                claseAlto="h-64 sm:h-72"
                cuadrada
              />
              <div className="flex flex-col gap-3">
                {finca.sectores.length === 0 ? (
                  <p className="text-tinta-suave">
                    Todavía no cargaste cultivos ni flores.{" "}
                    <Link href={rutaMetodo} className="font-semibold text-hoja underline">
                      Cargarlos ahora
                    </Link>
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y-[1.5px] divide-borde" aria-label="Sectores de la finca">
                    {finca.sectores.map((s) => {
                      const esFlores = s.tipo === "sector_flores";
                      const detalle = esFlores
                        ? s.subtipoFlores
                          ? ETIQUETAS_SUBTIPO_FLORES[s.subtipoFlores]
                          : "Flores"
                        : (s.cultivoNombre ?? s.cultivoOtro ?? "Cultivo");
                      return (
                        <li key={s.id} className="flex items-center gap-3 py-2.5">
                          <span
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border ${
                              esFlores ? "border-purple-700 bg-purple-600/35" : "border-green-700 bg-green-600/35"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold break-words text-tinta">{s.nombre}</p>
                            <p className="text-sm text-tinta-suave">
                              {esFlores ? "Flores" : "Cultivo"}
                              {detalle !== s.nombre && detalle !== "Flores" ? ` · ${detalle}` : ""}
                              {s.ubicacionRelativa ? ` · ${ETIQUETAS_UBICACION[s.ubicacionRelativa]}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 font-semibold text-tinta">{hectareas(s.superficieHa)}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {metricas.superficieRestanteHa !== null && metricas.superficieRestanteHa > 0 && (
                  <p className="text-sm text-tinta-suave">
                    Sin cargar: <strong className="text-tinta">{hectareas(metricas.superficieRestanteHa)}</strong> de{" "}
                    {hectareas(metricas.superficieTotalHa ?? 0)}.
                  </p>
                )}
              </div>
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}

export default function PaginaFichaFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando tu finca…</p>}>
        <ContenidoFicha params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
