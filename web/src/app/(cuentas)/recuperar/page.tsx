import Link from "next/link";
import { Suspense } from "react";
import { SoloSinSesion } from "@/componentes/cuentas/solo-sin-sesion";
import { FormularioRecuperar } from "./formulario";

export const metadata = { title: "Recuperar contraseña · PoliCampo" };

export default function PaginaRecuperar() {
  return (
    <>
      <Suspense fallback={null}>
        <SoloSinSesion />
      </Suspense>
      <h1 className="mb-1 text-2xl font-bold text-campo-oscuro">¿Olvidaste tu contraseña?</h1>
      <p className="mb-6 text-sm text-tinta-suave">
        Escribí el email de tu cuenta y te mandamos un enlace para crear una contraseña nueva.
      </p>
      <FormularioRecuperar />
      <p className="mt-6 text-center text-sm">
        <Link href="/ingresar" className="font-medium text-campo-oscuro underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </>
  );
}
