// Ruta /fincas: listado "Mis fincas" ordenado por última modificación (Esp. 02 §5.1, Esp. 04 §5.5).
// Con ?enfoque=diagnostico (desde Herramientas → Diagnóstico) cada finca lleva directo a su diagnóstico.
import { Suspense } from "react";
import { IconoFinca, IconoMas } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Aviso } from "@/componentes/ui/formulario";
import { obtenerResumenDiagnosticosPorEstablecimientos } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";
import { ListadoFincasConFiltro, type FincaEnListado } from "./ListadoFincasConFiltro";
import { listarDibujosDeFincasDelUsuario, listarEstablecimientosDelUsuario } from "./_lib/consultas";

export const metadata = { title: "Mis fincas · PoliCampo" };

interface Props {
  searchParams: Promise<{ borrada?: string; enfoque?: string }>;
}

async function ContenidoMisFincas({ searchParams }: Props) {
  const usuario = await requerirUsuario("/fincas");
  const [{ borrada, enfoque }, fincas, dibujos] = await Promise.all([
    searchParams,
    listarEstablecimientosDelUsuario(usuario.id),
    listarDibujosDeFincasDelUsuario(usuario.id),
  ]);
  const resumenesDiag = await obtenerResumenDiagnosticosPorEstablecimientos(fincas);
  const nombreBorrada = borrada?.trim().slice(0, 150) || null;
  const enfoqueDiagnostico = enfoque === "diagnostico";

  const fincasSerializadas: FincaEnListado[] = fincas.map((finca) => {
    const diag = resumenesDiag.get(finca.id);
    return {
      id: finca.id,
      nombre: finca.nombre,
      departamento: finca.departamento,
      localidad: finca.localidad,
      superficieTotalHa: finca.superficieTotalHa,
      metodoCaracterizacion: finca.metodoCaracterizacion,
      cantidadSectores: finca.cantidadSectores,
      diagnostico: diag
        ? {
            nivelRiesgo: diag.nivelRiesgo,
            porcentajeFlores: diag.porcentajeFlores,
            desactualizado: diag.desactualizado,
          }
        : null,
      dibujo: dibujos.get(finca.id) ?? null,
    };
  });

  const botonNueva = (
    <BotonEnlace href="/fincas/nueva">
      <IconoMas /> Nueva finca
    </BotonEnlace>
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        migas={[{ texto: "Herramientas", href: "/inicio" }]}
        titulo={enfoqueDiagnostico ? "Elegí una finca" : "Mis fincas"}
        bajada={enfoqueDiagnostico ? "Tocá la finca para ver o pedir su diagnóstico." : undefined}
        acciones={fincasSerializadas.length > 0 ? botonNueva : undefined}
      />

      {nombreBorrada && <Aviso tipo="exito">Se borró la finca {nombreBorrada}.</Aviso>}

      {fincasSerializadas.length === 0 ? (
        <EstadoVacio
          Icono={IconoFinca}
          titulo="Todavía no tenés fincas"
          texto="Cargá tu finca para ver cuántas flores tiene y qué le conviene sembrar."
          accion={<BotonEnlace href="/fincas/nueva">Cargar mi primera finca</BotonEnlace>}
        />
      ) : (
        <ListadoFincasConFiltro fincas={fincasSerializadas} enfoqueDiagnostico={enfoqueDiagnostico} />
      )}
    </div>
  );
}

export default function PaginaMisFincas(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-10">
      <Suspense fallback={<p className="text-tinta-suave">Cargando tus fincas…</p>}>
        <ContenidoMisFincas searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
