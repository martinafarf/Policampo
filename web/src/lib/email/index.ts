// Envío de emails (verificación, recuperación, avisos).
//
// T1 del módulo 01: todavía no hay servicio de email. En desarrollo y en los tests, el email se
// "simula": se escribe un aviso en la consola. En producción, enviar un email falla a propósito
// hasta que la T2 conecte Resend, para que nunca se pierdan emails en silencio.
import "server-only";

export type Email = {
  para: string;
  asunto: string;
  texto: string;
};

export async function enviarEmail(email: Email): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El envío de emails todavía no está configurado (módulo 01, tarea T2).");
  }
  // Solo en desarrollo: se muestra el asunto y el texto (con el enlace) para poder probar los flujos.
  // La T2 reemplaza esto por Resend y no registra el contenido (regla RS-05).
  console.info(`[email simulado] ${email.asunto}\n${email.texto}`);
}
