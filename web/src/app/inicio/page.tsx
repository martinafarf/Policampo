// Herramientas del usuario, en la ruta /inicio («Inicio» en pantalla es la landing) (especificación 01, 5.1): saludo, próximas tareas y accesos a los módulos.
// Reutiliza el fondo con cielo menta y PaisajeIlustrado de la portada + AbejaCursor siempre visible.
// Arriba, "Lo que sigue": el próximo paso de la finca que tocaste último, con un solo botón. Debajo, los
// módulos como tarjetas que se tocan enteras (un solo toque, sin seis botones "Abrir" compitiendo).
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
import { BotonEnlace } from "@/componentes/ui/boton";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Aviso } from "@/componentes/ui/formulario";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { obtenerResumenTareasParaInicio } from "@/dominio/calendario/servicio";
import { RUTA_EDICION_METODO } from "@/dominio/establecimientos";
import { requerirUsuario } from "@/lib/sesion";
import { pasoActual } from "../fincas/[id]/pasos";
import { listarEstablecimientosDelUsuario } from "../fincas/_lib/consultas";
import { obtenerEstadoDeFinca } from "../fincas/_lib/pasos-finca";

export const metadata = { title: "Herramientas · PoliCampo" };

const MODULOS: readonly {
  titulo: string;
  Icono: ComponentType<{ className?: string }>;
  texto: string;
  href: string;
}[] = [
  { titulo: "Mis fincas", Icono: IconoFinca, texto: "Tus fincas y lo que tiene cada una.", href: "/fincas" },
  { titulo: "Diagnóstico", Icono: IconoLupa, texto: "Cuántas flores tiene cada finca.", href: "/fincas?enfoque=diagnostico" },
  { titulo: "Rediseño", Icono: IconoFlor, texto: "Dónde sumar flores y qué sembrar.", href: "/fincas" },
  { titulo: "Mis tareas", Icono: IconoCalendario, texto: "Qué hacer y cuándo, en todas tus fincas.", href: "/tareas" },
  { titulo: "Informes", Icono: IconoDocumento, texto: "El informe en PDF de cada finca.", href: "/informes" },
  { titulo: "Guía de especies", Icono: IconoGuia, texto: "Plantas que atraen abejas y bichos útiles.", href: "/guia-especies" },
];

/**
 * "Lo que sigue": mira la finca que se modificó último y busca su próximo paso. Así la persona no tiene
 * que adivinar por dónde seguir: una frase y un botón.
 */
async function LoQueSigue({ usuarioId }: { usuarioId: string }) {
  const fincas = await listarEstablecimientosDelUsuario(usuarioId);
  let titulo: string;
  let texto: string;
  let boton: { texto: string; href: string };

  if (fincas.length === 0) {
    titulo = "Cargá tu primera finca";
    texto = "Con tu finca cargada vas a ver cuántas flores tiene y qué le conviene sembrar.";
    boton = { texto: "Cargar mi finca", href: "/fincas/nueva" };
  } else {
    const estado = await obtenerEstadoDeFinca(fincas[0].id, usuarioId);
    if (!estado) return null;
    const { finca } = estado;
    const paso = pasoActual(estado.pasos);
    const ficha = `/fincas/${finca.id}`;
    texto = paso?.detalle ?? "Podés revisar tu finca o generar un informe cuando quieras.";
    switch (paso?.clave) {
      case "terreno":
        titulo = `Completá el terreno de ${finca.nombre}`;
        boton = { texto: "Completar mi terreno", href: `${ficha}/${RUTA_EDICION_METODO[finca.metodoCaracterizacion]}` };
        break;
      case "diagnostico":
        titulo = paso.estado === "atencion" ? `Actualizá el diagnóstico de ${finca.nombre}` : `Pedí el diagnóstico de ${finca.nombre}`;
        boton = { texto: "Ir a mi finca", href: ficha };
        break;
      case "rediseno":
        titulo = `Armá el rediseño de ${finca.nombre}`;
        boton = { texto: "Armar mi rediseño", href: `${ficha}/propuestas/nueva` };
        break;
      case "calendario":
        titulo = `Armá el calendario de ${finca.nombre}`;
        boton = { texto: "Armar mi calendario", href: `${ficha}/calendario` };
        break;
      default:
        titulo = `${finca.nombre} está al día`;
        boton = { texto: "Ver mi finca", href: ficha };
    }
  }

  return (
    <section className="mt-6 flex flex-col gap-3 rounded-[28px] border-2 border-menta-fuerte bg-white p-5 shadow-chica sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex flex-col gap-1.5">
        <Etiqueta tono="ahora">Lo que sigue</Etiqueta>
        <h2 className="text-xl font-bold text-bosque sm:text-2xl">{titulo}</h2>
        <p className="max-w-[52ch] text-tinta-suave">{texto}</p>
      </div>
      <BotonEnlace href={boton.href} className="shrink-0">
        {boton.texto} <IconoFlecha className="h-5 w-5" />
      </BotonEnlace>
    </section>
  );
}

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
        <p className="max-w-[46ch] text-base text-tinta-suave">¿Qué querés hacer hoy?</p>
      </header>

      <LoQueSigue usuarioId={usuario.id} />

      {listaInicio.length > 0 ? (
        <section className="mt-6 rounded-[28px] border-2 border-menta-fuerte bg-white p-5 shadow-chica sm:p-6">
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
          <ul className="mt-2 flex flex-col divide-y-[1.5px] divide-borde">
            {listaInicio.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-[0.95rem]"
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

        <h2 className="mt-10 text-xl font-bold text-bosque">Todas las herramientas</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map(({ titulo, Icono, texto, href }) => (
            <li key={titulo}>
              <Link
                href={href}
                className="group flex h-full items-center gap-4 rounded-[28px] border-2 border-borde bg-white p-5 shadow-chica transition duration-200 hover:-translate-y-1 hover:border-hoja hover:shadow-suave"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-menta text-bosque">
                  <Icono className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-titulos text-lg font-bold text-bosque">{titulo}</span>
                  <span className="text-[0.95rem] text-tinta-suave">{texto}</span>
                </span>
                <IconoFlecha className="h-5 w-5 shrink-0 text-hoja transition group-hover:translate-x-0.5" />
              </Link>
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
