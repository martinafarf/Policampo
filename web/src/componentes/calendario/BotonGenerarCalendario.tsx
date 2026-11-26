"use client";

// Botón cliente para armar, regenerar (con confirmación) o abrir próxima temporada de calendario (Esp. 06).
// Usa los botones comunes (DESIGN.md): «principal» para la acción importante de la pantalla y «contorno» cuando
// va al lado de otra acción más importante.
import { useState, useTransition } from "react";
import { generarCalendarioAccion } from "@/app/fincas/[id]/calendario/acciones";
import { clasesBoton } from "@/componentes/ui/boton";

interface Props {
  establecimientoId: string;
  modo?: "nuevo" | "regenerar" | "proxima_temporada";
  texto: string;
  pedirConfirmacion?: boolean;
  textoConfirmacion?: string;
  /** "alerta" se mantiene por compatibilidad: se ve como el principal (el aviso de alrededor ya marca la alerta). */
  variante?: "primario" | "alerta" | "contorno";
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

  return (
    // items-center: el botón mantiene su ancho aunque abajo aparezca un mensaje de error largo
    <div className="flex flex-col items-center gap-2">
      {!confirmando ? (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => (pedirConfirmacion ? setConfirmando(true) : ejecutar())}
          className={clasesBoton(variante === "contorno" ? "contorno" : "principal")}
        >
          {pendiente ? "Armando el calendario…" : texto}
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-[#f3d3a3] bg-white p-4 text-tinta">
          <p>{textoConfirmacion}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente} onClick={ejecutar} className={clasesBoton("principal")}>
              {pendiente ? "Rehaciendo…" : "Sí, rehacer el calendario"}
            </button>
            <button
              type="button"
              disabled={pendiente}
              onClick={() => setConfirmando(false)}
              className={clasesBoton("texto")}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border-[1.5px] border-[#f5c2bd] bg-error-claro px-3 py-2 text-sm font-semibold text-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
