"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";
import { crearNuevaContrasenaAccion, type EstadoNuevaContrasena } from "../../acciones";

export function FormularioNuevaContrasena({ token }: { token: string }) {
  const [estado, accion] = useActionState<EstadoNuevaContrasena, FormData>(crearNuevaContrasenaAccion, {});
  if (estado.enlaceInvalido) {
    return (
      <Aviso tipo="error">
        El enlace venció o ya fue usado.{" "}
        <Link href="/recuperar" className="font-medium underline">
          Pedí uno nuevo
        </Link>
        .
      </Aviso>
    );
  }
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.general && <Aviso tipo="error">{estado.general}</Aviso>}
      <input type="hidden" name="token" value={token} />
      <Campo
        etiqueta="Contraseña nueva"
        nombre="contrasena"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        ayuda="Al menos 8 caracteres. No puede ser igual a tu usuario ni a tu email."
        error={estado.errores?.contrasena}
      />
      <Campo
        etiqueta="Repetir contraseña nueva"
        nombre="repetirContrasena"
        type="password"
        autoComplete="new-password"
        required
        error={estado.errores?.repetirContrasena}
      />
      <BotonEnviar>Guardar contraseña</BotonEnviar>
    </form>
  );
}
