// Destino del enlace del email de recuperación: Better Auth redirige acá con ?token=... si el
// enlace es válido, o con ?error=INVALID_TOKEN si venció o ya se usó (CA-01-13).
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cuentaDelEnlaceDeRecuperacion } from "@/lib/cuentas";
import { FormularioNuevaContrasena } from "./formulario";

export const metadata: Metadata = {
  title: "Nueva contraseña · PoliCampo",
  // El token viaja en la URL: no se manda como "referrer" si la persona toca un enlace externo.
  referrer: "no-referrer",
};

function EnlaceInvalido() {
  return (
    <>
      <h1 className="mb-3 text-3xl font-extrabold text-bosque sm:text-4xl">El enlace venció o ya fue usado</h1>
      <p className="mb-6">Los enlaces para crear una contraseña nueva vencen en 1 hora y sirven una sola vez.</p>
      <Link
        href="/recuperar"
        className="flex min-h-11 items-center justify-center rounded-lg bg-campo px-4 font-semibold text-white hover:bg-campo-oscuro"
      >
        Pedir un enlace nuevo
      </Link>
    </>
  );
}

async function Contenido({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  if (error || !token || !(await cuentaDelEnlaceDeRecuperacion(token))) return <EnlaceInvalido />;
  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold text-bosque sm:text-4xl">Crear una contraseña nueva</h1>
      <p className="mb-6 text-sm text-tinta-suave">Al guardarla, se cierran las sesiones abiertas en todos tus dispositivos.</p>
      <FormularioNuevaContrasena token={token} />
    </>
  );
}

export default function PaginaNuevaContrasena({ searchParams }: PageProps<"/recuperar/nueva">) {
  return (
    <Suspense fallback={<p>Comprobando el enlace…</p>}>
      <Contenido searchParams={searchParams as Promise<{ token?: string; error?: string }>} />
    </Suspense>
  );
}
