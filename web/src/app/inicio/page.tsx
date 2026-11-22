// Inicio del usuario (especificación 01, 5.1): saludo y accesos a los módulos. Los que todavía no
// existen dicen "Próximamente"; al terminar cada módulo se le agrega su enlace acá.
import Link from "next/link";
import { Suspense } from "react";
import { Aviso } from "@/componentes/ui/formulario";
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
  { titulo: "Rediseño", icono: "🌼", texto: "Dónde ubicar franjas florales y qué plantas sembrar." },
  { titulo: "Informes", icono: "📄", texto: "Descargá el informe técnico de cada finca." },
];

async function Saludo({ searchParams }: { searchParams: Promise<{ confirmada?: string }> }) {
  const usuario = await requerirUsuario("/inicio");
  const { confirmada } = await searchParams;
  return (
    <>
      {confirmada && (
        <div className="mb-4">
          <Aviso tipo="exito">¡Tu cuenta está confirmada! Ya podés usar PoliCampo.</Aviso>
        </div>
      )}
      <h1 className="text-2xl font-bold text-campo-oscuro">Hola, {usuario.nombreParaMostrar}</h1>
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
                className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-campo px-4 py-2 text-sm font-semibold text-white hover:bg-campo-oscuro"
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
