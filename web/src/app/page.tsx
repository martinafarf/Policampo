// Página principal provisoria. La landing completa (qué es, beneficios, cómo funciona) es la T7.
import Link from "next/link";
import { Suspense } from "react";
import { Aviso } from "@/componentes/ui/formulario";

async function AvisoSesionCerrada({ searchParams }: { searchParams: Promise<{ sesion?: string }> }) {
  const { sesion } = await searchParams;
  if (sesion !== "cerrada") return null;
  return (
    <div className="mb-6 w-full max-w-md">
      <Aviso tipo="exito">Cerraste sesión.</Aviso>
    </div>
  );
}

export default function Inicio({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <Suspense fallback={null}>
        <AvisoSesionCerrada searchParams={searchParams as Promise<{ sesion?: string }>} />
      </Suspense>
      <h1 className="text-3xl font-semibold text-campo-oscuro">PoliCampo</h1>
      <p className="max-w-md text-tinta-suave">
        Sistema de apoyo a la toma de decisiones agroecológicas para fincas de Jujuy.
      </p>
      <div className="mt-2 flex w-full max-w-xs flex-col gap-3 sm:max-w-md sm:flex-row">
        <Link href="/registro" className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-campo px-4 font-semibold text-white hover:bg-campo-oscuro">
          Registrarse
        </Link>
        <Link href="/ingresar" className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-borde bg-white px-4 font-semibold">
          Iniciar sesión
        </Link>
      </div>
      <p className="text-sm text-tinta-suave">Versión 2 en construcción.</p>
    </main>
  );
}
