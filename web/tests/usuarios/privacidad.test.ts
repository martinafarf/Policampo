// Tests de la política de privacidad y su consentimiento (especificación 01, T7): CA-01-22 y la
// sección 8 ("si cambia la versión, se pide aceptar la nueva al ingresar").
import { eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaginaPrivacidad from "@/app/privacidad/page";
import { db } from "@/db";
import { eventoSeguridad, limiteUso, user } from "@/db/schema";
import { crearOAscenderAdministrador } from "@/lib/administracion";
import { aceptarPolitica } from "@/lib/consentimiento";
import { registrarCuenta } from "@/lib/cuentas";
import { POLITICA_PRIVACIDAD_VERSION, politicaVigenteAceptada } from "@/lib/privacidad";

const CONTRASENA = "Quebrada-Huma-2026!";
vi.spyOn(console, "info").mockImplementation(() => {});

async function versionAceptada(email: string) {
  const [fila] = await db
    .select({ version: user.politicaPrivacidadVersion, fecha: user.politicaPrivacidadAceptadaEn })
    .from(user)
    .where(eq(user.email, email));
  return fila;
}

beforeEach(async () => {
  await db.delete(user);
  await db.delete(limiteUso);
  await db.delete(eventoSeguridad);
});

describe("página /privacidad (CA-01-22)", () => {
  it("muestra la versión vigente, los servicios con su país y el email de contacto", () => {
    vi.stubEnv("EMAIL_CONTACTO", "contacto@ejemplo.com");
    const html = renderToStaticMarkup(PaginaPrivacidad());
    expect(html).toContain(`Versión ${POLITICA_PRIVACIDAD_VERSION}`);
    for (const servicio of ["Neon", "Vercel", "Resend", "Esri"]) expect(html).toContain(servicio);
    expect(html).toContain("mailto:contacto@ejemplo.com");
    expect(html).toContain("Cuando eliminás tu cuenta");
    vi.unstubAllEnvs();
  });

  it("sin EMAIL_CONTACTO no muestra un enlace vacío", () => {
    vi.stubEnv("EMAIL_CONTACTO", "");
    expect(renderToStaticMarkup(PaginaPrivacidad())).not.toContain("mailto:");
    vi.unstubAllEnvs();
  });
});

describe("consentimiento (sección 8)", () => {
  it("solo cuenta como aceptada la versión vigente", () => {
    expect(politicaVigenteAceptada(POLITICA_PRIVACIDAD_VERSION)).toBe(true);
    expect(politicaVigenteAceptada("1")).toBe(false);
    expect(politicaVigenteAceptada(null)).toBe(false);
    expect(politicaVigenteAceptada(undefined)).toBe(false);
  });

  it("el registro guarda la versión vigente", async () => {
    await registrarCuenta(
      { email: "ana@ejemplo.com", usuario: "ana", contrasena: CONTRASENA, repetirContrasena: CONTRASENA, aceptaPrivacidad: true },
      "203.0.113.60",
    );
    expect((await versionAceptada("ana@ejemplo.com")).version).toBe(POLITICA_PRIVACIDAD_VERSION);
  });

  it("una cuenta sin consentimiento (creada con crear-admin) o con la versión vieja lo tiene que aceptar; al aceptar se guarda versión y fecha", async () => {
    await crearOAscenderAdministrador({ email: "jefa@ejemplo.com", usuario: "jefa", contrasena: CONTRASENA });
    const sinConsentimiento = await versionAceptada("jefa@ejemplo.com");
    expect(politicaVigenteAceptada(sinConsentimiento.version)).toBe(false);

    await db.update(user).set({ politicaPrivacidadVersion: "1" }).where(eq(user.email, "jefa@ejemplo.com"));
    expect(politicaVigenteAceptada((await versionAceptada("jefa@ejemplo.com")).version)).toBe(false);

    const [{ id }] = await db.select({ id: user.id }).from(user).where(eq(user.email, "jefa@ejemplo.com"));
    await aceptarPolitica(id);
    const aceptada = await versionAceptada("jefa@ejemplo.com");
    expect(aceptada.version).toBe(POLITICA_PRIVACIDAD_VERSION);
    expect(aceptada.fecha).toBeInstanceOf(Date);
    const [evento] = await db.select().from(eventoSeguridad).where(eq(eventoSeguridad.tipo, "politica_aceptada"));
    expect(evento).toMatchObject({ usuarioId: id, detalle: { version: POLITICA_PRIVACIDAD_VERSION } });
  });
});
