"use client";
import { useActionState } from "react";
import { Aviso, BotonEnviar } from "@/componentes/ui/formulario";
import { aceptarPoliticaAccion, type EstadoAceptar } from "./acciones";

export function FormularioAceptar({ volver }: { volver: string }) {
  const [estado, accion] = useActionState<EstadoAceptar, FormData>(aceptarPoliticaAccion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="volver" value={volver} />
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="acepta" required className="mt-1 h-5 w-5 shrink-0 accent-campo" />
        <span>
          Leí y acepto la política de privacidad, incluido que mis datos se procesen en servicios de Estados Unidos
          (Neon, Vercel, Resend y Esri).
        </span>
      </label>
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <BotonEnviar>Aceptar y seguir</BotonEnviar>
    </form>
  );
}
