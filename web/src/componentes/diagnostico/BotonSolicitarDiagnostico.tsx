"use client";

// Botón cliente para disparar la acción "Solicitar diagnóstico" / "Actualizar diagnóstico" (Esp. 04).
import { useState, useTransition } from "react";
import { solicitarDiagnosticoAccion } from "@/app/fincas/[id]/diagnostico/acciones";

interface Props {
  establecimientoId: string;
  texto: string;
  variante?: "primario" | "alerta";
}

export function BotonSolicitarDiagnostico({
  establecimientoId,
  texto,
  variante = "primario",
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function alHacerClic() {
    setError(null);
    iniciarTransicion(async () => {
      const res = await solicitarDiagnosticoAccion(establecimientoId);
      if (res?.error) {
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
      <button
        type="button"
        onClick={alHacerClic}
        disabled={pendiente}
        className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${estilo}`}
      >
        {pendiente ? "Calculando diagnóstico…" : texto}
      </button>
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
