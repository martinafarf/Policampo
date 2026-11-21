"use client";

// Menú "Más" de la ficha del establecimiento (Esp. 02, 5.4, 5.7, CA-02-20 y RS-08).
// Incluye el borrado definitivo escribiendo el nombre exacto y la limpieza del borrador local.
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { claveBorradorLocal } from "@/dominio/establecimientos";
import {
  borrarEstablecimiento,
  type EstadoBorradoEstablecimiento,
} from "../acciones";

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
}

const ESTADO_INICIAL: EstadoBorradoEstablecimiento = {};

export function MenuMasFicha({ establecimientoId, nombreEstablecimiento }: Props) {
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalBorrarAbierto, setModalBorrarAbierto] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");

  const accionConId = borrarEstablecimiento.bind(null, establecimientoId);
  const [estado, accionFormulario, borrando] = useActionState(accionConId, ESTADO_INICIAL);

  useEffect(() => {
    if (!estado.eliminado || !estado.nombreEliminado) return;
    // Al borrar la finca se limpia también su borrador del navegador (RS-08, CA-02-20).
    try {
      window.localStorage.removeItem(claveBorradorLocal(establecimientoId));
    } catch {
      // localStorage puede no estar disponible en modo privado.
    }
    router.replace(`/fincas?borrada=${encodeURIComponent(estado.nombreEliminado)}`);
  }, [estado.eliminado, estado.nombreEliminado, establecimientoId, router]);

  const nombreCoincide = textoConfirmacion.trim() === nombreEstablecimiento.trim();

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
          <div className="rounded-lg px-3 py-2 text-xs text-stone-500">
            <p className="font-semibold text-stone-700">Cargar de nuevo con otro método</p>
            <p className="mt-0.5">Disponible al completar los tres métodos de carga (T6).</p>
          </div>
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
              propuesta o informe asociado en el futuro. <strong>Esta acción no se puede deshacer.</strong>
            </p>

            <form action={accionFormulario} className="mt-4 flex flex-col gap-3">
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

              {estado.error ? (
                <p role="alert" className="text-sm text-red-700">
                  {estado.error}
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
