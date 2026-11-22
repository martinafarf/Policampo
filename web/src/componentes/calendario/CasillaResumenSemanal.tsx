"use client";

// Casilla de suscripción al resumen semanal de tareas en Mi perfil (Esp. 06 §5.6, Ley 25.326).
import { useState, useTransition } from "react";
import { cambiarResumenSemanalAccion } from "@/app/fincas/[id]/calendario/acciones";

export function CasillaResumenSemanal({ inicial }: { inicial: boolean }) {
  const [activo, setActivo] = useState(inicial);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  function alCambiar(nuevo: boolean) {
    setActivo(nuevo);
    setGuardado(false);
    iniciarTransicion(async () => {
      const res = await cambiarResumenSemanalAccion(nuevo);
      if (res.ok) {
        setActivo(res.activo);
        setGuardado(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex min-h-11 cursor-pointer items-start gap-3 text-sm text-stone-800">
        <input
          type="checkbox"
          checked={activo}
          disabled={pendiente}
          onChange={(e) => alCambiar(e.target.checked)}
          className="mt-1 h-4 w-4 accent-emerald-700"
        />
        <span>
          <strong>Quiero recibir los lunes un resumen de mis tareas por email.</strong>
          <span className="mt-0.5 block text-xs text-stone-600">
            Solo se envía si tenés tareas atrasadas o en las próximas 2 semanas. Podés darte de baja
            en cualquier momento desde acá o con el enlace al pie de cada correo.
          </span>
        </span>
      </label>
      {guardado ? (
        <p role="status" className="text-xs font-semibold text-emerald-800">
          {activo
            ? "Resumen semanal activado."
            : "Resumen semanal desactivado."}
        </p>
      ) : null}
    </div>
  );
}
