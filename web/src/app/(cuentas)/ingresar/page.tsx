import Link from "next/link";
import { Suspense } from "react";
import { SoloSinSesion } from "@/componentes/cuentas/solo-sin-sesion";
import { Aviso } from "@/componentes/ui/formulario";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { FormularioIngreso } from "./formulario";

export const metadata = { title: "Iniciar sesión · PoliCampo" };

async function Formulario({ searchParams }: { searchParams: Promise<{ volver?: string; contrasena?: string }> }) {
  const { volver, contrasena } = await searchParams;
  return (
    <>
      {contrasena === "cambiada" && (
        <div className="mb-4">
          <Aviso tipo="exito">Tu contraseña se cambió. Ya podés ingresar.</Aviso>
        </div>
      )}
      <FormularioIngreso volver={rutaInternaSegura(volver)} />
    </>
  );
}

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <Suspense fallback={null}>
        <SoloSinSesion />
      </Suspense>
      <h1 className="mb-6 text-3xl font-extrabold text-bosque sm:text-4xl">Iniciar sesión</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Formulario searchParams={searchParams as Promise<{ volver?: string; contrasena?: string }>} />
      </Suspense>
      <div className="mt-6 flex flex-col gap-2 text-center text-sm">
        <Link href="/recuperar" className="font-semibold text-hoja underline hover:text-hoja-oscura">
          ¿Olvidaste tu contraseña?
        </Link>
        <p>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-hoja underline hover:text-hoja-oscura">
            Registrate
          </Link>
        </p>
      </div>
    </>
  );
}
