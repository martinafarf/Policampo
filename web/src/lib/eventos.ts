// Registro de eventos de seguridad (auditoría B-02): tabla evento_seguridad.
// Solo ids y datos técnicos: nunca emails, contraseñas ni tokens (regla RS-05).
import "server-only";
import { db } from "@/db";
import { eventoSeguridad } from "@/db/schema";

export type TipoEvento =
  | "registro"
  | "ingreso"
  | "ingreso_fallido"
  | "ingreso_bloqueado"
  | "verificacion_reenviada"
  | "sesion_cerrada"
  | "contrasena_restablecida"
  // Perfil (T5)
  | "perfil_actualizado"
  | "contrasena_cambiada"
  | "cambio_email_pedido"
  | "email_cambiado"
  | "cuenta_eliminada";

export async function registrarEvento(
  tipo: TipoEvento,
  datos: { usuarioId?: string | null; actorId?: string | null; detalle?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await db.insert(eventoSeguridad).values({
      tipo,
      usuarioId: datos.usuarioId ?? null,
      actorId: datos.actorId ?? null,
      detalle: datos.detalle ?? {},
    });
  } catch (error) {
    // Un fallo del registro no puede impedir que la persona use el sistema.
    console.error(`No se pudo registrar el evento ${tipo}:`, error instanceof Error ? error.name : "error");
  }
}
