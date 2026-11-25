"use client";

// Botón cliente para disparar la acción "Solicitar diagnóstico" / "Actualizar diagnóstico" (Esp. 04).
import { useState, useTransition } from "react";
import { solicitarDiagnosticoAccion } from "@/app/fincas/[id]/diagnostico/acciones";
import { clasesBoton } from "@/componentes/ui/boton";

interface Props {
  establecimientoId: string;
  texto: string;
  variante?: "primario" | "alerta" | "contorno";
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

  // Botones de DESIGN.md: "primario" y "alerta" (actualizar uno viejo) son la acción principal de la
  // pantalla; "contorno" es para cuando hay otra acción más importante al lado.
  const estilo = clasesBoton(variante === "contorno" ? "contorno" : "principal");

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={alHacerClic} disabled={pendiente} className={estilo}>
        {pendiente ? "Calculando diagnóstico…" : texto}
      </button>
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
