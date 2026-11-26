"use client";

// Botones de descarga PDF (con estado "Generando…" y reintento) y borrado con confirmación (Esp. 07 §5.4, §6).
// Como en las propuestas: «Descargar PDF» a la vista y «Borrar» escondido en «Más» (con un cartel para confirmar),
// para que no se toque sin querer.
import { useState, useTransition } from "react";
import { borrarInformeAccion } from "@/app/fincas/[id]/informes/acciones";
import { IconoDocumento } from "@/componentes/marca/Iconos";
import { clasesBoton } from "@/componentes/ui/boton";

interface Props {
  establecimientoId: string;
  informeId: string;
  codigo: string;
  volverA?: "finca" | "global";
  /** En las listas: botones un poco más bajos y «Descargar PDF» con borde (la acción principal es «Ver»). */
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
  const [menuAbierto, setMenuAbierto] = useState(false);
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

  const alto = compacto ? "min-h-10 px-4" : "";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={descargando}
          onClick={descargarPdf}
          className={`${clasesBoton(compacto ? "contorno" : "principal")} ${alto}`}
        >
          <IconoDocumento className="h-5 w-5" />
          {descargando ? "Generando…" : "Descargar PDF"}
        </button>

        <div className="relative">
          <button
            type="button"
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            className={`${clasesBoton("contorno")} ${alto}`}
          >
            Más
          </button>
          {menuAbierto ? (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-3xl border-[1.5px] border-borde bg-white p-2 shadow-suave">
              <button
                type="button"
                onClick={() => {
                  setMenuAbierto(false);
                  setConfirmandoBorrado(true);
                }}
                className="flex min-h-12 w-full items-center rounded-2xl px-4 text-left font-semibold text-error hover:bg-error-claro"
              >
                Borrar informe
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {errorPdf ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-[1.5px] border-[#f5c2bd] bg-error-claro px-3 py-2 text-sm text-error"
        >
          <span>{errorPdf}</span>
          <button type="button" onClick={descargarPdf} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      ) : null}

      {/* Confirmación de borrado (mismo cartel que en propuestas y en la ficha) */}
      {confirmandoBorrado ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-borrar-${informeId}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bosque/60 p-4"
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 shadow-suave">
            <h2 id={`titulo-borrar-${informeId}`} className="text-xl font-bold text-bosque">
              ¿Borrar el informe {codigo}?
            </h2>
            <p className="text-tinta-suave">Se borra para siempre, también el PDF. No se puede deshacer.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pendienteBorrar}
                onClick={() => setConfirmandoBorrado(false)}
                className={clasesBoton("texto")}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendienteBorrar}
                onClick={confirmarBorrado}
                className={clasesBoton("peligro")}
              >
                {pendienteBorrar ? "Borrando…" : "Sí, borrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
