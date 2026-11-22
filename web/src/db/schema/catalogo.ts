// Esquema Drizzle del catálogo de especies y compatibilidades (especificación 03, sección 8).
//
// Reglas aplicadas:
// - RN-08: matriz de compatibilidad cultivo-planta de -5 a +5 con justificación agronómica.
// - RN-12: plantas disponibles en Jujuy (es_espontanea OR en_mercado_local) y períodos por ecorregión.
// - RN-13: estados borrador / publicado / retirado; publicar exige fuente y validador; historial inmutable.
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
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
import { CLAVES_ECORREGION } from "@/datos/jujuy";
import {
  ACCIONES_CATALOGO,
  CICLOS_PLANTA,
  ENTIDADES_CATALOGO,
  FUNCIONES_PLANTA,
  NIVELES_AGUA,
  ORIGENES_PLANTA,
  RIESGOS_MALEZA,
  type RangoSemanas,
} from "@/dominio/catalogo/tipos";
import { user } from "./auth";
import { cultivo, estadoCatalogoEnum, fuenteTipoEnum } from "./cultivos";

export const funcionPlantaEnum = pgEnum("funcion_planta", FUNCIONES_PLANTA);
export const cicloPlantaEnum = pgEnum("ciclo_planta", CICLOS_PLANTA);
export const origenPlantaEnum = pgEnum("origen_planta", ORIGENES_PLANTA);
export const nivelAguaEnum = pgEnum("nivel_agua", NIVELES_AGUA);
export const riesgoMalezaEnum = pgEnum("riesgo_maleza", RIESGOS_MALEZA);
export const entidadCatalogoEnum = pgEnum("entidad_catalogo", ENTIDADES_CATALOGO);
export const accionCatalogoEnum = pgEnum("accion_catalogo", ACCIONES_CATALOGO);

function listaEcorregionesSql() {
  return sql.join(
    CLAVES_ECORREGION.map((valor) => sql.raw(`'${valor}'`)),
    sql`, `,
  );
}

export const plantaServicio = pgTable(
  "planta_servicio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clave: text("clave").notNull().unique(), // única, en minúsculas, no cambia tras crearse
    nombreComun: text("nombre_comun").notNull(),
    nombreCientifico: text("nombre_cientifico"),
    funciones: funcionPlantaEnum("funciones").array().notNull(),
    ciclo: cicloPlantaEnum("ciclo").notNull(),
    origen: origenPlantaEnum("origen").notNull().default("desconocido"),
    esEspontanea: boolean("es_espontanea").notNull().default(false),
    enMercadoLocal: boolean("en_mercado_local").notNull().default(false),
    polinizadoresQueAtrae: text("polinizadores_que_atrae"),
    beneficios: text("beneficios"),
    necesidadAgua: nivelAguaEnum("necesidad_agua").notNull().default("media"),
    manejoCorte: text("manejo_corte"),
    riesgoMaleza: riesgoMalezaEnum("riesgo_maleza").notNull().default("bajo"),
    dosisSiembra: text("dosis_siembra"),
    costoReferenciaArsHa: numeric("costo_referencia_ars_ha", { precision: 12, scale: 2 }),
    costoReferenciaFecha: date("costo_referencia_fecha"),
    estado: estadoCatalogoEnum("estado").notNull().default("borrador"),
    fuenteTipo: fuenteTipoEnum("fuente_tipo"),
    fuenteDetalle: text("fuente_detalle"),
    validadoPor: text("validado_por"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    check(
      "planta_servicio_clave_normalizada",
      sql`${tabla.clave} = lower(btrim(${tabla.clave})) AND length(${tabla.clave}) > 0`,
    ),
    check("planta_servicio_funciones_no_vacias", sql`cardinality(${tabla.funciones}) >= 1`),
    check(
      "planta_servicio_disponibilidad_local",
      sql`${tabla.esEspontanea} OR ${tabla.enMercadoLocal}`,
    ),
    check(
      "planta_servicio_campos_publicacion",
      sql`${tabla.estado} <> 'publicado' OR (
        ${tabla.nombreCientifico} IS NOT NULL AND length(btrim(${tabla.nombreCientifico})) > 0
        AND ${tabla.beneficios} IS NOT NULL AND length(btrim(${tabla.beneficios})) > 0
        AND ${tabla.manejoCorte} IS NOT NULL AND length(btrim(${tabla.manejoCorte})) > 0
        AND ${tabla.fuenteTipo} IS NOT NULL
        AND ${tabla.fuenteDetalle} IS NOT NULL AND length(btrim(${tabla.fuenteDetalle})) > 0
        AND ${tabla.validadoPor} IS NOT NULL AND length(btrim(${tabla.validadoPor})) > 0
      )`,
    ),
  ],
);

export const plantaServicioEcorregion = pgTable(
  "planta_servicio_ecorregion",
  {
    plantaId: uuid("planta_id")
      .notNull()
      .references(() => plantaServicio.id, { onDelete: "cascade" }),
    ecorregion: text("ecorregion").notNull(),
    siembraSemanas: jsonb("siembra_semanas")
      .$type<RangoSemanas[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    floracionSemanas: jsonb("floracion_semanas")
      .$type<RangoSemanas[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    corteSemanas: jsonb("corte_semanas")
      .$type<RangoSemanas[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    semanasHastaFloracionMin: integer("semanas_hasta_floracion_min"),
    semanasHastaFloracionMax: integer("semanas_hasta_floracion_max"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.plantaId, tabla.ecorregion] }),
    check(
      "planta_ecorregion_valida",
      sql`${tabla.ecorregion} IN (${listaEcorregionesSql()})`,
    ),
    check(
      "planta_semanas_floracion_coherentes",
      sql`(${tabla.semanasHastaFloracionMin} IS NULL OR ${tabla.semanasHastaFloracionMin} > 0)
      AND (${tabla.semanasHastaFloracionMax} IS NULL OR ${tabla.semanasHastaFloracionMax} > 0)
      AND (
        ${tabla.semanasHastaFloracionMin} IS NULL
        OR ${tabla.semanasHastaFloracionMax} IS NULL
        OR ${tabla.semanasHastaFloracionMax} >= ${tabla.semanasHastaFloracionMin}
      )`,
    ),
  ],
);

export const cultivoEcorregion = pgTable(
  "cultivo_ecorregion",
  {
    cultivoId: uuid("cultivo_id")
      .notNull()
      .references(() => cultivo.id, { onDelete: "cascade" }),
    ecorregion: text("ecorregion").notNull(),
    floracionSemanas: jsonb("floracion_semanas")
      .$type<RangoSemanas[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    cosechaSemanas: jsonb("cosecha_semanas")
      .$type<RangoSemanas[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.cultivoId, tabla.ecorregion] }),
    check(
      "cultivo_ecorregion_valida",
      sql`${tabla.ecorregion} IN (${listaEcorregionesSql()})`,
    ),
  ],
);

export const compatibilidad = pgTable(
  "compatibilidad",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cultivoId: uuid("cultivo_id")
      .notNull()
      .references(() => cultivo.id, { onDelete: "restrict" }),
    plantaId: uuid("planta_id")
      .notNull()
      .references(() => plantaServicio.id, { onDelete: "restrict" }),
    grado: integer("grado").notNull(),
    justificacion: text("justificacion").notNull(),
    estado: estadoCatalogoEnum("estado").notNull().default("borrador"),
    fuenteTipo: fuenteTipoEnum("fuente_tipo"),
    fuenteDetalle: text("fuente_detalle"),
    validadoPor: text("validado_por"),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex("compatibilidad_cultivo_planta_unico_idx").on(tabla.cultivoId, tabla.plantaId),
    check("compatibilidad_grado_rango", sql`${tabla.grado} BETWEEN -5 AND 5`),
    check(
      "compatibilidad_justificacion_largo",
      sql`length(btrim(${tabla.justificacion})) BETWEEN 10 AND 500`,
    ),
    check(
      "compatibilidad_campos_publicacion",
      sql`${tabla.estado} <> 'publicado' OR (
        ${tabla.fuenteTipo} IS NOT NULL
        AND ${tabla.fuenteDetalle} IS NOT NULL AND length(btrim(${tabla.fuenteDetalle})) > 0
        AND ${tabla.validadoPor} IS NOT NULL AND length(btrim(${tabla.validadoPor})) > 0
      )`,
    ),
  ],
);

// Historial inmutable de cambios del catálogo (CA-03-15). Solo inserción.
export const cambioCatalogo = pgTable(
  "cambio_catalogo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entidad: entidadCatalogoEnum("entidad").notNull(),
    entidadId: uuid("entidad_id").notNull(),
    accion: accionCatalogoEnum("accion").notNull(),
    administradorId: text("administrador_id").references(() => user.id, { onDelete: "set null" }),
    fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
    antes: jsonb("antes").$type<Record<string, unknown> | null>(),
    despues: jsonb("despues").$type<Record<string, unknown> | null>(),
    motivo: text("motivo"),
  },
  (tabla) => [
    index("cambio_catalogo_entidad_idx").on(tabla.entidad, tabla.entidadId),
    index("cambio_catalogo_fecha_idx").on(tabla.fecha),
  ],
);

export const plantaServicioRelations = relations(plantaServicio, ({ many }) => ({
  ecorregiones: many(plantaServicioEcorregion),
  compatibilidades: many(compatibilidad),
}));

export const plantaServicioEcorregionRelations = relations(plantaServicioEcorregion, ({ one }) => ({
  planta: one(plantaServicio, {
    fields: [plantaServicioEcorregion.plantaId],
    references: [plantaServicio.id],
  }),
}));

export const cultivoEcorregionRelations = relations(cultivoEcorregion, ({ one }) => ({
  cultivo: one(cultivo, {
    fields: [cultivoEcorregion.cultivoId],
    references: [cultivo.id],
  }),
}));

export const compatibilidadRelations = relations(compatibilidad, ({ one }) => ({
  cultivo: one(cultivo, { fields: [compatibilidad.cultivoId], references: [cultivo.id] }),
  planta: one(plantaServicio, {
    fields: [compatibilidad.plantaId],
    references: [plantaServicio.id],
  }),
}));
