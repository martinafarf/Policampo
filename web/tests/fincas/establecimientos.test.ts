// Tests de integración en PostgreSQL para establecimientos y sectores (especificación 02, T7).
// Cubren: seed inicial de cultivos, CA-02-02, CA-02-04, CA-02-05 (RS-02), CA-02-06, CA-02-20 y CA-02-21.
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  listarEstablecimientosDelUsuario,
  obtenerEstablecimientoDelUsuario,
} from "@/app/fincas/_lib/consultas";
import { CULTIVOS_INICIALES } from "@/datos/jujuy";
import { db } from "@/db";
import { cultivo, establecimiento, sector, user } from "@/db/schema";

const USUARIO_A = "usr-fincas-a";
const USUARIO_B = "usr-fincas-b";
const USUARIO_ADMIN = "usr-fincas-admin";

async function crearUsuariosDePrueba() {
  await db.insert(user).values([
    { id: USUARIO_A, name: "productora_a", email: "a@ejemplo.com", role: "usuario" },
    { id: USUARIO_B, name: "productor_b", email: "b@ejemplo.com", role: "usuario" },
    { id: USUARIO_ADMIN, name: "admin_c", email: "admin@ejemplo.com", role: "administrador" },
  ]);
}

function datosFinca(
  usuarioId: string,
  nombre: string,
  actualizadoEn: Date = new Date(),
) {
  return {
    usuarioId,
    nombre,
    direccion: "Ruta Provincial 47 km 4,5",
    departamento: "El Carmen",
    localidad: "Perico",
    localidadEsOtra: false,
    ecorregion: "valles_templados",
    superficieTotalHa: "5.0000",
    metodoCaracterizacion: "cuestionario" as const,
    contorno: null,
    version: 1,
    actualizadoEn,
  };
}

beforeEach(async () => {
  await db.delete(user); // borra en cascada establecimientos y sectores; preserva la tabla cultivo
  await crearUsuariosDePrueba();
});

describe("Migración 0001_establecimientos: catálogo inicial de cultivos", () => {
  it("carga los 9 cultivos iniciales de la v1 activos", async () => {
    const filas = await db.select().from(cultivo);
    const claves = new Set(filas.map((f) => f.clave));
    for (const inicial of CULTIVOS_INICIALES) {
      expect(claves.has(inicial.clave)).toBe(true);
    }
    expect(filas.every((f) => f.activo)).toBe(true);
  });
});

describe("Unicidad de nombre por usuario (CA-02-02)", () => {
  it("impide repetir nombre en el mismo usuario sin distinguir mayúsculas, pero lo permite en otro usuario", async () => {
    await db.insert(establecimiento).values(datosFinca(USUARIO_A, "Finca Los Lapachos"));

    await expect(
      db.insert(establecimiento).values(datosFinca(USUARIO_A, "finca los lapachos")),
    ).rejects.toThrow();

    const [deB] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_B, "Finca Los Lapachos"))
      .returning({ id: establecimiento.id });

    expect(deB.id).toBeTruthy();
  });
});

describe("Permisos y listado de Mis fincas (RS-02, CA-02-04, CA-02-05)", () => {
  it("muestra solo las fincas del dueño ordenadas por última modificación y oculta ajenas incluso a administradores", async () => {
    const vieja = new Date("2026-11-20T10:00:00.000Z");
    const nueva = new Date("2026-11-21T15:00:00.000Z");

    const [fincaVieja] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_A, "Finca Vieja", vieja))
      .returning({ id: establecimiento.id });

    const [fincaNueva] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_A, "Finca Nueva", nueva))
      .returning({ id: establecimiento.id });

    await db.insert(establecimiento).values(datosFinca(USUARIO_B, "Finca de B", nueva));

    const listaA = await listarEstablecimientosDelUsuario(USUARIO_A);
    expect(listaA.map((f) => f.id)).toEqual([fincaNueva.id, fincaVieja.id]);

    // Dueño accede a su ficha; otro usuario y un administrador reciben null (→ 404).
    expect(await obtenerEstablecimientoDelUsuario(fincaNueva.id, USUARIO_A)).not.toBeNull();
    expect(await obtenerEstablecimientoDelUsuario(fincaNueva.id, USUARIO_B)).toBeNull();
    expect(await obtenerEstablecimientoDelUsuario(fincaNueva.id, USUARIO_ADMIN)).toBeNull();
    expect(await obtenerEstablecimientoDelUsuario("id-invalido", USUARIO_A)).toBeNull();
  });
});

describe("Restricciones de sectores y borrado en cascada (CA-02-06, CA-02-20, CA-02-21)", () => {
  it("hace cumplir los CHECK de tipo de sector y superficie positiva en Postgres", async () => {
    const [finca] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_A, "Finca Controles"))
      .returning({ id: establecimiento.id });

    const [tomate] = await db.select().from(cultivo).where(eq(cultivo.clave, "tomate")).limit(1);

    // sector_flores con cultivoId debe fallar
    await expect(
      db.insert(sector).values({
        establecimientoId: finca.id,
        tipo: "sector_flores",
        cultivoId: tomate.id,
        nombre: "Sector de flores 1",
        superficieHa: "1.0000",
        ubicacionRelativa: "centro",
      }),
    ).rejects.toThrow();

    // cultivo sin cultivoId ni cultivoOtro debe fallar
    await expect(
      db.insert(sector).values({
        establecimientoId: finca.id,
        tipo: "cultivo",
        nombre: "Sin cultivo",
        superficieHa: "1.0000",
        ubicacionRelativa: "centro",
      }),
    ).rejects.toThrow();

    // superficie <= 0 debe fallar
    await expect(
      db.insert(sector).values({
        establecimientoId: finca.id,
        tipo: "sector_flores",
        nombre: "Sector de flores 1",
        superficieHa: "0.0000",
        ubicacionRelativa: "centro",
      }),
    ).rejects.toThrow();
  });

  it("borra sectores al borrar la finca (CA-02-20) y borra fincas y sectores al eliminar el usuario (CA-02-21)", async () => {
    const [finca1] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_A, "Finca Uno"))
      .returning({ id: establecimiento.id });

    const [finca2] = await db
      .insert(establecimiento)
      .values(datosFinca(USUARIO_A, "Finca Dos"))
      .returning({ id: establecimiento.id });

    await db.insert(sector).values([
      {
        establecimientoId: finca1.id,
        tipo: "sector_flores",
        nombre: "Sector de flores 1",
        superficieHa: "1.0000",
        ubicacionRelativa: "centro",
      },
      {
        establecimientoId: finca2.id,
        tipo: "sector_flores",
        nombre: "Sector de flores 1",
        superficieHa: "1.0000",
        ubicacionRelativa: "centro",
      },
    ]);

    // Borrar finca1 elimina sus sectores en cascada (CA-02-20)
    await db.delete(establecimiento).where(eq(establecimiento.id, finca1.id));
    expect(await db.select().from(sector).where(eq(sector.establecimientoId, finca1.id))).toHaveLength(0);
    expect(await db.select().from(sector).where(eq(sector.establecimientoId, finca2.id))).toHaveLength(1);

    // Eliminar el usuario elimina finca2 y sus sectores en cascada (CA-02-21)
    await db.delete(user).where(eq(user.id, USUARIO_A));
    expect(await db.select().from(establecimiento).where(eq(establecimiento.usuarioId, USUARIO_A))).toHaveLength(0);
    expect(await db.select().from(sector).where(eq(sector.establecimientoId, finca2.id))).toHaveLength(0);
  });
});
