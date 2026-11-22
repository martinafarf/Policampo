"use client";
// Pedir un email de verificación nuevo, ingresando el email o el usuario.
import { useActionState } from "react";
import { reenviarConIdentificador, type EstadoReenvio } from "@/app/(cuentas)/acciones";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";

export function FormularioReenvio({ identificador, ocultarCampo = false }: { identificador?: string; ocultarCampo?: boolean }) {
  const [estado, accion] = useActionState<EstadoReenvio, FormData>(reenviarConIdentificador, {});
  return (
    <form action={accion} className="flex flex-col gap-3">
      {estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}
      {estado.error && <Aviso tipo="error">{estado.error}</Aviso>}
      {ocultarCampo ? (
        <input type="hidden" name="identificador" value={identificador ?? ""} />
      ) : (
        <Campo etiqueta="Tu email o nombre de usuario" nombre="identificador" autoComplete="username" defaultValue={identificador} required />
      )}
      <BotonEnviar secundario>Enviarme un email nuevo</BotonEnviar>
    </form>
  );
}
