// Ruta /fincas/nueva: elegir método y crear un establecimiento (Esp. 02, 5.2).
import { Suspense } from "react";
import { exigirUsuarioActual } from "../_lib/sesion";
import { FormularioNuevaFinca } from "./FormularioNuevaFinca";

async function ContenidoNuevaFinca() {
  await exigirUsuarioActual("/fincas/nueva");
  return <FormularioNuevaFinca />;
}

export default function PaginaNuevaFinca() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando formulario…</p>}>
        <ContenidoNuevaFinca />
      </Suspense>
    </main>
  );
}
