// Tablas de propuestas de rediseño y mezcla de plantas de servicio (especificación 05, §9).
// Reglas: RN-07, RN-13, RS-02, RD-08, CA-05-16 (única elegida por finca), CA-05-20 (RESTRICT planta).
import { desc, relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  DISPOSICIONES_PROPUESTA,
  type AvisoPropuesta,
  type EspecieEnMezcla,
  type EvaluacionFloracionMezcla,
  type FranjaPropuesta,
  type ParametrosDisposicion,
  type PerdidaCultivoItem,
  type RepartoUbicacionItem,
} from "@/dominio/propuesta/tipos";
import { plantaServicio } from "./catalogo";
import { diagnostico } from "./diagnostico";
import { establecimiento } from "./establecimientos";

export const disposicionPropuestaEnum = pgEnum("disposicion_propuesta", DISPOSICIONES_PROPUESTA);

export const propuesta = pgTable(
  "propuesta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimiento.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id")
      .notNull()
      .references(() => diagnostico.id, { onDelete: "cascade" }),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    nombre: text("nombre"),
    versionReglas: text("version_reglas").notNull(),
    elegida: boolean("elegida").notNull().default(false),
    objetivoPct: numeric("objetivo_pct", { precision: 4, scale: 1 }).notNull(),
    disposicion: disposicionPropuestaEnum("disposicion").notNull(),
    parametros: jsonb("parametros").$type<ParametrosDisposicion>().notNull(),
    franjas: jsonb("franjas").$type<FranjaPropuesta[] | null>(),
    reparto: jsonb("reparto").$type<RepartoUbicacionItem[] | null>(),
    editadaAMano: boolean("editada_a_mano").notNull().default(false),
    superficieFranjasHa: numeric("superficie_franjas_ha", { precision: 12, scale: 4 }).notNull(),
    superficieLibreUsadaHa: numeric("superficie_libre_usada_ha", {
      precision: 12,
      scale: 4,
    }).notNull(),
    porcentajeLogrado: numeric("porcentaje_logrado", { precision: 5, scale: 1 }).notNull(),
    perdidaPorCultivo: jsonb("perdida_por_cultivo").$type<PerdidaCultivoItem[]>().notNull(),
    floracion: jsonb("floracion").$type<EvaluacionFloracionMezcla>().notNull(),
    avisos: jsonb("avisos").$type<AvisoPropuesta[]>().notNull(),
  },
  (tabla) => [
    index("propuesta_establecimiento_creado_idx").on(
      tabla.establecimientoId,
      desc(tabla.creadoEn),
    ),
    // Garantiza a nivel de base que haya a lo sumo una propuesta elegida por finca (CA-05-16).
    uniqueIndex("propuesta_una_elegida_por_finca_idx")
      .on(tabla.establecimientoId)
      .where(sql`${tabla.elegida} = true`),
    check("propuesta_objetivo_rango", sql`${tabla.objetivoPct} BETWEEN 10 AND 40`),
    check(
      "propuesta_nombre_largo",
      sql`${tabla.nombre} IS NULL OR length(${tabla.nombre}) <= 60`,
    ),
  ],
);

export const propuestaEspecie = pgTable(
  "propuesta_especie",
  {
    propuestaId: uuid("propuesta_id")
      .notNull()
      .references(() => propuesta.id, { onDelete: "cascade" }),
    // ON DELETE RESTRICT: una planta usada en alguna propuesta no se puede borrar del catálogo (CA-05-20).
    plantaId: uuid("planta_id")
      .notNull()
      .references(() => plantaServicio.id, { onDelete: "restrict" }),
    proporcionPct: numeric("proporcion_pct", { precision: 4, scale: 1 }).notNull(),
    orden: integer("orden").notNull(),
    // Copia inmutable de los datos de la planta al momento de guardar (CA-05-18).
    copia: jsonb("copia").$type<EspecieEnMezcla>().notNull(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.propuestaId, tabla.plantaId] }),
    index("propuesta_especie_planta_idx").on(tabla.plantaId),
  ],
);

export const propuestaRelations = relations(propuesta, ({ one, many }) => ({
  establecimiento: one(establecimiento, {
    fields: [propuesta.establecimientoId],
    references: [establecimiento.id],
  }),
  diagnostico: one(diagnostico, {
    fields: [propuesta.diagnosticoId],
    references: [diagnostico.id],
  }),
  especies: many(propuestaEspecie),
}));

export const propuestaEspecieRelations = relations(propuestaEspecie, ({ one }) => ({
  propuesta: one(propuesta, {
    fields: [propuestaEspecie.propuestaId],
    references: [propuesta.id],
  }),
  planta: one(plantaServicio, {
    fields: [propuestaEspecie.plantaId],
    references: [plantaServicio.id],
  }),
}));
