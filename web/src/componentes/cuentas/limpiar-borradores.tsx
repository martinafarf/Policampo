"use client";
// Al llegar a la landing después de eliminar la cuenta, borra del navegador los borradores de
// PoliCampo (claves "policampo_*"), igual que al cerrar sesión (regla RS-08, especificación 01, 4.6).
import { useEffect } from "react";
import { borrarBorradoresLocales } from "./boton-cerrar-sesion";

export function LimpiarBorradores() {
  useEffect(() => {
    borrarBorradoresLocales();
  }, []);
  return null;
}
