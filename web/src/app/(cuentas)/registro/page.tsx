import Link from "next/link";
import { Suspense } from "react";
import { SoloSinSesion } from "@/componentes/cuentas/solo-sin-sesion";
import { FormularioRegistro } from "./formulario";

export const metadata = { title: "Registrarse · PoliCampo" };

export default function PaginaRegistro() {
  return (
    <>
      <Suspense fallback={null}>
        <SoloSinSesion />
      </Suspense>
      <h1 className="mb-1 text-2xl font-bold text-campo-oscuro">Crear tu cuenta</h1>
      <p className="mb-6 text-sm text-tinta-suave">
        Gratis. Solo te pedimos lo necesario: email, nombre de usuario y contraseña.
      </p>
      <FormularioRegistro />
      <p className="mt-6 text-center text-sm">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-campo-oscuro underline">
          Iniciá sesión
        </Link>
      </p>
    </>
  );
}
