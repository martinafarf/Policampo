// Configuración de drizzle-kit: genera y aplica las migraciones (regla RD-08).
//
// - "npm run db:generar" crea una migración SQL en web/drizzle/ a partir de src/db/schema
//   (no se conecta a la base).
// - "npm run db:migrar" la aplica usando DATABASE_URL_MIGRACIONES: el rol policampo_migraciones,
//   que es el único que puede cambiar el esquema (regla RS-12). Ese valor está solo en el
//   .env.local de quien migra; nunca en Vercel.
// - Antes de migrar producción: crear la rama de respaldo en Neon (regla RS-16, web/README.md).
import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_MIGRACIONES ?? "",
  },
  strict: true,
  verbose: true,
});
