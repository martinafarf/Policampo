// Consultas del catálogo de cultivos para los formularios de sectores (Esp. 02, sección 8).
import "server-only";
import { asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { cultivo } from "@/db/schema";
import type { CultivoCatalogoItem } from "@/dominio/establecimientos";

// Devuelve los cultivos activos ordenados alfabéticamente, más cualquier cultivo inactivo que ya
// esté asignado a un sector existente de la finca para que se siga mostrando sin romperse.
export async function listarCultivosParaFinca(
  idsYaAsignados: readonly string[] = [],
): Promise<CultivoCatalogoItem[]> {
  const filtro =
    idsYaAsignados.length > 0
      ? or(eq(cultivo.activo, true), inArray(cultivo.id, [...idsYaAsignados]))
      : eq(cultivo.activo, true);

  return db
    .select({
      id: cultivo.id,
      clave: cultivo.clave,
      nombre: cultivo.nombre,
      activo: cultivo.activo,
    })
    .from(cultivo)
    .where(filtro)
    .orderBy(asc(cultivo.nombre));
}
