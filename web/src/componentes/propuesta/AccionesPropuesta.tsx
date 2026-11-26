"use client";

// Acciones de una propuesta guardada (Esp. 05 §6.2), con el mismo estilo que la ficha de la finca:
// - <BotonElegirPropuesta>: «Usar esta propuesta» (la marca como Elegida). Es la acción principal cuando la
//   propuesta todavía no está elegida.
// - <MenuMasPropuesta>: botón «Más» con lo que se usa poco: elegirla, duplicarla y borrarla. Borrar va
//   escondido acá (y pide confirmación) para que no se toque sin querer.
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  borrarPropuestaAccion,
  marcarPropuestaElegidaAccion,
} from "@/app/fincas/[id]/propuestas/acciones";
import { clasesBoton, type VarianteBoton } from "@/componentes/ui/boton";

interface Props {
  establecimientoId: string;
  propuestaId: string;
  elegida: boolean;
}

export function BotonElegirPropuesta({
  establecimientoId,
  propuestaId,
  variante = "principal",
}: Omit<Props, "elegida"> & { variante?: VarianteBoton }) {
  const [pendiente, iniciarTransicion] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() =>
        iniciarTransicion(async () => {
          await marcarPropuestaElegidaAccion(establecimientoId, propuestaId);
        })
      }
      className={clasesBoton(variante)}
    >
      {pendiente ? "Guardando…" : "Usar esta propuesta"}
    </button>
  );
}

export function MenuMasPropuesta({
  establecimientoId,
  propuestaId,
  elegida,
  /** En la lista el botón es más chico, para que la tarjeta no quede alta. */
  chico = false,
}: Props & { chico?: boolean }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  const opcion =
    "flex min-h-12 w-full items-center rounded-2xl px-4 text-left font-semibold";

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={menuAbierto}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        className={`${clasesBoton("contorno")} ${chico ? "min-h-10 px-4" : ""}`}
      >
        Más
      </button>

      {menuAbierto ? (
        <div className="absolute right-0 z-20 mt-2 w-60 rounded-3xl border-[1.5px] border-borde bg-white p-2 shadow-suave">
          {!elegida ? (
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                setMenuAbierto(false);
                iniciarTransicion(async () => {
                  await marcarPropuestaElegidaAccion(
                    establecimientoId,
                    propuestaId,
                  );
                });
              }}
              className={`${opcion} text-tinta hover:bg-menta`}
            >
              Usar esta propuesta
            </button>
          ) : null}
          <Link
            href={`/fincas/${establecimientoId}/propuestas/nueva?desde=${propuestaId}`}
            className={`${opcion} text-tinta hover:bg-menta`}
          >
            Duplicar y editar
          </Link>
          <hr className="my-1 border-borde" />
          <button
            type="button"
            onClick={() => {
              setMenuAbierto(false);
              setConfirmandoBorrado(true);
            }}
            className={`${opcion} text-error hover:bg-error-claro`}
          >
            Borrar propuesta
          </button>
        </div>
      ) : null}

      {/* Confirmación de borrado (mismo cartel que en la ficha) */}
      {confirmandoBorrado ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`titulo-borrar-${propuestaId}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bosque/60 p-4"
        >
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 shadow-suave">
            <h2
              id={`titulo-borrar-${propuestaId}`}
              className="text-xl font-bold text-bosque"
            >
              ¿Borrar esta propuesta?
            </h2>
            <p className="text-tinta-suave">
              {elegida
                ? "Es la propuesta elegida: el calendario y los informes van a quedar sin propuesta hasta que elijas otra."
                : "No se puede deshacer."}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pendiente}
                onClick={() => setConfirmandoBorrado(false)}
                className={clasesBoton("texto")}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() =>
                  iniciarTransicion(async () => {
                    await borrarPropuestaAccion(establecimientoId, propuestaId);
                  })
                }
                className={clasesBoton("peligro")}
              >
                {pendiente ? "Borrando…" : "Sí, borrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
