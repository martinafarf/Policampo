// Encabezados HTTP de seguridad (regla RS-14, auditoría M-06).
import { describe, expect, it } from "vitest";
import { encabezadosDeSeguridad, politicaDeContenido } from "../../next.config";

const PRODUCCION = { desarrollo: false, vistaPrevia: false };

function valor(nombre: string, entorno = PRODUCCION) {
  return encabezadosDeSeguridad(entorno).find((e) => e.key === nombre)?.value;
}

describe("encabezados de seguridad (RS-14)", () => {
  it("están todos los que pide la regla", () => {
    expect(valor("Strict-Transport-Security")).toMatch(/max-age=\d+/);
    expect(valor("X-Content-Type-Options")).toBe("nosniff");
    expect(valor("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valor("Permissions-Policy")).toContain("geolocation=(self)");
    expect(valor("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  });

  it("en producción la CSP solo permite el propio sitio y las imágenes de Esri", () => {
    const csp = politicaDeContenido(PRODUCCION);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' blob: data: https://server.arcgisonline.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("vercel.live");
  });

  it("'unsafe-eval' solo en desarrollo y vercel.live solo en las vistas previas", () => {
    expect(politicaDeContenido({ desarrollo: true, vistaPrevia: false })).toContain("'unsafe-eval'");
    expect(politicaDeContenido({ desarrollo: true, vistaPrevia: false })).not.toContain("upgrade-insecure-requests");
    expect(politicaDeContenido({ desarrollo: false, vistaPrevia: true })).toContain("https://vercel.live");
  });
});
