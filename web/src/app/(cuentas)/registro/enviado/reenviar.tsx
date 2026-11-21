"use client";
import { useActionState } from "react";
import { Aviso, BotonEnviar } from "@/componentes/ui/formulario";
import { reenviarDesdeRegistro, type EstadoReenvio } from "../../acciones";

export function BotonReenviarRegistro() {
  const [estado, accion] = useActionState<EstadoReenvio>(reenviarDesdeRegistro, {});
  return (
    <form action={accion} className="flex flex-col gap-3">
      {estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      <BotonEnviar secundario>Reenviar email</BotonEnviar>
    </form>
  );
}
