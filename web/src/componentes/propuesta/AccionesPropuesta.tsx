"use client";

// Botones cliente para marcar como Elegida o Borrar una propuesta con confirmación (Esp. 05 §6.2).
import { useState, useTransition } from "react";
import {
  borrarPropuestaAccion,
  marcarPropuestaElegidaAccion,
} from "@/app/fincas/[id]/propuestas/acciones";

interface Props {
  establecimientoId: string;
  propuestaId: string;
  elegida: boolean;
  compacto?: boolean;
}

export function AccionesPropuesta({
  establecimientoId,
  propuestaId,
  elegida,
  compacto = false,
}: Props) {
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function marcarElegida() {
    iniciarTransicion(async () => {
      await marcarPropuestaElegidaAccion(establecimientoId, propuestaId);
    });
  }

  function confirmarBorrado() {
    iniciarTransicion(async () => {
      await borrarPropuestaAccion(establecimientoId, propuestaId);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!elegida ? (
        <button
          type="button"
          disabled={pendiente}
          onClick={marcarElegida}
          className={`inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-white font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 ${
            compacto ? "min-h-10 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2 text-sm"
          }`}
        >
          {pendiente ? "Guardando…" : "Marcar como elegida"}
        </button>
      ) : null}

      {!confirmandoBorrado ? (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => setConfirmandoBorrado(true)}
          className={`inline-flex items-center justify-center rounded-lg border border-red-200 bg-white font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 ${
            compacto ? "min-h-10 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2 text-sm"
          }`}
        >
          Borrar
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
          <span className="font-semibold text-red-900">¿Seguro?</span>
          <button
            type="button"
            disabled={pendiente}
            onClick={confirmarBorrado}
            className="rounded-md bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            Sí, borrar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => setConfirmandoBorrado(false)}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
