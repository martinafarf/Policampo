// CA-01-24: los logs del servidor no contienen emails, contraseñas ni tokens. Se capturan todos los
// mensajes de la consola durante el ingreso fallido, la recuperación y el registro repetido.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { limiteUso, user, verification } from "@/db/schema";
import { auth } from "@/lib/auth";
import { crearNuevaContrasena, ingresar, pedirRecuperacion, registrarCuenta } from "@/lib/cuentas";
import { ocultarDatosPersonales, registrarDeBetterAuth } from "@/lib/logs";

const EMAIL = "privada@ejemplo.com";
const CONTRASENA = "Quebrada-Huma-2026!";
const IP = "203.0.113.70";

let lineas: string[] = [];
function capturar(...partes: unknown[]) {
  const linea = partes.map((p) => (p instanceof Error ? `${p.name} ${p.message} ${p.stack}` : typeof p === "string" ? p : JSON.stringify(p))).join(" ");
  // Los emails "simulados" (sin GMAIL_CLAVE_APP) se muestran a propósito en desarrollo y en los
  // tests para poder probar los enlaces; en producción no existen. No son logs del servidor.
  if (!linea.startsWith("[email simulado]")) lineas.push(linea);
}

beforeEach(async () => {
  lineas = [];
  for (const nivel of ["log", "info", "warn", "error", "debug"] as const) vi.spyOn(console, nivel).mockImplementation(capturar);
  await db.delete(user);
  await db.delete(limiteUso);
});
afterEach(() => vi.restoreAllMocks());

describe("ocultar datos personales", () => {
  it("reemplaza emails, IPs y tokens", () => {
    const texto = ocultarDatosPersonales(
      "Sign-up attempt for existing email: ana.q@finca.com.ar desde 190.12.4.200 y 2800:810:4a5::1 token=eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImEifQ.abc_DEF-123 sesion=Zq8sX0pL4mN7rT2vW9yB3cE6",
    );
    expect(texto).not.toMatch(/ana\.q|190\.12|2800:810|eyJ|Zq8sX0/);
    expect(texto).toContain("Sign-up attempt for existing email: [oculto]");
  });

  it("de los objetos adjuntos al log solo deja el tipo", () => {
    registrarDeBetterAuth("error", "Falló", new Error(`No se pudo para ${EMAIL}`), { email: EMAIL, ip: IP });
    expect(lineas.join("\n")).not.toContain(EMAIL);
    expect(lineas.join("\n")).not.toContain(IP);
    expect(lineas.join("\n")).toContain("[object]");
  });
});

describe("CA-01-24: flujos sin datos personales en los logs", () => {
  it("ingreso fallido, recuperación y registro repetido", async () => {
    await registrarCuenta({ email: EMAIL, usuario: "privada", contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true }, IP);
    await db.update(user).set({ emailVerified: true }).where(eq(user.email, EMAIL));

    // Ingreso fallido, con el email y con el usuario
    await ingresar(EMAIL, "Contrasena-Equivocada-1", IP, new Headers());
    await ingresar("privada", "Contrasena-Equivocada-2", IP, new Headers());
    // Recuperación: pedido, token inventado y token real con contraseña inválida
    await pedirRecuperacion(EMAIL, IP);
    const [fila] = await db.select({ identificador: verification.identifier }).from(verification);
    const token = fila.identificador.replace("reset-password:", "");
    await crearNuevaContrasena("token-inventado-de-prueba-123", CONTRASENA, CONTRASENA);
    await crearNuevaContrasena(token, "corta", "corta");
    // Registro repetido directo en Better Auth (ahí es donde escribe el email en sus mensajes)
    await auth.api.signUpEmail({ body: { email: EMAIL, password: CONTRASENA, name: "otra", username: "otra_cuenta" } }).catch(() => {});

    const todo = lineas.join("\n");
    expect(todo).not.toContain(EMAIL);
    expect(todo).not.toContain("privada@");
    for (const contrasena of [CONTRASENA, "Contrasena-Equivocada-1", "Contrasena-Equivocada-2"]) expect(todo).not.toContain(contrasena);
    expect(todo).not.toContain(token);
  });
});
