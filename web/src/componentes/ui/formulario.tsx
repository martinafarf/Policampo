"use client";
// Piezas comunes de los formularios: campo con etiqueta y error, aviso y botón de envío.
// Pensadas para el celular: una columna, campos y botones de 44 px de alto o más (RD-03).
import { useState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { IconoAlerta, IconoCerrar, IconoInfo, IconoOk } from "@/componentes/marca/Iconos";

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

/**
 * Cartel de aviso. Los de éxito («Se guardó tu terreno») llevan una ✕ para cerrarlos: ya cumplieron su función
 * y no tienen que quedar ocupando lugar. Los de error no se cierran (hay que leerlos y corregir).
 */
export function Aviso({
  tipo = "info",
  cerrable = tipo === "exito",
  children,
}: {
  tipo?: "info" | "error" | "exito";
  /** Muestra la ✕ para cerrar el aviso (por defecto, solo en los de éxito). */
  cerrable?: boolean;
  children: React.ReactNode;
}) {
  const [cerrado, setCerrado] = useState(false);
  if (cerrado) return null;

  function cerrar() {
    setCerrado(true);
    // Si el aviso vino en la dirección (…?aviso=sectores-guardados), se saca de ahí para que no vuelva a
    // aparecer si se recarga la página.
    const url = new URL(window.location.href);
    if (url.searchParams.has("aviso")) {
      url.searchParams.delete("aviso");
      window.history.replaceState(window.history.state, "", url);
    }
  }

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
      <div className="min-w-0 flex-1">{children}</div>
      {cerrable ? (
        // -my-1.5 -mr-2: el botón es grande para el dedo (36 px) pero no agranda el cartel
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar aviso"
          className="-my-1.5 -mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-black/5"
        >
          <IconoCerrar className="h-5 w-5" />
        </button>
      ) : null}
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
