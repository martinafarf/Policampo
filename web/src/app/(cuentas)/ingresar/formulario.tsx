"use client";
import { useActionState } from "react";
import { FormularioReenvio } from "@/componentes/cuentas/formulario-reenvio";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";
import { ingresarAccion, type EstadoIngreso } from "../acciones";

// Mensajes de la especificación 01, flujo 4.3. "credenciales" nunca dice qué dato falló (CA-01-06).
const MENSAJES = {
  credenciales: "Usuario, email o contraseña incorrectos.",
  sin_verificar: "Tenés que confirmar tu email antes de ingresar.",
  desactivada: "Tu cuenta está desactivada. Escribinos para más información.",
  demasiados: "Demasiados intentos. Probá de nuevo en unos minutos.",
  error: "No pudimos iniciar la sesión. Probá de nuevo en unos minutos.",
} as const;

export function FormularioIngreso({ volver }: { volver: string }) {
  const [estado, accion] = useActionState<EstadoIngreso, FormData>(ingresarAccion, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={accion} className="flex flex-col gap-4">
        {estado.motivo && <Aviso tipo="error">{MENSAJES[estado.motivo]}</Aviso>}
        <input type="hidden" name="volver" value={volver} />
        <Campo
          etiqueta="Usuario o email"
          nombre="identificador"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={estado.identificador}
        />
        <Campo etiqueta="Contraseña" nombre="contrasena" type="password" autoComplete="current-password" required />
        <BotonEnviar>Ingresar</BotonEnviar>
      </form>
      {estado.motivo === "sin_verificar" && <FormularioReenvio identificador={estado.identificador} ocultarCampo />}
    </div>
  );
}
