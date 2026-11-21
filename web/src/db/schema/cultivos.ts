// Tabla de cultivos del catálogo base (especificación 02, sección 8).
// El módulo 03 (catálogo de especies) amplía esta tabla con datos agronómicos y estado editorial.
import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const cultivo = pgTable(
  "cultivo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clave: text("clave").notNull().unique(), // única, en minúsculas, ej. "tomate"
    nombre: text("nombre").notNull(), // ej. "Tomate"
    activo: boolean("activo").notNull().default(true),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check(
      "cultivo_clave_normalizada",
      sql`${tabla.clave} = lower(btrim(${tabla.clave})) AND length(${tabla.clave}) > 0`,
    ),
  ],
);
