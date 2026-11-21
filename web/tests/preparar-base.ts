// Prepara la base de tests antes de correrlos: la vacía y aplica todas las migraciones.
//
// PROTECCIÓN: solo corre si el nombre de la base termina en "_test". Así es imposible borrar por
// error la base de desarrollo o la de producción (reglas RS-11 y RS-16).
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

export function urlDeTests(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta TEST_DATABASE_URL. Configurala en web/.env.test.local con una base que termine en _test.",
    );
  }
  const nombreBase = new URL(url).pathname.replace(/^\//, "");
  if (!nombreBase.endsWith("_test")) {
    throw new Error(`La base de tests se llama "${nombreBase}": tiene que terminar en "_test". No se toca.`);
  }
  return url;
}

export default async function prepararBase() {
  const cliente = new Client({ connectionString: urlDeTests() });
  await cliente.connect();
  try {
    await cliente.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
    await cliente.query("DROP SCHEMA IF EXISTS public CASCADE");
    await cliente.query("CREATE SCHEMA public");
    await migrate(drizzle(cliente), { migrationsFolder: "./drizzle" });
  } finally {
    await cliente.end();
  }
}
