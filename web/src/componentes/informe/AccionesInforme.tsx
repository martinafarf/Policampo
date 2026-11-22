"use client";

// Botones de descarga PDF (con estado "Generando…" y reintento) y borrado con confirmación (Esp. 07 §5.4, §6).
import { useState, useTransition } from "react";
import { borrarInformeAccion } from "@/app/fincas/[id]/informes/acciones";

interface Props {
  establecimientoId: string;
  informeId: string;
  codigo: string;
  volverA?: "finca" | "global";
  compacto?: boolean;
}

export function AccionesInforme({
  establecimientoId,
  informeId,
  codigo,
  volverA = "finca",
  compacto = false,
}: Props) {
  const [descargando, setDescargando] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [pendienteBorrar, iniciarBorrado] = useTransition();

  async function descargarPdf() {
    setDescargando(true);
    setErrorPdf(null);
    try {
      const resp = await fetch(`/fincas/${establecimientoId}/informes/${informeId}/pdf`, {
        method: "GET",
      });
      if (!resp.ok) {
        const texto = await resp.text();
        let mensaje = "No se pudo generar el PDF, probá de nuevo.";
        try {
          const parsed = JSON.parse(texto) as { error?: string };
          if (parsed.error) mensaje = parsed.error;
        } catch {
          // Mantener mensaje por defecto
        }
        setErrorPdf(mensaje);
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PoliCampo-${codigo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorPdf("Error de conexión al descargar el PDF. Probá de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  function confirmarBorrado() {
    iniciarBorrado(async () => {
      await borrarInformeAccion(establecimientoId, informeId, volverA);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={descargando}
          onClick={descargarPdf}
          className={`inline-flex items-center justify-center rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 ${
            compacto ? "min-h-10 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2 text-sm"
          }`}
        >
          {descargando ? "Generando…" : "⬇️ Descargar PDF"}
        </button>

        {!confirmandoBorrado ? (
          <button
            type="button"
            disabled={pendienteBorrar}
            onClick={() => setConfirmandoBorrado(true)}
            className={`inline-flex items-center justify-center rounded-lg border border-red-200 bg-white font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 ${
              compacto ? "min-h-10 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2 text-sm"
            }`}
          >
            Borrar
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs">
            <span className="font-semibold text-red-900">¿Borrar definitivo?</span>
            <button
              type="button"
              disabled={pendienteBorrar}
              onClick={confirmarBorrado}
              className="rounded-md bg-red-700 px-2.5 py-1 font-semibold text-white hover:bg-red-800"
            >
              Sí, borrar
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(false)}
              className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-semibold text-stone-700"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {errorPdf ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          <span>{errorPdf}</span>
          <button
            type="button"
            onClick={descargarPdf}
            className="font-semibold underline hover:text-red-950"
          >
            Reintentar
          </button>
        </div>
      ) : null}
    </div>
  );
}
