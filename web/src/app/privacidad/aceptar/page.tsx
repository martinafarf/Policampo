// Aparece al ingresar si la persona aceptó una versión anterior de la política (o ninguna, como las
// cuentas creadas con el comando crear-admin). Hasta aceptar, no puede usar el resto del sitio; sí
// puede cerrar sesión o ir a su perfil para eliminar la cuenta (especificación 01, sección 8).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BotonCerrarSesion } from "@/componentes/cuentas/boton-cerrar-sesion";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";
import { requerirUsuario } from "@/lib/sesion";
import { FormularioAceptar } from "./formulario";

export const metadata: Metadata = { title: "Política de privacidad · PoliCampo" };

async function Contenido({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver = "" } = await searchParams;
  const destino = rutaInternaSegura(volver);
  const usuario = await requerirUsuario("/privacidad/aceptar", { sinConsentimiento: true });
  if (usuario.politicaAceptada) redirect(destino);
  return (
    <>
      <p className="mb-4">
        Actualizamos la política de privacidad (versión {POLITICA_PRIVACIDAD_VERSION}). Para seguir usando PoliCampo
        necesitamos que la leas y la aceptes.
      </p>
      <p className="mb-6">
        <Link href="/privacidad" target="_blank" className="font-semibold text-campo-oscuro underline">
          Leer la política de privacidad
        </Link>{" "}
        <span className="text-sm text-tinta-suave">(se abre en otra pestaña)</span>
      </p>
      <FormularioAceptar volver={destino} />
      <div className="mt-8 border-t border-borde pt-4 text-sm text-tinta-suave">
        <p className="mb-3">Si no estás de acuerdo, podés cerrar sesión o eliminar tu cuenta y todos tus datos.</p>
        <div className="flex flex-wrap items-center gap-3">
          <BotonCerrarSesion />
          <Link href="/perfil" className="underline">
            Ir a Mi perfil para eliminar la cuenta
          </Link>
        </div>
      </div>
    </>
  );
}

export default function PaginaAceptarPolitica({ searchParams }: PageProps<"/privacidad/aceptar">) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold text-campo-oscuro">Política de privacidad</h1>
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Contenido searchParams={searchParams as Promise<{ volver?: string }>} />
      </Suspense>
    </main>
  );
}
