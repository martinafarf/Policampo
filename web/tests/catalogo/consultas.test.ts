// Tests de integración en PostgreSQL para la consulta del motor de reglas (Esp. 03, T4, CA-03-10, RN-08).
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import {
  consultarPlantasCandidatasParaFinca,
  consultarPlantasCompatiblesPublicadas,
  consultarPlantasPublicadasParaGuia,
} from "@/dominio/catalogo/consultas";

async function publicarCultivo(clave: string) {
  const [fila] = await db
    .update(cultivo)
    .set({
      dependenciaPolinizacion: "alta",
      estado: "publicado",
      fuenteTipo: "entrevista",
      fuenteDetalle: "Entrevista Especialista 1",
      validadoPor: "Analista de dominio (Integrante 2)",
    })
    .where(eq(cultivo.clave, clave))
    .returning();
  return fila;
}

async function publicarPlanta(clave: string) {
  const [fila] = await db
    .update(plantaServicio)
    .set({
      estado: "publicado",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
    })
    .where(eq(plantaServicio.clave, clave))
    .returning();
  return fila;
}

beforeEach(async () => {
  // Volver a borrador cualquier registro publicado en tests anteriores para aislar cada caso.
  await db.update(compatibilidad).set({ estado: "borrador" });
  await db.update(plantaServicio).set({ estado: "borrador" });
  await db.update(cultivo).set({ estado: "borrador" });
});

describe("Consulta del motor de reglas al catálogo (CA-03-10, RN-08, RN-13)", () => {
  it("devuelve vacío mientras todo esté en Borrador (CA-03-20)", async () => {
    const [tomate] = await db.select().from(cultivo).where(eq(cultivo.clave, "tomate")).limit(1);
    const compatibles = await consultarPlantasCompatiblesPublicadas({
      ecorregion: "valles_templados",
      cultivoId: tomate.id,
    });
    expect(compatibles).toEqual([]);
    expect(await consultarPlantasPublicadasParaGuia()).toEqual([]);
  });

  it("devuelve solo plantas publicadas, aptas en la ecorregión, con compatibilidad publicada > 0, ordenadas por grado desc (CA-03-10)", async () => {
    const tomate = await publicarCultivo("tomate");
    const calendula = await publicarPlanta("calendula");
    const trebol = await publicarPlanta("trebol_blanco");
    // borraja queda en borrador; aunque publiquemos su compatibilidad, NO debe aparecer.
    const [borraja] = await db
      .select()
      .from(plantaServicio)
      .where(eq(plantaServicio.clave, "borraja"))
      .limit(1);

    await db
      .update(compatibilidad)
      .set({
        estado: "publicado",
        fuenteTipo: "bibliografia",
        fuenteDetalle: "Manual agroecológico",
        validadoPor: "Especialista 1",
      })
      .where(eq(compatibilidad.cultivoId, tomate.id));

    // calendula (+5) y trebol_blanco (+4) tienen período en valles_templados y están publicadas.
    // borraja está en borrador y no tiene período en valles_templados.
    const resultado = await consultarPlantasCompatiblesPublicadas({
      ecorregion: "valles_templados",
      cultivoId: tomate.id,
    });

    expect(resultado.map((r) => ({ clave: r.clave, grado: r.grado }))).toEqual([
      { clave: calendula.clave, grado: 5 },
      { clave: trebol.clave, grado: 4 },
    ]);
    expect(resultado.some((r) => r.clave === borraja.clave)).toBe(false);

    // En otra ecorregión sin períodos (puna) no se recomienda ninguna.
    expect(
      await consultarPlantasCompatiblesPublicadas({
        ecorregion: "puna",
        cultivoId: tomate.id,
      }),
    ).toEqual([]);
  });

  it("descarta candidatas que tengan grado negativo con algún cultivo de la finca (RN-08)", async () => {
    const tomate = await publicarCultivo("tomate");
    const pimiento = await publicarCultivo("pimiento");
    const calendula = await publicarPlanta("calendula");
    const trebol = await publicarPlanta("trebol_blanco");

    // Publicar compatibilidades positivas con tomate
    await db
      .update(compatibilidad)
      .set({
        estado: "publicado",
        fuenteTipo: "bibliografia",
        fuenteDetalle: "Manual",
        validadoPor: "Especialista 1",
      })
      .where(eq(compatibilidad.cultivoId, tomate.id));

    // Agregar antagonismo (-3) entre pimiento y calendula
    await db
      .insert(compatibilidad)
      .values({
        cultivoId: pimiento.id,
        plantaId: calendula.id,
        grado: -3,
        justificacion: "Antagonismo de prueba para verificar regla RN-08 en la finca.",
        estado: "publicado",
        fuenteTipo: "bibliografia",
        fuenteDetalle: "Manual",
        validadoPor: "Especialista 1",
      })
      .onConflictDoNothing();

    // Asegurar período en valles_templados para trebol
    await db
      .insert(plantaServicioEcorregion)
      .values({
        plantaId: trebol.id,
        ecorregion: "valles_templados",
        floracionSemanas: [[40, 52]],
      })
      .onConflictDoNothing();

    const candidatas = await consultarPlantasCandidatasParaFinca({
      ecorregion: "valles_templados",
      cultivoIds: [tomate.id, pimiento.id],
    });

    // calendula queda descartada por el grado -3 con pimiento; trebol_blanco permanece.
    expect(candidatas.map((c) => c.clave)).toEqual(["trebol_blanco"]);
  });
});
