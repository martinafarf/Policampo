// Firma y verificación HMAC-SHA256 para enlaces de baja del resumen semanal sin iniciar sesión (Esp. 06 §5.6, RS-07, CA-06-15).
import { createHmac, timingSafeEqual } from "node:crypto";

const PROPOSITO_BAJA = "baja-resumen";

function base64UrlEncode(texto: string): string {
  return Buffer.from(texto, "utf8").toString("base64url");
}

function base64UrlDecode(b64: string): string {
  return Buffer.from(b64, "base64url").toString("utf8");
}

function firmar(cargaB64: string, secreto: string): string {
  return createHmac("sha256", secreto).update(cargaB64).digest("base64url");
}

export function firmarTokenBajaResumen(usuarioId: string, secreto: string): string {
  if (!secreto || secreto.length < 16) {
    throw new Error("EMAIL_BAJA_SECRET debe tener al menos 16 caracteres.");
  }
  const carga = JSON.stringify({
    uid: usuarioId,
    proposito: PROPOSITO_BAJA,
  });
  const cargaB64 = base64UrlEncode(carga);
  const firma = firmar(cargaB64, secreto);
  return `${cargaB64}.${firma}`;
}

export function verificarTokenBajaResumen(
  token: string,
  secreto: string,
): { valido: true; usuarioId: string } | { valido: false } {
  if (!token || !secreto || secreto.length < 16) return { valido: false };
  const partes = token.split(".");
  if (partes.length !== 2) return { valido: false };

  const [cargaB64, firmaRecibida] = partes;
  if (!cargaB64 || !firmaRecibida) return { valido: false };

  const firmaEsperada = firmar(cargaB64, secreto);
  const bufRec = Buffer.from(firmaRecibida, "utf8");
  const bufEsp = Buffer.from(firmaEsperada, "utf8");
  if (bufRec.length !== bufEsp.length || !timingSafeEqual(bufRec, bufEsp)) {
    return { valido: false };
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(cargaB64)) as {
      uid?: unknown;
      proposito?: unknown;
    };
    if (
      parsed.proposito !== PROPOSITO_BAJA ||
      typeof parsed.uid !== "string" ||
      parsed.uid.trim().length === 0
    ) {
      return { valido: false };
    }
    return { valido: true, usuarioId: parsed.uid };
  } catch {
    return { valido: false };
  }
}
