"use client";
// Piezas comunes de los formularios: campo con etiqueta y error, aviso y botón de envío.
// Pensadas para el celular: una columna, campos y botones de 44 px de alto o más (RD-03).
import { useState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type PropsCampo = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  nombre: string;
  error?: string;
  ayuda?: string;
};

/**
 * `id` es opcional: por defecto es igual a `nombre`. Hay que pasarlo cuando dos formularios de la
 * misma página tienen un campo con el mismo nombre (por ejemplo "contrasena" en Mi perfil): los id
 * no se pueden repetir, o la etiqueta queda asociada al campo equivocado (accesibilidad).
 */
export function Campo({ etiqueta, nombre, id = nombre, error, ayuda, type = "text", ...resto }: PropsCampo) {
  const [mostrar, setMostrar] = useState(false);
  const esContrasena = type === "password";
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={nombre}
          type={esContrasena && mostrar ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? idError : "", ayuda ? idAyuda : ""].filter(Boolean).join(" ") || undefined}
          className={`min-h-11 w-full rounded-lg border bg-white px-3 text-base outline-none focus:ring-2 focus:ring-campo ${
            error ? "border-error" : "border-borde"
          }`}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="min-h-11 shrink-0 rounded-lg border border-borde px-3 text-sm"
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {mostrar ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-xs text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-sm text-error" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "error" | "exito"; children: React.ReactNode }) {
  const estilos = {
    info: "border-borde bg-white",
    error: "border-error bg-error-claro text-error",
    exito: "border-campo bg-campo-claro text-campo-oscuro",
  }[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border p-3 text-sm ${estilos}`}>
      {children}
    </div>
  );
}

/** Botón de envío: se deshabilita y dice "Enviando…" mientras se procesa (evita dobles envíos). */
export function BotonEnviar({ children, secundario = false }: { children: React.ReactNode; secundario?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 w-full rounded-lg px-4 font-semibold disabled:opacity-60 ${
        secundario ? "border border-borde bg-white text-tinta" : "bg-campo text-white hover:bg-campo-oscuro"
      }`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}
