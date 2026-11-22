"use client";

// Botón cliente para armar, regenerar (con confirmación) o abrir próxima temporada de calendario (Esp. 06).
import { useState, useTransition } from "react";
import { generarCalendarioAccion } from "@/app/fincas/[id]/calendario/acciones";

interface Props {
  establecimientoId: string;
  modo?: "nuevo" | "regenerar" | "proxima_temporada";
  texto: string;
  pedirConfirmacion?: boolean;
  textoConfirmacion?: string;
  variante?: "primario" | "alerta";
}

export function BotonGenerarCalendario({
  establecimientoId,
  modo = "nuevo",
  texto,
  pedirConfirmacion = false,
  textoConfirmacion = "Se va a rehacer el calendario con la nueva propuesta. Las tareas que ya marcaste como hechas se conservan en el historial.",
  variante = "primario",
}: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function ejecutar() {
    setError(null);
    iniciarTransicion(async () => {
      const res = await generarCalendarioAccion(establecimientoId, modo);
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  const estilo =
    variante === "alerta"
      ? "bg-amber-700 text-white hover:bg-amber-800"
      : "bg-emerald-700 text-white hover:bg-emerald-800";

  return (
    <div className="flex flex-col gap-2">
      {!confirmando ? (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => (pedirConfirmacion ? setConfirmando(true) : ejecutar())}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${estilo}`}
        >
          {pendiente ? "Generando calendario…" : texto}
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <p>{textoConfirmacion}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pendiente}
              onClick={ejecutar}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-amber-700 px-3.5 py-1.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              {pendiente ? "Regenerando…" : "Sí, regenerar calendario"}
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => setConfirmando(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 font-semibold text-stone-700 hover:bg-stone-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
