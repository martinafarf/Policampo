"use client";
import { useActionState } from "react";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";
import { pedirRecuperacionAccion, type EstadoRecuperacion } from "../acciones";

export function FormularioRecuperar() {
  const [estado, accion] = useActionState<EstadoRecuperacion, FormData>(pedirRecuperacionAccion, {});
  if (estado.enviado) {
    // El mismo mensaje exista o no la cuenta (CA-01-12).
    return (
      <Aviso tipo="exito">
        Si hay una cuenta con ese email, te enviamos un enlace para crear una contraseña nueva. Vence en 1 hora. Revisá
        también la carpeta de spam.
      </Aviso>
    );
  }
  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="Email"
        nombre="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.email}
        error={estado.error}
      />
      <BotonEnviar>Enviarme el enlace</BotonEnviar>
    </form>
  );
}
