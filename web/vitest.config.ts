// Configuración de los tests (Vitest).
//
// Los tests usan una base de datos DESCARTABLE (TEST_DATABASE_URL), cuyo nombre tiene que terminar
// en "_test": antes de empezar se borra y se vuelve a crear con las migraciones (ver
// tests/preparar-base.ts). En la CI es un Postgres temporal; en la computadora de cada integrante,
// una base "policampo_test" en la rama "desarrollo" de Neon, configurada en web/.env.test.local.
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { defineConfig } from "vitest/config";

Object.assign(process.env, { NODE_ENV: "test" });
loadEnvConfig(process.cwd()); // en modo test lee .env.test y .env.test.local (no .env.local)

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" impide importar código del servidor desde el navegador. En los tests (Node)
      // no hay navegador, así que se reemplaza por un módulo vacío.
      "server-only": path.resolve(__dirname, "tests/vacio.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/preparar-base.ts"],
    fileParallelism: false, // todos los archivos comparten la misma base de tests
    testTimeout: 20_000,
  },
});
