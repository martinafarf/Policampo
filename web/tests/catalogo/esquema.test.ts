// Tests de integración en PostgreSQL del esquema y datos iniciales del catálogo (Esp. 03, T1).
// Cubren CA-03-15, CA-03-20, RN-08, RN-12 y RN-13.
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  cambioCatalogo,
  compatibilidad,
  cultivo,
  cultivoEcorregion,
  plantaServicio,
  plantaServicioEcorregion,
  user,
} from "@/db/schema";

describe("Datos iniciales del catálogo por migración (CA-03-20)", () => {
  it("carga plantas, períodos, cultivos ampliados y compatibilidades todo en Borrador con su fuente", async () => {
    const plantas = await db.select().from(plantaServicio);
    const clavesPlantas = new Set(plantas.map((p) => p.clave));
    for (const esperada of [
      "calendula",
      "borraja",
      "vicia_villosa",
      "trebol_blanco",
      "albahaca",
      "lavanda",
      "romero",
      "mostaza_blanca",
      "hinojo",
      "perejil",
      "trigo_sarraceno",
    ]) {
      expect(clavesPlantas.has(esperada)).toBe(true);
    }

    // Todo entra en Borrador y con fuente (Guía vacía hasta que se publique algo)
    expect(plantas.every((p) => p.estado === "borrador")).toBe(true);
    expect(plantas.every((p) => Boolean(p.fuenteDetalle))).toBe(true);

    const periodosPlantas = await db.select().from(plantaServicioEcorregion);
    expect(periodosPlantas.length).toBeGreaterThanOrEqual(6);

    const periodosCultivos = await db.select().from(cultivoEcorregion);
    expect(periodosCultivos.length).toBeGreaterThanOrEqual(2);

    const compatibilidades = await db.select().from(compatibilidad);
    expect(compatibilidades.length).toBeGreaterThanOrEqual(4);
    expect(compatibilidades.every((c) => c.estado === "borrador")).toBe(true);
  });
});

describe("Restricciones del esquema del catálogo (RN-08, RN-12, RN-13, CA-03-15)", () => {
  it("rechaza planta sin disponibilidad local, compatibilidad fuera de [-5, 5] y borrado con compatibilidades", async () => {
    // RN-12: es_espontanea OR en_mercado_local
    await expect(
      db.insert(plantaServicio).values({
        clave: "planta_no_local",
        nombreComun: "Planta no local",
        funciones: ["atrae_polinizadores"],
        ciclo: "anual",
        esEspontanea: false,
        enMercadoLocal: false,
      }),
    ).rejects.toThrow();

    const [tomate] = await db.select().from(cultivo).where(eq(cultivo.clave, "tomate")).limit(1);
    const [hinojo] = await db
      .select()
      .from(plantaServicio)
      .where(eq(plantaServicio.clave, "hinojo"))
      .limit(1);

    // RN-08: grado fuera de -5..+5
    await expect(
      db.insert(compatibilidad).values({
        cultivoId: tomate.id,
        plantaId: hinojo.id,
        grado: 6,
        justificacion: "Justificación suficientemente larga para probar el rango.",
      }),
    ).rejects.toThrow();

    // ON DELETE RESTRICT: no se puede borrar una planta que tiene compatibilidades (calendula)
    const [calendula] = await db
      .select()
      .from(plantaServicio)
      .where(eq(plantaServicio.clave, "calendula"))
      .limit(1);

    await expect(
      db.delete(plantaServicio).where(eq(plantaServicio.id, calendula.id)),
    ).rejects.toThrow();
  });

  it("conserva el historial en cambio_catalogo con administrador_id = NULL si se elimina el administrador (CA-03-15)", async () => {
    const adminId = "usr-admin-catalogo-test";
    await db
      .insert(user)
      .values({ id: adminId, name: "admin_cat", email: "admin-cat@ejemplo.com", role: "administrador" })
      .onConflictDoNothing();

    const [calendula] = await db
      .select()
      .from(plantaServicio)
      .where(eq(plantaServicio.clave, "calendula"))
      .limit(1);

    const [registro] = await db
      .insert(cambioCatalogo)
      .values({
        entidad: "planta_servicio",
        entidadId: calendula.id,
        accion: "edicion",
        administradorId: adminId,
        antes: { riesgoMaleza: "bajo" },
        despues: { riesgoMaleza: "medio" },
      })
      .returning({ id: cambioCatalogo.id });

    await db.delete(user).where(eq(user.id, adminId));

    const [despues] = await db
      .select()
      .from(cambioCatalogo)
      .where(eq(cambioCatalogo.id, registro.id));
    expect(despues).toBeDefined();
    expect(despues.administradorId).toBeNull();
  });
});
