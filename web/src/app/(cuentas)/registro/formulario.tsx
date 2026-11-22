"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso, BotonEnviar, Campo } from "@/componentes/ui/formulario";
import { registrar, type EstadoRegistro } from "../acciones";

export function FormularioRegistro() {
  const [estado, accion] = useActionState<EstadoRegistro, FormData>(registrar, {});
  const errores = estado.errores ?? {};
  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      {estado.general && <Aviso tipo="error">{estado.general}</Aviso>}
      <Campo
        etiqueta="Email"
        nombre="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        maxLength={254}
        defaultValue={estado.valores?.email}
        error={errores.email}
      />
      <Campo
        etiqueta="Nombre de usuario"
        nombre="usuario"
        autoComplete="username"
        autoCapitalize="none"
        required
        minLength={3}
        maxLength={30}
        defaultValue={estado.valores?.usuario}
        ayuda="De 3 a 30 caracteres: letras sin acentos, números, punto y guion bajo."
        error={errores.usuario}
      />
      <Campo
        etiqueta="Contraseña"
        nombre="contrasena"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        ayuda="Al menos 8 caracteres. No puede ser igual a tu usuario ni a tu email."
        error={errores.contrasena}
      />
      <Campo
        etiqueta="Repetir contraseña"
        nombre="repetirContrasena"
        type="password"
        autoComplete="new-password"
        required
        error={errores.repetirContrasena}
      />
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="aceptaPrivacidad"
            className="mt-1 h-5 w-5 shrink-0 accent-campo"
            aria-invalid={errores.aceptaPrivacidad ? true : undefined}
            aria-describedby={errores.aceptaPrivacidad ? "aceptaPrivacidad-error" : undefined}
          />
          <span>
            Leí y acepto la{" "}
            <Link href="/privacidad" target="_blank" className="font-semibold text-hoja underline hover:text-hoja-oscura">
              política de privacidad
            </Link>
            , incluido que mis datos se procesen en servicios de Estados Unidos (Neon, Vercel, Google y Esri).
          </span>
        </label>
        {errores.aceptaPrivacidad && (
          <p id="aceptaPrivacidad-error" className="text-sm text-error" aria-live="polite">
            {errores.aceptaPrivacidad}
          </p>
        )}
      </div>
      <BotonEnviar>Crear cuenta</BotonEnviar>
    </form>
  );
}
