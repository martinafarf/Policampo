// Inicio del usuario (especificación 01, 5.1): saludo y accesos a los módulos. Los que todavía no
// existen dicen "Próximamente"; al terminar cada módulo se le agrega su enlace acá.
import Link from "next/link";
import { Suspense } from "react";
import { BadgeEstadoTarea } from "@/componentes/calendario/BadgeEstadoTarea";
import { Aviso } from "@/componentes/ui/formulario";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { obtenerResumenTareasParaInicio } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Inicio · PoliCampo" };

const MODULOS: readonly {
  titulo: string;
  icono: string;
  texto: string;
  href?: string;
}[] = [
  {
    titulo: "Mis fincas",
    icono: "🌾",
    texto: "Cargá tus fincas y cómo está distribuido el terreno.",
    href: "/fincas",
  },
  {
    titulo: "Guía de especies",
    icono: "🌿",
    texto: "Consultá plantas de servicio, períodos de floración y compatibilidades publicadas.",
    href: "/guia-especies",
  },
  {
    titulo: "Diagnóstico",
    icono: "🔍",
    texto: "Mirá cuánta superficie tiene flores frente al 20 % recomendado.",
    href: "/fincas?enfoque=diagnostico",
  },
  {
    titulo: "Rediseño",
    icono: "🌼",
    texto: "Dónde ubicar franjas florales y qué plantas sembrar.",
    href: "/fincas",
  },
  {
    titulo: "Mis tareas",
    icono: "🗓️",
    texto: "Calendario de siembra, fechas límite, corte y avisos de todas tus fincas.",
    href: "/tareas",
  },
  { titulo: "Informes", icono: "📄", texto: "Descargá el informe técnico de cada finca." },
];

async function Saludo({ searchParams }: { searchParams: Promise<{ confirmada?: string }> }) {
  const usuario = await requerirUsuario("/inicio");
  const [{ confirmada }, resumenTareas] = await Promise.all([
    searchParams,
    obtenerResumenTareasParaInicio(usuario.id),
  ]);
  const listaInicio = [...resumenTareas.atrasadas, ...resumenTareas.proximasOEnCurso];

  return (
    <>
      {confirmada && (
        <div className="mb-4">
          <Aviso tipo="exito">¡Tu cuenta está confirmada! Ya podés usar PoliCampo.</Aviso>
        </div>
      )}
      <h1 className="text-2xl font-bold text-campo-oscuro">Hola, {usuario.nombreParaMostrar}</h1>

      {listaInicio.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-borde bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-stone-900">Próximas tareas</h2>
            <Link
              href="/tareas"
              className="text-xs font-semibold text-emerald-800 hover:underline"
            >
              Ver todas ({resumenTareas.totalPendientes}) →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {listaInicio.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeEstadoTarea estado={t.estado} />
                  <Link
                    href={`/fincas/${t.establecimientoId}/calendario`}
                    className="font-semibold text-stone-900 hover:underline"
                  >
                    {t.titulo}
                  </Link>
                  <span className="text-stone-500">· {t.establecimientoNombre}</span>
                </div>
                <span className="font-medium text-stone-600">
                  {formatearFechaCortaEsAr(t.fechaInicio)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export default function PaginaInicio({ searchParams }: PageProps<"/inicio">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Saludo searchParams={searchParams as Promise<{ confirmada?: string }>} />
      </Suspense>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {MODULOS.map((modulo) => (
          <li key={modulo.titulo} className="rounded-2xl border border-borde bg-white p-5">
            <p className="text-3xl" aria-hidden>
              {modulo.icono}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{modulo.titulo}</h2>
            <p className="mt-1 text-sm text-tinta-suave">{modulo.texto}</p>
            {modulo.href ? (
              <Link
                href={modulo.href}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-campo px-4 py-2 text-sm font-semibold text-white hover:bg-campo-oscuro"
              >
                Abrir →
              </Link>
            ) : (
              <span className="mt-3 inline-block rounded-full bg-campo-claro px-3 py-1 text-xs font-medium text-campo-oscuro">
                Próximamente
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
