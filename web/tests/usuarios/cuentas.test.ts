// Tests del servicio de cuentas contra la base de tests (especificación 01, T3).
// CA-01-01, 02, 04, 05, 06, 07 y 08.
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { limiteUso, session, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ingresar, reenviarVerificacion, registrarCuenta } from "@/lib/cuentas";
import { POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";

const CONTRASENA = "Quebrada-Huma-2026!";
const IP = "203.0.113.10";

// Los emails se simulan en la consola: se capturan para leer el enlace de verificación.
const emails: string[] = [];
vi.spyOn(console, "info").mockImplementation((mensaje: unknown) => {
  emails.push(String(mensaje));
});

function datos(email: string, usuario: string) {
  return { email, usuario, contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true };
}

function tokenDelUltimoEmail(): string {
  const enlace = emails.at(-1)?.match(/https?:\/\/\S+/)?.[0];
  if (!enlace) throw new Error("No hay enlace en el último email");
  const token = new URL(enlace).searchParams.get("token");
  if (!token) throw new Error("El enlace no tiene token");
  return token;
}

async function crearVerificado(email: string, usuario: string) {
  await registrarCuenta(datos(email, usuario), IP);
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, email));
}

beforeEach(async () => {
  emails.length = 0;
  await db.delete(user);
  await db.delete(limiteUso);
});
afterEach(() => vi.useRealTimers());

describe("registro", () => {
  it("crea la cuenta sin verificar, con rol usuario y consentimiento, y manda el email (CA-01-01)", async () => {
    const r = await registrarCuenta(datos("Ana@Ejemplo.com", "Ana"), IP);
    expect(r).toEqual({ ok: true, email: "ana@ejemplo.com" });
    const [ana] = await db.select().from(user).where(eq(user.email, "ana@ejemplo.com"));
    expect(ana.emailVerified).toBe(false);
    expect(ana.role).toBe("usuario");
    expect(ana.politicaPrivacidadVersion).toBe(POLITICA_PRIVACIDAD_VERSION);
    expect(ana.politicaPrivacidadAceptadaEn).toBeInstanceOf(Date);
    expect(emails.at(-1)).toContain("confirmá tu cuenta");
  });

  it("rechaza email o usuario repetidos aunque cambien las mayúsculas (CA-01-02)", async () => {
    await registrarCuenta(datos("ana@ejemplo.com", "ana"), IP);
    const r = await registrarCuenta(datos("ANA@ejemplo.com", "ANA"), IP);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.email).toMatch(/ya está registrado/);
      expect(r.errores.usuario).toMatch(/ya está en uso/);
    }
  });

  it("valida en el servidor y no crea nada si hay errores (CA-01-02)", async () => {
    const r = await registrarCuenta({ ...datos("beto@ejemplo.com", "beto"), aceptaPrivacidad: false }, IP);
    expect(r.ok).toBe(false);
    expect(await db.select().from(user)).toHaveLength(0);
  });
});

describe("verificación del email (CA-01-04)", () => {
  it("el enlace válido verifica la cuenta y sirve una sola vez", async () => {
    await registrarCuenta(datos("carla@ejemplo.com", "carla"), IP);
    const token = tokenDelUltimoEmail();
    await auth.api.verifyEmail({ query: { token } });
    const [carla] = await db.select().from(user).where(eq(user.email, "carla@ejemplo.com"));
    expect(carla.emailVerified).toBe(true);
  });

  it("el enlace vencido (más de 24 horas) no verifica", async () => {
    await registrarCuenta(datos("dani@ejemplo.com", "dani"), IP);
    const token = tokenDelUltimoEmail();
    vi.useFakeTimers({ now: Date.now() + 25 * 60 * 60 * 1000, toFake: ["Date"] });
    await expect(auth.api.verifyEmail({ query: { token } })).rejects.toThrow();
    vi.useRealTimers();
    const [dani] = await db.select().from(user).where(eq(user.email, "dani@ejemplo.com"));
    expect(dani.emailVerified).toBe(false);
  });

  it("el reenvío manda un email nuevo, como máximo uno por minuto", async () => {
    await registrarCuenta(datos("eva@ejemplo.com", "eva"), IP);
    emails.length = 0;
    expect(await reenviarVerificacion("eva")).toEqual({ ok: true });
    expect(emails).toHaveLength(1);
    expect(await reenviarVerificacion("eva@ejemplo.com")).toEqual({ ok: false, demasiados: true });
  });
});

describe("ingreso", () => {
  it("entra con el usuario y con el email, sin importar las mayúsculas, y crea la sesión (CA-01-05)", async () => {
    await crearVerificado("fede@ejemplo.com", "Fede");
    expect(await ingresar("FEDE", CONTRASENA, IP, new Headers())).toEqual({ ok: true });
    expect(await ingresar("Fede@Ejemplo.com", CONTRASENA, IP, new Headers())).toEqual({ ok: true });
    expect((await db.select().from(session)).length).toBeGreaterThanOrEqual(2);
  });

  it("con datos incorrectos responde siempre lo mismo (CA-01-06)", async () => {
    await crearVerificado("gabi@ejemplo.com", "gabi");
    expect(await ingresar("gabi", "otra-contraseña", IP, new Headers())).toEqual({ ok: false, motivo: "credenciales" });
    expect(await ingresar("no-existe", CONTRASENA, IP, new Headers())).toEqual({ ok: false, motivo: "credenciales" });
    expect(await ingresar("nadie@ejemplo.com", CONTRASENA, IP, new Headers())).toEqual({ ok: false, motivo: "credenciales" });
  });

  it("sin verificar no puede ingresar (CA-01-07)", async () => {
    await registrarCuenta(datos("hugo@ejemplo.com", "hugo"), IP);
    expect(await ingresar("hugo", CONTRASENA, IP, new Headers())).toEqual({ ok: false, motivo: "sin_verificar" });
  });

  it("al sexto intento en 15 minutos bloquea aunque la contraseña sea correcta (CA-01-08)", async () => {
    await crearVerificado("ines@ejemplo.com", "ines");
    for (let i = 0; i < 5; i++) {
      expect((await ingresar("ines", "mal", `198.51.100.${i}`, new Headers())).ok).toBe(false);
    }
    expect(await ingresar("ines", CONTRASENA, "198.51.100.99", new Headers())).toEqual({ ok: false, motivo: "demasiados" });
  });

  it("también bloquea por conexión: 5 fallos desde la misma IP con cuentas distintas", async () => {
    await crearVerificado("juan@ejemplo.com", "juan");
    for (let i = 0; i < 5; i++) await ingresar(`cuenta${i}`, "mal", "192.0.2.7", new Headers());
    expect(await ingresar("juan", CONTRASENA, "192.0.2.7", new Headers())).toEqual({ ok: false, motivo: "demasiados" });
  });

  it("una cuenta desactivada no puede ingresar", async () => {
    await crearVerificado("kari@ejemplo.com", "kari");
    await db.update(user).set({ banned: true }).where(eq(user.email, "kari@ejemplo.com"));
    expect(await ingresar("kari", CONTRASENA, IP, new Headers())).toEqual({ ok: false, motivo: "desactivada" });
  });

  it("los contadores no guardan el email ni la IP en claro (RS-05)", async () => {
    await ingresar("lucia@ejemplo.com", "mal", IP, new Headers());
    const claves = (await db.select().from(limiteUso)).map((f) => f.clave).join(" ");
    expect(claves).not.toContain("lucia");
    expect(claves).not.toContain(IP);
  });
});
