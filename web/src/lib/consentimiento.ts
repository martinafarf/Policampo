// Consentimiento de la política de privacidad (Ley 25.326, regla RS-17). Lo guarda el registro; si
// la versión cambia, /privacidad/aceptar lo vuelve a pedir y lo guarda acá, con versión y fecha.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { registrarEvento } from "@/lib/eventos";
import { POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";

export async function aceptarPolitica(usuarioId: string): Promise<void> {
  await db
    .update(user)
    .set({ politicaPrivacidadVersion: POLITICA_PRIVACIDAD_VERSION, politicaPrivacidadAceptadaEn: new Date() })
    .where(eq(user.id, usuarioId));
  await registrarEvento("politica_aceptada", { usuarioId, detalle: { version: POLITICA_PRIVACIDAD_VERSION } });
}
