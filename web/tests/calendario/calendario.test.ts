// Tests de integración en PostgreSQL para el calendario agroecológico (Esp. 06, T2/T4).
// Cubre CA-06-06, CA-06-08 a CA-06-15.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  calendario,
  compatibilidad,
  cultivo,
  establecimiento,
  plantaServicio,
  sector,
  user,
} from "@/db/schema";
import {
  actualizarPreferenciaResumenSemanal,
  desmarcarTareaEnBase,
  ejecutarEnvioResumenSemanal,
  generarCalendarioEnBase,
  listarHistorialCalendariosDeFinca,
  listarMisTareas,
  marcarTareaHechaEnBase,
  obtenerCalendarioActivoDeFinca,
  obtenerPreferenciaResumenSemanal,
  obtenerResumenTareasParaInicio,
  procesarBajaResumenPorToken,
} from "@/dominio/calendario/servicio";
import { firmarTokenBajaResumen } from "@/dominio/calendario/tokens";
import { ejecutarYSolicitarDiagnostico } from "@/dominio/diagnostico/entrada";
import { crearContornoCroquis } from "@/dominio/establecimientos";
import {
  guardarPropuestaEnBase,
  marcarPropuestaComoElegida,
} from "@/dominio/propuesta/servicio";
import { claveDeLimite, reiniciarIntentos } from "@/lib/limites";

const DUENO_ID = "usr-cal-dueno-test";
const OTRO_ID = "usr-cal-otro-test";
const SECRETO_BAJA = "secreto-baja-test-muy-seguro-123456";

let tomateId = "";
let calendulaId = "";
let trebolId = "";

beforeAll(async () => {
  await db
    .insert(user)
    .values([
      {
        id: DUENO_ID,
        name: "dueno_cal",
        email: "dueno-cal@ejemplo.com",
        emailVerified: true,
        role: "usuario",
      },
      {
        id: OTRO_ID,
        name: "otro_cal",
        email: "otro-cal@ejemplo.com",
        emailVerified: true,
        role: "usuario",
      },
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
  await db.delete(user).where(eq(user.id, DUENO_ID));
  await db.delete(user).where(eq(user.id, OTRO_ID));
  await db.update(compatibilidad).set({ estado: "borrador" });
  await db.update(plantaServicio).set({ estado: "borrador" });
  await db.update(cultivo).set({ estado: "borrador" });
});

describe("Calendario agroecológico en PostgreSQL (Esp. 06 T2/T4)", () => {
  it("genera, valida checklist, regenera al cambiar propuesta, abre próxima temporada, envía resumen semanal idempotente y da de baja (CA-06-06 a 15)", async () => {
    const [finca] = await db
      .insert(establecimiento)
      .values({
        usuarioId: DUENO_ID,
        nombre: "Finca Calendario",
        direccion: "Ruta 9",
        departamento: "Dr. Manuel Belgrano",
        localidad: "San Salvador de Jujuy",
        ecorregion: "valles_templados",
        superficieTotalHa: "4.0000",
        metodoCaracterizacion: "croquis",
      })
      .returning();

    const contorno = crearContornoCroquis(4);
    await db.insert(sector).values({
      establecimientoId: finca.id,
      tipo: "cultivo",
      cultivoId: tomateId,
      nombre: "Lote tomate",
      superficieHa: "3.0000",
      geometria: contorno,
    });

    // CA-06-06: sin propuesta elegida no se puede generar
    const sinProp = await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      hoyIso: "2026-07-01",
    });
    expect(sinProp.ok).toBe(false);
    if (!sinProp.ok) expect(sinProp.motivo).toBe("sin_propuesta_elegida");

    await ejecutarYSolicitarDiagnostico({ establecimientoId: finca.id, usuarioId: DUENO_ID });

    const p1 = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Propuesta 1",
        objetivoPct: 20,
        disposicion: "perimetral",
        plantaIds: [calendulaId, trebolId],
      },
    });
    expect(p1.ok).toBe(true);

    // Generar calendario activo
    const cal1 = await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      hoyIso: "2026-07-01",
    });
    expect(cal1.ok).toBe(true);

    const activo = await obtenerCalendarioActivoDeFinca(finca.id, DUENO_ID, "2026-07-25");
    expect(activo?.calendario).not.toBeNull();
    expect(activo?.tareas.length).toBeGreaterThan(4);

    // CA-06-08 y CA-06-09: marcar hecha una siembra y rechazar informativa / fecha futura / otro usuario
    const tareaSiembra = activo!.tareas.find((t) => t.tipo === "siembra")!;
    const tareaInfo = activo!.tareas.find((t) => t.esInformativa)!;

    const rInfo = await marcarTareaHechaEnBase({
      tareaId: tareaInfo.id,
      usuarioId: DUENO_ID,
      fechaHechaIso: "2026-07-25",
      hoyIso: "2026-07-25",
    });
    expect(rInfo.ok).toBe(false);

    // CA-06-13: otro usuario recibe no_encontrado (404)
    const rAjena = await marcarTareaHechaEnBase({
      tareaId: tareaSiembra.id,
      usuarioId: OTRO_ID,
      fechaHechaIso: "2026-07-25",
      hoyIso: "2026-07-25",
    });
    expect(rAjena.ok).toBe(false);
    if (!rAjena.ok) expect(rAjena.motivo).toBe("no_encontrado");

    const rHecha = await marcarTareaHechaEnBase({
      tareaId: tareaSiembra.id,
      usuarioId: DUENO_ID,
      fechaHechaIso: "2026-07-24",
      nota: "Sembrado a la mañana con humedad.",
      hoyIso: "2026-07-25",
    });
    expect(rHecha.ok).toBe(true);

    // CA-06-12: Mis tareas e Inicio
    const misTareas = await listarMisTareas(DUENO_ID, "2026-07-25");
    expect(misTareas.some((t) => t.id === tareaSiembra.id && t.estado === "hecha")).toBe(true);

    const resumenInicio = await obtenerResumenTareasParaInicio(DUENO_ID, "2026-07-25");
    expect(resumenInicio.proximasOEnCurso.length).toBeLessThanOrEqual(5);

    // Desmarcar y volver a marcar para probar desmarcar + conservar en historial
    expect((await desmarcarTareaEnBase({ tareaId: tareaSiembra.id, usuarioId: DUENO_ID })).ok).toBe(
      true,
    );
    expect(
      (
        await marcarTareaHechaEnBase({
          tareaId: tareaSiembra.id,
          usuarioId: DUENO_ID,
          fechaHechaIso: "2026-07-24",
          nota: "Reconfirmada",
          hoyIso: "2026-07-25",
        })
      ).ok,
    ).toBe(true);

    // CA-06-10: cambiar propuesta elegida y regenerar -> cierra cal1 (con su tarea hecha) y crea cal2
    const p2 = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Propuesta 2",
        objetivoPct: 20,
        disposicion: "transversal",
        plantaIds: [calendulaId],
      },
    });
    expect(p2.ok).toBe(true);
    if (!p2.ok) return;
    await marcarPropuestaComoElegida({
      establecimientoId: finca.id,
      propuestaId: p2.propuestaId,
      usuarioId: DUENO_ID,
    });

    const cal2 = await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      modo: "regenerar",
      hoyIso: "2026-08-01",
    });
    expect(cal2.ok).toBe(true);

    const todosActivos = (
      await db.select().from(calendario).where(eq(calendario.establecimientoId, finca.id))
    ).filter((c) => c.cerradoEn === null);
    expect(todosActivos).toHaveLength(1);

    const historial = await listarHistorialCalendariosDeFinca(finca.id, DUENO_ID);
    expect(historial?.calendarios).toHaveLength(1);
    expect(historial?.calendarios[0].tareasHechas).toHaveLength(1);

    // CA-06-11: próxima temporada cuando falta menos de un mes
    const proxNo = await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      modo: "proxima_temporada",
      hoyIso: "2026-09-01",
    });
    expect(proxNo.ok).toBe(false);

    const proxSi = await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      modo: "proxima_temporada",
      hoyIso: "2027-06-20", // faltan 11 días para 2027-07-01
    });
    expect(proxSi.ok).toBe(true);

    // CA-06-14 y CA-06-15: resumen semanal idempotente y baja por token firmado
    await actualizarPreferenciaResumenSemanal(DUENO_ID, true);
    expect(await obtenerPreferenciaResumenSemanal(DUENO_ID)).toBe(true);

    const enviadosMock: { para: string; texto: string }[] = [];
    const envio1 = await ejecutarEnvioResumenSemanal({
      hoyIso: "2027-07-20",
      baseUrl: "https://policampo.vercel.app",
      secretoBaja: SECRETO_BAJA,
      enviarFn: async (em) => {
        enviadosMock.push({ para: em.para, texto: em.texto });
      },
    });
    expect(envio1.enviados).toBe(1);
    expect(enviadosMock[0].texto).not.toContain("Reconfirmada"); // RS-05: sin notas

    // Segunda ejecución la misma semana -> idempotente, no reenvía
    const envio2 = await ejecutarEnvioResumenSemanal({
      hoyIso: "2027-07-22",
      baseUrl: "https://policampo.vercel.app",
      secretoBaja: SECRETO_BAJA,
      enviarFn: async (em) => {
        enviadosMock.push({ para: em.para, texto: em.texto });
      },
    });
    expect(envio2.enviados).toBe(0);

    // Baja con token alterado falla; con token válido desactiva la casilla
    const tokenValido = firmarTokenBajaResumen(DUENO_ID, SECRETO_BAJA);
    expect(await procesarBajaResumenPorToken(`${tokenValido}bad`, SECRETO_BAJA)).toBe(false);
    expect(await procesarBajaResumenPorToken(tokenValido, SECRETO_BAJA)).toBe(true);
    expect(await obtenerPreferenciaResumenSemanal(DUENO_ID)).toBe(false);
  });
});
