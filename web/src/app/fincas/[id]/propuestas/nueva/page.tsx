// Ruta /fincas/[id]/propuestas/nueva: generación, comparación y ajuste de propuestas (Esp. 05 §6.1).
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  consultarDatosMezclaDesdeCatalogo,
  obtenerDetallePropuesta,
  prepararGeneracionPropuesta,
} from "@/dominio/propuesta/servicio";
import { requerirUsuario } from "@/lib/sesion";
import { ConstructorPropuesta } from "./ConstructorPropuesta";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string }>;
}

async function ContenidoNuevaPropuesta({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/propuestas/nueva`);
  const { desde } = await searchParams;

  // Si viene de "Duplicar y editar" (?desde=<propuestaId>), cargamos sus parámetros iniciales (CA-05-17).
  const baseDuplicar = desde ? await obtenerDetallePropuesta(id, desde, usuario.id) : null;
  const objetivoInicial = baseDuplicar ? baseDuplicar.propuesta.objetivoPct : 20;
  const respetarCultivosInicial = Boolean(baseDuplicar?.propuesta.parametros.respetarCultivos);

  const prep = await prepararGeneracionPropuesta(
    id,
    usuario.id,
    objetivoInicial,
    respetarCultivosInicial,
  );

  if (prep.estado === "no_encontrado") {
    notFound();
  }

  if (prep.estado === "requiere_diagnostico_vigente") {
    return (
      <div className="flex flex-col gap-5">
        <Link
          href={`/fincas/${prep.establecimiento.id}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {prep.establecimiento.nombre}
        </Link>
        <section className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-bold text-amber-950">Actualizá el diagnóstico primero</h1>
          <p className="text-sm text-amber-900">{prep.motivo}</p>
          <Link
            href={`/fincas/${prep.establecimiento.id}/diagnostico`}
            className="inline-flex min-h-11 items-center justify-center self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Ir al diagnóstico →
          </Link>
        </section>
      </div>
    );
  }

  if (prep.estado === "error_calculo") {
    return (
      <div className="flex flex-col gap-5">
        <Link
          href={`/fincas/${prep.establecimiento.id}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {prep.establecimiento.nombre}
        </Link>
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          {prep.mensaje}
        </section>
      </div>
    );
  }

  const { cultivosParaMezcla } = await consultarDatosMezclaDesdeCatalogo(prep.diagnostico);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${prep.establecimiento.id}/propuestas`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Propuestas de {prep.establecimiento.nombre}
        </Link>
        <Link
          href={`/fincas/${prep.establecimiento.id}/diagnostico`}
          className="font-medium text-stone-600 hover:underline"
        >
          · Ver diagnóstico
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-bold text-stone-900">
          {baseDuplicar ? "Nueva propuesta (duplicada)" : "Nueva propuesta de rediseño"}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Compará disposiciones, ajustá parámetros o especies y guardá la opción que mejor se adapte
          a <strong>{prep.establecimiento.nombre}</strong>.
        </p>
      </header>

      <ConstructorPropuesta
        establecimientoId={prep.establecimiento.id}
        metodo={prep.diagnostico.entrada.metodo}
        superficieTotalHa={prep.diagnostico.superficieTotalHa}
        superficieFloresActualHa={prep.diagnostico.superficieFloresHa}
        contorno={prep.contorno}
        sectores={prep.diagnostico.entrada.sectores}
        cultivosParaMezcla={cultivosParaMezcla}
        objetivoInicialPct={prep.objetivoPct}
        superficieAAgregarInicialHa={prep.superficieAAgregarHa}
        alternativasIniciales={prep.alternativasEspaciales}
        cuestionarioInicial={prep.propuestaCuestionario}
        mezclaInicial={prep.mezcla}
        nombreInicial={
          baseDuplicar?.propuesta.nombre ? `${baseDuplicar.propuesta.nombre} (copia)` : ""
        }
        disposicionInicial={baseDuplicar?.propuesta.disposicion}
        respetarCultivosInicial={respetarCultivosInicial}
        especiesInicialesIds={baseDuplicar?.propuesta.especies.map((e) => e.plantaId)}
      />
    </div>
  );
}

export default function PaginaNuevaPropuesta(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
      <Suspense fallback={<p className="text-sm text-stone-600">Generando alternativas de rediseño…</p>}>
        <ContenidoNuevaPropuesta params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
