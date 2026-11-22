// Regresión (encontrada probando la T4 en el navegador): si el email de AVISO "tu contraseña se
// cambió" falla, la contraseña igual queda cambiada y la persona tiene que ver que salió bien.
// Se simula solo el envío (nodemailer): rechaza el aviso y acepta el resto. Todo lo demás es el código real.
import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";

const enviados: { subject: string; text: string }[] = [];
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (email: { subject: string; text: string }) => {
        if (email.subject.includes("se cambió")) throw new Error("caído");
        enviados.push(email);
      },
    }),
  },
}));
vi.stubEnv("GMAIL_USUARIO", "policampo@ejemplo.com");
vi.stubEnv("GMAIL_CLAVE_APP", "clave-de-prueba");
vi.spyOn(console, "error").mockImplementation(() => {});

const { db } = await import("@/db");
const { limiteUso, user } = await import("@/db/schema");
const { crearNuevaContrasena, ingresar, pedirRecuperacion, registrarCuenta } = await import("@/lib/cuentas");

const CONTRASENA = "Quebrada-Huma-2026!";
const NUEVA = "Yungas-Floridas-2027!";
const IP = "203.0.113.30";

beforeEach(async () => {
  enviados.length = 0;
  await db.delete(user);
  await db.delete(limiteUso);
});

it("si falla el email de aviso, la contraseña igual se cambia y se informa que salió bien", async () => {
  await registrarCuenta(
    { email: "ana@ejemplo.com", usuario: "ana", contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true },
    IP,
  );
  await db.update(user).set({ emailVerified: true }).where(eq(user.email, "ana@ejemplo.com"));
  await pedirRecuperacion("ana@ejemplo.com", IP);
  const recuperacion = enviados.findLast((e) => e.subject.includes("contraseña nueva"));
  const enlace = recuperacion?.text.match(/https?:\/\/\S+/)?.[0] ?? "";
  const token = new URL(enlace).pathname.split("/").at(-1) ?? "";

  expect(await crearNuevaContrasena(token, NUEVA, NUEVA)).toEqual({ ok: true });
  expect((await ingresar("ana", NUEVA, IP, new Headers())).ok).toBe(true);
});
