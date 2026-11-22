"use client";
// Cerrar sesión: antes de enviar, borra del navegador los borradores de PoliCampo (claves
// "policampo_*"), para que no queden en una computadora compartida (regla RS-08, CA-01-10).
import { cerrarSesion } from "@/app/(cuentas)/acciones";

export function borrarBorradoresLocales() {
  try {
    for (const clave of Object.keys(window.localStorage)) {
      if (clave.startsWith("policampo_")) window.localStorage.removeItem(clave);
    }
  } catch {
    // El navegador puede tener el almacenamiento bloqueado: no impide cerrar la sesión.
  }
}

/** `enEncabezado`: en la barra de arriba toma los colores del encabezado (blanco sobre la foto de la landing). */
export function BotonCerrarSesion({ enEncabezado = false }: { enEncabezado?: boolean }) {
  return (
    <form action={cerrarSesion} onSubmit={borrarBorradoresLocales}>
      <button
        type="submit"
        className={`inline-flex min-h-10 items-center rounded-full border-2 border-borde px-3 font-semibold whitespace-nowrap text-tinta hover:bg-menta ${
          enEncabezado ? "texto-encabezado borde-encabezado hover-encabezado" : ""
        }`}
      >
        Cerrar sesión
      </button>
    </form>
  );
}
