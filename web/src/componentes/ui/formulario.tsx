"use client";
// Piezas comunes de los formularios: campo con etiqueta y error, aviso y botón de envío.
// Pensadas para el celular: una columna, campos y botones de 44 px de alto o más (RD-03).
import { useState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { IconoAlerta, IconoInfo, IconoOk } from "@/componentes/marca/Iconos";

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.95rem] font-semibold">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={nombre}
          type={esContrasena && mostrar ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? idError : "", ayuda ? idAyuda : ""].filter(Boolean).join(" ") || undefined}
          className={`min-h-12 w-full rounded-2xl border-[1.5px] px-4 text-base transition outline-none focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45 ${
            error ? "border-error bg-error-claro" : "border-borde bg-papel hover:border-[#b9cbae]"
          }`}
          {...resto}
        />
        {esContrasena && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="min-h-12 shrink-0 rounded-2xl border-[1.5px] border-borde bg-white px-4 text-[0.95rem] font-semibold text-hoja hover:bg-menta"
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {mostrar ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>
      {ayuda && (
        <p id={idAyuda} className="text-sm text-tinta-suave">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="flex items-center gap-1.5 text-sm font-semibold text-error" aria-live="polite">
          <IconoAlerta className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "error" | "exito"; children: React.ReactNode }) {
  const estilos = {
    info: "border-borde bg-white text-tinta",
    error: "border-[#f5c2bd] bg-error-claro text-error",
    exito: "border-menta-fuerte bg-menta text-bosque",
  }[tipo];
  const Icono = { info: IconoInfo, error: IconoAlerta, exito: IconoOk }[tipo];
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-[0.95rem] ${estilos}`}
    >
      <Icono className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
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
      className={`min-h-12 w-full rounded-full border-2 px-5 text-[1.0625rem] font-bold transition duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-chica disabled:cursor-not-allowed disabled:opacity-55 ${
        secundario ? "border-borde bg-white text-tinta enabled:hover:bg-menta" : "border-transparent bg-hoja text-white enabled:hover:bg-hoja-oscura"
      }`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}
