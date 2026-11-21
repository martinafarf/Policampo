// GET /api/salud: comprueba que la app está desplegada y que la base de datos responde.
// Sirve para verificar la conexión Vercel ↔ Neon. No devuelve datos de la base ni el detalle
// de los errores, para no exponer información interna.
import { sql } from "@/lib/db";

export async function GET() {
  try {
    await sql()`SELECT 1`;
    return Response.json({ app: "ok", baseDeDatos: "ok" });
  } catch (error) {
    // El detalle queda en los logs del servidor (sin datos personales: regla RS-05).
    console.error("Fallo la conexión con la base de datos:", error instanceof Error ? error.message : error);
    return Response.json({ app: "ok", baseDeDatos: "sin conexión" }, { status: 503 });
  }
}
