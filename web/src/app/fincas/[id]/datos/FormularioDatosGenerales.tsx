"use client";

// Formulario de edición de datos generales del establecimiento (Esp. 02, 6.1 y RS-15).
import Link from "next/link";
import { useActionState } from "react";
import { ETIQUETAS_METODO, type MetodoCaracterizacion } from "@/dominio/establecimientos";
import {
  actualizarDatosGenerales,
  type EstadoFormularioEstablecimiento,
} from "../../acciones";
import {
  CamposUbicacionYDatos,
  type ValoresInicialesEstablecimiento,
} from "../../_componentes/CamposUbicacionYDatos";

interface Props {
  establecimientoId: string;
  metodo: MetodoCaracterizacion;
  version: number;
  inicial: ValoresInicialesEstablecimiento;
}

const ESTADO_INICIAL: EstadoFormularioEstablecimiento = { errores: {} };

export function FormularioDatosGenerales({
  establecimientoId,
  metodo,
  version,
  inicial,
}: Props) {
  const accionConId = actualizarDatosGenerales.bind(null, establecimientoId);
  const [estado, accionFormulario, guardando] = useActionState(accionConId, ESTADO_INICIAL);

  return (
    <form
      action={accionFormulario}
      className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6"
    >
      {/* Versión del registro para evitar pisar cambios hechos en otro dispositivo (RS-15) */}
      <input type="hidden" name="version" value={version} />

      <div className="rounded-lg bg-stone-50 px-3.5 py-2.5 text-sm text-stone-700">
        Método de carga actual: <strong>{ETIQUETAS_METODO[metodo]}</strong>
      </div>

      <CamposUbicacionYDatos metodo={metodo} errores={estado.errores} inicial={inicial} />

      <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
