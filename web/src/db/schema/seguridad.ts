// Tablas de seguridad transversales (auditoría de seguridad, especificación 01 sección 7).
import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Registro de eventos de seguridad (auditoría B-02). Se conserva 90 días.
// Solo inserción: la aplicación no actualiza ni borra filas (salvo la limpieza de las viejas).
// Nunca lleva datos personales: solo ids y datos técnicos (regla RS-05).
export const eventoSeguridad = pgTable(
  "evento_seguridad",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: text("tipo").notNull(), // por ejemplo: ingreso_fallido, cuenta_desactivada, cuenta_eliminada
    usuarioId: text("usuario_id").references(() => user.id, { onDelete: "set null" }), // a quién afecta
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }), // quién lo hizo
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    detalle: jsonb("detalle").notNull().default(sql`'{}'::jsonb`),
  },
  (tabla) => [index("evento_seguridad_fecha_idx").on(tabla.fecha)],
);

// Contadores de los límites de uso de los módulos 04 a 07 (regla RS-13).
// La clave identifica qué se limita y para quién, por ejemplo "diagnostico:<id-usuario>".
export const limiteUso = pgTable("limite_uso", {
  clave: text("clave").primaryKey(),
  ventanaInicio: timestamp("ventana_inicio", { withTimezone: true }).notNull(),
  cantidad: integer("cantidad").notNull().default(0),
});
