"use client";

// Botón + confirmación de emisión de informe técnico con casilla opcional de nombre (Esp. 07 §5.1, CA-07-01, CA-07-03).
import Link from "next/link";
import { useState, useTransition } from "react";
import { emitirInformeAccion } from "@/app/fincas/[id]/informes/acciones";

interface Props {
  establecimientoId: string;
  cumpleRequisitos: boolean;
  mensajeFaltante: string | null;
  nombrePerfilCompleto: string | null;
}

export function BotonEmitirInforme({
  establecimientoId,
  cumpleRequisitos,
  mensajeFaltante,
  nombrePerfilCompleto,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [incluirNombre, setIncluirNombre] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  if (!cumpleRequisitos) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-500"
        >
          📄 Generar informe
        </button>
        <p className="text-xs font-medium text-amber-800">{mensajeFaltante}</p>
      </div>
    );
  }

  function confirmarEmision() {
    setError(null);
    iniciarTransicion(async () => {
      const res = await emitirInformeAccion(
        establecimientoId,
        Boolean(nombrePerfilCompleto && incluirNombre),
      );
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        📄 Generar informe
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
      <p className="text-sm font-bold text-emerald-950">Emitir informe técnico PDF</p>
      <p className="text-xs text-stone-700">
        Se guarda una foto fija del diagnóstico, la propuesta elegida y el calendario actual con un
        código único.
      </p>

      <label
        className={`inline-flex items-start gap-2.5 text-xs ${
          nombrePerfilCompleto ? "cursor-pointer text-stone-800" : "cursor-not-allowed text-stone-500"
        }`}
      >
        <input
          type="checkbox"
          disabled={!nombrePerfilCompleto || pendiente}
          checked={Boolean(nombrePerfilCompleto && incluirNombre)}
          onChange={(e) => setIncluirNombre(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-700"
        />
        <span>
          <strong>Incluir mi nombre en el informe</strong>
          {nombrePerfilCompleto ? (
            <span className="block text-[11px] text-stone-600">
              Aparecerá como: «Preparado para: {nombrePerfilCompleto}»
            </span>
          ) : (
            <span className="block text-[11px] text-amber-800">
              Cargá tu nombre en{" "}
              <Link href="/perfil" className="font-semibold underline">
                Mi perfil
              </Link>{" "}
              para habilitar esta opción.
            </span>
          )}
        </span>
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={confirmarEmision}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pendiente ? "Emitiendo informe…" : "Confirmar y emitir"}
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => setAbierto(false)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
