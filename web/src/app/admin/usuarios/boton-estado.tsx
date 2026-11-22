"use client";
// Botón para desactivar o reactivar una cuenta. Desactivar pide confirmación, porque cierra todas las
// sesiones de esa persona.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cambiarEstadoCuenta, type EstadoModeracion } from "./acciones";

function Boton({ desactivada }: { desactivada: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 rounded-lg px-3 text-sm font-semibold disabled:opacity-60 ${
        desactivada ? "border border-borde bg-white text-tinta hover:bg-campo-claro" : "border border-error text-error hover:bg-error-claro"
      }`}
    >
      {pending ? "Enviando…" : desactivada ? "Reactivar" : "Desactivar"}
    </button>
  );
}

export function BotonEstado({ usuarioId, usuario, desactivada }: { usuarioId: string; usuario: string; desactivada: boolean }) {
  const [estado, accion] = useActionState<EstadoModeracion, FormData>(cambiarEstadoCuenta, {});
  return (
    <form
      action={accion}
      onSubmit={(evento) => {
        if (!desactivada && !window.confirm(`¿Desactivar la cuenta de ${usuario}? Se cierran todas sus sesiones.`)) {
          evento.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="usuarioId" value={usuarioId} />
      <input type="hidden" name="accion" value={desactivada ? "reactivar" : "desactivar"} />
      <Boton desactivada={desactivada} />
      {estado.error && (
        <p className="text-xs text-error" role="alert">
          {estado.error}
        </p>
      )}
    </form>
  );
}
