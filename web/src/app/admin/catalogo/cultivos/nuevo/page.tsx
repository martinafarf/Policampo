// Ruta /admin/catalogo/cultivos/nuevo: crear cultivo nuevo (Esp. 03, 5.2, CA-03-04).
import { Suspense } from "react";
import { requerirAdministrador } from "@/lib/sesion";
import { FormularioCultivo } from "../FormularioCultivo";

async function ContenidoNuevoCultivo() {
  await requerirAdministrador();
  return <FormularioCultivo />;
}

export default function PaginaNuevoCultivo() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando formulario…</p>}>
        <ContenidoNuevoCultivo />
      </Suspense>
    </main>
  );
}
