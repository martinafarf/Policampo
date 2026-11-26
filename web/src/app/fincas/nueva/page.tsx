// Ruta /fincas/nueva: elegir método y crear un establecimiento (Esp. 02, 5.2).
import { Suspense } from "react";
import { requerirUsuario } from "@/lib/sesion";
import { FormularioNuevaFinca } from "./FormularioNuevaFinca";

async function ContenidoNuevaFinca() {
  await requerirUsuario("/fincas/nueva");
  return <FormularioNuevaFinca />;
}

export const metadata = { title: "Nueva finca · PoliCampo" };

export default function PaginaNuevaFinca() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <ContenidoNuevaFinca />
      </Suspense>
    </main>
  );
}
