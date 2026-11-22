// Ruta /fincas/[id]/datos: editar los datos generales del establecimiento (Esp. 02, 6.1).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { FormularioDatosGenerales } from "./FormularioDatosGenerales";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoEditarDatos({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/datos`);
  const finca = await obtenerEstablecimientoDelUsuario(id, usuario.id);

  if (!finca) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link href={`/fincas/${finca.id}`} className="font-semibold text-emerald-800 hover:underline">
          ← Volver a la ficha
        </Link>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-stone-900">Editar datos generales</h1>
        <p className="mt-1 text-sm text-stone-600">{finca.nombre}</p>
      </div>

      <FormularioDatosGenerales
        establecimientoId={finca.id}
        metodo={finca.metodoCaracterizacion}
        version={finca.version}
        inicial={{
          nombre: finca.nombre,
          direccion: finca.direccion,
          departamento: finca.departamento,
          localidad: finca.localidad,
          localidadEsOtra: finca.localidadEsOtra,
          ecorregion: finca.ecorregion,
          superficieTotalHa: finca.superficieTotalHa,
        }}
      />
    </div>
  );
}

export default function PaginaEditarDatos(props: Props) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando datos de la finca…</p>}>
        <ContenidoEditarDatos params={props.params} />
      </Suspense>
    </main>
  );
}
