import Link from "next/link";
import { Suspense } from "react";
import { SoloSinSesion } from "@/componentes/cuentas/solo-sin-sesion";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { FormularioIngreso } from "./formulario";

export const metadata = { title: "Iniciar sesión · PoliCampo" };

async function Formulario({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver } = await searchParams;
  return <FormularioIngreso volver={rutaInternaSegura(volver)} />;
}

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <Suspense fallback={null}>
        <SoloSinSesion />
      </Suspense>
      <h1 className="mb-6 text-2xl font-bold text-campo-oscuro">Iniciar sesión</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Formulario searchParams={searchParams as Promise<{ volver?: string }>} />
      </Suspense>
      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        <Link href="/recuperar" className="font-medium text-campo-oscuro underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <p>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-campo-oscuro underline">
            Registrate
          </Link>
        </p>
      </div>
    </>
  );
}
