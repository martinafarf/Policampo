// Limpieza diaria de datos vencidos (especificación 01, sección 7; política de privacidad).
// La corre una vez por día el cron de Vercel (src/app/api/cron/limpieza/route.ts).
//
// - Registro de seguridad: se conserva 90 días (auditoría B-02); lo promete la política de privacidad.
// - Contadores de límites de intentos: las ventanas más largas duran un día; se guardan 2 por las dudas.
// - Enlaces (verificación, recuperación) y sesiones: se borran cuando vencen.
import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventoSeguridad, limiteUso, rateLimit, session, verification } from "@/db/schema";

export const DIAS_REGISTRO_SEGURIDAD = 90;
const DIAS_CONTADORES = 2;
const DIA_MS = 24 * 60 * 60 * 1000;

export type ResultadoLimpieza = {
  eventos: number;
  contadores: number;
  limitesBetterAuth: number;
  enlaces: number;
  sesiones: number;
};

export async function limpiarDatosVencidos(): Promise<ResultadoLimpieza> {
  // Las fechas se comparan con la hora de la base (now()): una sola fuente de tiempo.
  const eventos = await db
    .delete(eventoSeguridad)
    .where(lt(eventoSeguridad.fecha, sql`now() - make_interval(days => ${DIAS_REGISTRO_SEGURIDAD})`))
    .returning({ id: eventoSeguridad.id });
  const contadores = await db
    .delete(limiteUso)
    .where(lt(limiteUso.ventanaInicio, sql`now() - make_interval(days => ${DIAS_CONTADORES})`))
    .returning({ clave: limiteUso.clave });
  const limitesBetterAuth = await db
    .delete(rateLimit)
    .where(lt(rateLimit.lastRequest, Date.now() - DIAS_CONTADORES * DIA_MS))
    .returning({ id: rateLimit.id });
  const enlaces = await db.delete(verification).where(lt(verification.expiresAt, sql`now()`)).returning({ id: verification.id });
  const sesiones = await db.delete(session).where(lt(session.expiresAt, sql`now()`)).returning({ id: session.id });

  return {
    eventos: eventos.length,
    contadores: contadores.length,
    limitesBetterAuth: limitesBetterAuth.length,
    enlaces: enlaces.length,
    sesiones: sesiones.length,
  };
}
