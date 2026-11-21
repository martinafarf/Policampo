// Conexión a la base de datos PostgreSQL en Neon.
//
// - "server-only" hace que el build falle si alguien importa este archivo desde un componente
//   del navegador: la cadena de conexión nunca puede llegar al cliente (regla RS-01).
// - DATABASE_URL viene de las variables de entorno: .env.local en la compu de cada uno,
//   y la configuración del proyecto en Vercel. Nunca se escribe en el código.
// - El driver de Neon funciona por HTTP, lo que conviene para las funciones de Vercel.
import "server-only";
import { neon } from "@neondatabase/serverless";

function urlDeLaBase(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta la variable de entorno DATABASE_URL (ver web/.env.example).");
  }
  return url;
}

// Uso: const filas = await sql()`SELECT ... WHERE id = ${id}`;
// Los valores entre ${} se envían como parámetros, no se pegan en el texto del SQL (regla RS-07).
export function sql() {
  return neon(urlDeLaBase());
}
