// Generador criptográfico de códigos únicos INF-{año}-XXXXXX (Esp. 07 §2, §7, CA-07-02).
import { randomInt } from "node:crypto";

// Alfabeto sin caracteres confusos (sin 0, O, 1, I, L).
export const ALFABETO_CODIGO_INFORME = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LARGO_SUFIJO = 6;
const REGEX_CODIGO_INFORME = /^INF-\d{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export function generarCodigoInforme(anio: number = new Date().getFullYear()): string {
  let sufijo = "";
  for (let i = 0; i < LARGO_SUFIJO; i += 1) {
    sufijo += ALFABETO_CODIGO_INFORME[randomInt(0, ALFABETO_CODIGO_INFORME.length)];
  }
  return `INF-${anio}-${sufijo}`;
}

export function esCodigoInformeValido(codigo: string): boolean {
  return REGEX_CODIGO_INFORME.test(codigo);
}
