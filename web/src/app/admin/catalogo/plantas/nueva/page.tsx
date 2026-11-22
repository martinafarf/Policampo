// Ruta /admin/catalogo/plantas/nueva: crear una planta de servicio en Borrador (Esp. 03, T2).
import { Suspense } from "react";
import { requerirAdministrador } from "@/lib/sesion";
import { FormularioPlanta } from "../FormularioPlanta";

async function ContenidoNuevaPlanta() {
  await requerirAdministrador();
  return <FormularioPlanta />;
}

export default function PaginaNuevaPlanta() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando formulario…</p>}>
        <ContenidoNuevaPlanta />
      </Suspense>
    </main>
  );
}
