// Ruta /fincas/[id]/datos: editar los datos generales del establecimiento (Esp. 02, 6.1).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { requerirUsuario } from "@/lib/sesion";
import { obtenerEstablecimientoDelUsuario } from "../../_lib/consultas";
import { FormularioDatosGenerales } from "./FormularioDatosGenerales";

export const metadata = { title: "Editar los datos de tu finca · PoliCampo" };

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
      <EncabezadoPagina
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: finca.nombre, href: `/fincas/${finca.id}` },
        ]}
        titulo="Editar los datos de tu finca"
      />

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
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando los datos de tu finca…</p>}>
        <ContenidoEditarDatos params={props.params} />
      </Suspense>
    </main>
  );
}
