"use client";

// Formulario de edición de datos generales del establecimiento (Esp. 02, 6.1 y RS-15).
import { useActionState } from "react";
import { BotonEnlace, clasesBoton } from "@/componentes/ui/boton";
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
      className="flex flex-col gap-5 rounded-[28px] border-2 border-borde bg-white p-5 sm:p-6"
    >
      {/* Versión del registro para evitar pisar cambios hechos en otro dispositivo (RS-15) */}
      <input type="hidden" name="version" value={version} />

      <p className="text-[0.95rem] text-tinta-suave">
        Tu finca se carga con: <strong className="text-tinta">{ETIQUETAS_METODO[metodo]}</strong>
      </p>

      <CamposUbicacionYDatos metodo={metodo} errores={estado.errores} inicial={inicial} />

      <div className="flex flex-col-reverse gap-3 border-t-[1.5px] border-borde pt-5 sm:flex-row sm:justify-end">
        <BotonEnlace href={`/fincas/${establecimientoId}`} variante="texto">
          Cancelar
        </BotonEnlace>
        <button type="submit" disabled={guardando} className={clasesBoton("principal")}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
