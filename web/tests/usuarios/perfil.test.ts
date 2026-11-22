// Tests del perfil (especificación 01, T5): CA-01-14 a CA-01-17, y las rutas de Better Auth
// cerradas al público. Se simula solo el envío (nodemailer), para saber a qué dirección va cada email.
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type EmailEnviado = { to: string; subject: string; text: string };
const enviados: EmailEnviado[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (email: EmailEnviado) => {
        enviados.push(email);
      },
    }),
  },
}));
vi.stubEnv("GMAIL_USUARIO", "policampo@ejemplo.com");
vi.stubEnv("GMAIL_CLAVE_APP", "clave-de-prueba");

const { db } = await import("@/db");
const { account, establecimiento, eventoSeguridad, limiteUso, session, user, verification } = await import("@/db/schema");
const { auth, URL_DEL_SITIO } = await import("@/lib/auth");
const { ingresar, pedirRecuperacion, registrarCuenta } = await import("@/lib/cuentas");
const { actualizarNombre, cambiarContrasena, datosDelPerfil, eliminarCuenta, pedirCambioEmail } = await import("@/lib/perfil");

const CONTRASENA = "Quebrada-Huma-2026!";
const NUEVA = "Yungas-Floridas-2027!";
const IP = "203.0.113.40";

/** Crea una cuenta verificada y devuelve su id. */
async function crearCuenta(email: string, usuario: string): Promise<string> {
  await registrarCuenta({ email, usuario, contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true }, IP);
  const [fila] = await db.update(user).set({ emailVerified: true }).where(eq(user.email, email)).returning({ id: user.id });
  return fila.id;
}

/** Inicia sesión y devuelve los encabezados con la cookie, como los mandaría el navegador. */
async function iniciarSesion(usuario: string, contrasena = CONTRASENA): Promise<Headers> {
  const { headers } = await auth.api.signInUsername({ body: { username: usuario, password: contrasena }, returnHeaders: true });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

function ultimoEmailPara(direccion: string): EmailEnviado | undefined {
  return enviados.findLast((e) => e.to === direccion);
}

function enlaceDe(email: EmailEnviado | undefined): string {
  const enlace = email?.text.match(/https?:\/\/\S+/)?.[0];
  if (!enlace) throw new Error("El email no tiene enlace");
  return enlace;
}

/** Un pedido desde afuera a la API de Better Auth, como lo haría un navegador o un script. */
function pedidoExterno(ruta: string, cookie: Headers, cuerpo: unknown): Request {
  return new Request(`${URL_DEL_SITIO}/api/auth${ruta}`, {
    method: "POST",
    headers: { cookie: cookie.get("cookie") ?? "", "content-type": "application/json", origin: URL_DEL_SITIO },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(async () => {
  enviados.length = 0;
  await db.delete(user);
  await db.delete(limiteUso);
  await db.delete(verification);
  await db.delete(eventoSeguridad);
});

describe("nombre y apellido (CA-01-14)", () => {
  it("cambia nombre y apellido, y valida largo y etiquetas HTML", async () => {
    const id = await crearCuenta("ana@ejemplo.com", "ana");
    expect(await actualizarNombre(id, { nombre: "  Ana  María ", apellido: "Quispe" })).toEqual({ ok: true });
    expect(await datosDelPerfil(id)).toMatchObject({ usuario: "ana", nombre: "Ana María", apellido: "Quispe" });

    expect(await actualizarNombre(id, { nombre: "a".repeat(61), apellido: "<b>Quispe</b>" })).toEqual({
      ok: false,
      errores: { nombre: expect.stringMatching(/60/), apellido: expect.stringMatching(/</) },
    });
    // Vacíos se guardan como null y se vuelve a mostrar el nombre de usuario
    await actualizarNombre(id, { nombre: "", apellido: " " });
    const [fila] = await db.select({ nombre: user.nombre, apellido: user.apellido }).from(user).where(eq(user.id, id));
    expect(fila).toEqual({ nombre: null, apellido: null });
  });

  it("el nombre de usuario no se puede cambiar, ni mandándolo directo a la API de Better Auth", async () => {
    const id = await crearCuenta("beto@ejemplo.com", "beto");
    const cookie = await iniciarSesion("beto");
    const respuesta = await auth.handler(pedidoExterno("/update-user", cookie, { username: "otro", name: "otro" }));
    expect(respuesta.status).toBe(404);
    expect(await datosDelPerfil(id)).toMatchObject({ usuario: "beto" });
  });
});

describe("rutas de Better Auth cerradas al público", () => {
  it("change-password, change-email y delete-user responden 404 desde afuera", async () => {
    const id = await crearCuenta("caro@ejemplo.com", "caro");
    const cookie = await iniciarSesion("caro");
    for (const [ruta, cuerpo] of [
      ["/change-password", { currentPassword: CONTRASENA, newPassword: NUEVA }],
      ["/change-email", { newEmail: "otra@ejemplo.com" }],
      ["/delete-user", {}],
    ] as const) {
      expect((await auth.handler(pedidoExterno(ruta, cookie, cuerpo))).status).toBe(404);
    }
    expect(await datosDelPerfil(id)).toMatchObject({ email: "caro@ejemplo.com" });
  });
});

describe("cambiar la contraseña (CA-01-15)", () => {
  it("exige la actual, cierra las otras sesiones, deja activa la actual y avisa por email", async () => {
    const id = await crearCuenta("dani@ejemplo.com", "dani");
    await iniciarSesion("dani"); // otro dispositivo
    const aca = await iniciarSesion("dani");
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(2);

    const sinActual = await cambiarContrasena(id, { actual: "equivocada", contrasena: NUEVA, repetirContrasena: NUEVA }, aca);
    expect(sinActual).toEqual({ ok: false, errores: { actual: "La contraseña actual no es correcta." } });

    expect(await cambiarContrasena(id, { actual: CONTRASENA, contrasena: NUEVA, repetirContrasena: NUEVA }, aca)).toEqual({ ok: true });
    // Queda una sola sesión, y es la de este dispositivo: sigue valiendo la misma cookie
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(1);
    expect(await auth.api.getSession({ headers: aca })).toMatchObject({ user: { id } });
    expect(ultimoEmailPara("dani@ejemplo.com")?.subject).toContain("se cambió");
    expect((await ingresar("dani", NUEVA, IP, new Headers())).ok).toBe(true);
  });

  it("aplica las reglas de la contraseña y limita los intentos con la actual equivocada", async () => {
    const id = await crearCuenta("eva@ejemplo.com", "eva_campo");
    const cookie = await iniciarSesion("eva_campo");
    const igualAlUsuario = await cambiarContrasena(id, { actual: CONTRASENA, contrasena: "EVA_CAMPO", repetirContrasena: "EVA_CAMPO" }, cookie);
    expect(igualAlUsuario).toMatchObject({ ok: false, errores: { contrasena: expect.stringMatching(/usuario/) } });

    for (let i = 0; i < 5; i++) await cambiarContrasena(id, { actual: "mal", contrasena: NUEVA, repetirContrasena: NUEVA }, cookie);
    // Al sexto intento, ni la contraseña correcta pasa
    const bloqueado = await cambiarContrasena(id, { actual: CONTRASENA, contrasena: NUEVA, repetirContrasena: NUEVA }, cookie);
    expect(bloqueado).toMatchObject({ ok: false, general: expect.stringMatching(/Demasiados/) });
  });
});

describe("cambiar el email (CA-01-16)", () => {
  it("exige la contraseña, cambia recién al confirmar desde el email nuevo y avisa al anterior", async () => {
    const id = await crearCuenta("fede@ejemplo.com", "fede");
    await crearCuenta("ocupado@ejemplo.com", "ocupado");
    const cookie = await iniciarSesion("fede");

    expect(await pedirCambioEmail(id, { email: "fede.nuevo@ejemplo.com", contrasena: "mal" }, cookie)).toEqual({
      ok: false,
      errores: { contrasena: "La contraseña actual no es correcta." },
    });
    expect(await pedirCambioEmail(id, { email: "OCUPADO@ejemplo.com", contrasena: CONTRASENA }, cookie)).toMatchObject({
      ok: false,
      errores: { email: expect.stringMatching(/registrado/) },
    });

    enviados.length = 0;
    expect(await pedirCambioEmail(id, { email: " Fede.Nuevo@Ejemplo.com ", contrasena: CONTRASENA }, cookie)).toEqual({
      ok: true,
      emailNuevo: "fede.nuevo@ejemplo.com",
    });
    // Hasta confirmar, el email sigue siendo el anterior; el enlace fue al NUEVO
    expect(await datosDelPerfil(id)).toMatchObject({ email: "fede@ejemplo.com" });
    const confirmacion = ultimoEmailPara("fede.nuevo@ejemplo.com");
    expect(confirmacion?.subject).toContain("email nuevo");
    expect(ultimoEmailPara("fede@ejemplo.com")).toBeUndefined();

    // Se abre el enlace (como desde el celular, sin sesión)
    const respuesta = await auth.handler(new Request(enlaceDe(confirmacion)));
    expect(respuesta.status).toBe(302);
    expect(respuesta.headers.get("location")).toBe("/perfil?email=cambiado");
    expect(await datosDelPerfil(id)).toMatchObject({ email: "fede.nuevo@ejemplo.com" });
    expect(ultimoEmailPara("fede@ejemplo.com")?.subject).toContain("email de tu cuenta cambió");
    // Ingresa con el email nuevo
    expect((await ingresar("fede.nuevo@ejemplo.com", CONTRASENA, IP, new Headers())).ok).toBe(true);
  });

  it("no acepta el mismo email ni uno inválido", async () => {
    const id = await crearCuenta("gabi@ejemplo.com", "gabi");
    const cookie = await iniciarSesion("gabi");
    expect(await pedirCambioEmail(id, { email: "GABI@ejemplo.com", contrasena: CONTRASENA }, cookie)).toMatchObject({ ok: false });
    expect(await pedirCambioEmail(id, { email: "no-es-email", contrasena: CONTRASENA }, cookie)).toMatchObject({ ok: false });
    expect(enviados.filter((e) => e.subject.includes("email nuevo"))).toHaveLength(0);
  });
});

describe("eliminar la cuenta (CA-01-17)", () => {
  it("exige la contraseña y escribir ELIMINAR; después no queda nada de la cuenta", async () => {
    const id = await crearCuenta("hugo@ejemplo.com", "hugo");
    const otra = await crearCuenta("ines@ejemplo.com", "ines"); // otra cuenta: no se toca
    const cookie = await iniciarSesion("hugo");
    // Datos asociados: una finca y un enlace de recuperación pendiente
    await db.insert(establecimiento).values({
      usuarioId: id,
      nombre: "La Esperanza",
      direccion: "Ruta 9 km 1800",
      departamento: "Tilcara",
      localidad: "Maimará",
      ecorregion: "quebrada_de_humahuaca",
      metodoCaracterizacion: "cuestionario",
      superficieTotalHa: "2.5",
    });
    await pedirRecuperacion("hugo@ejemplo.com", IP);
    expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(1);

    expect(await eliminarCuenta(id, { contrasena: CONTRASENA, confirmacion: "eliminar" }, cookie)).toMatchObject({
      ok: false,
      errores: { confirmacion: expect.any(String) },
    });
    expect(await eliminarCuenta(id, { contrasena: "mal", confirmacion: "ELIMINAR" }, cookie)).toMatchObject({
      ok: false,
      errores: { contrasena: expect.any(String) },
    });
    expect(await datosDelPerfil(id)).not.toBeNull();

    expect(await eliminarCuenta(id, { contrasena: CONTRASENA, confirmacion: " ELIMINAR " }, cookie)).toEqual({ ok: true });
    expect(await db.select().from(user).where(eq(user.id, id))).toHaveLength(0);
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    expect(await db.select().from(account).where(eq(account.userId, id))).toHaveLength(0);
    expect(await db.select().from(verification).where(eq(verification.value, id))).toHaveLength(0);
    expect(await db.select().from(establecimiento).where(eq(establecimiento.usuarioId, id))).toHaveLength(0);
    expect(ultimoEmailPara("hugo@ejemplo.com")?.subject).toContain("eliminada");
    expect(await ingresar("hugo", CONTRASENA, "198.51.100.60", new Headers())).toEqual({ ok: false, motivo: "credenciales" });
    // La otra cuenta sigue intacta
    expect(await datosDelPerfil(otra)).toMatchObject({ usuario: "ines" });
  });
});
