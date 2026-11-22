// Tests de integración en PostgreSQL para propuestas de rediseño (Esp. 05, T3).
// Cubre CA-05-09, CA-05-14, CA-05-16, CA-05-17, CA-05-18, CA-05-19 y CA-05-20.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  establecimiento,
  plantaServicio,
  propuesta,
  sector,
  user,
} from "@/db/schema";
import { ejecutarYSolicitarDiagnostico } from "@/dominio/diagnostico/entrada";
import { crearContornoCroquis, type PoligonoGeoJson } from "@/dominio/establecimientos";
import {
  borrarPropuestaDeFinca,
  guardarPropuestaEnBase,
  listarPropuestasDeFinca,
  marcarPropuestaComoElegida,
  obtenerDetallePropuesta,
  prepararGeneracionPropuesta,
} from "@/dominio/propuesta/servicio";
import { claveDeLimite, reiniciarIntentos } from "@/lib/limites";

const DUENO_ID = "usr-prop-dueno-test";
const OTRO_ID = "usr-prop-otro-test";

let tomateId = "";
let calendulaId = "";
let trebolId = "";
let borrajaId = "";

beforeAll(async () => {
  await db
    .insert(user)
    .values([
      { id: DUENO_ID, name: "dueno_prop", email: "dueno-prop@ejemplo.com", role: "usuario" },
      { id: OTRO_ID, name: "otro_prop", email: "otro-prop@ejemplo.com", role: "usuario" },
    ])
    .onConflictDoNothing();

  const [tomate] = await db
    .update(cultivo)
    .set({
      dependenciaPolinizacion: "alta",
      estado: "publicado",
      fuenteTipo: "entrevista",
      fuenteDetalle: "Entrevista Especialista 1",
      validadoPor: "Equipo",
    })
    .where(eq(cultivo.clave, "tomate"))
    .returning();
  tomateId = tomate.id;

  const [cal] = await db
    .update(plantaServicio)
    .set({
      estado: "publicado",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
    })
    .where(eq(plantaServicio.clave, "calendula"))
    .returning();
  calendulaId = cal.id;

  const [treb] = await db
    .update(plantaServicio)
    .set({
      estado: "publicado",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
    })
    .where(eq(plantaServicio.clave, "trebol_blanco"))
    .returning();
  trebolId = treb.id;

  const [borr] = await db
    .select()
    .from(plantaServicio)
    .where(eq(plantaServicio.clave, "borraja"))
    .limit(1);
  borrajaId = borr.id; // queda en borrador -> NO candidata

  await db
    .update(compatibilidad)
    .set({
      estado: "publicado",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
    })
    .where(eq(compatibilidad.cultivoId, tomateId));
});

afterAll(async () => {
  await reiniciarIntentos(claveDeLimite("diagnostico", DUENO_ID));
  await reiniciarIntentos(claveDeLimite("diagnostico", OTRO_ID));
  await db.delete(user).where(eq(user.id, DUENO_ID));
  await db.delete(user).where(eq(user.id, OTRO_ID));

  // Dejar el catálogo compartido en borrador para no afectar otros archivos de test.
  await db.update(compatibilidad).set({ estado: "borrador" });
  await db.update(plantaServicio).set({ estado: "borrador" });
  await db.update(cultivo).set({ estado: "borrador" });
});

describe("Propuestas de rediseño en PostgreSQL (Esp. 05 T3)", () => {
  it("genera, guarda recalculando en servidor, protege especies, gestiona Elegida, Desactualizada, permisos y cascadas (CA-05-09 a 20)", async () => {
    const contorno = crearContornoCroquis(4); // 200x200 = 4 ha
    const [finca] = await db
      .insert(establecimiento)
      .values({
        usuarioId: DUENO_ID,
        nombre: "Finca rediseño",
        direccion: "Ruta 9",
        departamento: "Dr. Manuel Belgrano",
        localidad: "San Salvador de Jujuy",
        ecorregion: "valles_templados",
        superficieTotalHa: "4.0000",
        metodoCaracterizacion: "croquis",
      })
      .returning();

    const cultivoPoli: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [150, 0],
          [150, 200],
          [0, 200],
          [0, 0],
        ],
      ],
    }; // 3 ha

    await db.insert(sector).values({
      establecimientoId: finca.id,
      tipo: "cultivo",
      cultivoId: tomateId,
      nombre: "Lote tomate",
      superficieHa: "3.0000",
      geometria: cultivoPoli,
    });

    const diagRes = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(diagRes.ok).toBe(true);

    // 1. Generar alternativas y mezcla en servidor
    const prep = await prepararGeneracionPropuesta(finca.id, DUENO_ID, 20);
    expect(prep.estado).toBe("listo");
    if (prep.estado !== "listo") return;
    expect(prep.alternativasEspaciales.length).toBeGreaterThanOrEqual(4);
    expect(prep.mezcla.especies.map((e) => e.plantaId).sort()).toEqual(
      [calendulaId, trebolId].sort(),
    );

    // 2. CA-05-14: rechazar especie no candidata (borraja está en borrador)
    const rechazoEspecie = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Inválida",
        objetivoPct: 20,
        disposicion: "perimetral",
        plantaIds: [calendulaId, borrajaId],
      },
    });
    expect(rechazoEspecie.ok).toBe(false);

    // 3. Guardar 1.ª propuesta -> queda automáticamente Elegida (CA-05-16)
    const p1 = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Perimetral 20 %",
        objetivoPct: 20,
        disposicion: "perimetral",
        plantaIds: [calendulaId, trebolId],
      },
    });
    expect(p1.ok).toBe(true);
    if (!p1.ok) return;
    expect(p1.elegida).toBe(true);

    // 4. CA-05-09: Guardar 2.ª propuesta editada a mano -> servidor recalcula superficie real y guarda editadaAMano=true
    const franjaManual: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [160, 0],
          [200, 0],
          [200, 200],
          [160, 200],
          [160, 0],
        ],
      ],
    }; // 40m x 200m = 0,8 ha exactas
    const p2 = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Manual 0,8 ha",
        objetivoPct: 20,
        disposicion: "superficie_libre",
        editadaAMano: true,
        franjas: [{ etiqueta: "Franja este", geometria: franjaManual }],
        plantaIds: [calendulaId, trebolId],
      },
    });
    expect(p2.ok).toBe(true);
    if (!p2.ok) return;
    expect(p2.elegida).toBe(false);

    const det2 = await obtenerDetallePropuesta(finca.id, p2.propuestaId, DUENO_ID);
    expect(det2?.propuesta.editadaAMano).toBe(true);
    expect(det2?.propuesta.superficieFranjasHa).toBe(0.8);
    expect(det2?.propuesta.porcentajeLogrado).toBe(20);

    // 5. CA-05-16: Marcar la 2.ª como Elegida quita la marca de la 1.ª
    const marcada = await marcarPropuestaComoElegida({
      establecimientoId: finca.id,
      propuestaId: p2.propuestaId,
      usuarioId: DUENO_ID,
    });
    expect(marcada).toBe(true);

    const listado = await listarPropuestasDeFinca(finca.id, DUENO_ID);
    const elegidas = listado?.propuestas.filter((p) => p.elegida) ?? [];
    expect(elegidas).toHaveLength(1);
    expect(elegidas[0].id).toBe(p2.propuestaId);

    // 6. CA-05-20 (RESTRICT): no se puede borrar una planta usada en una propuesta
    await expect(
      db.delete(plantaServicio).where(eq(plantaServicio.id, calendulaId)),
    ).rejects.toThrow();

    // 7. CA-05-18: si se retira una especie de la mezcla, la propuesta queda Desactualizada
    // pero sigue mostrando la especie retirada desde su copia inmutable.
    await db
      .update(plantaServicio)
      .set({ estado: "retirado" })
      .where(eq(plantaServicio.id, trebolId));

    const detDesact = await obtenerDetallePropuesta(finca.id, p2.propuestaId, DUENO_ID);
    expect(detDesact?.propuesta.desactualizada).toBe(true);
    expect(detDesact?.propuesta.motivosDesactualizada.some((m) => m.includes("Trébol blanco"))).toBe(
      true,
    );
    expect(detDesact?.propuesta.especies.some((e) => e.clave === "trebol_blanco")).toBe(true);

    // 8. CA-05-19: otro usuario recibe null / false (404)
    expect(await listarPropuestasDeFinca(finca.id, OTRO_ID)).toBeNull();
    expect(await obtenerDetallePropuesta(finca.id, p2.propuestaId, OTRO_ID)).toBeNull();
    expect(
      await marcarPropuestaComoElegida({
        establecimientoId: finca.id,
        propuestaId: p2.propuestaId,
        usuarioId: OTRO_ID,
      }),
    ).toBe(false);
    expect(
      await borrarPropuestaDeFinca({
        establecimientoId: finca.id,
        propuestaId: p1.propuestaId,
        usuarioId: OTRO_ID,
      }),
    ).toBe(false);

    // 9. Borrar propuesta propia y luego borrar finca (CA-05-20 cascada)
    expect(
      await borrarPropuestaDeFinca({
        establecimientoId: finca.id,
        propuestaId: p1.propuestaId,
        usuarioId: DUENO_ID,
      }),
    ).toBe(true);

    await db.delete(establecimiento).where(and(eq(establecimiento.id, finca.id)));
    const restantes = await db
      .select()
      .from(propuesta)
      .where(eq(propuesta.establecimientoId, finca.id));
    expect(restantes).toHaveLength(0);

    void contorno;
  });
});
