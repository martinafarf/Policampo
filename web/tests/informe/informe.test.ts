// Tests de integración en PostgreSQL para el módulo de informe técnico (Esp. 07, T5).
// Cubre CA-07-01 a CA-07-04, CA-07-09, CA-07-11 a CA-07-14.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  establecimiento,
  informe,
  plantaServicio,
  propuesta,
  sector,
  user,
} from "@/db/schema";
import { generarCalendarioEnBase } from "@/dominio/calendario/servicio";
import { ejecutarYSolicitarDiagnostico } from "@/dominio/diagnostico/entrada";
import { crearContornoCroquis } from "@/dominio/establecimientos";
import { esCodigoInformeValido } from "@/dominio/informe/codigo";
import {
  borrarInformeDeFinca,
  emitirInformeEnBase,
  listarInformesDeFinca,
  listarMisInformes,
  obtenerInformePorId,
  obtenerRequisitosEmisionInforme,
} from "@/dominio/informe/foto";
import {
  guardarPropuestaEnBase,
  marcarPropuestaComoElegida,
} from "@/dominio/propuesta/servicio";
import { claveDeLimite, reiniciarIntentos } from "@/lib/limites";

const DUENO_ID = "usr-inf-dueno-test";
const SIN_NOMBRE_ID = "usr-inf-sinnombre-test";
const OTRO_ID = "usr-inf-otro-test";

let tomateId = "";
let calendulaId = "";

beforeAll(async () => {
  await db
    .insert(user)
    .values([
      {
        id: DUENO_ID,
        name: "dueno_inf",
        nombre: "Solange",
        apellido: "Prueba",
        email: "dueno-inf@ejemplo.com",
        emailVerified: true,
        role: "usuario",
      },
      {
        id: SIN_NOMBRE_ID,
        name: "sinnombre_inf",
        nombre: null,
        apellido: null,
        email: "sinnombre-inf@ejemplo.com",
        emailVerified: true,
        role: "usuario",
      },
      {
        id: OTRO_ID,
        name: "otro_inf",
        email: "otro-inf@ejemplo.com",
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
  await reiniciarIntentos(claveDeLimite("informe_emitir", DUENO_ID));
  await reiniciarIntentos(claveDeLimite("informe_pdf", DUENO_ID));
  await reiniciarIntentos(claveDeLimite("diagnostico", SIN_NOMBRE_ID));
  await reiniciarIntentos(claveDeLimite("informe_emitir", SIN_NOMBRE_ID));
  await db.delete(user).where(eq(user.id, DUENO_ID));
  await db.delete(user).where(eq(user.id, SIN_NOMBRE_ID));
  await db.delete(user).where(eq(user.id, OTRO_ID));
  await db.update(compatibilidad).set({ estado: "borrador" });
  await db.update(plantaServicio).set({ estado: "borrador" });
  await db.update(cultivo).set({ estado: "borrador" });
});

async function crearFincaConCultivo(usuarioId: string, nombre: string) {
  const contorno = crearContornoCroquis(4);
  const [finca] = await db
    .insert(establecimiento)
    .values({
      usuarioId,
      nombre,
      direccion: "Ruta 9 km 14",
      departamento: "Dr. Manuel Belgrano",
      localidad: "San Salvador de Jujuy",
      ecorregion: "valles_templados",
      metodoCaracterizacion: "croquis",
      superficieTotalHa: "4.0000",
    })
    .returning();

  await db.insert(sector).values({
    establecimientoId: finca.id,
    nombre: "Lote Tomate",
    tipo: "cultivo",
    cultivoId: tomateId,
    superficieHa: "3.0000",
    geometria: contorno,
  });

  return finca;
}

describe("Informe técnico — integración PostgreSQL (Esp. 07)", () => {
  it("valida requisitos, emite con foto inmutable, respeta privacidad, aislamiento y cascada", async () => {
    const finca = await crearFincaConCultivo(DUENO_ID, "Finca Informe Principal");

    // CA-07-01: sin diagnóstico ni propuesta elegida -> rechazado
    const req0 = await obtenerRequisitosEmisionInforme(finca.id, DUENO_ID);
    expect(req0?.cumple).toBe(false);
    expect(req0?.mensajeFaltante).toBe("Primero pedí un diagnóstico");

    const emisionSinDiag = await emitirInformeEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(emisionSinDiag.ok).toBe(false);
    if (!emisionSinDiag.ok) {
      expect(emisionSinDiag.motivo).toBe("requisitos_incompletos");
    }

    // Diagnóstico listo, pero sin propuesta elegida
    const diagRes = await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
    });
    expect(diagRes.ok).toBe(true);

    const req1 = await obtenerRequisitosEmisionInforme(finca.id, DUENO_ID);
    expect(req1?.cumple).toBe(false);
    expect(req1?.mensajeFaltante).toBe("Primero elegí una propuesta");

    const propRes = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      payload: {
        nombre: "Borde principal",
        objetivoPct: 20,
        disposicion: "perimetral",
        plantaIds: [calendulaId],
      },
    });
    expect(propRes.ok).toBe(true);
    if (!propRes.ok) return;

    await marcarPropuestaComoElegida({
      establecimientoId: finca.id,
      propuestaId: propRes.propuestaId,
      usuarioId: DUENO_ID,
    });

    await generarCalendarioEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      modo: "nuevo",
      hoyIso: "2026-07-15",
    });

    // CA-07-02 y CA-07-03: emite sin nombre por defecto, luego con nombre opt-in
    const emisionAnon = await emitirInformeEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      incluirNombre: false,
    });
    expect(emisionAnon.ok).toBe(true);
    if (!emisionAnon.ok) return;
    expect(esCodigoInformeValido(emisionAnon.codigo)).toBe(true);

    const infAnon = await obtenerInformePorId(finca.id, emisionAnon.informeId, DUENO_ID);
    expect(infAnon).not.toBeNull();
    expect(infAnon?.incluyeNombre).toBe(false);
    expect(infAnon?.contenido.preparadoPara).toBeNull();
    expect(infAnon?.contenido.calendario).not.toBeNull();
    expect(infAnon?.contenido.desactualizado.hayAviso).toBe(false);

    // CA-07-04: si la finca cambia después del diagnóstico, el informe guarda el aviso de desactualizado
    await db
      .update(establecimiento)
      .set({ actualizadoEn: new Date(Date.now() + 60_000) })
      .where(eq(establecimiento.id, finca.id));

    const emisionConNombre = await emitirInformeEnBase({
      establecimientoId: finca.id,
      usuarioId: DUENO_ID,
      incluirNombre: true,
    });
    expect(emisionConNombre.ok).toBe(true);
    if (!emisionConNombre.ok) return;
    expect(emisionConNombre.codigo).not.toBe(emisionAnon.codigo);

    const infConNombre = await obtenerInformePorId(finca.id, emisionConNombre.informeId, DUENO_ID);
    expect(infConNombre?.incluyeNombre).toBe(true);
    expect(infConNombre?.contenido.preparadoPara).toBe("Solange Prueba");
    expect(infConNombre?.contenido.desactualizado.hayAviso).toBe(true);

    // CA-07-11 y CA-07-12: historial del dueño y bloqueo 404 para otro usuario
    const misInformes = await listarMisInformes(DUENO_ID);
    expect(misInformes.length).toBeGreaterThanOrEqual(2);
    const deFinca = await listarInformesDeFinca(finca.id, DUENO_ID);
    expect(deFinca?.informes).toHaveLength(2);

    expect(await obtenerInformePorId(finca.id, emisionAnon.informeId, OTRO_ID)).toBeNull();
    expect(await listarInformesDeFinca(finca.id, OTRO_ID)).toBeNull();
    expect(
      await borrarInformeDeFinca({
        establecimientoId: finca.id,
        informeId: emisionAnon.informeId,
        usuarioId: OTRO_ID,
      }),
    ).toBe(false);

    // CA-07-09: borrar la propuesta y retirar la especie NO altera ni rompe el informe guardado
    await db.delete(propuesta).where(eq(propuesta.id, propRes.propuestaId));
    await db
      .update(plantaServicio)
      .set({ estado: "retirado" })
      .where(eq(plantaServicio.id, calendulaId));

    const infDespues = await obtenerInformePorId(finca.id, emisionConNombre.informeId, DUENO_ID);
    expect(infDespues).not.toBeNull();
    expect(infDespues?.propuestaId).toBeNull();
    expect(infDespues?.contenido.propuesta.especies[0]?.nombreComun).toBe("Caléndula");

    // CA-07-12: borrar un informe individual
    expect(
      await borrarInformeDeFinca({
        establecimientoId: finca.id,
        informeId: emisionAnon.informeId,
        usuarioId: DUENO_ID,
      }),
    ).toBe(true);
    expect(await obtenerInformePorId(finca.id, emisionAnon.informeId, DUENO_ID)).toBeNull();

    // CA-07-14: borrar la finca borra en cascada los informes restantes
    await db.delete(establecimiento).where(eq(establecimiento.id, finca.id));
    const restantes = await db
      .select()
      .from(informe)
      .where(eq(informe.establecimientoId, finca.id));
    expect(restantes).toHaveLength(0);

    // Restaurar caléndula para el test siguiente
    await db
      .update(plantaServicio)
      .set({ estado: "publicado" })
      .where(eq(plantaServicio.id, calendulaId));
  });

  it("ignora incluirNombre si el usuario no cargó nombre y aplica límite de 20 emisiones/hora (CA-07-03, CA-07-13)", async () => {
    const finca = await crearFincaConCultivo(SIN_NOMBRE_ID, "Finca Límite");
    await ejecutarYSolicitarDiagnostico({
      establecimientoId: finca.id,
      usuarioId: SIN_NOMBRE_ID,
    });
    const propRes = await guardarPropuestaEnBase({
      establecimientoId: finca.id,
      usuarioId: SIN_NOMBRE_ID,
      payload: {
        nombre: "Borde límite",
        objetivoPct: 20,
        disposicion: "perimetral",
        plantaIds: [calendulaId],
      },
    });
    expect(propRes.ok).toBe(true);
    if (!propRes.ok) return;

    await marcarPropuestaComoElegida({
      establecimientoId: finca.id,
      propuestaId: propRes.propuestaId,
      usuarioId: SIN_NOMBRE_ID,
    });

    // 20 emisiones exitosas; la primera intenta incluirNombre pero perfil está vacío -> queda null
    let primerId = "";
    for (let i = 0; i < 20; i += 1) {
      const res = await emitirInformeEnBase({
        establecimientoId: finca.id,
        usuarioId: SIN_NOMBRE_ID,
        incluirNombre: i === 0,
      });
      expect(res.ok).toBe(true);
      if (res.ok && i === 0) primerId = res.informeId;
    }

    const primero = await obtenerInformePorId(finca.id, primerId, SIN_NOMBRE_ID);
    expect(primero?.incluyeNombre).toBe(false);
    expect(primero?.contenido.preparadoPara).toBeNull();

    // Emisión n.º 21 en la misma hora -> rechazada con limite_excedido (RS-06, CA-07-13)
    const vigesimoPrimera = await emitirInformeEnBase({
      establecimientoId: finca.id,
      usuarioId: SIN_NOMBRE_ID,
    });
    expect(vigesimoPrimera.ok).toBe(false);
    if (!vigesimoPrimera.ok) {
      expect(vigesimoPrimera.motivo).toBe("limite_excedido");
    }
  });
});
