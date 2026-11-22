// Landing de PoliCampo (especificación 01, T7): qué es, beneficios, cómo funciona y para quién es.
// El contenido viene de la landing de la v1 (templates/principal/inicio.html).
//
// La página es fija (se genera una vez); solo lo que depende de la sesión (los botones y los avisos
// de "Cerraste sesión" / "Tu cuenta fue eliminada") va dentro de <Suspense>.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LimpiarBorradores } from "@/componentes/cuentas/limpiar-borradores";
import { Aviso } from "@/componentes/ui/formulario";
import { obtenerUsuario } from "@/lib/sesion";
import abeja from "../../public/img/abeja.jpg";
import frutilla from "../../public/img/frutilla.jpg";
import huerta from "../../public/img/huerta.jpg";
import portada from "../../public/img/portada.jpg";

export const metadata: Metadata = {
  title: "PoliCampo · Franjas florales y biodiversidad para tu finca",
  description:
    "Sistema de apoyo a la toma de decisiones agroecológicas para fincas de Jujuy: diagnóstico de biodiversidad, franjas florales y plantas de servicio.",
};

type Busqueda = { sesion?: string; cuenta?: string };

const BENEFICIOS = [
  { icono: "🐝", titulo: "Más polinización", texto: "Las flores atraen abejas y otros polinizadores que mejoran el cuajado, el tamaño y la forma de los frutos." },
  { icono: "🐞", titulo: "Control natural de plagas", texto: "Las plantas de servicio dan refugio a insectos benéficos que se alimentan de las plagas del cultivo." },
  { icono: "🌱", titulo: "Menos agroquímicos", texto: "Con más control biológico, se reduce la necesidad de pesticidas y de servicios externos, y bajan los costos." },
  { icono: "🌼", titulo: "Recuperás biodiversidad", texto: "Los corredores florales conectan hábitats y ayudan a que la flora y la fauna vuelvan de forma natural." },
];

const PASOS = [
  { titulo: "Registrás tu finca", texto: "Cargás el terreno, el cultivo y las condiciones del lugar con un formulario, un croquis o el mapa." },
  { titulo: "Recibís un diagnóstico", texto: "El sistema mide cuánta superficie tiene flores frente al 20 % recomendado y marca las zonas aptas." },
  { titulo: "Obtenés una propuesta de rediseño", texto: "Dónde ubicar franjas florales y qué plantas de servicio son compatibles con tu cultivo." },
  { titulo: "Planificás y descargás tu informe", texto: "Un calendario de siembra, mantenimiento y floración, y un informe técnico para compartir." },
];

const CULTIVOS = ["Frutilla", "Durazno", "Tomate", "Pimiento", "Palta"];

const BOTON_PRINCIPAL =
  "flex min-h-11 items-center justify-center rounded-lg bg-campo px-5 font-semibold text-white hover:bg-campo-oscuro";
const BOTON_SECUNDARIO =
  "flex min-h-11 items-center justify-center rounded-lg border border-white/80 bg-white/10 px-5 font-semibold text-white backdrop-blur hover:bg-white/20";

/**
 * Con sesión: "Ir a Inicio". Sin sesión: Crear cuenta e Iniciar sesión (especificación 01, 5.1).
 * Va sobre fondo oscuro (la portada y el cierre).
 */
async function BotonesDeAcceso() {
  const usuario = await obtenerUsuario();
  if (usuario) {
    return (
      <Link href="/inicio" className={BOTON_PRINCIPAL}>
        Ir a Inicio
      </Link>
    );
  }
  return (
    <>
      <Link href="/registro" className={BOTON_PRINCIPAL}>
        Crear cuenta
      </Link>
      <Link href="/ingresar" className={BOTON_SECUNDARIO}>
        Iniciar sesión
      </Link>
    </>
  );
}

/** Avisos al llegar desde "Cerrar sesión" (?sesion=cerrada) o "Eliminar mi cuenta" (?cuenta=eliminada). */
async function AvisoDeLlegada({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { sesion, cuenta } = await searchParams;
  const mensaje = cuenta === "eliminada" ? "Tu cuenta fue eliminada." : sesion === "cerrada" ? "Cerraste sesión." : null;
  if (!mensaje) return null;
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4">
      {cuenta === "eliminada" && <LimpiarBorradores />}
      <Aviso tipo="exito">{mensaje}</Aviso>
    </div>
  );
}

function Encabezado({ etiqueta, titulo, texto }: { etiqueta: string; titulo: string; texto?: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-flor uppercase">{etiqueta}</p>
      <h2 className="mt-1 text-2xl font-bold text-campo-oscuro sm:text-3xl">{titulo}</h2>
      {texto && <p className="mt-3 text-tinta-suave">{texto}</p>}
    </div>
  );
}

export default function Landing({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-col">
      <Suspense fallback={null}>
        <AvisoDeLlegada searchParams={searchParams as Promise<Busqueda>} />
      </Suspense>

      {/* ─── Portada ─── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={portada}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/55 to-black/20" />
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-20 text-white sm:py-28">
          <p className="text-sm font-semibold tracking-wide uppercase opacity-90">Agroecología · Jujuy</p>
          <h1 className="max-w-2xl text-3xl leading-tight font-bold sm:text-5xl">Más flores, más vida, mejores cosechas</h1>
          <p className="max-w-xl text-base opacity-95 sm:text-lg">
            PoliCampo te ayuda a rediseñar tu terreno agrícola con franjas florales y plantas de servicio que atraen
            polinizadores, promueven el control biológico de plagas y ayudan a recuperar la biodiversidad.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Suspense fallback={<div className="min-h-11" />}>
              <BotonesDeAcceso />
            </Suspense>
          </div>
          <p className="mt-2 inline-flex w-fit items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
            <strong className="text-lg">Al menos 20 %</strong> de hábitat natural para favorecer la biodiversidad
          </p>
        </div>
      </section>

      {/* ─── Qué es ─── */}
      <section className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-16 md:grid-cols-[1fr_auto]">
        <div>
          <Encabezado
            etiqueta="Qué es PoliCampo"
            titulo="Un sistema web que convierte tu finca en un paisaje con más flores y más polinizadores"
          />
          <p className="max-w-2xl text-tinta-suave">
            Cargás los datos de tu terreno y tus cultivos, y PoliCampo te devuelve un diagnóstico de biodiversidad, una
            propuesta de rediseño con las especies adecuadas para tu zona y un calendario para saber qué hacer en cada
            momento del año. Con recomendaciones claras y basadas en ciencia.
          </p>
        </div>
        <Image
          src={abeja}
          alt="Abeja posada sobre una flor"
          placeholder="blur"
          sizes="(min-width: 768px) 240px, 60vw"
          className="mx-auto h-auto w-60 rounded-3xl object-cover shadow-lg"
        />
      </section>

      {/* ─── Beneficios ─── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <Encabezado
            etiqueta="Beneficios"
            titulo="Lo que ganás con las franjas florales"
            texto="Pequeños cambios en el diseño del terreno que mejoran la producción y cuidan el ambiente."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="rounded-2xl border border-borde bg-fondo p-5">
                <p className="text-3xl" aria-hidden>
                  {b.icono}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{b.titulo}</h3>
                <p className="mt-1 text-sm text-tinta-suave">{b.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Cómo funciona ─── */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
        <div>
          <Encabezado etiqueta="Cómo funciona" titulo="De tu finca a un plan, en cuatro pasos" />
          <ol className="flex flex-col gap-5">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="flex gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-campo font-bold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{paso.titulo}</h3>
                  <p className="text-sm text-tinta-suave">{paso.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Image
          src={huerta}
          alt="Huerta con hileras de verduras y plantas"
          placeholder="blur"
          sizes="(min-width: 768px) 480px, 100vw"
          className="h-auto w-full rounded-3xl object-cover shadow-lg"
        />
      </section>

      {/* ─── Para quién es ─── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4">
          <Encabezado etiqueta="Para quién es" titulo="Hecho para quienes trabajan la tierra en Jujuy" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-borde bg-fondo p-5">
              <h3 className="text-lg font-semibold">👩‍🌾 Productores</h3>
              <p className="mt-1 text-sm text-tinta-suave">
                Pequeños y medianos productores que quieren mejorar su rendimiento, reducir costos en insumos y avanzar
                hacia una producción agroecológica, con una guía práctica paso a paso.
              </p>
            </div>
            <div className="rounded-2xl border border-borde bg-fondo p-5">
              <h3 className="text-lg font-semibold">🧑‍🔬 Ingenieros agrónomos</h3>
              <p className="mt-1 text-sm text-tinta-suave">
                Profesionales que asesoran fincas y necesitan diagnósticos ordenados, propuestas fundamentadas e informes
                técnicos para compartir con productores e instituciones.
              </p>
            </div>
          </div>
          <div className="mt-8 grid items-center gap-6 rounded-2xl bg-campo-claro p-5 md:grid-cols-[auto_1fr]">
            <Image
              src={frutilla}
              alt="Frutilla madura en la planta"
              placeholder="blur"
              sizes="160px"
              className="mx-auto h-40 w-32 rounded-2xl object-cover"
            />
            <div>
              <h3 className="text-lg font-semibold text-campo-oscuro">Cultivos que más se benefician</h3>
              <p className="mt-1 text-sm text-tinta-suave">
                Los cultivos intensivos que dependen de la polinización son los que más aprovechan las franjas florales.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {CULTIVOS.map((c) => (
                  <li key={c} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-campo-oscuro">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Respaldo científico ─── */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <Encabezado
          etiqueta="Respaldo científico"
          titulo="Recomendaciones basadas en ciencia"
          texto="Los paisajes agrícolas que combinan producción con vegetación natural (franjas florales, borduras y corredores) sostienen más polinizadores e insectos benéficos: mejor polinización, menos plagas y sistemas más estables frente al clima."
        />
        <blockquote className="rounded-2xl border-l-4 border-flor bg-white p-5 text-sm">
          <p className="font-semibold">Referencia principal</p>
          <p className="mt-1">Paisajes agrícolas multifuncionales: de la ciencia a la práctica.</p>
          <p className="text-tinta-suave">Lucas A. Garibaldi, Paula F. Zermoglio, Facundo J. Oddi y Lucas J. Andreoni.</p>
        </blockquote>
      </section>

      {/* ─── Cierre ─── */}
      <section className="bg-campo-oscuro py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Diseñemos juntos una finca con más vida</h2>
          <p className="max-w-xl opacity-90">Creá tu cuenta, cargá tu finca y recibí tu primer diagnóstico de biodiversidad.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Suspense fallback={<div className="min-h-11" />}>
              <BotonesDeAcceso />
            </Suspense>
          </div>
          <p className="mt-6 text-sm opacity-80">
            Somos un grupo de estudiantes de la Facultad de Ingeniería de la Universidad Nacional de Jujuy (UNJu).{" "}
            <Link href="/privacidad" className="underline">
              Política de privacidad
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
