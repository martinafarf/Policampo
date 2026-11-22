// Servicio de cuentas: registro, ingreso y reenvío de la verificación (especificación 01, T3).
// Las acciones de las pantallas llaman a estas funciones; así la lógica se testea sin pantallas.
import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import {
  emailValido,
  normalizarEmail,
  validarContrasena,
  validarRegistro,
  type DatosRegistro,
  type ErroresContrasena,
  type ErroresRegistro,
} from "@/dominio/usuarios/validaciones";
import { auth } from "@/lib/auth";
import { registrarEvento } from "@/lib/eventos";
import { claveDeLimite, consumirIntento, contarIntentos, reiniciarIntentos, sumarIntento } from "@/lib/limites";
import { POLITICA_PRIVACIDAD_VERSION } from "@/lib/privacidad";

const MINUTO = 60;
const HORA = 60 * MINUTO;
/** Adónde vuelve Better Auth después del enlace de verificación (con éxito o con ?error=...). */
export const RUTA_VERIFICACION = "/verificar-email";

// Límites de la especificación 01 (sección 2 y 8), guardados en la base (RS-13).
export const LIMITE_INGRESO = { ventana: 15 * MINUTO, maximo: 5 };
const LIMITE_REGISTRO_IP = { ventana: HORA, maximo: 10 };
const LIMITE_REENVIO = { ventana: MINUTO, maximo: 1 };

/** El código de error de Better Auth (por ejemplo "INVALID_PASSWORD"), o undefined si no es suyo. */
export function codigoDeError(error: unknown): string | undefined {
  if (error instanceof APIError) return (error.body as { code?: string } | undefined)?.code;
  return undefined;
}

// ─── Registro ───

export type ResultadoRegistro =
  | { ok: true; email: string }
  | { ok: false; errores: ErroresRegistro; general?: string };

export async function registrarCuenta(entrada: DatosRegistro, ip: string): Promise<ResultadoRegistro> {
  const validacion = validarRegistro(entrada);
  if (!validacion.ok) return { ok: false, errores: validacion.errores };
  const { email, usuario, contrasena } = validacion.datos;

  if (!(await consumirIntento(claveDeLimite("registro-ip", ip), LIMITE_REGISTRO_IP.ventana, LIMITE_REGISTRO_IP.maximo))) {
    return { ok: false, errores: {}, general: "Demasiados registros desde esta conexión. Probá de nuevo más tarde." };
  }

  // El grupo decidió informar si el email o el usuario ya existen (riesgo aceptado, auditoría M-07).
  const [emailUsado] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  const [usuarioUsado] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.username})`, usuario.toLowerCase()))
    .limit(1);
  if (emailUsado || usuarioUsado) {
    const errores: ErroresRegistro = {};
    if (emailUsado) errores.email = "Ese email ya está registrado. ¿Querés ingresar?";
    if (usuarioUsado) errores.usuario = "Ese nombre de usuario ya está en uso.";
    return { ok: false, errores };
  }

  try {
    const { user: creado } = await auth.api.signUpEmail({
      body: { email, password: contrasena, name: usuario, username: usuario, callbackURL: RUTA_VERIFICACION },
    });
    // Consentimiento de la política de privacidad, con su versión y fecha (Ley 25.326, RS-17).
    await db
      .update(user)
      .set({ politicaPrivacidadVersion: POLITICA_PRIVACIDAD_VERSION, politicaPrivacidadAceptadaEn: new Date() })
      .where(eq(user.id, creado.id));
    await registrarEvento("registro", { usuarioId: creado.id });
    return { ok: true, email };
  } catch (error) {
    switch (codigoDeError(error)) {
      case "PASSWORD_COMPROMISED":
        return { ok: false, errores: { contrasena: "Esa contraseña apareció en filtraciones de datos. Elegí otra." } };
      case "USERNAME_IS_ALREADY_TAKEN":
        return { ok: false, errores: { usuario: "Ese nombre de usuario ya está en uso." } };
      case "USER_ALREADY_EXISTS":
      case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
        return { ok: false, errores: { email: "Ese email ya está registrado. ¿Querés ingresar?" } };
      case "INVALID_USERNAME":
      case "USERNAME_TOO_SHORT":
      case "USERNAME_TOO_LONG":
        return { ok: false, errores: { usuario: "Ese nombre de usuario no es válido." } };
      default:
        console.error("Error al registrar:", error instanceof Error ? error.name : "error");
        return { ok: false, errores: {}, general: "No pudimos crear la cuenta. Probá de nuevo en unos minutos." };
    }
  }
}

// ─── Ingreso ───

export type MotivoIngresoFallido = "credenciales" | "sin_verificar" | "desactivada" | "demasiados" | "error";
export type ResultadoIngreso = { ok: true } | { ok: false; motivo: MotivoIngresoFallido };

/**
 * Ingreso con nombre de usuario o email (si tiene "@" es email). Límite: 5 intentos fallidos cada
 * 15 minutos por cuenta y por conexión; al llegar, ni la contraseña correcta entra (CA-01-08).
 * La cookie de sesión la guarda el plugin nextCookies de Better Auth.
 */
export async function ingresar(identificador: string, contrasena: string, ip: string, headers: Headers): Promise<ResultadoIngreso> {
  const id = identificador.trim();
  if (!id || !contrasena) return { ok: false, motivo: "credenciales" };

  const claveCuenta = claveDeLimite("ingreso-cuenta", id);
  const claveIp = claveDeLimite("ingreso-ip", ip);
  const { ventana, maximo } = LIMITE_INGRESO;
  if ((await contarIntentos(claveCuenta, ventana)) >= maximo || (await contarIntentos(claveIp, ventana)) >= maximo) {
    await registrarEvento("ingreso_bloqueado", { detalle: { motivo: "limite" } });
    return { ok: false, motivo: "demasiados" };
  }

  try {
    const resultado = id.includes("@")
      ? await auth.api.signInEmail({ body: { email: normalizarEmail(id), password: contrasena }, headers })
      : await auth.api.signInUsername({ body: { username: id, password: contrasena }, headers });
    await reiniciarIntentos(claveCuenta);
    await registrarEvento("ingreso", { usuarioId: resultado.user.id });
    return { ok: true };
  } catch (error) {
    const codigo = codigoDeError(error);
    if (codigo === "EMAIL_NOT_VERIFIED") return { ok: false, motivo: "sin_verificar" };
    if (codigo === "BANNED_USER") return { ok: false, motivo: "desactivada" };
    // Un usuario con caracteres no permitidos o de largo inválido es, para quien ingresa, un dato
    // incorrecto más: se responde igual que con una contraseña equivocada (CA-01-06).
    const datosIncorrectos = [
      "INVALID_EMAIL_OR_PASSWORD",
      "INVALID_USERNAME_OR_PASSWORD",
      "INVALID_USERNAME",
      "USERNAME_TOO_SHORT",
      "USERNAME_TOO_LONG",
      "INVALID_EMAIL",
    ];
    if (codigo && datosIncorrectos.includes(codigo)) {
      await sumarIntento(claveCuenta, ventana);
      await sumarIntento(claveIp, ventana);
      await registrarEvento("ingreso_fallido", { detalle: { metodo: id.includes("@") ? "email" : "usuario" } });
      return { ok: false, motivo: "credenciales" };
    }
    console.error("Error al ingresar:", error instanceof Error ? error.name : "error");
    return { ok: false, motivo: "error" };
  }
}

// ─── Reenvío del email de verificación ───

/**
 * Reenvía el email de verificación. Acepta email o nombre de usuario. Responde lo mismo exista o
 * no la cuenta; máximo 1 reenvío por minuto por cuenta.
 */
export async function reenviarVerificacion(identificador: string): Promise<{ ok: boolean; demasiados?: boolean }> {
  const id = identificador.trim();
  if (!id) return { ok: false };
  const condicion = id.includes("@") ? eq(user.email, normalizarEmail(id)) : eq(sql`lower(${user.username})`, id.toLowerCase());
  const [cuenta] = await db.select({ id: user.id, email: user.email, verificada: user.emailVerified }).from(user).where(condicion).limit(1);
  // El límite se cuenta por cuenta (su email), aunque se escriba el usuario o el email.
  const claveReenvio = claveDeLimite("reenvio-verificacion", cuenta?.email ?? id);
  if (!(await consumirIntento(claveReenvio, LIMITE_REENVIO.ventana, LIMITE_REENVIO.maximo))) {
    return { ok: false, demasiados: true };
  }
  if (cuenta && !cuenta.verificada) {
    try {
      await auth.api.sendVerificationEmail({ body: { email: cuenta.email, callbackURL: RUTA_VERIFICACION } });
      await registrarEvento("verificacion_reenviada", { usuarioId: cuenta.id });
    } catch (error) {
      console.error("Error al reenviar la verificación:", error instanceof Error ? error.name : "error");
      return { ok: false };
    }
  }
  return { ok: true };
}

// ─── Recuperación de contraseña (especificación 01, flujo 4.5, T4) ───

/** Adónde lleva el enlace del email de recuperación (con ?token=... o ?error=INVALID_TOKEN). */
export const RUTA_NUEVA_CONTRASENA = "/recuperar/nueva";
const LIMITE_RECUPERACION_IP = { ventana: HORA, maximo: 5 };
const LIMITE_RECUPERACION_EMAIL = { ventana: HORA, maximo: 3 };

export type ResultadoPedidoRecuperacion = { ok: true } | { ok: false; error: string };

/**
 * Pide el enlace para crear una contraseña nueva. Responde lo mismo exista o no la cuenta
 * (CA-01-12): el email solo se envía si existe.
 */
export async function pedirRecuperacion(emailIngresado: string, ip: string): Promise<ResultadoPedidoRecuperacion> {
  const email = normalizarEmail(emailIngresado);
  if (!emailValido(email)) return { ok: false, error: "El email no es válido." };
  const porIp = await consumirIntento(claveDeLimite("recuperacion-ip", ip), LIMITE_RECUPERACION_IP.ventana, LIMITE_RECUPERACION_IP.maximo);
  const porEmail = await consumirIntento(
    claveDeLimite("recuperacion-email", email),
    LIMITE_RECUPERACION_EMAIL.ventana,
    LIMITE_RECUPERACION_EMAIL.maximo,
  );
  if (!porIp || !porEmail) return { ok: false, error: "Demasiados pedidos. Probá de nuevo más tarde." };
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: RUTA_NUEVA_CONTRASENA } });
  } catch (error) {
    console.error("Error al pedir la recuperación:", error instanceof Error ? error.name : "error");
    return { ok: false, error: "No pudimos procesar el pedido. Probá de nuevo en unos minutos." };
  }
  return { ok: true };
}

/** La cuenta a la que corresponde un enlace de recuperación vigente, o null si venció o ya se usó. */
export async function cuentaDelEnlaceDeRecuperacion(token: string): Promise<{ id: string; usuario: string; email: string } | null> {
  if (!token || token.length > 200) return null;
  const [fila] = await db
    .select({ id: user.id, usuario: user.username, email: user.email })
    .from(verification)
    .innerJoin(user, eq(user.id, verification.value))
    // Se compara con la hora de la base (now()), no con new Date() de Node: es la misma fuente de
    // tiempo para todos y Next.js no lo trata como un valor inestable al pre-generar la página.
    .where(and(eq(verification.identifier, `reset-password:${token}`), gt(verification.expiresAt, sql`now()`)))
    .limit(1);
  return fila ? { id: fila.id, usuario: fila.usuario ?? "", email: fila.email } : null;
}

export type ResultadoNuevaContrasena =
  | { ok: true }
  | { ok: false; enlaceInvalido?: boolean; errores?: ErroresContrasena; general?: string };

/**
 * Crea la contraseña nueva con el enlace del email. Better Auth consume el enlace (sirve una sola
 * vez), cierra todas las sesiones de la cuenta y dispara el email de aviso (CA-01-13).
 */
export async function crearNuevaContrasena(token: string, contrasena: string, repetir: string): Promise<ResultadoNuevaContrasena> {
  const cuenta = await cuentaDelEnlaceDeRecuperacion(token);
  if (!cuenta) return { ok: false, enlaceInvalido: true };
  const errores = validarContrasena(contrasena, repetir, cuenta);
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  try {
    await auth.api.resetPassword({ body: { newPassword: contrasena, token } });
    await registrarEvento("contrasena_restablecida", { usuarioId: cuenta.id });
    return { ok: true };
  } catch (error) {
    const codigo = codigoDeError(error);
    if (codigo === "PASSWORD_COMPROMISED")
      return { ok: false, errores: { contrasena: "Esa contraseña apareció en filtraciones de datos. Elegí otra." } };
    if (codigo === "INVALID_TOKEN") return { ok: false, enlaceInvalido: true };
    console.error("Error al crear la contraseña nueva:", error instanceof Error ? error.name : "error");
    return { ok: false, general: "No pudimos cambiar la contraseña. Probá de nuevo en unos minutos." };
  }
}
