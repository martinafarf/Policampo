// Tablas de autenticación (Better Auth 1.7 + plugins username y admin).
//
// Los nombres de las tablas (user, session, account, verification, rateLimit) y de sus campos los
// fija Better Auth, en inglés: la regla RD-02 lo permite para términos de la librería. Los campos
// agregados por el proyecto están en español. Las columnas usan snake_case en la base.
// Especificación 01, sección 7. Si se actualiza Better Auth, comparar con
// node_modules/@better-auth/core/dist/db/get-tables.mjs y con los schema de los plugins.
import { relations } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  // Better Auth exige "name". Como el registro no pide nombre (RS-05), la T3 guarda acá el
  // nombre de usuario tal como se escribió. El nombre real es opcional: "nombre" y "apellido".
  name: text("name").notNull(),
  email: text("email").notNull().unique(), // en minúsculas
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Plugin username: único y en minúsculas; display_username conserva cómo se escribió.
  username: text("username").unique(),
  displayUsername: text("display_username"),
  // Plugin admin: rol (usuario | administrador) y desactivación de la cuenta.
  role: text("role").notNull().default("usuario"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  // Campos del proyecto (especificación 01).
  nombre: text("nombre"),
  apellido: text("apellido"),
  politicaPrivacidadVersion: text("politica_privacidad_version"),
  politicaPrivacidadAceptadaEn: timestamp("politica_privacidad_aceptada_en", { withTimezone: true }),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"), // plugin admin (la suplantación está desactivada)
  },
  (tabla) => [index("session_user_id_idx").on(tabla.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"), // hash scrypt: nunca se expone ni se registra
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index("account_user_id_idx").on(tabla.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index("verification_identifier_idx").on(tabla.identifier)],
);

// Contadores del límite de intentos de Better Auth, en la base (regla RS-13).
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(), // milisegundos
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));
