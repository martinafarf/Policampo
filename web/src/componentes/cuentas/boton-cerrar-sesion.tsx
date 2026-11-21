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

export function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion} onSubmit={borrarBorradoresLocales}>
      <button
        type="submit"
        className="rounded-lg border border-borde px-3 py-2 font-medium text-tinta hover:bg-campo-claro"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
