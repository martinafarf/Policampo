// Herramientas del usuario, en la ruta /inicio («Inicio» en pantalla es la landing) (especificación 01, 5.1): saludo, próximas tareas y accesos a los módulos.
// Reutiliza el fondo con cielo menta y PaisajeIlustrado de la portada + AbejaCursor siempre visible.
import Link from "next/link";
import { Suspense, type ComponentType } from "react";
import { BadgeEstadoTarea } from "@/componentes/calendario/BadgeEstadoTarea";
import { AbejaCursor } from "@/componentes/marca/AbejaCursor";
import {
  Hoja,
  IconoCalendario,
  IconoDocumento,
  IconoFinca,
  IconoFlecha,
  IconoFlor,
  IconoGuia,
  IconoLupa,
} from "@/componentes/marca/Iconos";
import { PaisajeIlustrado } from "@/componentes/marca/PaisajeIlustrado";
import { Aviso } from "@/componentes/ui/formulario";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { obtenerResumenTareasParaInicio } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Herramientas · PoliCampo" };

const MODULOS: readonly {
  titulo: string;
  Icono: ComponentType<{ className?: string }>;
  texto: string;
  href: string;
}[] = [
  {
    titulo: "Mis fincas",
    Icono: IconoFinca,
    texto: "Cargá tus fincas y cómo está distribuido el terreno.",
    href: "/fincas",
  },
  {
    titulo: "Guía de especies",
    Icono: IconoGuia,
    texto: "Consultá plantas de servicio, períodos de floración y compatibilidades publicadas.",
    href: "/guia-especies",
  },
  {
    titulo: "Diagnóstico",
    Icono: IconoLupa,
    texto: "Mirá cuánta superficie tiene flores frente al 20 % recomendado.",
    href: "/fincas?enfoque=diagnostico",
  },
  {
    titulo: "Rediseño",
    Icono: IconoFlor,
    texto: "Dónde ubicar franjas florales y qué plantas sembrar.",
    href: "/fincas",
  },
  {
    titulo: "Mis tareas",
    Icono: IconoCalendario,
    texto: "Calendario de siembra, fechas límite, corte y avisos de todas tus fincas.",
    href: "/tareas",
  },
  {
    titulo: "Informes",
    Icono: IconoDocumento,
    texto: "Descargá el informe técnico en PDF de cada finca.",
    href: "/informes",
  },
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
        <div className="mb-6">
          <Aviso tipo="exito">¡Tu cuenta está confirmada! Ya podés usar PoliCampo.</Aviso>
        </div>
      )}

      <header className="relative flex flex-col gap-2 py-2 sm:py-4">
        <Hoja className="animar-flota pointer-events-none absolute right-6 top-1 hidden h-12 w-12 text-naranja/45 sm:block" />
        <h1 className="titulo-onda text-3xl font-bold text-bosque sm:text-4xl">
          Hola, {usuario.nombreParaMostrar}
        </h1>
        <p className="max-w-[46ch] text-base text-tinta-suave">
          Elegí por dónde empezar para diagnosticar, rediseñar y seguir el calendario de tus fincas.
        </p>
      </header>

      {listaInicio.length > 0 ? (
        <section className="mt-6 rounded-[28px] border-2 border-menta-fuerte bg-white/90 p-5 shadow-chica backdrop-blur-[2px] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-bosque">Próximas tareas</h2>
            <Link
              href="/tareas"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-hoja transition hover:bg-menta hover:text-hoja-oscura"
            >
              Ver todas ({resumenTareas.totalPendientes})
              <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {listaInicio.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-[1.5px] border-borde bg-papel px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeEstadoTarea estado={t.estado} />
                  <Link
                    href={`/fincas/${t.establecimientoId}/calendario`}
                    className="font-semibold text-bosque hover:text-hoja hover:underline"
                  >
                    {t.titulo}
                  </Link>
                  <span className="text-tinta-suave">· {t.establecimientoNombre}</span>
                </div>
                <span className="font-semibold text-tinta-suave">
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
    <main className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[linear-gradient(#d6f1e7,#eff9f5_60%)]">
      {/* Abeja volando sobre todo el Inicio (arranca junto al saludo y sigue al cursor) */}
      <AbejaCursor siempreVisible reposo={{ x: 0.68, y: 0.11 }} />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 pb-6 sm:pt-12">
        <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
          <Saludo searchParams={searchParams as Promise<{ confirmada?: string }>} />
        </Suspense>

        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map(({ titulo, Icono, texto, href }) => (
            <li
              key={titulo}
              className="flex flex-col justify-between gap-5 rounded-[28px] border-2 border-borde bg-white/95 p-6 shadow-chica backdrop-blur-[2px] transition hover:-translate-y-1 hover:shadow-suave"
            >
              <div className="flex flex-col gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-menta text-bosque">
                  <Icono className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-bosque">{titulo}</h2>
                <p className="text-sm leading-relaxed text-tinta-suave">{texto}</p>
              </div>
              <div>
                <Link
                  href={href}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-hoja px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-hoja-oscura hover:shadow-chica"
                >
                  Abrir
                  <IconoFlecha className="h-4 w-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Paisaje ilustrado de la portada (sin texto) como cierre/fondo inferior de Inicio */}
      <div className="pointer-events-none relative z-0 -mt-4 w-full">
        <PaisajeIlustrado />
      </div>
    </main>
  );
}
