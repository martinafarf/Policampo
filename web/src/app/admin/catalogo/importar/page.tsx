// Ruta /admin/catalogo/importar: carga masiva y exportación CSV del catálogo (Esp. 03, T5).
// Acceso exclusivo para administradores (sin rol responde 404, CA-03-16).
import Link from "next/link";
import { Suspense } from "react";
import { requerirAdministrador } from "@/lib/sesion";
import { FormularioImportarCsv } from "./FormularioImportarCsv";

async function ContenidoImportarCsv() {
  await requerirAdministrador();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/catalogo"
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            ← Volver al catálogo
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Importar y exportar CSV</h1>
          <p className="text-sm text-stone-600">
            Descargá copias de respaldo o cargá especies, períodos y compatibilidades desde planilla
            con vista previa previa a guardar.
          </p>
        </div>
      </header>

      <FormularioImportarCsv />
    </div>
  );
}

export default function PaginaImportarCsv() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando importador CSV…</p>}>
        <ContenidoImportarCsv />
      </Suspense>
    </main>
  );
}
