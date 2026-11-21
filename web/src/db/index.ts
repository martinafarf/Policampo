// Conexión de Drizzle ORM a PostgreSQL.
//
// - En la app (local, vistas previas y producción) se usa el driver de Neon por WebSocket,
//   que soporta transacciones (las necesitan Better Auth y el guardado de sectores).
// - En los tests (NODE_ENV=test) se usa el driver estándar de Postgres ("pg"), porque la CI
//   levanta un Postgres común, sin Neon (decisión de la T1, especificación 01).
//
// La cadena de conexión viene siempre de variables de entorno (regla RS-01):
// - app: DATABASE_URL (rol policampo_app, solo datos: regla RS-12)
// - tests: TEST_DATABASE_URL (una base descartable, nunca la de desarrollo ni la de producción)
import "server-only";
import { Pool as PoolNeon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Pool as PoolPg } from "pg";
import * as schema from "./schema";

const esTest = process.env.NODE_ENV === "test";

function cadenaDeConexion(): string {
  const nombre = esTest ? "TEST_DATABASE_URL" : "DATABASE_URL";
  const url = process.env[nombre];
  if (!url) {
    // Al compilar (next build, por ejemplo en la CI) Next.js carga los módulos de las rutas, pero
    // nunca consulta la base: ahí se acepta que falte la variable. En ejecución, es un error.
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return "postgresql://compilacion:sin-conexion@localhost:5432/compilacion";
    }
    throw new Error(`Falta la variable de entorno ${nombre} (ver web/.env.example).`);
  }
  return url;
}

function crearDb() {
  if (esTest) {
    return drizzlePg(new PoolPg({ connectionString: cadenaDeConexion() }), { schema });
  }
  // Node.js 22+ trae WebSocket incorporado; el driver de Neon lo usa para hablar con la base.
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  return drizzleNeon(new PoolNeon({ connectionString: cadenaDeConexion() }), { schema });
}

// Los dos drivers comparten la misma API de Drizzle para Postgres.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Una sola instancia por proceso del servidor.
export const db: Db = crearDb();
