// Ruta pública /baja-resumen?token=...: desactiva el resumen semanal sin iniciar sesión (Esp. 06 §5.6, CA-06-15).
import Link from "next/link";
import { Suspense } from "react";
import { procesarBajaResumenPorToken } from "@/dominio/calendario/servicio";

export const metadata = { title: "Baja del resumen semanal · PoliCampo" };

async function ContenidoBaja({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const secreto = process.env.EMAIL_BAJA_SECRET ?? "";
  const ok = token && secreto.length >= 16 ? await procesarBajaResumenPorToken(token, secreto) : false;

  return ok ? (
    <section className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
      <h1 className="text-xl font-bold text-emerald-950">Listo: desactivamos tu resumen semanal</h1>
      <p className="text-sm text-emerald-900">
        Ya no vas a recibir el correo de los lunes con tus tareas. Si alguna vez querés volver a
        activarlo, podés hacerlo desde <strong>Mi perfil</strong>.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex min-h-11 items-center justify-center self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Volver a PoliCampo
      </Link>
    </section>
  ) : (
    <section className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-xl font-bold text-red-950">El enlace de baja no es válido</h1>
      <p className="text-sm text-red-900">
        El enlace puede estar incompleto o alterado. Podés desactivar el resumen semanal iniciando
        sesión en <strong>Mi perfil</strong>.
      </p>
      <Link
        href="/ingresar"
        className="mt-2 inline-flex min-h-11 items-center justify-center self-start rounded-lg border border-red-700 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
      >
        Ir a Iniciar sesión
      </Link>
    </section>
  );
}

export default function PaginaBajaResumen({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <Suspense fallback={<p className="text-sm text-stone-600">Procesando solicitud…</p>}>
        <ContenidoBaja searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
