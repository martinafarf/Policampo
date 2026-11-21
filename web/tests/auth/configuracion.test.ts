// Tests de la base de autenticación (especificación 01, tarea T1).
// Cubren CA-01-03 (no se puede crear un administrador desde el registro) y CA-01-09 (sesión y
// cookies), más los orígenes confiables sin comodines (auditoría M-09).
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Los emails se simulan en la consola: se silencian para que no ensucien la salida.
vi.spyOn(console, "info").mockImplementation(() => {});

const CONTRASENA = "Quebrada-Huma-2026!";
const TREINTA_DIAS = 30 * 24 * 60 * 60;

async function cargarAuth() {
  const { auth } = await import("@/lib/auth");
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  return { auth, db, schema };
}

async function vaciarUsuarios() {
  const { db, schema } = await cargarAuth();
  await db.delete(schema.user); // borra en cascada sesiones y cuentas
}

describe("Registro (CA-01-03)", () => {
  beforeEach(vaciarUsuarios);

  it("crea la cuenta con rol usuario, sin verificar", async () => {
    const { auth, db, schema } = await cargarAuth();
    await auth.api.signUpEmail({
      body: { email: "ana@ejemplo.com", password: CONTRASENA, name: "ana", username: "ana" },
    });
    const [ana] = await db.select().from(schema.user).where(eq(schema.user.email, "ana@ejemplo.com"));
    expect(ana.role).toBe("usuario");
    expect(ana.emailVerified).toBe(false);
    expect(ana.username).toBe("ana");
  });

  it("no permite crear un administrador aunque se envíe el rol en la petición", async () => {
    const { auth, db, schema } = await cargarAuth();
    const cuerpo = {
      email: "beto@ejemplo.com",
      password: CONTRASENA,
      name: "beto",
      username: "beto",
      role: "administrador",
    };
    // Better Auth rechaza el pedido (400, FIELD_NOT_ALLOWED) y no crea la cuenta.
    await expect(auth.api.signUpEmail({ body: cuerpo as never })).rejects.toMatchObject({
      statusCode: 400,
      body: { code: "FIELD_NOT_ALLOWED" },
    });
    const filas = await db.select().from(schema.user).where(eq(schema.user.email, "beto@ejemplo.com"));
    expect(filas).toHaveLength(0);
  });

  it("rechaza nombres de usuario reservados o con caracteres no permitidos", async () => {
    const { auth } = await cargarAuth();
    for (const nombre of ["admin", "PoliCampo", "con espacio", "a@b", "ñandú"]) {
      await expect(
        auth.api.signUpEmail({
          body: { email: `x${Math.random()}@ejemplo.com`, password: CONTRASENA, name: nombre, username: nombre },
        }),
        nombre,
      ).rejects.toThrow();
    }
  });
});

describe("Sesión y cookies (CA-01-09)", () => {
  beforeEach(vaciarUsuarios);

  it("la sesión dura 30 días y se renueva una vez por día", async () => {
    const { auth } = await cargarAuth();
    expect(auth.options.session?.expiresIn).toBe(TREINTA_DIAS);
    expect(auth.options.session?.updateAge).toBe(24 * 60 * 60);
  });

  it("un usuario verificado ingresa y recibe una cookie HttpOnly, SameSite=Lax, de 30 días", async () => {
    const { auth, db, schema } = await cargarAuth();
    await auth.api.signUpEmail({
      body: { email: "carla@ejemplo.com", password: CONTRASENA, name: "carla", username: "carla" },
    });
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, "carla@ejemplo.com"));

    const respuesta = await auth.api.signInUsername({
      body: { username: "carla", password: CONTRASENA },
      asResponse: true,
    });
    expect(respuesta.status).toBe(200);
    const cookie = respuesta.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/session_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(new RegExp(`Max-Age=${TREINTA_DIAS}`));
  });

  it("un usuario sin verificar no puede ingresar (CA-01-07)", async () => {
    const { auth } = await cargarAuth();
    await auth.api.signUpEmail({
      body: { email: "dani@ejemplo.com", password: CONTRASENA, name: "dani", username: "dani" },
    });
    await expect(
      auth.api.signInEmail({ body: { email: "dani@ejemplo.com", password: CONTRASENA } }),
    ).rejects.toThrow();
  });
});

describe("Cookies seguras y orígenes confiables (CA-01-09, auditoría M-09)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("en producción (https) las cookies son Secure", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://policampo.vercel.app");
    vi.resetModules();
    const { auth } = await cargarAuth();
    expect(auth.options.advanced?.useSecureCookies).toBe(true);
  });

  it("los orígenes confiables son URLs exactas, sin comodines", async () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://policampo.vercel.app");
    vi.stubEnv("VERCEL_URL", "policampo-abc123-martina-a168.vercel.app");
    vi.resetModules();
    const { auth } = await cargarAuth();
    const origenes = auth.options.trustedOrigins as string[];
    expect(origenes).toContain("https://policampo.vercel.app");
    expect(origenes).toContain("https://policampo-abc123-martina-a168.vercel.app");
    for (const origen of origenes) expect(origen).not.toContain("*");
  });
});
