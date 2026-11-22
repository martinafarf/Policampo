// Tests de integración en PostgreSQL para el diagnóstico agroecológico (Esp. 04, T2).
// Cubre CA-04-08, CA-04-09, CA-04-10, CA-04-11, CA-04-13, CA-04-15 y CA-04-16.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { cultivo, diagnostico, establecimiento, sector, user } from "@/db/schema";
import {
  ejecutarYSolicitarDiagnostico,
  listarHistorialDiagnosticos,
  obtenerDiagnosticoPorId,
  obtenerUltimoDiagnostico,
} from "@/dominio/diagnostico/entrada";
import { claveDeLimite, reiniciarIntentos } from "@/lib/limites";

const DUENO_ID = "usr-diag-dueno-test";
const OTRO_ID = "usr-diag-otro-test";
const LIMITE_USR_ID = "usr-diag-limite-test";

let tomateId = "";

beforeAll(async () => {
  await db
    .insert(user)
    .values([
      { id: DUENO_ID, name: "dueño_diag", email: "dueno-diag@ejemplo.com", role: "usuario" },
      { id: OTRO_ID, name: "otro_diag", email: "otro-diag@ejemplo.com", role: "usuario" },
      { id: LIMITE_USR_ID, name: "limite_diag", email: "limite-diag@ejemplo.com", role: "usuario" },
    ])
    .onConflictDoNothing();

  const [tomate] = await db.select().from(cultivo).where(eq(cultivo.clave, "tomate")).limit(1);
  tomateId = tomate.id;
});

afterAll(async () => {
  await reiniciarIntentos(claveDeLimite("diagnostico", DUENO_ID));
  await reiniciarIntentos(claveDeLimite("diagnostico", OTRO_ID));
  await reiniciarIntentos(claveDeLimite("diagnostico", LIMITE_USR_ID));
  await db.delete(user).where(eq(user.id, DUENO_ID));
  await db.delete(user).where(eq(user.id, OTRO_ID));
  await db.delete(user).where(eq(user.id, LIMITE_USR_ID));
});

async function crearFincaPrueba(params: {
  usuarioId: string;
  nombre: string;
  superficieTotalHa: string | null;
  metodo?: "cuestionario" | "croquis" | "mapa";
}) {
  const [finca] = await db
    .insert(establecimiento)
    .values({
      usuarioId: params.usuarioId,
      nombre: params.nombre,
      direccion: "Ruta 9 km 10",
      departamento: "Dr. Manuel Belgrano",
      localidad: "San Salvador de Jujuy",
      ecorregion: "valles_templados",
      superficieTotalHa: params.superficieTotalHa,
      metodoCaracterizacion: params.metodo ?? "cuestionario",
    })
    .returning();
  return finca;
}

describe("Persistencia, permisos y reglas del diagnóstico (Esp. 04 T2)", () => {
  it("impide crear diagnóstico si falta superficie total o sector de cultivo (CA-04-08)", async () => {
    const fincaSinSup = await crearFincaPrueba({
      usuarioId: DUENO_ID,
      nombre: "Finca sin superficie",
      superficieTotalHa: null,
      metodo: "mapa",
    });
    const r1 = await ejecutarYSolicitarDiagnostico({
      establecimientoId: fincaSinSup.id,
      usuarioId: DUENO_ID,
    });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.motivo).toBe("requisitos_incompletos");
      expect(r1.mensaje).toContain("superficie total");
    }

    const fincaSinCultivo = await crearFincaPrueba({
      usuarioId: DUENO_ID,
      nombre: "Finca solo flores",
      superficieTotalHa: "10.0000",
    });
    await db.insert(sector).values({
      establecimientoId: fincaSinCultivo.id,
      tipo: "sector_flores",
      subtipoFlores: "borde_silvestre",
      nombre: "Borde 1",
      superficieHa: "2.0000",
      ubicacionRelativa: "arriba_izquierda",
    });

    const r2 = await ejecutarYSolicitarDiagnostico({
      establecimientoId: fincaSinCultivo.id,
      usuarioId: DUENO_ID,
    });
    expect(r2.ok).toBe(false);
    if (!r2.ok) {
      expect(r2.motivo).toBe("requisitos_incompletos");
      expect(r2.mensaje).toContain("cultivo");
    }

    const guardados = await db
      .select()
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, fincaSinCultivo.id));
    expect(guardados).toHaveLength(0);
  });

  it("crea diagnóstico, reutiliza el vigente sin duplicar, marca desactualizado y conserva historial (CA-04-09, CA-04-10, CA-04-11)", async () => {
    const finca = await crearFincaPrueba({
      usuarioId: DUENO_ID,
      nombre: "Finca evolución",
      superficieTotalHa: "10.0000",
    });

    await db.insert(sector).values([
      {
        establecimientoId: finca.id,
        tipo: "cultivo",
        cultivoId: tomateId,
        nombre: "Lote tomate",
        superficieHa: "9.0000",
        ubicacionRelativa: "centro",
      },
      {
        establecimientoId: finca.id,
        tipo: "sector_flores",
        subtipoFlores: "banda_implantada",
        nombre: "Banda 1",
        superficieHa: "1.0000",
        ubicacionRelativa: "arriba_izquierda",
      },
    ]);

    // 1. Primera solicitud -> crea diagnóstico (10 %, Moderado)
    const primero = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(primero.ok).toBe(true);
    if (!primero.ok) return;
    expect(primero.creado).toBe(true);
    expect(primero.diagnostico.porcentajeFlores).toBe(10);
    expect(primero.diagnostico.nivelRiesgo).toBe("moderado");

    // 2. Segunda solicitud sin cambios -> reutiliza el vigente (CA-04-09)
    const repetido = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(repetido.ok).toBe(true);
    if (!repetido.ok) return;
    expect(repetido.creado).toBe(false);
    expect(repetido.diagnostico.id).toBe(primero.diagnostico.id);

    // 3. Modificar sector y actualizar actualizadoEn -> queda desactualizado (CA-04-10)
    await db
      .update(sector)
      .set({ superficieHa: "8.0000" })
      .where(and(eq(sector.establecimientoId, finca.id), eq(sector.nombre, "Lote tomate")));
    await db
      .update(sector)
      .set({ superficieHa: "2.0000" })
      .where(and(eq(sector.establecimientoId, finca.id), eq(sector.nombre, "Banda 1")));
    await db
      .update(establecimiento)
      .set({ actualizadoEn: new Date(primero.diagnostico.creadoEn.getTime() + 2000) })
      .where(eq(establecimiento.id, finca.id));

    const estadoDesactualizado = await obtenerUltimoDiagnostico(finca.id, DUENO_ID);
    expect(estadoDesactualizado?.desactualizado).toBe(true);

    // 4. Actualizar diagnóstico -> crea uno nuevo (20 %, Adecuado) y conserva el primero en historial
    const segundo = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(segundo.ok).toBe(true);
    if (!segundo.ok) return;
    expect(segundo.creado).toBe(true);
    expect(segundo.diagnostico.id).not.toBe(primero.diagnostico.id);
    expect(segundo.diagnostico.porcentajeFlores).toBe(20);
    expect(segundo.diagnostico.nivelRiesgo).toBe("adecuado");

    // 5. Historial del más nuevo al más viejo, y el viejo conserva sus datos originales (CA-04-11)
    const historial = await listarHistorialDiagnosticos(finca.id, DUENO_ID);
    expect(historial?.diagnosticos).toHaveLength(2);
    expect(historial?.diagnosticos[0].id).toBe(segundo.diagnostico.id);
    expect(historial?.diagnosticos[1].id).toBe(primero.diagnostico.id);

    const viejo = await obtenerDiagnosticoPorId(finca.id, primero.diagnostico.id, DUENO_ID);
    expect(viejo?.diagnostico.porcentajeFlores).toBe(10);
    expect(viejo?.diagnostico.entrada.sectores).toHaveLength(2);

    // 6. Permisos: otro usuario recibe null / no_encontrado (CA-04-13)
    expect(await obtenerUltimoDiagnostico(finca.id, OTRO_ID)).toBeNull();
    expect(await obtenerDiagnosticoPorId(finca.id, primero.diagnostico.id, OTRO_ID)).toBeNull();
    expect(await listarHistorialDiagnosticos(finca.id, OTRO_ID)).toBeNull();
    const ajeno = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: OTRO_ID,
    });
    expect(ajeno.ok).toBe(false);
    if (!ajeno.ok) expect(ajeno.motivo).toBe("no_encontrado");

    // 7. Cascada: al borrar la finca se borran sus diagnósticos (CA-04-16)
    await db.delete(establecimiento).where(eq(establecimiento.id, finca.id));
    const restantes = await db
      .select()
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, finca.id));
    expect(restantes).toHaveLength(0);
  });

  it("bloquea el vigésimo primer diagnóstico en una hora con límite excedido (CA-04-15)", async () => {
    await reiniciarIntentos(claveDeLimite("diagnostico", LIMITE_USR_ID));
    const finca = await crearFincaPrueba({
      usuarioId: LIMITE_USR_ID,
      nombre: "Finca límite",
      superficieTotalHa: "10.0000",
    });
    await db.insert(sector).values({
      establecimientoId: finca.id,
      tipo: "cultivo",
      cultivoId: tomateId,
      nombre: "Lote 1",
      superficieHa: "9.0000",
      ubicacionRelativa: "centro",
    });

    let baseMs = Date.now() + 1000;
    for (let i = 1; i <= 20; i += 1) {
      baseMs += 1000;
      await db
        .update(establecimiento)
        .set({ actualizadoEn: new Date(baseMs) })
        .where(eq(establecimiento.id, finca.id));
      const res = await ejecutarYSolicitarDiagnostico({
        establecimientoId: finca.id,
        usuarioId: LIMITE_USR_ID,
      });
      expect(res.ok).toBe(true);
    }

    // 21.º cálculo dentro de la misma hora -> rechazado
    await db
      .update(establecimiento)
      .set({ actualizadoEn: new Date(baseMs + 5000) })
      .where(eq(establecimiento.id, finca.id));
    const vigesimoPrimero = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: LIMITE_USR_ID,
    });
    expect(vigesimoPrimero.ok).toBe(false);
    if (!vigesimoPrimero.ok) {
      expect(vigesimoPrimero.motivo).toBe("limite_excedido");
      expect(vigesimoPrimero.mensaje).toContain("Demasiadas solicitudes");
    }
  });
});
