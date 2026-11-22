// Tabla de diagnósticos agroecológicos (especificación 04, sección 8).
// Reglas: RN-01, RN-07, RS-02, RD-08, CA-04-07, CA-04-16 (ON DELETE CASCADE).
import { desc, relations } from "drizzle-orm";
import { index, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import {
  NIVELES_RIESGO,
  type AlertaDiagnostico,
  type AreasAptasDiagnostico,
  type EntradaDiagnostico,
  type GeometriaLibreGeoJson,
} from "@/dominio/diagnostico/tipos";
import { establecimiento } from "./establecimientos";

export const nivelRiesgoEnum = pgEnum("nivel_riesgo", NIVELES_RIESGO);

export const diagnostico = pgTable(
  "diagnostico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimiento.id, { onDelete: "cascade" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    versionReglas: text("version_reglas").notNull(),
    entrada: jsonb("entrada").$type<EntradaDiagnostico>().notNull(),
    superficieTotalHa: numeric("superficie_total_ha", { precision: 12, scale: 4 }).notNull(),
    superficieFloresHa: numeric("superficie_flores_ha", { precision: 12, scale: 4 }).notNull(),
    superficieCultivosHa: numeric("superficie_cultivos_ha", { precision: 12, scale: 4 }).notNull(),
    superficieSinAsignarHa: numeric("superficie_sin_asignar_ha", {
      precision: 12,
      scale: 4,
    }).notNull(),
    hectareasACompensar: numeric("hectareas_a_compensar", { precision: 12, scale: 4 }).notNull(),
    porcentajeFlores: numeric("porcentaje_flores", { precision: 5, scale: 1 }).notNull(),
    deficitPp: numeric("deficit_pp", { precision: 5, scale: 1 }).notNull(),
    nivelRiesgo: nivelRiesgoEnum("nivel_riesgo").notNull(),
    perimetroM: numeric("perimetro_m", { precision: 10, scale: 1 }),
    anchoFranjaM: numeric("ancho_franja_m", { precision: 10, scale: 1 }),
    areasAptas: jsonb("areas_aptas").$type<AreasAptasDiagnostico>().notNull(),
    superficieLibre: jsonb("superficie_libre").$type<GeometriaLibreGeoJson | null>(),
    alertas: jsonb("alertas").$type<AlertaDiagnostico[]>().notNull(),
  },
  (tabla) => [
    index("diagnostico_establecimiento_creado_idx").on(
      tabla.establecimientoId,
      desc(tabla.creadoEn),
    ),
  ],
);

export const diagnosticoRelations = relations(diagnostico, ({ one }) => ({
  establecimiento: one(establecimiento, {
    fields: [diagnostico.establecimientoId],
    references: [establecimiento.id],
  }),
}));
