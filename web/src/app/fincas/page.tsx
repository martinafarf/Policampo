// Ruta /fincas: listado "Mis fincas" ordenado por última modificación (Esp. 02 §5.1, Esp. 04 §5.5).
import Link from "next/link";
import { Suspense } from "react";
import { obtenerResumenDiagnosticosPorEstablecimientos } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";
import { ListadoFincasConFiltro, type FincaEnListado } from "./ListadoFincasConFiltro";
import { listarEstablecimientosDelUsuario } from "./_lib/consultas";

interface Props {
  searchParams: Promise<{ borrada?: string; enfoque?: string }>;
}

async function ContenidoMisFincas({ searchParams }: Props) {
  const usuario = await requerirUsuario("/fincas");
  const [{ borrada, enfoque }, fincas] = await Promise.all([
    searchParams,
    listarEstablecimientosDelUsuario(usuario.id),
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
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {enfoqueDiagnostico ? "Consultar diagnóstico" : "Mis fincas"}
          </h1>
          <p className="text-sm text-stone-600">
            {enfoqueDiagnostico
              ? "Buscá y elegí la finca para ver o solicitar su diagnóstico agroecológico."
              : "Administrá tus establecimientos, filtralos por estado y consultá su diagnóstico."}
          </p>
        </div>
        <Link
          href="/fincas/nueva"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          + Nueva finca
        </Link>
      </header>

      {nombreBorrada ? (
        <div
          role="status"
          className="break-words rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Se borró la finca {nombreBorrada}.
        </div>
      ) : null}

      {fincasSerializadas.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-stone-900">Todavía no cargaste fincas</p>
          <p className="max-w-md text-sm text-stone-600">
            Cargá tu primer establecimiento con cuestionario, croquis o mapa para ver su
            distribución y preparar el diagnóstico de biodiversidad.
          </p>
          <Link
            href="/fincas/nueva"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Cargar mi primera finca
          </Link>
        </section>
      ) : (
        <ListadoFincasConFiltro
          fincas={fincasSerializadas}
          enfoqueDiagnostico={enfoqueDiagnostico}
        />
      )}
    </div>
  );
}

export default function PaginaMisFincas(props: Props) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Cargando tus fincas…</p>}>
        <ContenidoMisFincas searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
