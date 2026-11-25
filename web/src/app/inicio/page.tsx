// Herramientas del usuario, en la ruta /inicio («Inicio» en pantalla es la landing) (especificación 01, 5.1): saludo y accesos a los módulos.
// Las tareas no van acá: tienen su lugar en la barra de arriba ("Tareas", con un número si hay algo para hacer ya),
// así esta pantalla se enfoca en las herramientas.
// Reutiliza el fondo con cielo menta y PaisajeIlustrado de la portada + AbejaCursor siempre visible.
//
// Las herramientas van en dos grupos, para que lo que más se busca se encuentre primero:
// - Principales (Mis fincas, Diagnóstico, Rediseño): el recorrido central de PoliCampo. Tarjetas grandes
//   y resaltadas, justo debajo del saludo.
// - Más herramientas (Mis tareas, Informes, Guía): tarjetas más chicas, al final.
// Todas las tarjetas se tocan enteras (un solo toque, sin botones "Abrir" compitiendo entre sí).
import Link from "next/link";
import { Suspense, type ComponentType } from "react";
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
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Herramientas · PoliCampo" };

type Modulo = {
  titulo: string;
  Icono: ComponentType<{ className?: string }>;
  texto: string;
  href: string;
};

/** El recorrido central: cargar la finca → ver cuántas flores tiene → decidir dónde sumar más. */
const PRINCIPALES: readonly Modulo[] = [
  { titulo: "Mis fincas", Icono: IconoFinca, texto: "Cargá tus fincas y mirá lo que tiene cada una.", href: "/fincas" },
  {
    titulo: "Diagnóstico",
    Icono: IconoLupa,
    texto: "Cuántas flores tiene tu finca y cuántas le faltan.",
    href: "/fincas?enfoque=diagnostico",
  },
  { titulo: "Rediseño", Icono: IconoFlor, texto: "Dónde sumar flores y qué plantas sembrar.", href: "/fincas" },
];

const SECUNDARIAS: readonly Modulo[] = [
  { titulo: "Mis tareas", Icono: IconoCalendario, texto: "Qué hacer y cuándo.", href: "/tareas" },
  { titulo: "Informes", Icono: IconoDocumento, texto: "El PDF de cada finca.", href: "/informes" },
  { titulo: "Guía de especies", Icono: IconoGuia, texto: "Plantas que atraen abejas.", href: "/guia-especies" },
];

/** Tarjeta grande y resaltada: borde oliva, ícono en círculo naranja y título grande. */
function TarjetaPrincipal({ titulo, Icono, texto, href }: Modulo) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-4 rounded-[28px] border-2 border-hoja bg-white p-6 shadow-suave transition duration-200 hover:-translate-y-1 hover:bg-menta/40"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-naranja text-bosque">
        <Icono className="h-7 w-7" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="font-titulos text-2xl font-bold text-bosque">{titulo}</span>
        <span className="text-tinta-suave">{texto}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 font-bold text-hoja">
        Entrar
        <IconoFlecha className="h-5 w-5 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

/** Tarjeta chica: para lo que se usa menos seguido. */
function TarjetaSecundaria({ titulo, Icono, texto, href }: Modulo) {
  return (
    <Link
      href={href}
      className="group flex h-full items-center gap-3 rounded-3xl border-2 border-borde bg-white/80 px-4 py-3 transition duration-200 hover:border-hoja hover:bg-white"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-menta text-bosque">
        <Icono className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-titulos font-bold text-bosque">{titulo}</span>
        <span className="text-sm text-tinta-suave">{texto}</span>
      </span>
      <IconoFlecha className="h-5 w-5 shrink-0 text-hoja transition group-hover:translate-x-0.5" />
    </Link>
  );
}

async function Saludo({ searchParams }: { searchParams: Promise<{ confirmada?: string }> }) {
  const usuario = await requerirUsuario("/inicio");
  const { confirmada } = await searchParams;

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
        <p className="max-w-[46ch] text-base text-tinta-suave">¿Qué querés hacer hoy?</p>
      </header>

      {/* Lo principal, primero y resaltado */}
      <ul className="mt-6 grid gap-5 md:grid-cols-3" aria-label="Herramientas principales">
        {PRINCIPALES.map((m) => (
          <li key={m.titulo}>
            <TarjetaPrincipal {...m} />
          </li>
        ))}
      </ul>

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

        <h2 className="mt-10 text-lg font-bold text-bosque">Más herramientas</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {SECUNDARIAS.map((m) => (
            <li key={m.titulo}>
              <TarjetaSecundaria {...m} />
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
