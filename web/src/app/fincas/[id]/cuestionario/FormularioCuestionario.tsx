"use client";

// Pantalla interactiva del método cuestionario (Esp. 02, 5.3, 6.2, RD-03, CA-02-06 a 09).
// - Muestra en todo momento la superficie restante (cambia de color al acercarse a 0 y en rojo si se pasa).
// - Tarjetas plegables para uso cómodo en el celular (desde 360 px).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  formatearHectareas,
  formatearSuperficieCompleta,
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

  const claseBarraRestante = excedida
    ? "border-red-300 bg-red-50 text-red-900"
    : cercaDeCero
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";

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

  return (
    <form onSubmit={manejarGuardado} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a la ficha de {nombreEstablecimiento}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Cuestionario de sectores</h1>
        <p className="text-sm text-stone-600">
          Cargá los sectores de cultivo y los sectores de flores o vegetación natural que ya tenés
          en tu finca.
        </p>
      </div>

      {/* Barra fija con superficie total, distribuida y restante (Esp. 02, 5.3 y 6.2) */}
      <aside
        aria-live="polite"
        className={`sticky top-2 z-10 rounded-xl border p-3.5 shadow-xs ${claseBarraRestante}`}
      >
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div>
            <p className="opacity-80">Total</p>
            <p className="font-bold">{formatearHectareas(superficieTotalHa)}</p>
          </div>
          <div>
            <p className="opacity-80">Distribuida</p>
            <p className="font-bold">{formatearHectareas(superficieDistribuida)}</p>
          </div>
          <div>
            <p className="opacity-80">{excedida ? "Exceso" : "Restante"}</p>
            <p className="font-bold">
              {excedida ? `+${formatearHectareas(excesoHa)}` : formatearHectareas(restanteHa)}
            </p>
          </div>
        </div>
        {excedida ? (
          <p className="mt-2 text-center text-xs font-semibold text-red-800">
            La suma de los sectores supera la superficie total en {formatearHectareas(excesoHa)}.
          </p>
        ) : null}
      </aside>

      <BannerBorrador
        fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
        ultimoAutoguardadoIso={ultimoAutoguardado}
        onRecuperar={recuperarBorrador}
        onDescartar={descartarBorrador}
      />

      {errorGeneral ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorGeneral}
        </div>
      ) : null}

      {filas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No hay sectores cargados. Tocá «Agregar sector» para empezar o guardá la finca sin
          sectores.
        </div>
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
                className={`rounded-xl border bg-white shadow-xs ${
                  errorFila ? "border-red-300" : "border-stone-200"
                }`}
              >
                {/* Cabecera plegable para celular */}
                <div className="flex items-center justify-between gap-2 px-4 py-3">
                  <button
                    type="button"
                    aria-expanded={fila.abierto}
                    onClick={() => actualizarFila(indice, { abierto: !fila.abierto })}
                    className="flex min-h-10 flex-1 flex-wrap items-center gap-2 text-left"
                  >
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        esFlores
                          ? "bg-purple-100 text-purple-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {esFlores ? "🌼 Flores" : "🌱 Cultivo"}
                    </span>
                    <span className="font-semibold text-stone-900">{nombreMostrado}</span>
                    {supNum !== null && supNum > 0 ? (
                      <span className="text-xs font-medium text-stone-600">
                        · {formatearHectareas(supNum)}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-stone-500">
                      {fila.abierto ? "Ocultar ▲" : "Editar ▼"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarSector(indice)}
                    aria-label={`Quitar sector ${indice + 1}`}
                    className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Quitar
                  </button>
                </div>

                {errorFila ? (
                  <p role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-800">
                    {errorFila}
                  </p>
                ) : null}

                {fila.abierto ? (
                  <div className="flex flex-col gap-4 border-t border-stone-100 p-4">
                    {/* Tipo de sector (RN-02) */}
                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-sm font-semibold text-stone-800">
                        Tipo de sector <span className="text-red-600">*</span>
                      </legend>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            actualizarFila(indice, {
                              tipo: "cultivo",
                              subtipoFlores: "",
                            })
                          }
                          className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${
                            !esFlores
                              ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                              : "border-stone-300 bg-white text-stone-700"
                          }`}
                        >
                          🌱 Cultivo
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            actualizarFila(indice, {
                              tipo: "sector_flores",
                              cultivoSeleccion: "",
                              cultivoOtro: "",
                            })
                          }
                          className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold ${
                            esFlores
                              ? "border-purple-700 bg-purple-50 text-purple-900"
                              : "border-stone-300 bg-white text-stone-700"
                          }`}
                        >
                          🌼 Sector de flores
                        </button>
                      </div>
                    </fieldset>

                    {/* Cultivo (catálogo u "Otro") o Subtipo de flores */}
                    {!esFlores ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor={`cultivo-${fila.claveLocal}`}
                            className="text-sm font-semibold text-stone-800"
                          >
                            Cultivo <span className="text-red-600">*</span>
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
                            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
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
                              className="text-sm font-semibold text-stone-800"
                            >
                              Nombre del cultivo <span className="text-red-600">*</span>
                            </label>
                            <input
                              id={`cultivo-otro-${fila.claveLocal}`}
                              type="text"
                              minLength={2}
                              maxLength={80}
                              value={fila.cultivoOtro}
                              onChange={(e) =>
                                actualizarFila(indice, { cultivoOtro: e.target.value })
                              }
                              placeholder="Ej.: Quinua, papa andina…"
                              className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
                            />
                            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                              Aviso: al elegir «Otro» el sector se guarda, pero el sistema no podrá
                              recomendar plantas de servicio específicas para ese cultivo hasta que
                              esté en el catálogo.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`subtipo-${fila.claveLocal}`}
                          className="text-sm font-semibold text-stone-800"
                        >
                          Subtipo de vegetación (opcional)
                        </label>
                        <select
                          id={`subtipo-${fila.claveLocal}`}
                          value={fila.subtipoFlores}
                          onChange={(e) =>
                            actualizarFila(indice, {
                              subtipoFlores: e.target.value as SubtipoFlores | "",
                            })
                          }
                          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
                        >
                          <option value="">Sin especificar</option>
                          {SUBTIPOS_FLORES.map((subtipo) => (
                            <option key={subtipo} value={subtipo}>
                              {ETIQUETAS_SUBTIPO_FLORES[subtipo]}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Superficie y nombre opcional */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`superficie-${fila.claveLocal}`}
                          className="text-sm font-semibold text-stone-800"
                        >
                          Superficie (ha) <span className="text-red-600">*</span>
                        </label>
                        <input
                          id={`superficie-${fila.claveLocal}`}
                          type="text"
                          inputMode="decimal"
                          value={fila.superficieTexto}
                          onChange={(e) =>
                            actualizarFila(indice, { superficieTexto: e.target.value })
                          }
                          placeholder="Ej.: 1,25"
                          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
                        />
                        {supNum !== null && supNum > 0 ? (
                          <p className="text-xs text-stone-600">
                            {formatearSuperficieCompleta(supNum)}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`nombre-${fila.claveLocal}`}
                          className="text-sm font-semibold text-stone-800"
                        >
                          Nombre del sector (opcional)
                        </label>
                        <input
                          id={`nombre-${fila.claveLocal}`}
                          type="text"
                          maxLength={60}
                          value={fila.nombrePersonalizado}
                          onChange={(e) =>
                            actualizarFila(indice, { nombrePersonalizado: e.target.value })
                          }
                          placeholder={`Automático: ${nombresSugeridos[indice]}`}
                          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-900"
                        />
                      </div>
                    </div>

                    {/* Ubicación relativa en grilla 3×3 táctil (CA-02-09) */}
                    <fieldset className="flex flex-col gap-2">
                      <legend className="text-sm font-semibold text-stone-800">
                        Ubicación aproximada en el terreno <span className="text-red-600">*</span>
                      </legend>
                      <div className="grid grid-cols-3 gap-1.5">
                        {GRILLA_UBICACIONES.map((pos) => {
                          const activa = fila.ubicacionRelativa === pos.valor;
                          return (
                            <button
                              key={pos.valor}
                              type="button"
                              aria-label={pos.etiqueta}
                              aria-pressed={activa}
                              onClick={() =>
                                actualizarFila(indice, { ubicacionRelativa: pos.valor })
                              }
                              className={`min-h-11 rounded-lg border px-1.5 py-2 text-center text-xs font-medium ${
                                activa
                                  ? "border-emerald-700 bg-emerald-700 text-white"
                                  : "border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100"
                              }`}
                            >
                              {pos.corta}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={agregarSector}
          disabled={filas.length >= LIMITES_ESTABLECIMIENTO.maxSectores}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
        >
          + Agregar sector ({filas.length}/{LIMITES_ESTABLECIMIENTO.maxSectores})
        </button>

        <button
          type="submit"
          disabled={guardando || excedida}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
