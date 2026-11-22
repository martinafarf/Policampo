"use client";

// Flujo de creación de establecimiento (Esp. 02, 5.2, CA-02-01 y CA-02-03).
// Paso 1: elegir uno de los tres métodos. Paso 2: completar los datos generales.
import Link from "next/link";
import { useActionState, useState } from "react";
import type { MetodoCaracterizacion } from "@/dominio/establecimientos";
import { crearEstablecimiento, type EstadoFormularioEstablecimiento } from "../acciones";
import { CamposUbicacionYDatos } from "../_componentes/CamposUbicacionYDatos";

const OPCIONES_METODO: readonly {
  id: MetodoCaracterizacion;
  icono: string;
  titulo: string;
  descripcion: string;
  etiquetaExtra?: string;
}[] = [
  {
    id: "cuestionario",
    icono: "📝",
    titulo: "Responder un cuestionario",
    descripcion: "Listás los sectores del terreno con sus superficies y ubicación aproximada.",
    etiquetaExtra: "Más simple y accesible",
  },
  {
    id: "croquis",
    icono: "📐",
    titulo: "Dibujar un croquis",
    descripcion: "Dibujás los sectores sobre un plano cuadrado a escala, sin necesitar mapa satelital.",
  },
  {
    id: "mapa",
    icono: "🗺️",
    titulo: "Ubicar mi campo en el mapa",
    descripcion: "Marcás el contorno y los sectores de tu finca sobre la imagen satelital.",
  },
];

const ESTADO_INICIAL: EstadoFormularioEstablecimiento = { errores: {} };

export function FormularioNuevaFinca() {
  const [metodo, setMetodo] = useState<MetodoCaracterizacion | null>(null);
  const [estado, accionFormulario, enviando] = useActionState(crearEstablecimiento, ESTADO_INICIAL);

  if (!metodo) {
    return (
      <section className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium text-emerald-700">Paso 1 de 2</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">¿Cómo querés cargar tu finca?</h1>
          <p className="mt-1 text-sm text-stone-600">
            Cada finca usa un único método de carga. Si después querés cambiarlo, podés empezar de
            nuevo conservando los datos generales.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3.5">
          {OPCIONES_METODO.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setMetodo(opcion.id)}
              className="flex min-h-24 w-full flex-col gap-1.5 rounded-xl border border-stone-300 bg-white p-4 text-left shadow-xs transition hover:border-emerald-600 hover:bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-bold text-stone-900">
                  <span aria-hidden="true" className="mr-2">
                    {opcion.icono}
                  </span>
                  {opcion.titulo}
                </span>
                {opcion.etiquetaExtra ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {opcion.etiquetaExtra}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-stone-600">{opcion.descripcion}</p>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <Link
            href="/fincas"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-stone-700 hover:text-stone-950"
          >
            ← Volver a Mis fincas
          </Link>
        </div>
      </section>
    );
  }

  const metodoSeleccionado = OPCIONES_METODO.find((op) => op.id === metodo)!;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Paso 2 de 2</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">Datos generales de la finca</h1>
          <p className="mt-1 text-sm text-stone-600">
            Método elegido:{" "}
            <strong className="text-stone-900">
              {metodoSeleccionado.icono} {metodoSeleccionado.titulo}
            </strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMetodo(null)}
          className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cambiar método
        </button>
      </div>

      <form
        action={accionFormulario}
        className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6"
      >
        <input type="hidden" name="metodoCaracterizacion" value={metodo} />
        <CamposUbicacionYDatos metodo={metodo} errores={estado.errores} />

        <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
          <Link
            href="/fincas"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {enviando ? "Guardando…" : "Guardar y cargar sectores"}
          </button>
        </div>
      </form>
    </section>
  );
}
