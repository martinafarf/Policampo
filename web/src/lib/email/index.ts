// Envío de emails por Gmail (SMTP) con nodemailer (especificación 01, tarea T2).
//
// - Con GMAIL_USUARIO y GMAIL_CLAVE_APP: se envía por Gmail (con una "contraseña de aplicación").
// - Sin ellas:
//     · en desarrollo y en los tests, el email se "simula": se escribe en la consola para poder
//       probar los flujos (verificación, recuperación) sin mandar nada;
//     · en producción es un error: nunca se pierden emails en silencio.
// - Nunca se registran en los logs el destinatario ni el contenido (regla RS-05).
import "server-only";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { ContenidoEmail } from "./plantillas";

export type Email = ContenidoEmail & { para: string };

let transporte: Transporter | undefined;
function gmail(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USUARIO, pass: process.env.GMAIL_CLAVE_APP },
  });
  return transporte;
}

export async function enviarEmail(email: Email): Promise<void> {
  if (!process.env.GMAIL_CLAVE_APP || !process.env.GMAIL_USUARIO) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Faltan GMAIL_USUARIO y GMAIL_CLAVE_APP: no se puede enviar el email.");
    }
    console.info(`[email simulado] ${email.asunto}\n${email.texto}`);
    return;
  }

  try {
    await gmail().sendMail({
      // Gmail obliga a que el remitente sea la propia cuenta.
      from: `PoliCampo <${process.env.GMAIL_USUARIO}>`,
      to: email.para,
      subject: email.asunto,
      text: email.texto,
      html: email.html,
    });
  } catch (error) {
    // Solo el tipo de error: sin destinatario ni contenido (regla RS-05).
    const tipo = error instanceof Error ? error.name : "desconocido";
    console.error(`No se pudo enviar el email "${email.asunto}": ${tipo}`);
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
