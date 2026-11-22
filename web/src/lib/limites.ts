// Límites de uso compartidos entre todas las instancias del servidor (regla RS-13).
// Los contadores viven en la tabla limite_uso. Las claves llevan un hash del identificador
// (email, usuario o IP), nunca el valor en claro (regla RS-05).
import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Los dos drivers (Neon y pg) devuelven las filas en "rows".
type FilasConCantidad = { rows: { cantidad: number | string }[] };

export function claveDeLimite(tipo: string, identificador: string): string {
  const hash = createHash("sha256").update(identificador.trim().toLowerCase()).digest("hex").slice(0, 32);
  return `${tipo}:${hash}`;
}

/** Cuántos intentos hubo en la ventana vigente (sin sumar uno). */
export async function contarIntentos(clave: string, ventanaSegundos: number): Promise<number> {
  const filas = (await db.execute(sql`
    SELECT cantidad FROM limite_uso
    WHERE clave = ${clave} AND ventana_inicio >= now() - make_interval(secs => ${ventanaSegundos})
  `)) as unknown as FilasConCantidad;
  return Number(filas.rows[0]?.cantidad ?? 0);
}

/**
 * Suma un intento de forma atómica (una sola sentencia, sin carreras entre instancias) y devuelve
 * el total de la ventana. Si la ventana venció, vuelve a empezar en 1.
 */
export async function sumarIntento(clave: string, ventanaSegundos: number): Promise<number> {
  const filas = (await db.execute(sql`
    INSERT INTO limite_uso (clave, ventana_inicio, cantidad) VALUES (${clave}, now(), 1)
    ON CONFLICT (clave) DO UPDATE SET
      cantidad = CASE WHEN limite_uso.ventana_inicio < now() - make_interval(secs => ${ventanaSegundos})
                      THEN 1 ELSE limite_uso.cantidad + 1 END,
      ventana_inicio = CASE WHEN limite_uso.ventana_inicio < now() - make_interval(secs => ${ventanaSegundos})
                            THEN now() ELSE limite_uso.ventana_inicio END
    RETURNING cantidad
  `)) as unknown as FilasConCantidad;
  return Number(filas.rows[0]?.cantidad ?? 1);
}

/** Suma un intento y dice si todavía está dentro del máximo permitido. */
export async function consumirIntento(clave: string, ventanaSegundos: number, maximo: number): Promise<boolean> {
  return (await sumarIntento(clave, ventanaSegundos)) <= maximo;
}

/** Borra el contador (por ejemplo, después de un ingreso correcto). */
export async function reiniciarIntentos(clave: string): Promise<void> {
  await db.execute(sql`DELETE FROM limite_uso WHERE clave = ${clave}`);
}
