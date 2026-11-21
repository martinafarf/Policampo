// Tests del envío de emails (especificación 01, tarea T2).
// Resend se reemplaza por un simulacro: ningún test manda emails reales ni necesita la clave.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enviar = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: enviar };
  },
}));

const EMAIL = { para: "ana@ejemplo.com", asunto: "Asunto", texto: "Texto", html: "<p>HTML</p>" };

async function cargar() {
  vi.resetModules();
  return import("@/lib/email");
}

describe("enviarEmail", () => {
  beforeEach(() => {
    enviar.mockReset();
    enviar.mockResolvedValue({ data: { id: "1" }, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("con clave, envía por Resend desde EMAIL_REMITENTE", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
    vi.stubEnv("EMAIL_REMITENTE", "PoliCampo <no-responder@policampo.com.ar>");
    const { enviarEmail } = await cargar();
    await enviarEmail(EMAIL);
    expect(enviar).toHaveBeenCalledWith({
      from: "PoliCampo <no-responder@policampo.com.ar>",
      to: "ana@ejemplo.com",
      subject: "Asunto",
      text: "Texto",
      html: "<p>HTML</p>",
    });
  });

  it("sin EMAIL_REMITENTE usa el remitente de prueba de Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
    vi.stubEnv("EMAIL_REMITENTE", "");
    const { enviarEmail } = await cargar();
    await enviarEmail(EMAIL);
    expect(enviar.mock.calls[0][0].from).toBe("PoliCampo <onboarding@resend.dev>");
  });

  it("si Resend falla, lanza un error sin registrar el destinatario ni el contenido", async () => {
    vi.stubEnv("RESEND_API_KEY", "clave-de-prueba");
    enviar.mockResolvedValue({ data: null, error: { name: "validation_error", message: "x" } });
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    const { enviarEmail } = await cargar();
    await expect(enviarEmail(EMAIL)).rejects.toThrow("No se pudo enviar el email");
    const logueado = registro.mock.calls.flat().join(" ");
    expect(logueado).not.toContain("ana@ejemplo.com");
    expect(logueado).not.toContain("Texto");
  });

  it("sin clave, en desarrollo simula el envío en la consola", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const consola = vi.spyOn(console, "info").mockImplementation(() => {});
    const { enviarEmail } = await cargar();
    await enviarEmail(EMAIL);
    expect(enviar).not.toHaveBeenCalled();
    expect(consola).toHaveBeenCalled();
  });

  it("sin clave, en producción falla en vez de perder el email", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const { enviarEmail } = await cargar();
    await expect(enviarEmail(EMAIL)).rejects.toThrow("RESEND_API_KEY");
    expect(enviar).not.toHaveBeenCalled();
  });
});
