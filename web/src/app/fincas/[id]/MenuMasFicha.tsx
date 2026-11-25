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
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 border-hoja bg-transparent text-hoja hover:bg-white"
      >
        Más
      </button>

      {menuAbierto ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-3xl border-[1.5px] border-borde bg-white p-2 shadow-suave">
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              setModalMetodoAbierto(true);
            }}
            className="flex min-h-12 w-full items-center rounded-2xl px-4 text-left font-semibold text-tinta hover:bg-menta"
          >
            Cargar de nuevo con otro método
          </button>
          <hr className="my-1 border-borde" />
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              setModalBorrarAbierto(true);
            }}
            className="flex min-h-12 w-full items-center rounded-2xl px-4 text-left font-semibold text-error hover:bg-error-claro"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-bosque/60 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-suave">
            <h2 id="titulo-cambiar-metodo" className="text-xl font-bold text-bosque">
              Cargar de nuevo con otro método
            </h2>
            <p className="mt-3 rounded-2xl border-[1.5px] border-[#f3d3a6] bg-[#fff3df] p-3 text-[0.95rem] text-[#7a4100]">
              Se van a borrar los <strong>{cantidadSectores}</strong>{" "}
              {cantidadSectores === 1 ? "sector" : "sectores"} y el dibujo de esta finca. Los datos
              generales se conservan.
            </p>

            <form action={formActionMetodo} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="version" value={version} />

              <fieldset className="flex flex-col gap-2">
                <legend className="text-[0.95rem] font-semibold text-tinta">
                  Elegí el nuevo método
                </legend>
                {otrosMetodos.map((m) => (
                  <label
                    key={m}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] px-4 font-semibold ${
                      nuevoMetodo === m
                        ? "border-hoja bg-menta text-bosque"
                        : "border-borde bg-white text-tinta hover:bg-papel"
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
                <p className="text-sm text-tinta-suave">
                  Al pasar al mapa, la superficie total quedará vacía hasta que dibujes el contorno
                  del terreno.
                </p>
              ) : null}

              {necesitaSuperficie ? (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="superficieCambioMetodo"
                    className="text-[0.95rem] font-semibold text-tinta"
                  >
                    Superficie total (hectáreas) <span className="text-error">*</span>
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
                    className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base outline-none focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
                  />
                </div>
              ) : null}

              {estadoMetodo.error ? (
                <p role="alert" className="text-sm font-semibold text-error">
                  {estadoMetodo.error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalMetodoAbierto(false)}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-transparent px-4 text-hoja hover:bg-menta"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cambiandoMetodo}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-hoja text-white hover:bg-hoja-oscura"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-bosque/60 p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-suave">
            <h2 id="titulo-borrar-finca" className="text-xl font-bold text-bosque">
              Borrar finca definitivamente
            </h2>
            <p className="mt-3 text-[0.95rem] text-tinta">
              Se van a borrar el establecimiento, sus sectores y dibujos, y cualquier diagnóstico,
              propuesta o informe asociado en el futuro.{" "}
              <strong>Esta acción no se puede deshacer.</strong>
            </p>

            <form action={formActionBorrar} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmacionNombre" className="text-[0.95rem] font-semibold text-tinta">
                  Escribí <span className="font-bold text-error">{nombreEstablecimiento}</span>{" "}
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
                  className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base outline-none focus:border-error focus:bg-white focus:ring-4 focus:ring-error/20"
                />
              </div>

              {estadoBorrar.error ? (
                <p role="alert" className="text-sm font-semibold text-error">
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
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-transparent px-4 text-hoja hover:bg-menta"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreCoincide || borrando}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-base font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 border-transparent bg-error text-white hover:bg-[#8f1c13]"
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
