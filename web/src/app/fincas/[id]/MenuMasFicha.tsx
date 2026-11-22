"use client";

// Menú "Más" de la ficha del establecimiento (Esp. 02, 5.4, 5.5, 5.7, CA-02-16, CA-02-20, RS-08).
// Incluye "Cargar de nuevo con otro método" y el borrado definitivo escribiendo el nombre exacto.
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  ETIQUETAS_METODO,
  METODOS_CARACTERIZACION,
  claveBorradorLocal,
  type MetodoCaracterizacion,
} from "@/dominio/establecimientos";
import {
  borrarEstablecimiento,
  cambiarMetodoEstablecimiento,
  type EstadoBorradoEstablecimiento,
  type EstadoCambioMetodo,
} from "../acciones";

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
  metodoActual: MetodoCaracterizacion;
  cantidadSectores: number;
  superficieTotalHa: number | null;
  version: number;
}

const ESTADO_BORRAR_INICIAL: EstadoBorradoEstablecimiento = {};
const ESTADO_METODO_INICIAL: EstadoCambioMetodo = {};

export function MenuMasFicha({
  establecimientoId,
  nombreEstablecimiento,
  metodoActual,
  cantidadSectores,
  superficieTotalHa,
  version,
}: Props) {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalMetodoAbierto, setModalMetodoAbierto] = useState(false);
  const [modalBorrarAbierto, setModalBorrarAbierto] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  const otrosMetodos = METODOS_CARACTERIZACION.filter((m) => m !== metodoActual);
  const [nuevoMetodo, setNuevoMetodo] = useState<MetodoCaracterizacion>(otrosMetodos[0]);
  const [superficieNueva, setSuperficieNueva] = useState<string>(
    superficieTotalHa !== null ? String(superficieTotalHa) : "",
  );

  const accionBorrar = borrarEstablecimiento.bind(null, establecimientoId);
  const [estadoBorrar, formActionBorrar, borrando] = useActionState(
    accionBorrar,
    ESTADO_BORRAR_INICIAL,
  );

  const accionMetodo = cambiarMetodoEstablecimiento.bind(null, establecimientoId);
  const [estadoMetodo, formActionMetodo, cambiandoMetodo] = useActionState(
    accionMetodo,
    ESTADO_METODO_INICIAL,
  );

  useEffect(() => {
    if (!estadoBorrar.eliminado || !estadoBorrar.nombreEliminado) return;
    // Al borrar la finca se limpia también su borrador local (RS-08, CA-02-20).
    try {
      window.localStorage.removeItem(claveBorradorLocal(establecimientoId));
    } catch {
      // Modo privado.
    }
    router.replace(`/fincas?borrada=${encodeURIComponent(estadoBorrar.nombreEliminado)}`);
  }, [estadoBorrar.eliminado, estadoBorrar.nombreEliminado, establecimientoId, router]);

  useEffect(() => {
    if (!estadoMetodo.cambiado || !estadoMetodo.rutaDestino) return;
    // Al cambiar de método se limpia también el borrador local (RS-08, CA-02-16).
    try {
      window.localStorage.removeItem(claveBorradorLocal(establecimientoId));
    } catch {
      // Modo privado.
    }
    router.push(estadoMetodo.rutaDestino);
  }, [estadoMetodo.cambiado, estadoMetodo.rutaDestino, establecimientoId, router]);

  const nombreCoincide = textoConfirmacion.trim() === nombreEstablecimiento.trim();
  const necesitaSuperficie =
    nuevoMetodo !== "mapa" && (metodoActual === "mapa" || superficieTotalHa === null);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={menuAbierto}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        Más ▾
      </button>

      {menuAbierto ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              setModalMetodoAbierto(true);
            }}
            className="flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-stone-800 hover:bg-stone-100"
          >
            Cargar de nuevo con otro método
          </button>
          <hr className="my-1 border-stone-100" />
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              setModalBorrarAbierto(true);
            }}
            className="flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Borrar finca
          </button>
        </div>
      ) : null}

      {/* Modal: Cargar de nuevo con otro método (Esp. 02, 5.5, CA-02-16) */}
      {modalMetodoAbierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-cambiar-metodo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="titulo-cambiar-metodo" className="text-lg font-bold text-stone-900">
              Cargar de nuevo con otro método
            </h2>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Se van a borrar los <strong>{cantidadSectores}</strong>{" "}
              {cantidadSectores === 1 ? "sector" : "sectores"} y el dibujo de esta finca. Los datos
              generales se conservan.
            </p>

            <form action={formActionMetodo} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="version" value={version} />

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-semibold text-stone-800">
                  Elegí el nuevo método
                </legend>
                {otrosMetodos.map((m) => (
                  <label
                    key={m}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
                      nuevoMetodo === m
                        ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                        : "border-stone-300 bg-white text-stone-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="nuevoMetodo"
                      value={m}
                      checked={nuevoMetodo === m}
                      onChange={() => setNuevoMetodo(m)}
                    />
                    {ETIQUETAS_METODO[m]}
                  </label>
                ))}
              </fieldset>

              {nuevoMetodo === "mapa" ? (
                <p className="text-xs text-stone-600">
                  Al pasar al mapa, la superficie total quedará vacía hasta que dibujes el contorno
                  del terreno.
                </p>
              ) : null}

              {necesitaSuperficie ? (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="superficieCambioMetodo"
                    className="text-sm font-semibold text-stone-800"
                  >
                    Superficie total (hectáreas) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="superficieCambioMetodo"
                    name="superficieTotalHa"
                    type="text"
                    inputMode="decimal"
                    required
                    value={superficieNueva}
                    onChange={(e) => setSuperficieNueva(e.target.value)}
                    placeholder="Ej.: 4,5"
                    className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-900"
                  />
                </div>
              ) : null}

              {estadoMetodo.error ? (
                <p role="alert" className="text-sm text-red-700">
                  {estadoMetodo.error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalMetodoAbierto(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cambiandoMetodo}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {cambiandoMetodo ? "Cambiando…" : "Confirmar y empezar de nuevo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal: Borrar finca definitivamente (Esp. 02, 5.7, CA-02-20) */}
      {modalBorrarAbierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-borrar-finca"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h2 id="titulo-borrar-finca" className="text-lg font-bold text-stone-900">
              Borrar finca definitivamente
            </h2>
            <p className="mt-2 text-sm text-stone-700">
              Se van a borrar el establecimiento, sus sectores y dibujos, y cualquier diagnóstico,
              propuesta o informe asociado en el futuro.{" "}
              <strong>Esta acción no se puede deshacer.</strong>
            </p>

            <form action={formActionBorrar} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmacionNombre" className="text-sm font-semibold text-stone-800">
                  Escribí <span className="font-mono text-red-700">{nombreEstablecimiento}</span>{" "}
                  para confirmar
                </label>
                <input
                  id="confirmacionNombre"
                  name="confirmacionNombre"
                  type="text"
                  required
                  value={textoConfirmacion}
                  onChange={(e) => setTextoConfirmacion(e.target.value)}
                  placeholder={nombreEstablecimiento}
                  className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-900 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/20"
                />
              </div>

              {estadoBorrar.error ? (
                <p role="alert" className="text-sm text-red-700">
                  {estadoBorrar.error}
                </p>
              ) : null}

              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalBorrarAbierto(false);
                    setTextoConfirmacion("");
                  }}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreCoincide || borrando}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {borrando ? "Borrando…" : "Confirmar borrado"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
