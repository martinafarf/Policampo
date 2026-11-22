// Tests de la administración (especificación 01, T6): CA-01-19, 20 y 21, y auditoría M-08.
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { eventoSeguridad, limiteUso, session, user } from "@/db/schema";
import {
  crearOAscenderAdministrador,
  desactivarCuenta,
  listarUsuarios,
  reactivarCuenta,
  USUARIOS_POR_PAGINA,
} from "@/lib/administracion";
import { auth, URL_DEL_SITIO } from "@/lib/auth";
import { ingresar, registrarCuenta } from "@/lib/cuentas";

const CONTRASENA = "Quebrada-Huma-2026!";
const IP = "203.0.113.50";
vi.spyOn(console, "info").mockImplementation(() => {}); // emails simulados

async function crearCuenta(email: string, usuario: string): Promise<string> {
  await registrarCuenta({ email, usuario, contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true }, IP);
  const [fila] = await db.update(user).set({ emailVerified: true }).where(eq(user.email, email)).returning({ id: user.id });
  return fila.id;
}

async function crearAdmin(email: string, usuario: string): Promise<string> {
  const id = await crearCuenta(email, usuario);
  await crearOAscenderAdministrador({ email });
  return id;
}

async function iniciarSesion(usuario: string): Promise<Headers> {
  const { headers } = await auth.api.signInUsername({ body: { username: usuario, password: CONTRASENA }, returnHeaders: true });
  return new Headers({ cookie: headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") });
}

async function estaDesactivada(id: string): Promise<boolean> {
  const [fila] = await db.select({ banned: user.banned }).from(user).where(eq(user.id, id));
  return Boolean(fila?.banned);
}

beforeEach(async () => {
  await db.delete(user);
  await db.delete(limiteUso);
  await db.delete(eventoSeguridad);
});

describe("comando crear-admin (CA-01-20)", () => {
  it("crea un administrador verificado que puede ingresar", async () => {
    const resultado = await crearOAscenderAdministrador({ email: " Admin@Ejemplo.com ", usuario: "Admin_Campo", contrasena: CONTRASENA });
    expect(resultado).toEqual({ ok: true, accion: "creado" });
    const [fila] = await db.select().from(user).where(eq(user.email, "admin@ejemplo.com"));
    expect(fila).toMatchObject({ role: "administrador", emailVerified: true, username: "admin_campo", displayUsername: "Admin_Campo" });
    expect((await ingresar("admin_campo", CONTRASENA, IP, new Headers())).ok).toBe(true);
  });

  it("asciende una cuenta existente, y avisa si ya era administrador", async () => {
    await crearCuenta("ana@ejemplo.com", "ana");
    expect(await crearOAscenderAdministrador({ email: "ANA@ejemplo.com" })).toEqual({ ok: true, accion: "ascendido" });
    expect(await crearOAscenderAdministrador({ email: "ana@ejemplo.com" })).toEqual({ ok: true, accion: "ya_era" });
    const [fila] = await db.select({ role: user.role }).from(user).where(eq(user.email, "ana@ejemplo.com"));
    expect(fila.role).toBe("administrador");
  });

  it("valida el usuario y la contraseña de una cuenta nueva", async () => {
    expect(await crearOAscenderAdministrador({ email: "a@ejemplo.com", usuario: "admin", contrasena: CONTRASENA })).toMatchObject({ ok: false });
    expect(await crearOAscenderAdministrador({ email: "a@ejemplo.com", usuario: "beto", contrasena: "corta" })).toMatchObject({ ok: false });
    await crearCuenta("carla@ejemplo.com", "carla");
    expect(await crearOAscenderAdministrador({ email: "b@ejemplo.com", usuario: "CARLA", contrasena: CONTRASENA })).toEqual({
      ok: false,
      error: "Ese nombre de usuario ya está en uso.",
    });
    expect(await db.select().from(user).where(eq(user.role, "administrador"))).toHaveLength(0);
  });
});

describe("lista de usuarios (CA-01-20 y 21)", () => {
  it("nunca incluye hashes ni tokens: solo las columnas de la tabla", async () => {
    await crearCuenta("dani@ejemplo.com", "Dani");
    const { filas } = await listarUsuarios({});
    expect(Object.keys(filas[0]).sort()).toEqual(["desactivada", "email", "id", "registradoEn", "rol", "usuario", "verificado"]);
    expect(filas[0]).toMatchObject({ usuario: "Dani", email: "dani@ejemplo.com", verificado: true, rol: "usuario", desactivada: false });
  });

  it("busca por usuario o email sin mayúsculas, y pagina de a 20", async () => {
    const ahora = Date.now();
    await db.insert(user).values(
      Array.from({ length: 25 }, (_, i) => ({
        id: `u${i}`,
        name: `productor${i}`,
        username: `productor${i}`,
        email: `p${i}@finca.com`,
        emailVerified: true,
        createdAt: new Date(ahora - i * 1000),
        updatedAt: new Date(ahora),
      })),
    );
    await crearCuenta("eva_x@otra.com", "eva_x");

    const primera = await listarUsuarios({ pagina: 1 });
    expect(primera).toMatchObject({ total: 26, paginas: 2, pagina: 1 });
    expect(primera.filas).toHaveLength(USUARIOS_POR_PAGINA);
    expect((await listarUsuarios({ pagina: 2 })).filas).toHaveLength(6);
    expect((await listarUsuarios({ pagina: 99 })).pagina).toBe(2); // una página que no existe lleva a la última

    expect((await listarUsuarios({ busqueda: "PRODUCTOR1" })).total).toBe(11); // productor1 y productor10 a 19
    expect((await listarUsuarios({ busqueda: "OTRA.COM" })).filas.map((f) => f.usuario)).toEqual(["eva_x"]);
    // "_" y "%" se buscan como texto, no como comodines
    expect((await listarUsuarios({ busqueda: "a_x" })).total).toBe(1);
    expect((await listarUsuarios({ busqueda: "%" })).total).toBe(0);
  });
});

describe("desactivar y reactivar cuentas (CA-01-20, M-08)", () => {
  it("desactivar cierra las sesiones e impide ingresar; reactivar lo devuelve; queda quién lo hizo", async () => {
    const adminId = await crearAdmin("admin@ejemplo.com", "jefa");
    const id = await crearCuenta("fede@ejemplo.com", "fede");
    await iniciarSesion("fede");
    const admin = await iniciarSesion("jefa");

    expect(await desactivarCuenta(adminId, id, admin)).toEqual({ ok: true });
    expect(await estaDesactivada(id)).toBe(true);
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect(await ingresar("fede", CONTRASENA, IP, new Headers())).toEqual({ ok: false, motivo: "desactivada" });

    expect(await reactivarCuenta(adminId, id, admin)).toEqual({ ok: true });
    expect((await ingresar("fede", CONTRASENA, IP, new Headers())).ok).toBe(true);

    const eventos = await db
      .select({ tipo: eventoSeguridad.tipo })
      .from(eventoSeguridad)
      .where(and(eq(eventoSeguridad.usuarioId, id), eq(eventoSeguridad.actorId, adminId)));
    expect(eventos.map((e) => e.tipo).sort()).toEqual(["cuenta_desactivada", "cuenta_reactivada"]);
  });

  it("nadie se desactiva a sí mismo ni desactiva a otro administrador", async () => {
    const adminId = await crearAdmin("admin@ejemplo.com", "jefa");
    const otroAdminId = await crearAdmin("admin2@ejemplo.com", "jefe");
    const admin = await iniciarSesion("jefa");
    expect(await desactivarCuenta(adminId, adminId, admin)).toMatchObject({ ok: false, error: expect.stringMatching(/propia/) });
    expect(await desactivarCuenta(adminId, otroAdminId, admin)).toMatchObject({ ok: false, error: expect.stringMatching(/administrador/) });
    expect(await estaDesactivada(otroAdminId)).toBe(false);
  });

  it("ni llamando directo a la API de Better Auth: las rutas de administración responden 404", async () => {
    await crearAdmin("admin@ejemplo.com", "jefa");
    const otroAdminId = await crearAdmin("admin2@ejemplo.com", "jefe");
    const admin = await iniciarSesion("jefa");
    for (const [ruta, cuerpo] of [
      ["/admin/ban-user", { userId: otroAdminId }],
      ["/admin/revoke-user-sessions", { userId: otroAdminId }],
      ["/admin/set-role", { userId: otroAdminId, role: "usuario" }],
      ["/admin/list-users", {}],
    ] as const) {
      const respuesta = await auth.handler(
        new Request(`${URL_DEL_SITIO}/api/auth${ruta}`, {
          method: "POST",
          headers: { cookie: admin.get("cookie") ?? "", "content-type": "application/json", origin: URL_DEL_SITIO },
          body: JSON.stringify(cuerpo),
        }),
      );
      expect(respuesta.status).toBe(404);
    }
    expect(await estaDesactivada(otroAdminId)).toBe(false);
  });

  it("un usuario común no puede desactivar a nadie (CA-01-19)", async () => {
    const comunId = await crearCuenta("gabi@ejemplo.com", "gabi");
    const otraId = await crearCuenta("hugo@ejemplo.com", "hugo");
    const comun = await iniciarSesion("gabi");
    expect(await desactivarCuenta(comunId, otraId, comun)).toMatchObject({ ok: false });
    expect(await estaDesactivada(otraId)).toBe(false);
  });
});
