"use client";

// Botón + confirmación de emisión de informe técnico con casilla opcional de nombre (Esp. 07 §5.1, CA-07-01, CA-07-03).
import Link from "next/link";
import { useState, useTransition } from "react";
import { emitirInformeAccion } from "@/app/fincas/[id]/informes/acciones";
import { clasesBoton } from "@/componentes/ui/boton";

interface Props {
  establecimientoId: string;
  cumpleRequisitos: boolean;
  mensajeFaltante: string | null;
  nombrePerfilCompleto: string | null;
  /** false cuando hay otra acción más importante en la pantalla: el botón va con borde (contorno). */
  principal?: boolean;
}

export function BotonEmitirInforme({
  establecimientoId,
  cumpleRequisitos,
  mensajeFaltante,
  nombrePerfilCompleto,
  principal = true,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [incluirNombre, setIncluirNombre] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  if (!cumpleRequisitos) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button type="button" disabled className={clasesBoton("contorno")}>
          Generar informe
        </button>
        <p className="text-sm font-semibold text-tinta-suave">{mensajeFaltante}</p>
      </div>
    );
  }

  function confirmarEmision() {
    setError(null);
    iniciarTransicion(async () => {
      const res = await emitirInformeAccion(
        establecimientoId,
        Boolean(nombrePerfilCompleto && incluirNombre),
      );
      if (res && !res.ok) {
        setError(res.error);
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={clasesBoton(principal ? "principal" : "contorno")}
      >
        Generar informe
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-menta-fuerte bg-menta p-4">
      <p className="font-bold text-bosque">Generar el informe en PDF</p>
      <p className="text-sm text-tinta-suave">
        Se guarda una foto fija del diagnóstico, la propuesta elegida y el calendario actual con un
        código único.
      </p>

      <label
        className={`inline-flex items-start gap-2.5 text-sm ${
          nombrePerfilCompleto ? "cursor-pointer text-tinta" : "cursor-not-allowed text-tinta-suave"
        }`}
      >
        <input
          type="checkbox"
          disabled={!nombrePerfilCompleto || pendiente}
          checked={Boolean(nombrePerfilCompleto && incluirNombre)}
          onChange={(e) => setIncluirNombre(e.target.checked)}
          className="mt-0.5 h-5 w-5"
        />
        <span>
          <strong>Incluir mi nombre en el informe</strong>
          {nombrePerfilCompleto ? (
            <span className="block text-sm text-tinta-suave">
              Aparecerá como: «Preparado para: {nombrePerfilCompleto}»
            </span>
          ) : (
            <span className="block text-sm text-tinta-suave">
              Cargá tu nombre en{" "}
              <Link href="/perfil" className="font-semibold underline">
                Mi perfil
              </Link>{" "}
              para habilitar esta opción.
            </span>
          )}
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border-[1.5px] border-[#f5c2bd] bg-error-claro px-3 py-2 text-sm font-semibold text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendiente}
          onClick={confirmarEmision}
          className={clasesBoton("principal")}
        >
          {pendiente ? "Emitiendo informe…" : "Confirmar y emitir"}
        </button>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => setAbierto(false)}
          className={clasesBoton("texto")}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
