// Tabla de cultivos del catálogo (especificación 02, ampliada en especificación 03, sección 8).
import { sql } from "drizzle-orm";
import { boolean, check, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  DEPENDENCIAS_POLINIZACION,
  ESTADOS_CATALOGO,
  FUENTES_TIPO,
} from "@/dominio/catalogo/tipos";

export const estadoCatalogoEnum = pgEnum("estado_catalogo", ESTADOS_CATALOGO);
export const fuenteTipoEnum = pgEnum("fuente_tipo", FUENTES_TIPO);
export const dependenciaPolinizacionEnum = pgEnum(
  "dependencia_polinizacion",
  DEPENDENCIAS_POLINIZACION,
);

export const cultivo = pgTable(
  "cultivo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clave: text("clave").notNull().unique(), // única, en minúsculas, ej. "tomate"
    nombre: text("nombre").notNull(), // ej. "Tomate"
    activo: boolean("activo").notNull().default(true),
    // Ampliación del módulo 03 (datos agronómicos, validación y trazabilidad).
    dependenciaPolinizacion: dependenciaPolinizacionEnum("dependencia_polinizacion"),
    tipoPolinizacion: text("tipo_polinizacion"),
    polinizadoresNecesarios: text("polinizadores_necesarios"),
    estado: estadoCatalogoEnum("estado").notNull().default("borrador"),
    fuenteTipo: fuenteTipoEnum("fuente_tipo"),
    fuenteDetalle: text("fuente_detalle"),
    validadoPor: text("validado_por"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check(
      "cultivo_clave_normalizada",
      sql`${tabla.clave} = lower(btrim(${tabla.clave})) AND length(${tabla.clave}) > 0`,
    ),
    check(
      "cultivo_campos_publicacion",
      sql`${tabla.estado} <> 'publicado' OR (
        ${tabla.dependenciaPolinizacion} IS NOT NULL
        AND ${tabla.fuenteTipo} IS NOT NULL
        AND ${tabla.fuenteDetalle} IS NOT NULL
        AND length(btrim(${tabla.fuenteDetalle})) > 0
        AND ${tabla.validadoPor} IS NOT NULL
        AND length(btrim(${tabla.validadoPor})) > 0
      )`,
    ),
  ],
);
