"use client";
// Círculo de perfil del encabezado (con sesión iniciada). Muestra la inicial de la persona y, al tocarlo,
// abre una tarjetita con su nombre, "Mi perfil", "Usuarios" (solo administradores) y "Cerrar sesión".
// Se cierra con Escape, al tocar afuera o al elegir una opción. Todavía no permite cambiar la foto.
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { BotonCerrarSesion } from "./boton-cerrar-sesion";

const OPCION = "flex min-h-11 items-center rounded-xl px-3 font-semibold text-tinta hover:bg-menta";

export function MenuPerfil({
  nombre,
  usuario,
  esAdministrador,
}: {
  nombre: string;
  usuario: string;
  esAdministrador: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const idPanel = useId();
  const inicial = (nombre || usuario).trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!abierto) return;
    const alTocar = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("pointerdown", alTocar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alTocar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label={`Menú de ${usuario}: sesión iniciada`}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-white/80 bg-naranja font-titulos text-lg font-extrabold text-bosque transition hover:bg-naranja-claro"
      >
        {inicial}
      </button>
      {abierto && (
        <div
          id={idPanel}
          className="absolute top-full right-0 z-50 mt-2 w-64 rounded-2xl bg-white p-2 text-left shadow-suave ring-1 ring-borde"
          onClick={(e) => {
            // Al elegir un enlace, se cierra la tarjetita.
            if ((e.target as HTMLElement).closest("a")) setAbierto(false);
          }}
        >
          <div className="px-3 pt-2 pb-3">
            <p className="text-xs font-semibold tracking-wide text-tinta-suave uppercase">Sesión iniciada</p>
            <p className="mt-0.5 truncate font-titulos text-lg font-bold text-bosque">{nombre}</p>
            {nombre !== usuario && <p className="truncate text-sm text-tinta-suave">@{usuario}</p>}
          </div>
          <div className="flex flex-col gap-1 border-t border-borde pt-2">
            <Link href="/perfil" className={OPCION}>
              Mi perfil
            </Link>
            {esAdministrador && (
              <Link href="/admin/usuarios" className={OPCION}>
                Usuarios
              </Link>
            )}
            <BotonCerrarSesion />
          </div>
        </div>
      )}
    </div>
  );
}
