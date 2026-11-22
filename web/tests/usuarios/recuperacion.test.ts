// Tests de la recuperación de contraseña (especificación 01, T4): CA-01-12 y CA-01-13.
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { limiteUso, session, user, verification } from "@/db/schema";
import { crearNuevaContrasena, cuentaDelEnlaceDeRecuperacion, ingresar, pedirRecuperacion, registrarCuenta } from "@/lib/cuentas";

const CONTRASENA = "Quebrada-Huma-2026!";
const NUEVA = "Yungas-Floridas-2027!";
const IP = "203.0.113.20";

// Los emails se simulan en la consola: se capturan para leer el enlace.
const emails: string[] = [];
vi.spyOn(console, "info").mockImplementation((mensaje: unknown) => {
  emails.push(String(mensaje));
});

function tokenDelEmailDeRecuperacion(): string {
  const email = emails.findLast((e) => e.includes("contraseña nueva"));
  const enlace = email?.match(/https?:\/\/\S+/)?.[0];
  if (!enlace) throw new Error("No hay email de recuperación");
  // El enlace es .../api/auth/reset-password/<token>?callbackURL=...
  return new URL(enlace).pathname.split("/").at(-1) ?? "";
}

async function crearCuenta(email: string, usuario: string) {
  await registrarCuenta({ email, usuario, contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true }, IP);
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
}

beforeEach(async () => {
  emails.length = 0;
  await db.delete(user);
  await db.delete(limiteUso);
});

describe("pedir el enlace (CA-01-12)", () => {
  it("responde lo mismo exista o no la cuenta, y solo envía el email si existe", async () => {
    await crearCuenta("ana@ejemplo.com", "ana");
    emails.length = 0;
    expect(await pedirRecuperacion("nadie@ejemplo.com", IP)).toEqual({ ok: true });
    expect(emails.filter((e) => e.includes("contraseña nueva"))).toHaveLength(0);
    expect(await pedirRecuperacion("ANA@ejemplo.com", IP)).toEqual({ ok: true });
    expect(emails.filter((e) => e.includes("contraseña nueva"))).toHaveLength(1);
  });

  it("limita los pedidos por email (3 por hora)", async () => {
    for (let i = 0; i < 3; i++) expect((await pedirRecuperacion("beto@ejemplo.com", `198.51.100.${i}`)).ok).toBe(true);
    expect(await pedirRecuperacion("beto@ejemplo.com", "198.51.100.9")).toEqual({
      ok: false,
      error: "Demasiados pedidos. Probá de nuevo más tarde.",
    });
  });
});

describe("crear la contraseña nueva (CA-01-13)", () => {
  it("cambia la contraseña, cierra todas las sesiones, avisa por email y el enlace sirve una sola vez", async () => {
    await crearCuenta("carla@ejemplo.com", "carla");
    expect((await ingresar("carla", CONTRASENA, IP, new Headers())).ok).toBe(true);
    expect(await db.select().from(session)).toHaveLength(1);

    await pedirRecuperacion("carla@ejemplo.com", IP);
    const token = tokenDelEmailDeRecuperacion();
    expect(await cuentaDelEnlaceDeRecuperacion(token)).toMatchObject({ usuario: "carla" });

    expect(await crearNuevaContrasena(token, NUEVA, NUEVA)).toEqual({ ok: true });
    expect(await db.select().from(session)).toHaveLength(0); // se cerraron las sesiones
    expect(emails.at(-1)).toContain("tu contraseña se cambió");

    // La nueva funciona y la vieja no
    expect((await ingresar("carla", NUEVA, IP, new Headers())).ok).toBe(true);
    expect(await ingresar("carla", CONTRASENA, "198.51.100.50", new Headers())).toEqual({ ok: false, motivo: "credenciales" });

    // El enlace ya no sirve
    expect(await cuentaDelEnlaceDeRecuperacion(token)).toBeNull();
    expect(await crearNuevaContrasena(token, "Otra-Clave-2027!", "Otra-Clave-2027!")).toEqual({ ok: false, enlaceInvalido: true });
  });

  it("el enlace vence a la hora", async () => {
    await crearCuenta("dani@ejemplo.com", "dani");
    await pedirRecuperacion("dani@ejemplo.com", IP);
    const token = tokenDelEmailDeRecuperacion();
    // Vence a la hora: se simula que pasó 1 hora y 1 minuto moviendo el vencimiento al pasado.
    const [fila] = await db.select().from(verification).where(eq(verification.identifier, `reset-password:${token}`));
    expect(fila.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 60 * 1000) })
      .where(eq(verification.identifier, `reset-password:${token}`));
    expect(await cuentaDelEnlaceDeRecuperacion(token)).toBeNull();
    expect(await crearNuevaContrasena(token, NUEVA, NUEVA)).toEqual({ ok: false, enlaceInvalido: true });
  });

  it("aplica las reglas de la contraseña: distinta del usuario y del email, y repetida igual", async () => {
    await crearCuenta("eva@ejemplo.com", "eva_campo");
    await pedirRecuperacion("eva@ejemplo.com", IP);
    const token = tokenDelEmailDeRecuperacion();
    const igualAlUsuario = await crearNuevaContrasena(token, "EVA_CAMPO", "EVA_CAMPO");
    expect(igualAlUsuario).toMatchObject({ ok: false, errores: { contrasena: expect.stringMatching(/usuario/) } });
    const distintas = await crearNuevaContrasena(token, NUEVA, "otra");
    expect(distintas).toMatchObject({ ok: false, errores: { repetirContrasena: expect.any(String) } });
    // Las validaciones fallidas no consumen el enlace
    expect(await cuentaDelEnlaceDeRecuperacion(token)).not.toBeNull();
  });

  it("un token inventado no sirve", async () => {
    expect(await crearNuevaContrasena("inventado", NUEVA, NUEVA)).toEqual({ ok: false, enlaceInvalido: true });
  });
});
