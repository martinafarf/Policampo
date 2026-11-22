// Limpieza diaria de datos vencidos: registro de seguridad a los 90 días, contadores, enlaces y
// sesiones vencidos. También que la ruta del cron exige el secreto.
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/limpieza/route";
import { db } from "@/db";
import { eventoSeguridad, limiteUso, rateLimit, session, user, verification } from "@/db/schema";
import { limpiarDatosVencidos } from "@/lib/limpieza";

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.spyOn(console, "info").mockImplementation(() => {});

const DIA = 24 * 60 * 60 * 1000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA);

beforeEach(async () => {
  await db.delete(user);
  await db.delete(eventoSeguridad);
  await db.delete(limiteUso);
  await db.delete(rateLimit);
  await db.delete(verification);
});

describe("limpieza diaria", () => {
  it("borra solo lo vencido", async () => {
    await db.insert(user).values({ id: "u1", name: "ana", email: "ana@ejemplo.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
    await db.insert(eventoSeguridad).values([
      { tipo: "ingreso", usuarioId: "u1", fecha: hace(91) },
      { tipo: "ingreso", usuarioId: "u1", fecha: hace(89) },
    ]);
    await db.insert(limiteUso).values([
      { clave: "vieja", ventanaInicio: hace(3), cantidad: 1 },
      { clave: "actual", ventanaInicio: new Date(), cantidad: 1 },
    ]);
    await db.insert(rateLimit).values([
      { id: "r1", key: "vieja", count: 1, lastRequest: hace(3).getTime() },
      { id: "r2", key: "actual", count: 1, lastRequest: Date.now() },
    ]);
    await db.insert(verification).values([
      { id: "v1", identifier: "vencido", value: "u1", expiresAt: hace(1) },
      { id: "v2", identifier: "vigente", value: "u1", expiresAt: new Date(Date.now() + DIA) },
    ]);
    await db.insert(session).values([
      { id: "s1", token: "vencida", userId: "u1", expiresAt: hace(1), createdAt: hace(31), updatedAt: hace(31) },
      { id: "s2", token: "vigente", userId: "u1", expiresAt: new Date(Date.now() + DIA), createdAt: new Date(), updatedAt: new Date() },
    ]);

    expect(await limpiarDatosVencidos()).toEqual({ eventos: 1, contadores: 1, limitesBetterAuth: 1, enlaces: 1, sesiones: 1 });
    const [{ eventos }] = await db.select({ eventos: sql<number>`count(*)::int` }).from(eventoSeguridad);
    expect(eventos).toBe(1);
    expect((await db.select().from(session).where(eq(session.id, "s2"))).length).toBe(1);
    expect((await db.select().from(verification).where(eq(verification.id, "v2"))).length).toBe(1);
  });
});

describe("ruta del cron", () => {
  it("sin el secreto correcto responde 401 y no borra nada", async () => {
    vi.stubEnv("CRON_SECRET", "secreto-de-prueba-largo");
    await db.insert(eventoSeguridad).values({ tipo: "ingreso", fecha: hace(100) });
    expect((await GET(new Request("http://localhost/api/cron/limpieza"))).status).toBe(401);
    const malo = new Request("http://localhost/api/cron/limpieza", { headers: { authorization: "Bearer otro" } });
    expect((await GET(malo)).status).toBe(401);
    expect(await db.select().from(eventoSeguridad)).toHaveLength(1);

    const bueno = new Request("http://localhost/api/cron/limpieza", { headers: { authorization: "Bearer secreto-de-prueba-largo" } });
    const respuesta = await GET(bueno);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toMatchObject({ eventos: 1 });
    vi.unstubAllEnvs();
  });

  it("sin CRON_SECRET configurado, nunca se ejecuta", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const pedido = new Request("http://localhost/api/cron/limpieza", { headers: { authorization: "Bearer " } });
    expect((await GET(pedido)).status).toBe(401);
    vi.unstubAllEnvs();
  });
});
