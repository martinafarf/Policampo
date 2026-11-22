import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SoloSinSesion } from "@/componentes/cuentas/solo-sin-sesion";
import { enmascararEmail } from "@/dominio/usuarios/validaciones";
import { BotonReenviarRegistro } from "./reenviar";

export const metadata = { title: "Revisá tu email · PoliCampo" };

async function EmailEnmascarado() {
  const email = (await cookies()).get("policampo_registro")?.value;
  return <strong>{email ? enmascararEmail(email) : "tu email"}</strong>;
}

export default function PaginaRegistroEnviado() {
  return (
    <>
      <Suspense fallback={null}>
        <SoloSinSesion />
      </Suspense>
      <p className="mb-2 text-4xl" aria-hidden>
        📬
      </p>
      <h1 className="mb-3 text-3xl font-extrabold text-bosque sm:text-4xl">Revisá tu email</h1>
      <p className="mb-2">
        Te enviamos un email a{" "}
        <Suspense fallback={<strong>tu email</strong>}>
          <EmailEnmascarado />
        </Suspense>{" "}
        para confirmar tu cuenta. Revisá también la carpeta de spam.
      </p>
      <p className="mb-6 text-sm text-tinta-suave">El enlace vence en 24 horas.</p>
      <BotonReenviarRegistro />
      <p className="mt-6 text-center text-sm">
        <Link href="/ingresar" className="font-semibold text-hoja underline hover:text-hoja-oscura">
          Ir a iniciar sesión
        </Link>
      </p>
    </>
  );
}
