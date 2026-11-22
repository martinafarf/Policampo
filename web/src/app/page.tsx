// Landing de PoliCampo (especificación 01, T7): qué es, beneficios, cómo funciona y para quién es.
// Rediseño visual "estilos-visuales": foto real a sangre, bordes ondulados, foto de un corredor floral y paisaje
// ilustrado (sistema de estilos en globals.css; mockup en docs/diseno/mockup/).
//
// La página es fija (se genera una vez); solo lo que depende de la sesión (los botones y los avisos
// de "Cerraste sesión" / "Tu cuenta fue eliminada") va dentro de <Suspense>.
import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LimpiarBorradores } from "@/componentes/cuentas/limpiar-borradores";
import {
  Hoja,
  IconoCalendario,
  IconoFinca,
  IconoFlecha,
  IconoFlor,
  IconoLupa,
} from "@/componentes/marca/Iconos";
import { Onda } from "@/componentes/marca/Onda";
import { PaisajeIlustrado } from "@/componentes/marca/PaisajeIlustrado";
import { Revelar } from "@/componentes/marca/Revelar";
import { Aviso } from "@/componentes/ui/formulario";
import { obtenerUsuario } from "@/lib/sesion";
import abeja from "../../public/img/abeja.jpg";
// Foto del corredor floral: Sebastian Wallroth, Wikimedia Commons ("Blühstreifen 001.jpg"), dominio público.
import corredorFloral from "../../public/img/corredor-floral.jpg";
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
  { foto: abeja, alt: "Abeja posada sobre una flor", titulo: "Más polinización", texto: "Las flores atraen abejas y otros polinizadores que mejoran el cuajado, el tamaño y la forma de los frutos." },
  { foto: huerta, alt: "Huerta con flores entre las hileras de verduras", titulo: "Control natural de plagas", texto: "Las plantas de servicio dan refugio a insectos benéficos que se alimentan de las plagas del cultivo." },
  { foto: frutilla, alt: "Frutilla madura en la planta", titulo: "Menos agroquímicos", texto: "Con más control biológico, se reduce la necesidad de pesticidas y bajan los costos." },
  { foto: portada, alt: "Pradera con flores silvestres", titulo: "Recuperás biodiversidad", texto: "Los corredores florales conectan hábitats y ayudan a que la flora y la fauna vuelvan." },
];

const PASOS = [
  { Icono: IconoFinca, titulo: "Registrás tu finca", texto: "Cargás el terreno, el cultivo y las condiciones del lugar con un formulario, un croquis o el mapa." },
  { Icono: IconoLupa, titulo: "Recibís un diagnóstico", texto: "El sistema mide cuánta superficie tiene flores frente al 20 % recomendado y marca las zonas aptas." },
  { Icono: IconoFlor, titulo: "Obtenés una propuesta", texto: "Dónde ubicar franjas florales y qué plantas de servicio son compatibles con tu cultivo." },
  { Icono: IconoCalendario, titulo: "Planificás y descargás", texto: "Un calendario de siembra, mantenimiento y floración, y un informe técnico para compartir." },
];

const CULTIVOS = ["Frutilla", "Durazno", "Tomate", "Pimiento", "Palta"];

// Botones (píldoras). "naranja" va sobre la foto; "principal" sobre fondos claros.
const BOTON_BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 px-6 font-bold transition duration-200 hover:-translate-y-0.5 hover:shadow-chica";
const BOTON_NARANJA = `${BOTON_BASE} border-transparent bg-naranja text-bosque hover:bg-naranja-claro`;
const BOTON_CLARO = `${BOTON_BASE} border-white/85 bg-white/10 text-white hover:bg-white/20`;
const BOTON_PRINCIPAL = `${BOTON_BASE} border-transparent bg-hoja text-white hover:bg-hoja-oscura`;
const BOTON_CONTORNO = `${BOTON_BASE} border-hoja text-hoja hover:bg-white`;

/**
 * Con sesión: "Ir a Inicio". Sin sesión: Crear cuenta e Iniciar sesión (especificación 01, 5.1).
 * `sobreFoto`: en la portada los botones van sobre la foto; en el cierre, sobre fondo claro.
 */
async function BotonesDeAcceso({ sobreFoto }: { sobreFoto: boolean }) {
  const usuario = await obtenerUsuario();
  const principal = sobreFoto ? BOTON_NARANJA : BOTON_PRINCIPAL;
  if (usuario) {
    return (
      <Link href="/inicio" className={principal}>
        Ir a Inicio <IconoFlecha />
      </Link>
    );
  }
  return (
    <>
      <Link href="/registro" className={principal}>
        Crear cuenta <IconoFlecha />
      </Link>
      <Link href="/ingresar" className={sobreFoto ? BOTON_CLARO : BOTON_CONTORNO}>
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
    <div className="mx-auto w-full max-w-6xl px-4 pt-6">
      {cuenta === "eliminada" && <LimpiarBorradores />}
      <Aviso tipo="exito">{mensaje}</Aviso>
    </div>
  );
}

/** Foto en marco de arco (tarjetas de "Para quién es"). */
function FotoArco({ src, alt, posicion }: { src: StaticImageData; alt: string; posicion: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      placeholder="blur"
      sizes="(min-width: 640px) 150px, 100vw"
      style={{ objectPosition: posicion }}
      className="h-44 w-full rounded-[120px_120px_20px_20px] object-cover sm:h-48 sm:rounded-arco"
    />
  );
}

/** Insignia circular que gira: "al menos 20 % de hábitat natural". */
function InsigniaHabitat() {
  return (
    <svg
      viewBox="0 0 170 170"
      className="absolute right-3 bottom-16 h-24 w-24 sm:right-[max(2rem,calc((100%-72rem)/2))] sm:bottom-32 sm:h-40 sm:w-40"
      role="img"
      aria-label="Al menos 20 % de hábitat natural"
    >
      <circle cx="85" cy="85" r="84" fill="var(--color-turquesa)" />
      <g className="animar-gira" style={{ transformBox: "view-box" }}>
        <path id="circulo-insignia" d="M85 85m-62 0a62 62 0 1 1 124 0a62 62 0 1 1-124 0" fill="none" />
        <text fontSize="11.5" fontWeight="700" letterSpacing="1.6" fill="var(--color-bosque)">
          <textPath href="#circulo-insignia" textLength="384" lengthAdjust="spacing">
            AL MENOS 20 % DE HÁBITAT NATURAL ·
          </textPath>
        </text>
      </g>
      <text x="85" y="97" textAnchor="middle" className="font-titulos" fontSize="34" fontWeight="800" fill="var(--color-bosque)">
        20 %
      </text>
    </svg>
  );
}

export default function Landing({ searchParams }: PageProps<"/">) {
  return (
    <main className="flex flex-col bg-white">
      {/* ─── Portada ─── */}
      {/* min-h-svh: la portada ocupa toda la pantalla (svh descuenta la barra del navegador del celular), así se
          ven las olas de abajo pero la sección siguiente empieza recién al bajar. */}
      <section className="relative isolate flex min-h-svh items-center overflow-hidden text-white">
        <Image
          src={portada}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="animar-acerca -z-20 object-cover"
        />
        {/* Degradado arriba: el logo y el menú (sin fondo) se leen aunque la foto sea clara en esa zona */}
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(rgb(0_34_0/.6),transparent)]" />
        {/* Velo oscuro para que el texto se lea sobre la foto: de arriba abajo en el celular, de izquierda a derecha en pantallas anchas */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(0_34_0/.8),rgb(0_34_0/.6)_60%,rgb(0_34_0/.35))] md:bg-[linear-gradient(100deg,rgb(0_34_0/.82),rgb(0_34_0/.55)_45%,rgb(0_34_0/0)_80%)]" />
        <div className="mx-auto w-full max-w-6xl px-4 pt-32 pb-40 sm:pt-32 md:pb-32">
          <h1 className="text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
            {/* Cada frase en su línea, para que no se corten "más vida" ni "mejores cosechas". */}
            <span className="block">Más flores,</span>
            <span className="block">más vida,</span>
            <span className="block text-naranja">mejores cosechas</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg text-white/90 sm:text-xl">
            PoliCampo te ayuda a rediseñar tu finca con franjas florales y plantas de servicio que atraen polinizadores
            y controlan plagas de forma natural.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Suspense fallback={<div className="min-h-12" />}>
              <BotonesDeAcceso sobreFoto />
            </Suspense>
          </div>
        </div>
        <InsigniaHabitat />
        <Hoja className="animar-flota absolute top-[24%] left-[54%] hidden h-12 w-12 text-naranja md:block" />
        <Onda color="#fff" lado="abajo" doble />
      </section>

      <Suspense fallback={null}>
        <AvisoDeLlegada searchParams={searchParams as Promise<Busqueda>} />
      </Suspense>

      {/* ─── Qué es: foto real de un corredor floral con una tarjeta superpuesta ───
          Pantalla ancha: la foto ocupa las columnas 1–8 y la tarjeta las 7–12, en la misma fila, así se
          superponen. Celular: la foto a lo ancho y la tarjeta sube por encima de su borde inferior.
          Detrás, una banda menta con bordes ondulados (como en las referencias de docs/diseno/). */}
      <section id="que-es" className="relative scroll-mt-20 pt-6 pb-28 sm:pt-10 sm:pb-32">
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-menta md:h-[52%]" aria-hidden="true">
          <Onda color="var(--color-menta)" lado="arriba" />
          <Onda color="#fff" lado="abajo" />
        </div>
        <div className="relative mx-auto grid w-full max-w-6xl items-center px-4 md:grid-cols-12">
          <figure className="m-0 md:col-span-8 md:col-start-1 md:row-start-1">
            <Image
              src={corredorFloral}
              alt="Franja de manzanillas y acianos en flor en el borde de un cultivo, junto a un cerco vivo"
              placeholder="blur"
              sizes="(min-width: 1152px) 750px, (min-width: 768px) 66vw, 100vw"
              className="aspect-[4/3.3] w-full rounded-[28px] object-cover object-[50%_60%] shadow-suave md:aspect-[16/11] md:object-center"
            />
          </figure>
          <Revelar className="relative z-10 mx-3 -mt-10 flex flex-col gap-5 rounded-[24px] bg-white p-6 shadow-suave sm:mx-8 sm:p-8 md:col-span-6 md:col-start-7 md:row-start-1 md:mx-0 md:mt-0 md:p-10">
            <h2 className="titulo-onda text-3xl font-bold sm:text-[2.4rem] sm:leading-[1.08]">
              Tu finca, rediseñada para la biodiversidad
            </h2>
            <p className="text-tinta-suave">
              Cargás tu terreno y tus cultivos. PoliCampo mide cuánta superficie tiene hábitat natural y te propone
              dónde ubicar franjas florales y corredores como este, con especies compatibles con tu cultivo y tu zona.
            </p>
            <p className="font-semibold text-bosque">
              La meta: que al menos el 20 % de la finca sea hábitat natural, como recomiendan Garibaldi et al.
            </p>
            <a
              href="#como-funciona"
              className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-hoja px-6 font-bold text-white transition hover:-translate-y-0.5 hover:bg-hoja-oscura hover:shadow-chica"
            >
              Ver cómo funciona <IconoFlecha />
            </a>
          </Revelar>
        </div>
      </section>

      {/* ─── Beneficios: fotos en arco ─── */}
      <section id="beneficios" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-28" aria-labelledby="titulo-beneficios">
        <Revelar className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 id="titulo-beneficios" className="titulo-onda text-3xl font-bold sm:text-[2.6rem] sm:leading-[1.08]">
            Lo que ganás con las franjas florales
          </h2>
          <p className="max-w-[42ch] text-tinta-suave">
            Pequeños cambios en el diseño del terreno que mejoran la producción y cuidan el ambiente.
          </p>
        </Revelar>
        <ul className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFICIOS.map((b, i) => (
            <Revelar
              key={b.titulo}
              como="li"
              className={`group relative aspect-[3/3.4] overflow-hidden rounded-[160px_160px_28px_28px] shadow-suave transition duration-500 ease-salida hover:-translate-y-2 sm:aspect-[3/4.4] sm:rounded-arco ${
                i % 2 === 1 ? "lg:mt-16" : ""
              }`}
            >
              <Image
                src={b.foto}
                alt={b.alt}
                placeholder="blur"
                fill
                sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 100vw"
                className="object-cover transition duration-700 ease-salida group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgb(0_51_0/.9)_42%)] px-6 pt-16 pb-6 text-white">
                <h3 className="text-xl font-bold text-white">{b.titulo}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-snug text-white/90">{b.texto}</p>
              </div>
            </Revelar>
          ))}
        </ul>
      </section>

      {/* ─── Cómo funciona: banda menta con bordes ondulados ─── */}
      <section id="como-funciona" className="relative scroll-mt-20 bg-menta py-24 sm:py-28">
        <Onda color="var(--color-menta)" lado="arriba" />
        <div className="mx-auto w-full max-w-6xl px-4">
          <Revelar className="mb-12">
            <h2 className="titulo-onda text-3xl font-bold sm:text-[2.6rem] sm:leading-[1.08]">
              De tu finca a un plan, en cuatro pasos
            </h2>
          </Revelar>
          {/* Camino punteado: vertical en el celular, horizontal en pantallas anchas */}
          <ol className="relative grid gap-8 before:absolute before:top-0 before:bottom-0 before:left-[33px] before:border-l-[3px] before:border-dashed before:border-hoja/45 md:grid-cols-4 md:before:top-[34px] md:before:right-[8%] md:before:bottom-auto md:before:left-[8%] md:before:border-t-[3px] md:before:border-l-0">
            {PASOS.map(({ Icono, titulo, texto }, i) => (
              <Revelar key={titulo} como="li" className="relative flex min-h-[68px] flex-col gap-2 pl-[88px] md:pl-0">
                <span className="absolute top-0 left-0 grid h-[68px] w-[68px] place-items-center rounded-[60%_40%_55%_45%/50%_55%_45%_50%] bg-white text-hoja shadow-chica md:relative md:mb-2">
                  <Icono className="h-8 w-8" />
                  {/* El orden importa (son pasos): el número va en una marquita sobre el ícono. */}
                  <span className="absolute -top-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-hoja text-sm font-bold text-white tabular-nums">
                    {i + 1}
                  </span>
                </span>
                <h3 className="text-xl font-bold">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {titulo}
                </h3>
                <p className="text-[0.95rem] text-tinta-suave">{texto}</p>
              </Revelar>
            ))}
          </ol>
        </div>
        <div className="absolute inset-x-0 -bottom-px rotate-180">
          <Onda color="var(--color-menta)" lado="arriba" />
        </div>
      </section>

      {/* ─── Para quién es ─── */}
      <section id="para-quien" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pt-32 pb-24">
        <Revelar className="mb-10">
          <h2 className="titulo-onda text-3xl font-bold sm:text-[2.6rem] sm:leading-[1.08]">
            Hecho para quienes trabajan la tierra en Jujuy
          </h2>
        </Revelar>
        <div className="grid gap-6 md:grid-cols-2">
          <Revelar className="grid items-center gap-5 rounded-[28px] border-2 border-borde p-5 sm:grid-cols-[150px_1fr] sm:p-6">
            <FotoArco src={frutilla} alt="Frutillas maduras en la planta" posicion="40% 50%" />
            <div>
              <h3 className="text-xl font-bold">Productores</h3>
              <p className="mt-1.5 text-tinta-suave">
                Pequeños y medianos productores que quieren mejorar su rendimiento, reducir costos en insumos y avanzar
                hacia una producción agroecológica, con una guía práctica paso a paso.
              </p>
            </div>
          </Revelar>
          <Revelar className="grid items-center gap-5 rounded-[28px] border-2 border-borde p-5 sm:grid-cols-[150px_1fr] sm:p-6">
            <FotoArco src={huerta} alt="Huerta diversificada con flores entre las hileras" posicion="70% 40%" />
            <div>
              <h3 className="text-xl font-bold">Ingenieros agrónomos</h3>
              <p className="mt-1.5 text-tinta-suave">
                Profesionales que asesoran fincas y necesitan diagnósticos ordenados, propuestas fundamentadas e informes
                técnicos para compartir con productores e instituciones.
              </p>
            </div>
          </Revelar>
        </div>
        <Revelar className="mt-8 flex flex-wrap items-center gap-3">
          <h3 className="mr-2 font-sans text-base font-semibold tracking-normal">Cultivos que más se benefician:</h3>
          <ul className="flex flex-wrap gap-2.5">
            {CULTIVOS.map((c) => (
              <li key={c} className="rounded-full bg-menta px-4 py-2 text-[0.95rem] font-semibold text-bosque">
                {c}
              </li>
            ))}
          </ul>
        </Revelar>
      </section>

      {/* ─── Respaldo científico ─── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-28">
        <Revelar className="relative grid items-center gap-8 overflow-hidden rounded-[28px] bg-menta-fuerte/60 px-6 py-12 sm:px-12 sm:py-16 md:grid-cols-[1.2fr_0.8fr]">
          {/* Es un resumen con nuestras palabras, no una cita textual: por eso no va entre comillas. */}
          <div className="flex flex-col gap-4">
            <h2 className="titulo-onda text-3xl font-bold sm:text-[2.6rem] sm:leading-[1.08]">
              Recomendaciones basadas en ciencia
            </h2>
            <p className="text-lg text-tinta">
              Según Garibaldi et al., los paisajes agrícolas que combinan producción con vegetación natural (franjas
              florales, borduras y corredores) sostienen más polinizadores e insectos benéficos: mejor polinización,
              menos plagas y sistemas más estables frente al clima.
            </p>
          </div>
          <p className="border-t-2 border-bosque/15 pt-4 text-[0.95rem] text-tinta-suave">
            <span className="mb-1 block font-semibold text-bosque">Referencia principal</span>
            <cite className="not-italic">Paisajes agrícolas multifuncionales: de la ciencia a la práctica</cite>. Lucas
            A. Garibaldi, Paula F. Zermoglio, Facundo J. Oddi y Lucas J. Andreoni.
          </p>
          <Hoja className="animar-flota absolute top-5 right-6 hidden h-20 w-20 text-hoja opacity-30 md:block" />
        </Revelar>
      </section>

      {/* ─── Cierre con paisaje ilustrado ─── */}
      <section className="relative overflow-hidden bg-[linear-gradient(#d6f1e7,#eff9f5_60%)] pt-24 text-center">
        <Revelar className="mx-auto max-w-6xl px-4">
          <h2 className="mx-auto max-w-[18ch] text-3xl font-bold sm:text-[2.6rem] sm:leading-[1.08]">
            Diseñemos juntos una finca con más vida
          </h2>
          <p className="mx-auto mt-4 max-w-[46ch] text-tinta-suave">
            Creá tu cuenta, cargá tu finca y recibí tu primer diagnóstico de biodiversidad.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Suspense fallback={<div className="min-h-12" />}>
              <BotonesDeAcceso sobreFoto={false} />
            </Suspense>
          </div>
        </Revelar>
        <PaisajeIlustrado />
      </section>

      <footer className="bg-bosque py-10 text-[0.95rem] text-white/85">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex flex-col gap-1">
            <p>Somos un grupo de estudiantes de la Facultad de Ingeniería de la Universidad Nacional de Jujuy (UNJu).</p>
            <p className="text-sm text-white/70">Foto del corredor floral: Sebastian Wallroth (Wikimedia Commons, dominio público).</p>
          </div>
          <Link href="/privacidad" className="font-semibold text-white underline">
            Política de privacidad
          </Link>
        </div>
      </footer>
    </main>
  );
}
