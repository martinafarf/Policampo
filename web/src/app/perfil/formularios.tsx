"use client";
// Formularios de Mi perfil (especificación 01, flujo 4.6). Cada uno manda a su acción del servidor
// (./acciones.ts) y muestra los errores junto al campo que falló.
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";
import {
  cambiarContrasenaAccion,
  eliminarCuentaAccion,
  guardarNombre,
  pedirCambioEmailAccion,
  type EstadoContrasena,
  type EstadoEliminar,
  type EstadoEmail,
  type EstadoNombre,
} from "./acciones";

const AYUDA_CONTRASENA = "Al menos 8 caracteres. No puede ser igual a tu usuario ni a tu email.";

export function FormularioNombre({ nombre, apellido }: { nombre: string; apellido: string }) {
  const [estado, accion] = useActionState<EstadoNombre, FormData>(guardarNombre, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.guardado && <Aviso tipo="exito">Guardamos tus datos.</Aviso>}
      <Campo
        etiqueta="Nombre (opcional)"
        nombre="nombre"
        autoComplete="given-name"
        maxLength={60}
        defaultValue={nombre}
        error={estado.errores?.nombre}
      />
      <Campo
        etiqueta="Apellido (opcional)"
        nombre="apellido"
        autoComplete="family-name"
        maxLength={60}
        defaultValue={apellido}
        error={estado.errores?.apellido}
      />
      <BotonEnviar>Guardar</BotonEnviar>
    </form>
  );
}

export function FormularioContrasena() {
  const [estado, accion] = useActionState<EstadoContrasena, FormData>(cambiarContrasenaAccion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.guardada && (
        <Aviso tipo="exito">Cambiaste tu contraseña. Cerramos la sesión en tus otros dispositivos.</Aviso>
      )}
      {estado.general && <Aviso tipo="error">{estado.general}</Aviso>}
      <Campo
        etiqueta="Contraseña actual"
        nombre="actual"
        type="password"
        autoComplete="current-password"
        required
        error={estado.errores?.actual}
      />
      <Campo
        etiqueta="Contraseña nueva"
        nombre="contrasena"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        ayuda={AYUDA_CONTRASENA}
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
      <BotonEnviar>Cambiar contraseña</BotonEnviar>
    </form>
  );
}

export function FormularioEmail() {
  const [estado, accion] = useActionState<EstadoEmail, FormData>(pedirCambioEmailAccion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.enviadoA && (
        <Aviso tipo="exito">
          Te mandamos un enlace a <strong>{estado.enviadoA}</strong>. Abrilo para confirmar el cambio (vence en 24
          horas). Hasta entonces seguís usando tu email actual.
        </Aviso>
      )}
      {estado.general && <Aviso tipo="error">{estado.general}</Aviso>}
      <Campo
        etiqueta="Email nuevo"
        nombre="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        defaultValue={estado.email}
        error={estado.errores?.email}
      />
      <Campo
        etiqueta="Contraseña actual"
        nombre="contrasena"
        id="email-contrasena"
        type="password"
        autoComplete="current-password"
        required
        error={estado.errores?.contrasena}
      />
      <BotonEnviar>Cambiar email</BotonEnviar>
    </form>
  );
}

export function FormularioEliminar() {
  const [estado, accion] = useActionState<EstadoEliminar, FormData>(eliminarCuentaAccion, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      {estado.general && <Aviso tipo="error">{estado.general}</Aviso>}
      <Campo
        etiqueta="Contraseña"
        nombre="contrasena"
        id="eliminar-contrasena"
        type="password"
        autoComplete="current-password"
        required
        error={estado.errores?.contrasena}
      />
      <Campo
        etiqueta="Escribí ELIMINAR para confirmar"
        nombre="confirmacion"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        error={estado.errores?.confirmacion}
      />
      <BotonEliminar />
    </form>
  );
}

/** Botón rojo: se deshabilita mientras se envía, como BotonEnviar (evita dobles envíos). */
function BotonEliminar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-lg bg-error px-4 font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
    </button>
  );
}
