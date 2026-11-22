// Destino del enlace de verificación (Better Auth redirige acá, CA-01-04):
// - con éxito, la sesión ya está iniciada → /inicio con el mensaje de bienvenida;
// - con ?error=TOKEN_EXPIRED / INVALID_TOKEN / ..., se explica y se ofrece pedir otro enlace.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormularioReenvio } from "@/componentes/cuentas/formulario-reenvio";
import { obtenerUsuario } from "@/lib/sesion";

export const metadata = { title: "Confirmar cuenta · PoliCampo" };

async function Resultado({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) {
    if (await obtenerUsuario()) redirect("/inicio?confirmada=1");
    return (
      <>
        <h1 className="mb-3 text-3xl font-extrabold text-bosque sm:text-4xl">Tu cuenta está confirmada</h1>
        <Link href="/ingresar" className="font-semibold text-hoja underline hover:text-hoja-oscura">
          Iniciá sesión
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="mb-3 text-3xl font-extrabold text-bosque sm:text-4xl">El enlace venció o ya fue usado</h1>
      <p className="mb-6">Pedí un enlace nuevo: te lo mandamos por email y vence en 24 horas.</p>
      <FormularioReenvio />
    </>
  );
}

export default function PaginaVerificarEmail({ searchParams }: PageProps<"/verificar-email">) {
  return (
    <Suspense fallback={<p>Comprobando el enlace…</p>}>
      <Resultado searchParams={searchParams as Promise<{ error?: string }>} />
    </Suspense>
  );
}
