// Tests de las funciones puras de usuarios (especificación 01, T3): validaciones y ruta segura.
import { describe, expect, it } from "vitest";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { enmascararEmail, validarRegistro, type DatosRegistro } from "@/dominio/usuarios/validaciones";

const VALIDOS: DatosRegistro = {
  email: "  Ana@Ejemplo.com ",
  usuario: "ana.campo_1",
  contrasena: "Quebrada-Huma-2026!",
  repetirContrasena: "Quebrada-Huma-2026!",
  aceptaPrivacidad: true,
};

describe("validarRegistro (CA-01-02)", () => {
  it("acepta datos válidos y normaliza el email", () => {
    const r = validarRegistro(VALIDOS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.datos.email).toBe("ana@ejemplo.com");
  });

  it.each([
    ["email inválido", { email: "ana@" }, "email"],
    ["usuario corto", { usuario: "an" }, "usuario"],
    ["usuario largo", { usuario: "a".repeat(31) }, "usuario"],
    ["usuario con espacio", { usuario: "ana campo" }, "usuario"],
    ["usuario con @", { usuario: "ana@campo" }, "usuario"],
    ["usuario con acento", { usuario: "ñandú" }, "usuario"],
    ["usuario reservado", { usuario: "Admin" }, "usuario"],
    ["contraseña corta", { contrasena: "corta1", repetirContrasena: "corta1" }, "contrasena"],
    ["contraseña igual al usuario", { contrasena: "ANA.CAMPO_1", repetirContrasena: "ANA.CAMPO_1" }, "contrasena"],
    ["contraseña igual al email", { contrasena: "ana@ejemplo.com", repetirContrasena: "ana@ejemplo.com" }, "contrasena"],
    ["contraseñas distintas", { repetirContrasena: "Otra-cosa-2026!" }, "repetirContrasena"],
    ["sin consentimiento", { aceptaPrivacidad: false }, "aceptaPrivacidad"],
  ])("rechaza %s", (_caso, cambio, campo) => {
    const r = validarRegistro({ ...VALIDOS, ...cambio });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores).toHaveProperty(campo);
  });

  it("enmascara el email para mostrarlo", () => {
    expect(enmascararEmail("ana@ejemplo.com")).toBe("a…@ejemplo.com");
  });
});

describe("rutaInternaSegura (CA-01-11)", () => {
  it.each([
    ["/fincas/123", "/fincas/123"],
    ["/inicio?x=1", "/inicio?x=1"],
    [undefined, "/inicio"],
    ["", "/inicio"],
    ["https://otro-sitio.com", "/inicio"],
    ["//otro-sitio.com", "/inicio"],
    ["/\\otro-sitio.com", "/inicio"],
    ["javascript:alert(1)", "/inicio"],
    ["/ruta\nmala", "/inicio"],
  ])("%s → %s", (entrada, esperado) => {
    expect(rutaInternaSegura(entrada)).toBe(esperado);
  });
});
