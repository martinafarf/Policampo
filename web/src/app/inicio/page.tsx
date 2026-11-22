// Inicio del usuario (especificación 01, 5.1): saludo, próximas tareas y accesos a los módulos.
// Estética alineada con DESIGN.md (paleta bosque/hoja/menta/naranja, tarjetas 28 px, píldoras 48 px, íconos SVG).
import Link from "next/link";
import { Suspense, type ComponentType } from "react";
import { BadgeEstadoTarea } from "@/componentes/calendario/BadgeEstadoTarea";
import { AbejaCursor, DibujoAbeja } from "@/componentes/marca/AbejaCursor";
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
import { Aviso } from "@/componentes/ui/formulario";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { obtenerResumenTareasParaInicio } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Inicio · PoliCampo" };

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

      <header className="relative flex min-h-32 flex-col justify-center gap-2 overflow-hidden py-3 sm:py-5">
        <AbejaCursor reposo={{ x: 0.62, y: 0.44 }} />
        <Hoja className="animar-flota pointer-events-none absolute right-10 top-3 hidden h-12 w-12 text-naranja/45 lg:block" />

        <div className="relative z-20 flex items-center gap-3">
          <h1 className="titulo-onda text-3xl font-bold text-bosque sm:text-4xl">
            Hola, {usuario.nombreParaMostrar}
          </h1>
          <span className="animar-flota inline-block shrink-0 lg:hidden" aria-hidden="true">
            <DibujoAbeja className="h-10 w-[52px] drop-shadow-[0_3px_5px_rgb(0_51_0/.2)]" />
          </span>
        </div>
        <p className="relative z-20 max-w-[46ch] text-base text-tinta-suave">
          Elegí por dónde empezar para diagnosticar, rediseñar y seguir el calendario de tus fincas.
        </p>
      </header>

      {listaInicio.length > 0 ? (
        <section className="mt-8 rounded-[28px] border-2 border-menta-fuerte bg-menta/70 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-bosque">Próximas tareas</h2>
            <Link
              href="/tareas"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-hoja transition hover:bg-white/70 hover:text-hoja-oscura"
            >
              Ver todas ({resumenTareas.totalPendientes})
              <IconoFlecha className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-4 flex flex-col gap-2.5">
            {listaInicio.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-[1.5px] border-borde bg-white px-4 py-3 text-sm"
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-tinta-suave">Cargando…</p>}>
        <Saludo searchParams={searchParams as Promise<{ confirmada?: string }>} />
      </Suspense>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map(({ titulo, Icono, texto, href }) => (
          <li
            key={titulo}
            className="flex flex-col justify-between gap-5 rounded-[28px] border-2 border-borde bg-white p-6 transition hover:-translate-y-1 hover:shadow-suave"
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
    </main>
  );
}
