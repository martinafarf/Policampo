// Plantillas de los emails de PoliCampo (especificación 01, sección 6.1), en español.
//
// Cada plantilla devuelve el asunto, el texto plano y el HTML. Todo dato que viene del usuario
// (nombres, enlaces) se escapa antes de ponerlo en el HTML (regla RS-07).
// Los emails llevan lo mínimo: sin contraseñas, sin datos de las fincas (regla RS-05).

export type ContenidoEmail = {
  asunto: string;
  texto: string;
  html: string;
};

const PIE_TEXTO =
  "Si no pediste esto, podés ignorar este email.\n\nPoliCampo · Sistema de apoyo a la toma de decisiones agroecológicas";

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Arma el HTML común: título, párrafos y, si hay, un botón con enlace. */
function html({ titulo, parrafos, boton }: { titulo: string; parrafos: string[]; boton?: { texto: string; url: string } }) {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 16px">${escaparHtml(p)}</p>`).join("");
  const enlace = boton
    ? `<p style="margin:24px 0"><a href="${escaparHtml(boton.url)}" style="background:#2b8a3e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escaparHtml(boton.texto)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#555">Si el botón no funciona, copiá este enlace en el navegador:<br>${escaparHtml(boton.url)}</p>`
    : "";
  return (
    `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f4f7f2;font-family:Arial,sans-serif;color:#1f2a1f">` +
    `<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">` +
    `<h1 style="margin:0 0 16px;font-size:20px;color:#2b8a3e">${escaparHtml(titulo)}</h1>${cuerpo}${enlace}` +
    `<p style="margin:24px 0 0;font-size:12px;color:#777">Si no pediste esto, podés ignorar este email.<br>PoliCampo · Sistema de apoyo a la toma de decisiones agroecológicas</p>` +
    `</div></body></html>`
  );
}

/** Verificación de email al registrarse (vence a las 24 horas). */
export function verificacion(url: string): ContenidoEmail {
  return {
    asunto: "PoliCampo: confirmá tu cuenta",
    texto: `¡Hola! Para confirmar tu cuenta de PoliCampo abrí este enlace (vence en 24 horas):\n${url}\n\n${PIE_TEXTO}`,
    html: html({
      titulo: "Confirmá tu cuenta",
      parrafos: ["¡Hola! Para empezar a usar PoliCampo confirmá tu email. El enlace vence en 24 horas."],
      boton: { texto: "Confirmar mi cuenta", url },
    }),
  };
}

/** Recuperación de contraseña (vence en 1 hora). */
export function recuperacion(url: string): ContenidoEmail {
  return {
    asunto: "PoliCampo: crear una contraseña nueva",
    texto: `Para crear una contraseña nueva abrí este enlace (vence en 1 hora):\n${url}\n\n${PIE_TEXTO}`,
    html: html({
      titulo: "Crear una contraseña nueva",
      parrafos: ["Pediste crear una contraseña nueva para tu cuenta. El enlace vence en 1 hora y sirve una sola vez."],
      boton: { texto: "Crear contraseña nueva", url },
    }),
  };
}

/** Aviso de que la contraseña cambió (después de recuperarla o de cambiarla en el perfil). */
export function avisoCambioContrasena(): ContenidoEmail {
  const parrafo =
    "La contraseña de tu cuenta de PoliCampo se cambió. Si no fuiste vos, recuperá tu contraseña ahora y escribinos.";
  return {
    asunto: "PoliCampo: tu contraseña se cambió",
    texto: `${parrafo}\n\n${PIE_TEXTO}`,
    html: html({ titulo: "Tu contraseña se cambió", parrafos: [parrafo] }),
  };
}

/** Confirmación del email nuevo, enviada a la dirección NUEVA (vence a las 24 horas). */
export function confirmarEmailNuevo(url: string): ContenidoEmail {
  return {
    asunto: "PoliCampo: confirmá tu email nuevo",
    texto: `Para usar este email en tu cuenta de PoliCampo abrí este enlace (vence en 24 horas):\n${url}\n\n${PIE_TEXTO}`,
    html: html({
      titulo: "Confirmá tu email nuevo",
      parrafos: ["Pediste cambiar el email de tu cuenta a esta dirección. Hasta que lo confirmes, se sigue usando el anterior."],
      boton: { texto: "Confirmar email nuevo", url },
    }),
  };
}

/** Aviso a la dirección ANTERIOR de que el email de la cuenta cambió. */
export function avisoEmailCambiado(): ContenidoEmail {
  const parrafo =
    "El email de tu cuenta de PoliCampo se cambió por otra dirección. Si no fuiste vos, escribinos cuanto antes.";
  return {
    asunto: "PoliCampo: el email de tu cuenta cambió",
    texto: `${parrafo}\n\n${PIE_TEXTO}`,
    html: html({ titulo: "El email de tu cuenta cambió", parrafos: [parrafo] }),
  };
}

/** Confirmación de que la cuenta y todos sus datos se eliminaron. */
export function cuentaEliminada(): ContenidoEmail {
  const parrafo =
    "Tu cuenta de PoliCampo y todos sus datos (fincas, diagnósticos, propuestas e informes) se eliminaron. Gracias por usar PoliCampo.";
  return {
    asunto: "PoliCampo: tu cuenta fue eliminada",
    texto: `${parrafo}\n\n${PIE_TEXTO}`,
    html: html({ titulo: "Tu cuenta fue eliminada", parrafos: [parrafo] }),
  };
}
