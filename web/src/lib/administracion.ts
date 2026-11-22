// Servicio de administración (especificación 01, flujo 4.7, T6): lista de usuarios, desactivar y
// reactivar cuentas, y crear o ascender administradores (lo usa el comando crear-admin).
//
// Las rutas /api/auth/admin/... de Better Auth están cerradas al público (src/lib/auth.ts): solo se
// llega a desactivar o reactivar pasando por estas funciones, que aplican la auditoría M-08.
import "server-only";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import {
  emailValido,
  nombreDeUsuarioValido,
  normalizarEmail,
  USUARIO_MAX,
  USUARIO_MIN,
  validarContrasena,
} from "@/dominio/usuarios/validaciones";
import { auth } from "@/lib/auth";
import { codigoDeError } from "@/lib/cuentas";
import { registrarEvento } from "@/lib/eventos";

export const USUARIOS_POR_PAGINA = 20;

// ─── Lista de usuarios (CA-01-20 y 21) ───

/** Lo que muestra la tabla. Se eligen las columnas una por una: nunca hashes ni tokens (CA-01-21). */
export type FilaUsuario = {
  id: string;
  usuario: string;
  email: string;
  registradoEn: Date;
  verificado: boolean;
  rol: "usuario" | "administrador";
  desactivada: boolean;
};

export type ListaUsuarios = { filas: FilaUsuario[]; total: number; pagina: number; paginas: number };

/** Usuarios de a 20, del más nuevo al más viejo. `busqueda` filtra por usuario o email (sin mayúsculas). */
export async function listarUsuarios({ busqueda = "", pagina = 1 }: { busqueda?: string; pagina?: number }): Promise<ListaUsuarios> {
  const texto = busqueda.trim().slice(0, 100);
  // Los comodines de LIKE (% y _) se escapan: buscar "ana_g" busca ese texto, no "ana" + un carácter.
  const patron = `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const filtro = texto ? or(ilike(user.username, patron), ilike(user.email, patron)) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(user).where(filtro);
  const paginas = Math.max(1, Math.ceil(total / USUARIOS_POR_PAGINA));
  const actual = Math.min(Math.max(1, Math.floor(pagina) || 1), paginas);
  const filas = await db
    .select({
      id: user.id,
      usuario: sql<string>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      email: user.email,
      registradoEn: user.createdAt,
      verificado: user.emailVerified,
      rol: user.role,
      desactivada: user.banned,
    })
    .from(user)
    .where(filtro)
    .orderBy(desc(user.createdAt), user.id)
    .limit(USUARIOS_POR_PAGINA)
    .offset((actual - 1) * USUARIOS_POR_PAGINA);

  return {
    filas: filas.map((f) => ({
      ...f,
      rol: f.rol === "administrador" ? "administrador" : "usuario",
      desactivada: Boolean(f.desactivada),
    })),
    total,
    pagina: actual,
    paginas,
  };
}

// ─── Desactivar y reactivar (CA-01-20, auditoría M-08) ───

export type ResultadoModeracion = { ok: true } | { ok: false; error: string };

async function cuentaObjetivo(usuarioId: string) {
  const [fila] = await db.select({ id: user.id, rol: user.role }).from(user).where(eq(user.id, usuarioId)).limit(1);
  return fila;
}

/**
 * Desactiva una cuenta: Better Auth la marca como desactivada y borra todas sus sesiones, y ya no
 * puede ingresar. Nadie se desactiva a sí mismo, y ningún administrador desactiva a otro: eso solo
 * se hace desde el servidor (auditoría M-08).
 */
export async function desactivarCuenta(adminId: string, usuarioId: string, headers: Headers): Promise<ResultadoModeracion> {
  if (adminId === usuarioId) return { ok: false, error: "No podés desactivar tu propia cuenta." };
  const objetivo = await cuentaObjetivo(usuarioId);
  if (!objetivo) return { ok: false, error: "Esa cuenta ya no existe." };
  if (objetivo.rol === "administrador") return { ok: false, error: "No se puede desactivar a un administrador desde acá." };
  try {
    await auth.api.banUser({ body: { userId: usuarioId, banReason: "Desactivada por un administrador" }, headers });
  } catch (error) {
    console.error("Error al desactivar la cuenta:", codigoDeError(error) ?? "error");
    return { ok: false, error: "No pudimos desactivar la cuenta. Probá de nuevo." };
  }
  await registrarEvento("cuenta_desactivada", { usuarioId, actorId: adminId });
  return { ok: true };
}

export async function reactivarCuenta(adminId: string, usuarioId: string, headers: Headers): Promise<ResultadoModeracion> {
  if (!(await cuentaObjetivo(usuarioId))) return { ok: false, error: "Esa cuenta ya no existe." };
  try {
    await auth.api.unbanUser({ body: { userId: usuarioId }, headers });
  } catch (error) {
    console.error("Error al reactivar la cuenta:", codigoDeError(error) ?? "error");
    return { ok: false, error: "No pudimos reactivar la cuenta. Probá de nuevo." };
  }
  await registrarEvento("cuenta_reactivada", { usuarioId, actorId: adminId });
  return { ok: true };
}

// ─── Crear o ascender administradores (comando crear-admin, RS-03) ───

/** Si ya hay una cuenta con ese email (para decidir si el comando tiene que pedir usuario y contraseña). */
export async function existeCuenta(email: string): Promise<boolean> {
  const [fila] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizarEmail(email))).limit(1);
  return Boolean(fila);
}

export type ResultadoCrearAdmin = { ok: true; accion: "ascendido" | "creado" | "ya_era" } | { ok: false; error: string };

/**
 * Si la cuenta existe, la pasa a Administrador. Si no, la crea ya verificada con rol Administrador.
 * Solo lo usa el comando del servidor: el registro público nunca crea administradores (CA-01-03).
 */
export async function crearOAscenderAdministrador(datos: {
  email: string;
  usuario?: string;
  contrasena?: string;
}): Promise<ResultadoCrearAdmin> {
  const email = normalizarEmail(datos.email);
  if (!emailValido(email)) return { ok: false, error: "El email no es válido." };

  const [existente] = await db.select({ id: user.id, rol: user.role }).from(user).where(eq(user.email, email)).limit(1);
  if (existente) {
    if (existente.rol === "administrador") return { ok: true, accion: "ya_era" };
    await db.update(user).set({ role: "administrador", updatedAt: new Date() }).where(eq(user.id, existente.id));
    await registrarEvento("administrador_ascendido", { usuarioId: existente.id });
    return { ok: true, accion: "ascendido" };
  }

  const usuario = (datos.usuario ?? "").trim();
  const contrasena = datos.contrasena ?? "";
  if (usuario.length < USUARIO_MIN || usuario.length > USUARIO_MAX || !nombreDeUsuarioValido(usuario))
    return { ok: false, error: `El nombre de usuario no es válido (${USUARIO_MIN} a ${USUARIO_MAX} letras sin acentos, números, . o _).` };
  const errores = validarContrasena(contrasena, contrasena, { usuario, email });
  if (errores.contrasena) return { ok: false, error: errores.contrasena };
  const [usado] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.username})`, usuario.toLowerCase()))
    .limit(1);
  if (usado) return { ok: false, error: "Ese nombre de usuario ya está en uso." };

  try {
    const { user: creado } = await auth.api.createUser({
      body: {
        email,
        password: contrasena,
        name: usuario,
        role: "administrador",
        data: { username: usuario.toLowerCase(), displayUsername: usuario, emailVerified: true },
      },
    });
    await registrarEvento("administrador_creado", { usuarioId: creado.id });
    return { ok: true, accion: "creado" };
  } catch (error) {
    console.error("Error al crear el administrador:", codigoDeError(error) ?? "error");
    return { ok: false, error: "No se pudo crear la cuenta." };
  }
}
