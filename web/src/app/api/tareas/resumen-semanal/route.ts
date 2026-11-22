// Endpoint programado GET/POST /api/tareas/resumen-semanal (Esp. 06 §5.6, §7, CA-06-14, RS-01, RS-05).
// Exige Authorization: Bearer <CRON_SECRET>; registra solo conteos, nunca emails ni contenidos.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ejecutarEnvioResumenSemanal } from "@/dominio/calendario/servicio";

function verificarAutorizacionCron(request: Request): boolean {
  const secreto = process.env.CRON_SECRET ?? "";
  if (secreto.length < 16) return false;

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const recibido = header.slice("Bearer ".length);

  const bufRec = Buffer.from(recibido, "utf8");
  const bufEsp = Buffer.from(secreto, "utf8");
  return bufRec.length === bufEsp.length && timingSafeEqual(bufRec, bufEsp);
}

async function manejarEjecucion(request: Request) {
  if (!verificarAutorizacionCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const secretoBaja = process.env.EMAIL_BAJA_SECRET ?? "";
  if (secretoBaja.length < 16) {
    return NextResponse.json(
      { error: "Falta configurar EMAIL_BAJA_SECRET en el entorno." },
      { status: 500 },
    );
  }

  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://policampo.vercel.app";
  const resumen = await ejecutarEnvioResumenSemanal({
    baseUrl,
    secretoBaja,
  });

  // Regla RS-05: solo cantidades, nunca emails ni datos personales.
  console.info(
    `[resumen-semanal] evaluados=${resumen.evaluados} enviados=${resumen.enviados} omitidos=${resumen.omitidos}`,
  );

  return NextResponse.json(resumen, { status: 200 });
}

export async function GET(request: Request) {
  return manejarEjecucion(request);
}

export async function POST(request: Request) {
  return manejarEjecucion(request);
}
