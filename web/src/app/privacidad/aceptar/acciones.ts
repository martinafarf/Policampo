"use server";
// Aceptar la versión vigente de la política de privacidad (especificación 01, sección 8).
import { redirect } from "next/navigation";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { aceptarPolitica } from "@/lib/consentimiento";
import { requerirUsuario } from "@/lib/sesion";

export type EstadoAceptar = { error?: string };

export async function aceptarPoliticaAccion(_previo: EstadoAceptar, formulario: FormData): Promise<EstadoAceptar> {
  const usuario = await requerirUsuario("/privacidad/aceptar", { sinConsentimiento: true });
  if (formulario.get("acepta") !== "on") return { error: "Para seguir usando PoliCampo tenés que aceptar la política." };
  await aceptarPolitica(usuario.id);
  const volver = formulario.get("volver");
  // rutaInternaSegura evita que "volver" lleve a otro sitio (CA-01-11).
  redirect(rutaInternaSegura(typeof volver === "string" ? volver : ""));
}
