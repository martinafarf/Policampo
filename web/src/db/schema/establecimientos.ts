// Tablas de establecimientos y sectores (especificación 02, sección 8).
//
// Reglas aplicadas:
// - RN-02: sectores de tipo "cultivo" (catálogo u "Otro") o "sector_flores" (sin cultivo, subtipo opcional).
// - RN-03: un único metodo_caracterizacion por establecimiento.
// - RN-06: superficies positivas en hectáreas con hasta 4 decimales (numeric(12, 4)).
// - RS-02: ids uuid (no predecibles) y usuario_id indexado para filtrar siempre por dueño.
// - RS-15: columna version para evitar sobrescrituras simultáneas entre dispositivos.
// - Borrado en cascada desde user -> establecimiento -> sector (CA-02-20 y CA-02-21).
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CLAVES_ECORREGION, NOMBRES_DEPARTAMENTOS_JUJUY } from "@/datos/jujuy";
import {
  METODOS_CARACTERIZACION,
  SUBTIPOS_FLORES,
  TIPOS_SECTOR,
  UBICACIONES_RELATIVAS,
  type PoligonoGeoJson,
} from "@/dominio/establecimientos/tipos";
import { user } from "./auth";
import { cultivo } from "./cultivos";

export const metodoCaracterizacionEnum = pgEnum(
  "metodo_caracterizacion",
  METODOS_CARACTERIZACION,
);

export const tipoSectorEnum = pgEnum("tipo_sector", TIPOS_SECTOR);

export const subtipoFloresEnum = pgEnum("subtipo_flores", SUBTIPOS_FLORES);

export const ubicacionRelativaEnum = pgEnum("ubicacion_relativa", UBICACIONES_RELATIVAS);

function listaSql(valores: readonly string[]) {
  return sql.join(
    valores.map((valor) => sql.raw(`'${valor.replace(/'/g, "''")}'`)),
    sql`, `,
  );
}

export const establecimiento = pgTable(
  "establecimiento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    direccion: text("direccion").notNull(),
    departamento: text("departamento").notNull(),
    localidad: text("localidad").notNull(),
    localidadEsOtra: boolean("localidad_es_otra").notNull().default(false),
    ecorregion: text("ecorregion").notNull(),
    // Nula solo cuando metodo_caracterizacion = 'mapa' y todavía no se dibujó el contorno.
    superficieTotalHa: numeric("superficie_total_ha", { precision: 12, scale: 4 }),
    metodoCaracterizacion: metodoCaracterizacionEnum("metodo_caracterizacion").notNull(),
    // GeoJSON del contorno en el método mapa; nulo en cuestionario y croquis.
    contorno: jsonb("contorno").$type<PoligonoGeoJson | null>(),
    // Control optimista de concurrencia: suma 1 con cada guardado (RS-15, auditoría M-04).
    version: integer("version").notNull().default(1),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index("establecimiento_usuario_id_idx").on(tabla.usuarioId),
    // Nombre único por usuario sin distinguir mayúsculas (CA-02-02).
    uniqueIndex("establecimiento_usuario_nombre_unico_idx").on(
      tabla.usuarioId,
      sql`lower(${tabla.nombre})`,
    ),
    check(
      "establecimiento_departamento_valido",
      sql`${tabla.departamento} IN (${listaSql(NOMBRES_DEPARTAMENTOS_JUJUY)})`,
    ),
    check(
      "establecimiento_ecorregion_valida",
      sql`${tabla.ecorregion} IN (${listaSql(CLAVES_ECORREGION)})`,
    ),
    check(
      "establecimiento_superficie_positiva",
      sql`${tabla.superficieTotalHa} IS NULL OR ${tabla.superficieTotalHa} > 0`,
    ),
    check(
      "establecimiento_superficie_segun_metodo",
      sql`${tabla.metodoCaracterizacion} = 'mapa' OR ${tabla.superficieTotalHa} IS NOT NULL`,
    ),
    check(
      "establecimiento_contorno_solo_mapa",
      sql`${tabla.metodoCaracterizacion} = 'mapa' OR ${tabla.contorno} IS NULL`,
    ),
    check("establecimiento_version_positiva", sql`${tabla.version} >= 1`),
  ],
);

export const sector = pgTable(
  "sector",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    establecimientoId: uuid("establecimiento_id")
      .notNull()
      .references(() => establecimiento.id, { onDelete: "cascade" }),
    tipo: tipoSectorEnum("tipo").notNull(),
    cultivoId: uuid("cultivo_id").references(() => cultivo.id, { onDelete: "restrict" }),
    cultivoOtro: text("cultivo_otro"),
    subtipoFlores: subtipoFloresEnum("subtipo_flores"),
    nombre: text("nombre").notNull(),
    superficieHa: numeric("superficie_ha", { precision: 12, scale: 4 }).notNull(),
    ubicacionRelativa: ubicacionRelativaEnum("ubicacion_relativa"),
    geometria: jsonb("geometria").$type<PoligonoGeoJson | null>(),
    orden: integer("orden").notNull().default(0),
    creadoEn: timestamp("creado_en", { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index("sector_establecimiento_id_idx").on(tabla.establecimientoId),
    check("sector_superficie_positiva", sql`${tabla.superficieHa} > 0`),
    // Coherencia RN-02: cultivo exige cultivo_id o cultivo_otro (sin subtipo_flores);
    // sector_flores no puede tener cultivo_id ni cultivo_otro.
    check(
      "sector_coherencia_tipo",
      sql`(
        ${tabla.tipo} = 'cultivo'
        AND (
          (${tabla.cultivoId} IS NOT NULL AND ${tabla.cultivoOtro} IS NULL)
          OR (${tabla.cultivoId} IS NULL AND ${tabla.cultivoOtro} IS NOT NULL AND length(btrim(${tabla.cultivoOtro})) > 0)
        )
        AND ${tabla.subtipoFlores} IS NULL
      ) OR (
        ${tabla.tipo} = 'sector_flores'
        AND ${tabla.cultivoId} IS NULL
        AND ${tabla.cultivoOtro} IS NULL
      )`,
    ),
  ],
);

export const establecimientoRelations = relations(establecimiento, ({ one, many }) => ({
  usuario: one(user, { fields: [establecimiento.usuarioId], references: [user.id] }),
  sectores: many(sector),
}));

export const sectorRelations = relations(sector, ({ one }) => ({
  establecimiento: one(establecimiento, {
    fields: [sector.establecimientoId],
    references: [establecimiento.id],
  }),
  cultivo: one(cultivo, { fields: [sector.cultivoId], references: [cultivo.id] }),
}));
