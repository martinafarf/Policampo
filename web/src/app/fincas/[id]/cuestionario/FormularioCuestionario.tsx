"use client";

// Pantalla interactiva del método cuestionario (Esp. 02, 5.3, 6.2, RD-03, CA-02-06 a 09).
// - Muestra en todo momento cuánta superficie llevás cargada (barra que se pone naranja al acercarse al total y
//   roja si se pasa). En la computadora va en un panel a la derecha con el botón Guardar; en el celular, arriba.
// - Cada sector es un bloque plegable, cómodo para el celular (desde 360 px).
// - Cada sector es UNA cosa (un cultivo o flores/vegetación): la pantalla dice "Podés agregar todos los que
//   tengas" y tiene un botón "Agregar otro sector", para que no parezca que se elige solo uno.
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import { IconoAlerta, IconoChevron, IconoMas } from "@/componentes/marca/Iconos";
import { Boton, clasesBoton } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Aviso } from "@/componentes/ui/formulario";
import { MasInfo } from "@/componentes/ui/mas-info";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  formatearHectareas,
  formatearMetrosCuadrados,
  generarNombresSectores,
  parsearNumeroDecimal,
  redondearHectareas,
  type CultivoCatalogoItem,
  type ErrorSector,
  type SubtipoFlores,
  type TipoSector,
  type UbicacionRelativa,
} from "@/dominio/establecimientos";
import { guardarSectoresCuestionario } from "./acciones";

const VALOR_OTRO_CULTIVO = "__OTRO__";

const CAMPO =
  "min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";

const GRILLA_UBICACIONES: readonly { valor: UbicacionRelativa; corta: string; etiqueta: string }[] = [
  { valor: "arriba_izquierda", corta: "Arriba Izq.", etiqueta: "Arriba a la izquierda" },
  { valor: "arriba_centro", corta: "Arriba Centro", etiqueta: "Arriba al centro" },
  { valor: "arriba_derecha", corta: "Arriba Der.", etiqueta: "Arriba a la derecha" },
  { valor: "centro_izquierda", corta: "Centro Izq.", etiqueta: "Centro a la izquierda" },
  { valor: "centro", corta: "Centro", etiqueta: "Centro" },
  { valor: "centro_derecha", corta: "Centro Der.", etiqueta: "Centro a la derecha" },
  { valor: "abajo_izquierda", corta: "Abajo Izq.", etiqueta: "Abajo a la izquierda" },
  { valor: "abajo_centro", corta: "Abajo Centro", etiqueta: "Abajo al centro" },
  { valor: "abajo_derecha", corta: "Abajo Der.", etiqueta: "Abajo a la derecha" },
];

export interface SectorInicialCuestionario {
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string | null;
  subtipoFlores: SubtipoFlores | null;
  nombre: string;
  superficieHa: number;
  ubicacionRelativa: UbicacionRelativa | null;
}

interface FilaSector {
  claveLocal: string;
  abierto: boolean;
  tipo: TipoSector;
  cultivoSeleccion: string; // uuid del catálogo, VALOR_OTRO_CULTIVO o ""
  cultivoOtro: string;
  subtipoFlores: SubtipoFlores | "";
  nombrePersonalizado: string;
  superficieTexto: string;
  ubicacionRelativa: UbicacionRelativa | "";
}

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
  superficieTotalHa: number;
  versionInicial: number;
  actualizadoEnIso: string;
  cultivos: readonly CultivoCatalogoItem[];
  sectoresIniciales: readonly SectorInicialCuestionario[];
}

function crearFilaVacia(claveLocal: string): FilaSector {
  return {
    claveLocal,
    abierto: true,
    tipo: "cultivo",
    cultivoSeleccion: "",
    cultivoOtro: "",
    subtipoFlores: "",
    nombrePersonalizado: "",
    superficieTexto: "",
    ubicacionRelativa: "centro",
  };
}

function convertirIniciales(sectores: readonly SectorInicialCuestionario[]): FilaSector[] {
  if (sectores.length === 0) {
    return [crearFilaVacia("sector-0")];
  }
  return sectores.map((s, indice) => ({
    claveLocal: `sector-inicial-${indice}`,
    abierto: indice === 0,
    tipo: s.tipo,
    cultivoSeleccion: s.cultivoOtro ? VALOR_OTRO_CULTIVO : (s.cultivoId ?? ""),
    cultivoOtro: s.cultivoOtro ?? "",
    subtipoFlores: s.subtipoFlores ?? "",
    nombrePersonalizado: s.nombre,
    superficieTexto: String(s.superficieHa),
    ubicacionRelativa: s.ubicacionRelativa ?? "centro",
  }));
}

export function FormularioCuestionario({
  establecimientoId,
  nombreEstablecimiento,
  superficieTotalHa,
  versionInicial,
  actualizadoEnIso,
  cultivos,
  sectoresIniciales,
}: Props) {
  const router = useRouter();
  const [filas, setFilas] = useState<FilaSector[]>(() => convertirIniciales(sectoresIniciales));
  const [siguienteId, setSiguienteId] = useState<number>(sectoresIniciales.length + 1);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [erroresPorIndice, setErroresPorIndice] = useState<Map<number, string>>(new Map());
  const [guardando, iniciarTransicion] = useTransition();

  const onRecuperarBorrador = useCallback((datos: FilaSector[]) => {
    setFilas(datos);
    setSiguienteId((n) => n + datos.length + 1);
  }, []);

  const {
    borradorPendiente,
    ultimoAutoguardado,
    recuperarBorrador,
    descartarBorrador,
    guardarBorradorAhora,
    limpiarBorrador,
  } = useBorradorFinca<FilaSector[]>({
    establecimientoId,
    metodo: "cuestionario",
    actualizadoEnIso,
    datosActuales: filas,
    onRecuperar: onRecuperarBorrador,
  });

  const mapaCultivos = new Map(cultivos.map((c) => [c.id, c]));

  // Nombres automáticos calculados en vivo para mostrar como sugerencia (CA-02-07).
  const nombresSugeridos = generarNombresSectores(
    filas.map((f) => {
      const nombreCultivo =
        f.cultivoSeleccion === VALOR_OTRO_CULTIVO
          ? f.cultivoOtro
          : mapaCultivos.get(f.cultivoSeleccion)?.nombre;
      return {
        tipo: f.tipo,
        nombreCultivo,
        nombrePersonalizado: null,
      };
    }),
  );

  // Cálculo en vivo de superficie distribuida, restante y exceso (Esp. 02, 6.2).
  const superficieDistribuida = redondearHectareas(
    filas.reduce((acum, f) => {
      const num = parsearNumeroDecimal(f.superficieTexto);
      return acum + (num !== null && num > 0 ? num : 0);
    }, 0),
  );
  const maximoConTolerancia =
    superficieTotalHa * (1 + LIMITES_ESTABLECIMIENTO.toleranciaSumaSectores);
  const excedida = superficieDistribuida > maximoConTolerancia;
  const excesoHa = excedida ? redondearHectareas(superficieDistribuida - superficieTotalHa) : 0;
  const restanteHa = redondearHectareas(Math.max(0, superficieTotalHa - superficieDistribuida));
  const cercaDeCero = !excedida && restanteHa <= superficieTotalHa * 0.1;

  function actualizarFila(indice: number, cambios: Partial<FilaSector>) {
    setFilas((previas) =>
      previas.map((fila, idx) => (idx === indice ? { ...fila, ...cambios } : fila)),
    );
  }

  function agregarSector() {
    if (filas.length >= LIMITES_ESTABLECIMIENTO.maxSectores) return;
    const nuevaClave = `sector-nuevo-${siguienteId}`;
    setSiguienteId((n) => n + 1);
    setFilas((previas) => [
      ...previas.map((f) => ({ ...f, abierto: false })),
      crearFilaVacia(nuevaClave),
    ]);
  }

  function eliminarSector(indice: number) {
    setFilas((previas) => previas.filter((_, idx) => idx !== indice));
    setErroresPorIndice(new Map());
  }

  function manejarGuardado(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorGeneral(null);
    setErroresPorIndice(new Map());

    iniciarTransicion(async () => {
      try {
        const respuesta = await guardarSectoresCuestionario(establecimientoId, {
          version: versionInicial,
          sectores: filas.map((f) => ({
            tipo: f.tipo,
            cultivoId:
              f.tipo === "cultivo" && f.cultivoSeleccion && f.cultivoSeleccion !== VALOR_OTRO_CULTIVO
                ? f.cultivoSeleccion
                : null,
            cultivoOtro:
              f.tipo === "cultivo" && f.cultivoSeleccion === VALOR_OTRO_CULTIVO
                ? f.cultivoOtro
                : null,
            subtipoFlores: f.tipo === "sector_flores" && f.subtipoFlores ? f.subtipoFlores : null,
            nombrePersonalizado: f.nombrePersonalizado.trim() || null,
            superficieTexto: f.superficieTexto,
            ubicacionRelativa: f.ubicacionRelativa,
          })),
        });

        if (!respuesta.guardado) {
          setErrorGeneral(respuesta.errorGeneral ?? "Revisá los datos de los sectores antes de guardar.");
          if (respuesta.erroresSectores && respuesta.erroresSectores.length > 0) {
            const mapa = new Map<number, string>();
            for (const err of respuesta.erroresSectores as ErrorSector[]) {
              mapa.set(err.indice, err.mensaje);
            }
            setErroresPorIndice(mapa);
            // Expandir automáticamente los sectores con error para que el usuario los vea en el celular.
            setFilas((previas) =>
              previas.map((fila, idx) => (mapa.has(idx) ? { ...fila, abierto: true } : fila)),
            );
          }
          return;
        }

        // Limpiar borrador local al guardar con éxito (RS-08, CA-02-17).
        limpiarBorrador();

        router.push(`/fincas/${establecimientoId}?aviso=sectores-guardados`);
      } catch {
        guardarBorradorAhora();
        setErrorGeneral(
          "No se pudo guardar. Tus cambios siguen en este dispositivo; probá de nuevo cuando tengas señal.",
        );
      }
    });
  }

  // Textos y estado de la barra de superficie: verde mientras sobra lugar, naranja cuando queda poco y rojo
  // si la suma se pasa del total.
  const porcentajeUsado =
    superficieTotalHa > 0 ? Math.min(100, (superficieDistribuida / superficieTotalHa) * 100) : 0;
  const colorBarra = excedida ? "bg-error" : cercaDeCero ? "bg-naranja" : "bg-hoja";

  const botonGuardar = (
    <button type="submit" disabled={guardando || excedida} className={clasesBoton("principal", true)}>
      {guardando ? "Guardando…" : "Guardar mi terreno"}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: nombreEstablecimiento, href: `/fincas/${establecimientoId}` },
        ]}
        titulo="¿Qué tenés en tu finca?"
        bajada="Agregá un sector por cada cultivo y por cada lugar con flores o vegetación. Podés agregar todos los que tengas."
      />

      <form
        onSubmit={manejarGuardado}
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        {/* Lado izquierdo: los sectores */}
        <div className="flex flex-col gap-4 max-lg:order-2">
          <BannerBorrador
            fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
            ultimoAutoguardadoIso={ultimoAutoguardado}
            onRecuperar={recuperarBorrador}
            onDescartar={descartarBorrador}
          />

          {errorGeneral ? <Aviso tipo="error">{errorGeneral}</Aviso> : null}

          {filas.length === 0 ? (
            <EstadoVacio
              Icono={IconoMas}
              titulo="Todavía no agregaste sectores"
              texto="Tocá «Agregar sector» para empezar, o guardá la finca sin sectores."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filas.map((fila, indice) => {
                const nombreMostrado = fila.nombrePersonalizado.trim() || nombresSugeridos[indice];
                const supNum = parsearNumeroDecimal(fila.superficieTexto);
                const errorFila = erroresPorIndice.get(indice);
                const esFlores = fila.tipo === "sector_flores";

                return (
                  <section
                    key={fila.claveLocal}
                    className={`rounded-[28px] border-2 bg-white ${errorFila ? "border-error/50" : "border-borde"}`}
                  >
                    {/* Cabecera: se toca para abrir o cerrar el sector */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2 sm:px-5">
                      <button
                        type="button"
                        aria-expanded={fila.abierto}
                        onClick={() => actualizarFila(indice, { abierto: !fila.abierto })}
                        className="flex min-h-12 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
                      >
                        <span
                          className={`rounded-full px-3 py-0.5 text-sm font-bold ${
                            esFlores ? "bg-purple-100 text-purple-900" : "bg-menta text-bosque"
                          }`}
                        >
                          {esFlores ? "🌼 Flores" : "🌱 Cultivo"}
                        </span>
                        <span className="font-titulos text-lg font-bold text-bosque">{nombreMostrado}</span>
                        {supNum !== null && supNum > 0 ? (
                          <span className="text-[0.95rem] font-semibold text-tinta-suave">
                            {formatearHectareas(supNum)}
                          </span>
                        ) : null}
                        <IconoChevron
                          className={`ml-auto h-5 w-5 shrink-0 text-hoja transition-transform ${
                            fila.abierto ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarSector(indice)}
                        aria-label={`Quitar sector ${indice + 1}`}
                        className="inline-flex min-h-10 items-center rounded-full px-3 text-[0.95rem] font-bold text-error transition hover:bg-error-claro"
                      >
                        Quitar
                      </button>
                    </div>

                    {errorFila ? (
                      <p
                        role="alert"
                        className="flex items-center gap-2 border-t-[1.5px] border-[#f5c2bd] bg-error-claro px-4 py-2.5 text-[0.95rem] font-semibold text-error sm:px-5"
                      >
                        <IconoAlerta className="h-5 w-5 shrink-0" />
                        {errorFila}
                      </p>
                    ) : null}

                    {fila.abierto ? (
                      <div className="flex flex-col gap-5 border-t-[1.5px] border-borde p-4 sm:p-5">
                        {/* En la computadora el sector va en dos columnas (a la izquierda qué es, y a la derecha cuánto mide y dónde está); en el celular, una sola con este orden: qué es, cultivo, hectáreas, nombre, ubicación */}
                        <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start md:gap-x-8">
                          <div className="contents md:flex md:flex-col md:gap-5">
                        {/* Qué es el sector (RN-02): cada sector es UNA de las dos cosas; para tener las dos, se agregan dos sectores */}
                        <fieldset className="flex flex-col gap-2">
                          <legend className="text-[0.95rem] font-semibold text-tinta">
                            ¿Qué es este sector?
                            <MasInfo sobre="qué es un sector">
                              Cada sector es una sola cosa: un cultivo o un lugar con flores. Si tenés las dos,
                              agregá un sector para cada una con «Agregar otro sector». Podés agregar todos los que
                              tengas.
                            </MasInfo>
                          </legend>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              aria-pressed={!esFlores}
                              onClick={() => actualizarFila(indice, { tipo: "cultivo", subtipoFlores: "" })}
                              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left transition ${
                                !esFlores
                                  ? "border-hoja bg-menta"
                                  : "border-borde bg-white hover:border-hoja"
                              }`}
                            >
                              <span aria-hidden="true" className="text-2xl">
                                🌱
                              </span>
                              <span className="flex flex-col">
                                <span className="font-bold text-bosque">Un cultivo</span>
                                <span className="text-sm text-tinta-suave">Lo que sembrás para cosechar</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={esFlores}
                              onClick={() =>
                                actualizarFila(indice, {
                                  tipo: "sector_flores",
                                  cultivoSeleccion: "",
                                  cultivoOtro: "",
                                })
                              }
                              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-2 text-left transition ${
                                esFlores
                                  ? "border-purple-700 bg-purple-50"
                                  : "border-borde bg-white hover:border-hoja"
                              }`}
                            >
                              <span aria-hidden="true" className="text-2xl">
                                🌼
                              </span>
                              <span className="flex flex-col">
                                <span className="font-bold text-bosque">Flores o vegetación</span>
                                <span className="text-sm text-tinta-suave">Flores, pasto, monte, bordes</span>
                              </span>
                            </button>
                          </div>
                        </fieldset>

                        {/* Cultivo (catálogo u "Otro") o tipo de flores */}
                        {!esFlores ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <label
                                htmlFor={`cultivo-${fila.claveLocal}`}
                                className="text-[0.95rem] font-semibold text-tinta"
                              >
                                ¿Qué cultivo es?
                              </label>
                              <select
                                id={`cultivo-${fila.claveLocal}`}
                                value={fila.cultivoSeleccion}
                                onChange={(e) =>
                                  actualizarFila(indice, {
                                    cultivoSeleccion: e.target.value,
                                    cultivoOtro:
                                      e.target.value === VALOR_OTRO_CULTIVO ? fila.cultivoOtro : "",
                                  })
                                }
                                className={CAMPO}
                              >
                                <option value="">Elegí un cultivo…</option>
                                {cultivos.map((c) => (
                                  <option
                                    key={c.id}
                                    value={c.id}
                                    disabled={!c.activo && fila.cultivoSeleccion !== c.id}
                                  >
                                    {c.nombre}
                                    {!c.activo ? " (inactivo)" : ""}
                                  </option>
                                ))}
                                <option value={VALOR_OTRO_CULTIVO}>Otro cultivo…</option>
                              </select>
                            </div>

                            {fila.cultivoSeleccion === VALOR_OTRO_CULTIVO ? (
                              <div className="flex flex-col gap-1.5">
                                <label
                                  htmlFor={`cultivo-otro-${fila.claveLocal}`}
                                  className="text-[0.95rem] font-semibold text-tinta"
                                >
                                  Nombre del cultivo
                                </label>
                                <input
                                  id={`cultivo-otro-${fila.claveLocal}`}
                                  type="text"
                                  minLength={2}
                                  maxLength={80}
                                  value={fila.cultivoOtro}
                                  onChange={(e) => actualizarFila(indice, { cultivoOtro: e.target.value })}
                                  placeholder="Ej.: Quinua, papa andina…"
                                  className={CAMPO}
                                />
                                <p className="text-sm text-tinta-suave">
                                  Se guarda igual, pero para un cultivo que no está en la lista no podemos
                                  recomendar plantas.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`subtipo-${fila.claveLocal}`}
                              className="text-[0.95rem] font-semibold text-tinta"
                            >
                              ¿Qué tipo de flores o vegetación?
                            </label>
                            <select
                              id={`subtipo-${fila.claveLocal}`}
                              value={fila.subtipoFlores}
                              onChange={(e) =>
                                actualizarFila(indice, {
                                  subtipoFlores: e.target.value as SubtipoFlores | "",
                                })
                              }
                              className={CAMPO}
                            >
                              <option value="">No sé / sin especificar</option>
                              {SUBTIPOS_FLORES.map((subtipo) => (
                                <option key={subtipo} value={subtipo}>
                                  {ETIQUETAS_SUBTIPO_FLORES[subtipo]}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                          <div className="flex flex-col gap-1.5 max-md:order-4">
                            <label
                              htmlFor={`nombre-${fila.claveLocal}`}
                              className="text-[0.95rem] font-semibold text-tinta"
                            >
                              Nombre del sector (opcional)
                            </label>
                            <input
                              id={`nombre-${fila.claveLocal}`}
                              type="text"
                              maxLength={60}
                              value={fila.nombrePersonalizado}
                              onChange={(e) => actualizarFila(indice, { nombrePersonalizado: e.target.value })}
                              placeholder={nombresSugeridos[indice]}
                              className={CAMPO}
                            />
                          </div>

                          </div>
                          <div className="contents md:flex md:flex-col md:gap-5">
                          <div className="flex flex-col gap-1.5 max-md:order-3">
                            <label
                              htmlFor={`superficie-${fila.claveLocal}`}
                              className="text-[0.95rem] font-semibold text-tinta"
                            >
                              ¿Cuántas hectáreas ocupa?
                            </label>
                            <input
                              id={`superficie-${fila.claveLocal}`}
                              type="text"
                              inputMode="decimal"
                              value={fila.superficieTexto}
                              onChange={(e) => actualizarFila(indice, { superficieTexto: e.target.value })}
                              placeholder="Ej.: 1,25"
                              className={CAMPO}
                            />
                            <p className="text-sm text-tinta-suave">
                              En hectáreas, por ejemplo 1,25.
                              {supNum !== null && supNum > 0
                                ? ` Son ${formatearMetrosCuadrados(supNum)}.`
                                : ""}
                            </p>
                          </div>
                        {/* Ubicación aproximada en una grilla 3×3 que se toca con el dedo (CA-02-09) */}
                        <fieldset className="flex flex-col gap-2 max-md:order-5">
                          <legend className="text-[0.95rem] font-semibold text-tinta">
                            ¿En qué parte del terreno está?
                          </legend>
                          <div className="grid max-w-md grid-cols-3 gap-2">
                            {GRILLA_UBICACIONES.map((pos) => {
                              const activa = fila.ubicacionRelativa === pos.valor;
                              return (
                                <button
                                  key={pos.valor}
                                  type="button"
                                  aria-label={pos.etiqueta}
                                  aria-pressed={activa}
                                  onClick={() => actualizarFila(indice, { ubicacionRelativa: pos.valor })}
                                  className={`min-h-12 rounded-2xl border-2 px-1.5 py-2 text-center text-sm font-semibold transition ${
                                    activa
                                      ? "border-transparent bg-hoja text-white"
                                      : "border-borde bg-white text-tinta-suave hover:border-hoja hover:text-tinta"
                                  }`}
                                >
                                  {pos.corta}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>

                          </div>
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Boton
              variante="contorno"
              onClick={agregarSector}
              disabled={filas.length >= LIMITES_ESTABLECIMIENTO.maxSectores}
            >
              <IconoMas className="h-5 w-5" />
              Agregar otro sector
            </Boton>
            <MasInfo sobre="cuántos sectores se pueden agregar">
              Agregá un sector por cada cultivo y por cada lugar con flores o vegetación. No hay que elegir solo
              uno: podés agregar todos los que tengas.
            </MasInfo>
            {filas.length >= LIMITES_ESTABLECIMIENTO.maxSectores ? (
              <p className="text-[0.95rem] text-tinta-suave">
                Llegaste al máximo de {LIMITES_ESTABLECIMIENTO.maxSectores} sectores.
              </p>
            ) : null}
          </div>

          {/* En el celular, Guardar va al final de la lista */}
          <div className="lg:hidden">{botonGuardar}</div>
        </div>

        {/* Lado derecho (arriba en el celular): cuánta superficie llevás cargada. Se queda a la vista al bajar. */}
        <aside
          aria-live="polite"
          className="flex flex-col gap-4 rounded-[28px] border-2 border-menta-fuerte bg-menta p-5 max-lg:order-1 lg:sticky lg:top-28"
        >
          <h2 className="text-xl font-bold text-bosque">Tu superficie</h2>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className="font-titulos text-3xl font-extrabold text-bosque">
              {formatearHectareas(superficieDistribuida)}
            </strong>
            <span className="text-tinta-suave">de {formatearHectareas(superficieTotalHa)}</span>
          </p>
          <div className="h-4 overflow-hidden rounded-full bg-white" aria-hidden="true">
            <div className={`h-full rounded-full transition-all ${colorBarra}`} style={{ width: `${porcentajeUsado}%` }} />
          </div>
          {excedida ? (
            <p className="flex items-start gap-2 font-semibold text-error">
              <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
              Te pasaste por {formatearHectareas(excesoHa)}: los sectores suman más que tu finca.
            </p>
          ) : (
            <p className="font-titulos text-lg font-bold text-bosque">
              {restanteHa > 0 ? `Te quedan ${formatearHectareas(restanteHa)} libres.` : "Ya cargaste toda la finca."}
            </p>
          )}
          <div className="max-lg:hidden">{botonGuardar}</div>
        </aside>
      </form>
    </div>
  );
}
