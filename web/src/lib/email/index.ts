// Envío de emails con Resend (especificación 01, tarea T2).
//
// - Con RESEND_API_KEY: se envía por Resend, desde EMAIL_REMITENTE.
// - Sin RESEND_API_KEY:
//     · en desarrollo y en los tests, el email se "simula": se escribe en la consola para poder
//       probar los flujos (verificación, recuperación) sin mandar nada;
//     · en producción es un error: nunca se pierden emails en silencio.
// - Nunca se registran en los logs el destinatario ni el contenido (regla RS-05).
import "server-only";
import { Resend } from "resend";
import type { ContenidoEmail } from "./plantillas";

// Hasta tener un dominio propio verificado en Resend, se usa su remitente de prueba. Con ese
// remitente Resend solo entrega a la dirección dueña de la cuenta (pendiente de la especificación 01).
const REMITENTE_DE_PRUEBA = "PoliCampo <onboarding@resend.dev>";

export type Email = ContenidoEmail & { para: string };

let cliente: Resend | undefined;
function resend(): Resend {
  cliente ??= new Resend(process.env.RESEND_API_KEY);
  return cliente;
}

export async function enviarEmail(email: Email): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Falta la variable de entorno RESEND_API_KEY: no se puede enviar el email.");
    }
    console.info(`[email simulado] ${email.asunto}\n${email.texto}`);
    return;
  }

  const { error } = await resend().emails.send({
    from: process.env.EMAIL_REMITENTE || REMITENTE_DE_PRUEBA,
    to: email.para,
    subject: email.asunto,
    text: email.texto,
    html: email.html,
  });
  if (error) {
    // Solo el tipo de error: sin destinatario ni contenido (regla RS-05).
    console.error(`No se pudo enviar el email "${email.asunto}": ${error.name}`);
    throw new Error("No se pudo enviar el email. Probá de nuevo en unos minutos.");
  }
}

/**
 * Para los emails de AVISO (contraseña cambiada, email cambiado, cuenta eliminada): se mandan
 * después de que la operación ya ocurrió. Si el envío falla, se registra y se sigue: la operación
 * no puede aparecer como fallida cuando en realidad se hizo.
 */
export async function enviarAvisoSinInterrumpir(email: Email): Promise<void> {
  try {
    await enviarEmail(email);
  } catch {
    console.error(`No se pudo enviar el aviso "${email.asunto}"; la operación ya se había completado.`);
  }
}
