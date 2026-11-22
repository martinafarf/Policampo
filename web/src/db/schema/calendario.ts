// Tablas del calendario agroecológico y checklist de tareas (especificación 06, §8).
// Reglas: RN-10, RN-11, RS-02, RD-08, CA-06-09 (informativas no marcables), CA-06-10 (1 activo/finca).
import { desc, relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  TIPOS_TAREA,
  type AvisoCalendario,
} from "@/dominio/calendario/tipos";
import { establecimiento } from "./establecimientos";
import { propuesta } from "./propuesta";

export const tipoTareaEnum = pgEnum("tipo_tarea", TIPOS_TAREA);

export const calendario = pgTable(
  "calendario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimiento.id, { onDelete: "cascade" }),
    // Si se borra la propuesta, el calendario sigue existiendo como historial (§8).
    propuestaId: uuid("propuesta_id").references(() => propuesta.id, { onDelete: "set null" }),
    temporadaInicio: date("temporada_inicio").notNull(),
    temporadaFin: date("temporada_fin").notNull(),
    generadoEn: timestamp("generado_en", { withTimezone: true }).notNull().defaultNow(),
    cerradoEn: timestamp("cerrado_en", { withTimezone: true }),
    versionReglas: text("version_reglas").notNull(),
    avisos: jsonb("avisos").$type<AvisoCalendario[]>().notNull(),
  },
  (tabla) => [
    index("calendario_establecimiento_generado_idx").on(
      tabla.establecimientoId,
      desc(tabla.generadoEn),
    ),
    // Garantiza a nivel de base que nunca haya dos calendarios activos en la misma finca (CA-06-10).
    uniqueIndex("calendario_activo_unico_por_finca_idx")
      .on(tabla.establecimientoId)
      .where(sql`${tabla.cerradoEn} IS NULL`),
  ],
);

export const tarea = pgTable(
  "tarea",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarioId: uuid("calendario_id")
      .notNull()
      .references(() => calendario.id, { onDelete: "cascade" }),
    tipo: tipoTareaEnum("tipo").notNull(),
    plantaNombre: text("planta_nombre"),
    cultivoNombre: text("cultivo_nombre"),
    titulo: text("titulo").notNull(),
    descripcion: text("descripcion").notNull(),
    fechaInicio: date("fecha_inicio").notNull(),
    fechaFin: date("fecha_fin").notNull(),
    estimada: boolean("estimada").notNull().default(false),
    hechaEn: date("hecha_en"),
    nota: text("nota"),
    orden: integer("orden").notNull().default(0),
  },
  (tabla) => [
    index("tarea_calendario_fecha_idx").on(tabla.calendarioId, tabla.fechaInicio),
    check("tarea_fechas_coherentes", sql`${tabla.fechaFin} >= ${tabla.fechaInicio}`),
    check(
      "tarea_informativa_no_marcable",
      sql`${tabla.hechaEn} IS NULL OR ${tabla.tipo} NOT IN ('info_floracion_cultivo', 'info_cosecha_cultivo', 'info_floracion_planta')`,
    ),
    check("tarea_nota_largo", sql`${tabla.nota} IS NULL OR length(${tabla.nota}) <= 300`),
  ],
);

export const calendarioRelations = relations(calendario, ({ one, many }) => ({
  establecimiento: one(establecimiento, {
    fields: [calendario.establecimientoId],
    references: [establecimiento.id],
  }),
  propuesta: one(propuesta, {
    fields: [calendario.propuestaId],
    references: [propuesta.id],
  }),
  tareas: many(tarea),
}));

export const tareaRelations = relations(tarea, ({ one }) => ({
  calendario: one(calendario, {
    fields: [tarea.calendarioId],
    references: [calendario.id],
  }),
}));
