// Cron de Vercel: borra los datos vencidos una vez por día (web/vercel.json, src/lib/limpieza.ts).
//
// Vercel llama a esta ruta con el encabezado "Authorization: Bearer <CRON_SECRET>". Sin ese secreto
// responde 401: nadie de afuera puede dispararla. Solo devuelve cuántas filas borró (sin datos).
import { connection } from "next/server";
import { limpiarDatosVencidos } from "@/lib/limpieza";

export async function GET(pedido: Request): Promise<Response> {
  await connection(); // se ejecuta en cada pedido, nunca se pre-genera
  const secreto = process.env.CRON_SECRET;
  if (!secreto || pedido.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const resultado = await limpiarDatosVencidos();
  console.info("Limpieza diaria:", JSON.stringify(resultado));
  return Response.json(resultado);
}
