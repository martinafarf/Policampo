// Tests del envío de emails (especificación 01, tarea T2).
// Gmail se reemplaza por un simulacro: ningún test manda emails reales ni necesita la clave.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enviar = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: enviar }) },
}));

const EMAIL = { para: "ana@ejemplo.com", asunto: "Asunto", texto: "Texto", html: "<p>HTML</p>" };

async function cargar() {
  vi.resetModules();
  return import("@/lib/email");
}

describe("enviarEmail", () => {
  beforeEach(() => {
    enviar.mockReset();
    enviar.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllEnvs());

  it("con clave, envía por Gmail desde la cuenta GMAIL_USUARIO", async () => {
    vi.stubEnv("GMAIL_USUARIO", "policampo@ejemplo.com");
    vi.stubEnv("GMAIL_CLAVE_APP", "clave-de-prueba");
    const { enviarEmail } = await cargar();
    await enviarEmail(EMAIL);
    expect(enviar).toHaveBeenCalledWith({
      from: "PoliCampo <policampo@ejemplo.com>",
      to: "ana@ejemplo.com",
      subject: "Asunto",
      text: "Texto",
      html: "<p>HTML</p>",
    });
  });

  it("si Gmail falla, lanza un error sin registrar el destinatario ni el contenido", async () => {
    vi.stubEnv("GMAIL_USUARIO", "policampo@ejemplo.com");
    vi.stubEnv("GMAIL_CLAVE_APP", "clave-de-prueba");
    enviar.mockRejectedValue(new Error("ana@ejemplo.com Texto"));
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { enviarEmail } = await cargar();
    await expect(enviarEmail(EMAIL)).rejects.toThrow("No se pudo enviar el email");
    const logueado = registro.mock.calls.flat().join(" ");
    expect(logueado).not.toContain("ana@ejemplo.com");
    expect(logueado).not.toContain("Texto");
  });

  it("sin clave, en desarrollo simula el envío en la consola", async () => {
    vi.stubEnv("GMAIL_CLAVE_APP", "");
    const consola = vi.spyOn(console, "info").mockImplementation(() => {});
    const { enviarEmail } = await cargar();
    await enviarEmail(EMAIL);
    expect(enviar).not.toHaveBeenCalled();
    expect(consola).toHaveBeenCalled();
  });

  it("sin clave, en producción falla en vez de perder el email", async () => {
    vi.stubEnv("GMAIL_CLAVE_APP", "");
    vi.stubEnv("NODE_ENV", "production");
    const { enviarEmail } = await cargar();
    await expect(enviarEmail(EMAIL)).rejects.toThrow("GMAIL_CLAVE_APP");
    expect(enviar).not.toHaveBeenCalled();
  });
});
