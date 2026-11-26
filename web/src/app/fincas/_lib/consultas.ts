// Consultas de establecimientos y sectores en el servidor (especificación 02).
// Regla RS-02: toda consulta filtra siempre por usuario_id = usuario de la sesión.
// Ni siquiera un administrador puede consultar establecimientos ajenos (CA-02-05).
import "server-only";
import { and, asc, count, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { cultivo, establecimiento, sector } from "@/db/schema";
import {
  esUuidValido,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type SubtipoFlores,
  type TipoSector,
  type UbicacionRelativa,
} from "@/dominio/establecimientos";
import type { ClaveEcorregion, NombreDepartamentoJujuy } from "@/datos/jujuy";

export interface ResumenEstablecimiento {
  id: string;
  nombre: string;
  departamento: NombreDepartamentoJujuy;
  localidad: string;
  superficieTotalHa: number | null;
  metodoCaracterizacion: MetodoCaracterizacion;
  cantidadSectores: number;
  actualizadoEn: Date;
}

export interface SectorDetalle {
  id: string;
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoNombre: string | null;
  /** Clave del catálogo ("arandano", "citricos"…): define el color del sector en los dibujos. */
  cultivoClave: string | null;
  cultivoOtro: string | null;
  subtipoFlores: SubtipoFlores | null;
  nombre: string;
  superficieHa: number;
  ubicacionRelativa: UbicacionRelativa | null;
  geometria: PoligonoGeoJson | null;
  orden: number;
}

export interface DetalleEstablecimiento {
  id: string;
  nombre: string;
  direccion: string;
  departamento: NombreDepartamentoJujuy;
  localidad: string;
  localidadEsOtra: boolean;
  ecorregion: ClaveEcorregion;
  superficieTotalHa: number | null;
  metodoCaracterizacion: MetodoCaracterizacion;
  contorno: PoligonoGeoJson | null;
  version: number;
  creadoEn: Date;
  actualizadoEn: Date;
  sectores: SectorDetalle[];
}

export async function listarEstablecimientosDelUsuario(
  usuarioId: string,
): Promise<ResumenEstablecimiento[]> {
  const filas = await db
    .select({
      id: establecimiento.id,
      nombre: establecimiento.nombre,
      departamento: establecimiento.departamento,
      localidad: establecimiento.localidad,
      superficieTotalHa: establecimiento.superficieTotalHa,
      metodoCaracterizacion: establecimiento.metodoCaracterizacion,
      actualizadoEn: establecimiento.actualizadoEn,
      cantidadSectores: count(sector.id),
    })
    .from(establecimiento)
    .leftJoin(sector, eq(sector.establecimientoId, establecimiento.id))
    .where(eq(establecimiento.usuarioId, usuarioId))
    .groupBy(establecimiento.id)
    .orderBy(desc(establecimiento.actualizadoEn));

  return filas.map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    departamento: fila.departamento as NombreDepartamentoJujuy,
    localidad: fila.localidad,
    superficieTotalHa: fila.superficieTotalHa !== null ? Number(fila.superficieTotalHa) : null,
    metodoCaracterizacion: fila.metodoCaracterizacion,
    cantidadSectores: Number(fila.cantidadSectores),
    actualizadoEn: fila.actualizadoEn,
  }));
}

export async function obtenerEstablecimientoDelUsuario(
  id: string,
  usuarioId: string,
): Promise<DetalleEstablecimiento | null> {
  if (!esUuidValido(id)) {
    return null;
  }

  const [finca] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, id), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);

  if (!finca) {
    return null;
  }

  const filasSectores = await db
    .select({
      id: sector.id,
      tipo: sector.tipo,
      cultivoId: sector.cultivoId,
      cultivoNombre: cultivo.nombre,
      cultivoClave: cultivo.clave,
      cultivoOtro: sector.cultivoOtro,
      subtipoFlores: sector.subtipoFlores,
      nombre: sector.nombre,
      superficieHa: sector.superficieHa,
      ubicacionRelativa: sector.ubicacionRelativa,
      geometria: sector.geometria,
      orden: sector.orden,
    })
    .from(sector)
    .leftJoin(cultivo, eq(cultivo.id, sector.cultivoId))
    .where(eq(sector.establecimientoId, finca.id))
    .orderBy(asc(sector.orden), asc(sector.creadoEn));

  return {
    id: finca.id,
    nombre: finca.nombre,
    direccion: finca.direccion,
    departamento: finca.departamento as NombreDepartamentoJujuy,
    localidad: finca.localidad,
    localidadEsOtra: finca.localidadEsOtra,
    ecorregion: finca.ecorregion as ClaveEcorregion,
    superficieTotalHa: finca.superficieTotalHa !== null ? Number(finca.superficieTotalHa) : null,
    metodoCaracterizacion: finca.metodoCaracterizacion,
    contorno: finca.contorno ?? null,
    version: finca.version,
    creadoEn: finca.creadoEn,
    actualizadoEn: finca.actualizadoEn,
    sectores: filasSectores.map((s) => ({
      id: s.id,
      tipo: s.tipo,
      cultivoId: s.cultivoId,
      cultivoNombre: s.cultivoNombre,
      cultivoClave: s.cultivoClave,
      cultivoOtro: s.cultivoOtro,
      subtipoFlores: s.subtipoFlores,
      nombre: s.nombre,
      superficieHa: Number(s.superficieHa),
      ubicacionRelativa: s.ubicacionRelativa,
      geometria: s.geometria ?? null,
      orden: s.orden,
    })),
  };
}

/** Dibujo de una finca para la miniatura del listado: contorno (si es mapa) y sectores con geometría. */
export interface DibujoFinca {
  contorno: PoligonoGeoJson | null;
  sectores: { tipo: TipoSector; cultivoClave: string | null; geometria: PoligonoGeoJson }[];
}

/**
 * Dibujos de todas las fincas del usuario, para mostrar el croquis en miniatura en Mis fincas.
 * Dos consultas para todo el listado (no una por finca). Filtra por usuario (RS-02).
 */
export async function listarDibujosDeFincasDelUsuario(usuarioId: string): Promise<Map<string, DibujoFinca>> {
  const [fincas, sectores] = await Promise.all([
    db
      .select({ id: establecimiento.id, contorno: establecimiento.contorno })
      .from(establecimiento)
      .where(eq(establecimiento.usuarioId, usuarioId)),
    db
      .select({
        establecimientoId: sector.establecimientoId,
        tipo: sector.tipo,
        cultivoClave: cultivo.clave,
        geometria: sector.geometria,
      })
      .from(sector)
      .innerJoin(establecimiento, eq(sector.establecimientoId, establecimiento.id))
      .leftJoin(cultivo, eq(cultivo.id, sector.cultivoId))
      .where(and(eq(establecimiento.usuarioId, usuarioId), isNotNull(sector.geometria)))
      .orderBy(asc(sector.orden)),
  ]);

  const dibujos = new Map<string, DibujoFinca>();
  for (const f of fincas) dibujos.set(f.id, { contorno: f.contorno ?? null, sectores: [] });
  for (const s of sectores) {
    if (s.geometria) dibujos.get(s.establecimientoId)?.sectores.push({ tipo: s.tipo, cultivoClave: s.cultivoClave, geometria: s.geometria });
  }
  return dibujos;
}
