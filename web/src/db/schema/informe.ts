// Tabla de informes técnicos emitidos con su foto inmutable (especificación 07, §8).
// Reglas: RS-02, RS-05, RD-08, CA-07-02, CA-07-09, CA-07-14.
import { desc, relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { FotoInforme } from "@/dominio/informe/tipos";
import { calendario } from "./calendario";
import { diagnostico } from "./diagnostico";
import { establecimiento } from "./establecimientos";
import { propuesta } from "./propuesta";

export const informe = pgTable(
  "informe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codigo: text("codigo").notNull().unique(),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimiento.id, { onDelete: "cascade" }),
    // Referencias opcionales con ON DELETE SET NULL: el PDF se arma siempre desde la foto (CA-07-09, 14).
    diagnosticoId: uuid("diagnostico_id").references(() => diagnostico.id, {
      onDelete: "set null",
    }),
    propuestaId: uuid("propuesta_id").references(() => propuesta.id, { onDelete: "set null" }),
    calendarioId: uuid("calendario_id").references(() => calendario.id, { onDelete: "set null" }),
    emitidoEn: timestamp("emitido_en", { withTimezone: true }).notNull().defaultNow(),
    incluyeNombre: boolean("incluye_nombre").notNull().default(false),
    versionPlantilla: text("version_plantilla").notNull(),
    contenido: jsonb("contenido").$type<FotoInforme>().notNull(),
  },
  (tabla) => [
    index("informe_establecimiento_emitido_idx").on(
      tabla.establecimientoId,
      desc(tabla.emitidoEn),
    ),
  ],
);

export const informeRelations = relations(informe, ({ one }) => ({
  establecimiento: one(establecimiento, {
    fields: [informe.establecimientoId],
    references: [establecimiento.id],
  }),
  diagnostico: one(diagnostico, {
    fields: [informe.diagnosticoId],
    references: [diagnostico.id],
  }),
  propuesta: one(propuesta, {
    fields: [informe.propuestaId],
    references: [propuesta.id],
  }),
  calendario: one(calendario, {
    fields: [informe.calendarioId],
    references: [calendario.id],
  }),
}));
