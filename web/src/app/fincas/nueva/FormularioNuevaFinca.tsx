"use client";

// Flujo de creación de establecimiento (Esp. 02, 5.2, CA-02-01 y CA-02-03).
// Paso 1: elegir uno de los tres métodos. Paso 2: completar los datos generales.
//
// Para que se entienda sin conocer la plataforma: cada método es una tarjeta grande con un dibujo y
// una frase que dice qué vas a hacer (no cómo se llama la técnica). El más fácil está marcado.
// En la computadora las tres opciones van una al lado de la otra; en el celular, una debajo de la otra.
import { useActionState, useState, type ComponentType } from "react";
import { IconoFlecha, IconoLapiz, IconoLista, IconoMapa } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace, clasesBoton } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Desplegable } from "@/componentes/ui/mas-info";
import type { MetodoCaracterizacion } from "@/dominio/establecimientos";
import { crearEstablecimiento, type EstadoFormularioEstablecimiento } from "../acciones";
import { CamposUbicacionYDatos } from "../_componentes/CamposUbicacionYDatos";

const OPCIONES_METODO: readonly {
  id: MetodoCaracterizacion;
  Icono: ComponentType<{ className?: string }>;
  titulo: string;
  descripcion: string;
  etiquetaExtra?: string;
}[] = [
  {
    id: "cuestionario",
    Icono: IconoLista,
    titulo: "Contestar preguntas",
    descripcion: "Escribís qué tenés sembrado, dónde y cuánto mide. No hace falta dibujar.",
    etiquetaExtra: "El más fácil",
  },
  {
    id: "croquis",
    Icono: IconoLapiz,
    titulo: "Dibujar un plano",
    descripcion: "Dibujás tus cultivos y flores en un cuadrado, como en un papel.",
  },
  {
    id: "mapa",
    Icono: IconoMapa,
    titulo: "Marcar en el mapa",
    descripcion: "Marcás tu finca sobre la foto satelital. Usa más datos del celular.",
  },
];

const ESTADO_INICIAL: EstadoFormularioEstablecimiento = { errores: {} };

const MIGAS = [{ texto: "Mis fincas", href: "/fincas" }] as const;

/** "Paso 1 de 2": dos rayitas que muestran cuánto falta. */
function IndicadorPaso({ actual }: { actual: 1 | 2 }) {
  return (
    <p className="flex items-center gap-3 text-[0.95rem] font-semibold text-tinta-suave">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-8 rounded-full bg-hoja" />
        <span className={`h-1.5 w-8 rounded-full ${actual === 2 ? "bg-hoja" : "bg-borde"}`} />
      </span>
      Paso {actual} de 2
    </p>
  );
}

export function FormularioNuevaFinca() {
  const [metodo, setMetodo] = useState<MetodoCaracterizacion | null>(null);
  const [estado, accionFormulario, enviando] = useActionState(crearEstablecimiento, ESTADO_INICIAL);

  if (!metodo) {
    return (
      <section className="flex flex-col gap-6">
        {/* "Paso 1 de 2" va a la derecha del título (en el celular, debajo) para ahorrar un renglón */}
        <EncabezadoPagina migas={MIGAS} titulo="¿Cómo querés cargar tu finca?" acciones={<IndicadorPaso actual={1} />} />

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {OPCIONES_METODO.map(({ id, Icono, titulo, descripcion, etiquetaExtra }) => (
            <li key={id} className="h-full">
              <button
                type="button"
                onClick={() => setMetodo(id)}
                className="group flex h-full w-full items-center gap-4 rounded-[28px] border-2 border-borde bg-white p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-hoja hover:shadow-suave md:flex-col md:items-start md:p-6"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-menta text-bosque">
                  <Icono className="h-7 w-7" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-titulos text-xl font-bold text-bosque">{titulo}</span>
                    {etiquetaExtra && <Etiqueta tono="listo">{etiquetaExtra}</Etiqueta>}
                  </span>
                  <span className="text-tinta-suave">{descripcion}</span>
                </span>
                <IconoFlecha className="h-6 w-6 shrink-0 text-hoja transition group-hover:translate-x-0.5 md:hidden" />
                <span className="inline-flex items-center gap-1.5 font-bold text-hoja max-md:hidden">
                  Elegir <IconoFlecha className="h-5 w-5 transition group-hover:translate-x-1" />
                </span>
              </button>
            </li>
          ))}
        </ul>

        <Desplegable pregunta="¿Puedo cambiarlo después?">
          Sí. Cada finca se carga de una sola forma, pero desde la finca (menú «Más») podés empezar de nuevo
          con otra. Se borran los cultivos y flores cargados; el nombre y la ubicación se conservan.
        </Desplegable>
      </section>
    );
  }

  const metodoSeleccionado = OPCIONES_METODO.find((op) => op.id === metodo)!;

  return (
    <section className="flex flex-col gap-5">
      <EncabezadoPagina
        migas={MIGAS}
        titulo="Datos de tu finca"
        acciones={
          <div className="flex flex-col gap-1 sm:items-end">
            <IndicadorPaso actual={2} />
            <p className="flex flex-wrap items-center gap-2 text-[0.95rem] text-tinta-suave">
              <metodoSeleccionado.Icono className="h-5 w-5 text-hoja" />
              {metodoSeleccionado.titulo}
              <Boton variante="texto" onClick={() => setMetodo(null)} className="min-h-10">
                Cambiar
              </Boton>
            </p>
          </div>
        }
      />

      <form
        action={accionFormulario}
        className="flex flex-col gap-5 rounded-[28px] border-2 border-borde bg-white p-5 sm:p-6"
      >
        <input type="hidden" name="metodoCaracterizacion" value={metodo} />
        <CamposUbicacionYDatos metodo={metodo} errores={estado.errores} />

        <div className="flex flex-col-reverse gap-3 border-t-[1.5px] border-borde pt-5 sm:flex-row sm:justify-end">
          <BotonEnlace href="/fincas" variante="texto">
            Cancelar
          </BotonEnlace>
          <button type="submit" disabled={enviando} className={clasesBoton("principal")}>
            {enviando ? "Guardando…" : "Guardar y seguir"}
            {!enviando && <IconoFlecha className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </section>
  );
}
