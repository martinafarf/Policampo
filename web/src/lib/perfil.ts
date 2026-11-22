// Servicio del perfil (especificación 01, flujo 4.6, T5): nombre y apellido, contraseña, email y
// eliminar la cuenta. Las acciones de /perfil llaman a estas funciones; así se testean sin pantallas.
//
// Las rutas de Better Auth que se usan acá (/change-password, /change-email, /delete-user) están
// cerradas al público (src/lib/auth.ts): solo se llega a ellas pasando por estas validaciones.
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import {
  emailValido,
  normalizarEmail,
  validarContrasena,
  validarNombreYApellido,
  type ErroresNombre,
} from "@/dominio/usuarios/validaciones";
import { auth } from "@/lib/auth";
import { codigoDeError } from "@/lib/cuentas";
import { enviarAvisoSinInterrumpir } from "@/lib/email";
import * as plantillas from "@/lib/email/plantillas";
import { registrarEvento } from "@/lib/eventos";
import { claveDeLimite, contarIntentos, consumirIntento, reiniciarIntentos, sumarIntento } from "@/lib/limites";

const MINUTO = 60;
const HORA = 60 * MINUTO;
/** Contraseña actual equivocada: 5 intentos cada 15 minutos por cuenta, como el ingreso (RS-04). */
const LIMITE_CONTRASENA_ACTUAL = { ventana: 15 * MINUTO, maximo: 5 };
/** Emails de confirmación a direcciones nuevas: 3 por hora por cuenta, para no usarlo de spam. */
const LIMITE_ENVIOS_EMAIL_NUEVO = { ventana: HORA, maximo: 3 };
/** Adónde vuelve el enlace del email nuevo (con ?error=... si venció o ya se usó). */
export const RUTA_EMAIL_CAMBIADO = "/perfil?email=cambiado";
/** Lo que hay que escribir para confirmar que se quiere eliminar la cuenta. */
export const PALABRA_PARA_ELIMINAR = "ELIMINAR";

const DEMASIADOS = "Demasiados intentos con una contraseña incorrecta. Probá de nuevo en 15 minutos.";
const ACTUAL_INCORRECTA = "La contraseña actual no es correcta.";

export type DatosPerfil = { usuario: string; email: string; nombre: string; apellido: string };

export async function datosDelPerfil(usuarioId: string): Promise<DatosPerfil | null> {
  const [fila] = await db
    .select({ usuario: user.displayUsername, email: user.email, nombre: user.nombre, apellido: user.apellido })
    .from(user)
    .where(eq(user.id, usuarioId))
    .limit(1);
  if (!fila) return null;
  return { usuario: fila.usuario ?? "", email: fila.email, nombre: fila.nombre ?? "", apellido: fila.apellido ?? "" };
}

// ─── Contraseña actual: comprobación con límite de intentos ───

/**
 * Corre `operacion` (que comprueba la contraseña actual) respetando el límite por cuenta.
 * Si Better Auth responde INVALID_PASSWORD, suma un intento fallido.
 */
async function conContrasenaActual<T>(
  usuarioId: string,
  operacion: () => Promise<T>,
): Promise<{ ok: true; valor: T } | { ok: false; error: "demasiados" | "incorrecta" | "otro"; codigo?: string }> {
  const clave = claveDeLimite("perfil-contrasena", usuarioId);
  const { ventana, maximo } = LIMITE_CONTRASENA_ACTUAL;
  if ((await contarIntentos(clave, ventana)) >= maximo) return { ok: false, error: "demasiados" };
  try {
    const valor = await operacion();
    await reiniciarIntentos(clave);
    return { ok: true, valor };
  } catch (error) {
    const codigo = codigoDeError(error);
    if (codigo === "INVALID_PASSWORD") {
      await sumarIntento(clave, ventana);
      return { ok: false, error: "incorrecta" };
    }
    return { ok: false, error: "otro", codigo };
  }
}

// ─── Nombre y apellido (CA-01-14) ───

export type ResultadoNombre = { ok: true } | { ok: false; errores: ErroresNombre };

/** Cambia solo nombre y apellido: el nombre de usuario no se puede cambiar (CA-01-14). */
export async function actualizarNombre(usuarioId: string, entrada: { nombre: string; apellido: string }): Promise<ResultadoNombre> {
  const validacion = validarNombreYApellido(entrada);
  if (!validacion.ok) return validacion;
  await db.update(user).set({ ...validacion.datos, updatedAt: new Date() }).where(eq(user.id, usuarioId));
  await registrarEvento("perfil_actualizado", { usuarioId });
  return { ok: true };
}

// ─── Contraseña (CA-01-15) ───

export type ErroresCambioContrasena = { actual?: string; contrasena?: string; repetirContrasena?: string };
export type ResultadoCambioContrasena = { ok: true } | { ok: false; errores: ErroresCambioContrasena; general?: string };

/**
 * Cambia la contraseña pidiendo la actual, cierra las DEMÁS sesiones (la de este dispositivo sigue
 * igual) y avisa por email.
 *
 * Se hace en dos pasos a propósito: con `revokeOtherSessions: true`, Better Auth borra TODAS las
 * sesiones y crea una nueva con otra cookie. Pero Next vuelve a dibujar la página en el mismo
 * pedido con la cookie vieja, y la página creería que la sesión se cerró (manda a /ingresar).
 */
export async function cambiarContrasena(
  usuarioId: string,
  entrada: { actual: string; contrasena: string; repetirContrasena: string },
  headers: Headers,
): Promise<ResultadoCambioContrasena> {
  const perfil = await datosDelPerfil(usuarioId);
  if (!perfil) return { ok: false, errores: {}, general: "No encontramos tu cuenta." };
  if (!entrada.actual) return { ok: false, errores: { actual: "Ingresá tu contraseña actual." } };
  const errores = validarContrasena(entrada.contrasena, entrada.repetirContrasena, perfil);
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const resultado = await conContrasenaActual(usuarioId, async () => {
    await auth.api.changePassword({
      body: { currentPassword: entrada.actual, newPassword: entrada.contrasena, revokeOtherSessions: false },
      headers,
    });
    await auth.api.revokeOtherSessions({ headers });
  });
  if (!resultado.ok) {
    if (resultado.error === "demasiados") return { ok: false, errores: {}, general: DEMASIADOS };
    if (resultado.error === "incorrecta") return { ok: false, errores: { actual: ACTUAL_INCORRECTA } };
    if (resultado.codigo === "PASSWORD_COMPROMISED")
      return { ok: false, errores: { contrasena: "Esa contraseña apareció en filtraciones de datos. Elegí otra." } };
    console.error("Error al cambiar la contraseña:", resultado.codigo ?? "error");
    return { ok: false, errores: {}, general: "No pudimos cambiar la contraseña. Probá de nuevo en unos minutos." };
  }
  await registrarEvento("contrasena_cambiada", { usuarioId });
  await enviarAvisoSinInterrumpir({ para: perfil.email, ...plantillas.avisoCambioContrasena() });
  return { ok: true };
}

// ─── Email (CA-01-16) ───

export type ErroresCambioEmail = { email?: string; contrasena?: string };
export type ResultadoCambioEmail = { ok: true; emailNuevo: string } | { ok: false; errores: ErroresCambioEmail; general?: string };

/**
 * Pide cambiar el email: comprueba la contraseña y manda el enlace de confirmación al email NUEVO
 * (vence en 24 horas). El email cambia recién cuando se abre ese enlace; entonces se avisa al
 * anterior (src/lib/auth.ts, databaseHooks).
 */
export async function pedirCambioEmail(
  usuarioId: string,
  entrada: { email: string; contrasena: string },
  headers: Headers,
): Promise<ResultadoCambioEmail> {
  const perfil = await datosDelPerfil(usuarioId);
  if (!perfil) return { ok: false, errores: {}, general: "No encontramos tu cuenta." };
  const emailNuevo = normalizarEmail(entrada.email);
  if (!emailNuevo) return { ok: false, errores: { email: "Ingresá el email nuevo." } };
  if (!emailValido(emailNuevo)) return { ok: false, errores: { email: "El email no es válido." } };
  if (emailNuevo === perfil.email) return { ok: false, errores: { email: "Ese ya es el email de tu cuenta." } };
  if (!entrada.contrasena) return { ok: false, errores: { contrasena: "Ingresá tu contraseña actual." } };

  const comprobacion = await conContrasenaActual(usuarioId, () =>
    auth.api.verifyPassword({ body: { password: entrada.contrasena }, headers }),
  );
  if (!comprobacion.ok) {
    if (comprobacion.error === "demasiados") return { ok: false, errores: {}, general: DEMASIADOS };
    if (comprobacion.error === "incorrecta") return { ok: false, errores: { contrasena: ACTUAL_INCORRECTA } };
    console.error("Error al comprobar la contraseña:", comprobacion.codigo ?? "error");
    return { ok: false, errores: {}, general: "No pudimos procesar el pedido. Probá de nuevo en unos minutos." };
  }

  // Igual que el registro, se informa si el email ya tiene cuenta (riesgo aceptado, auditoría M-07).
  const [usado] = await db.select({ id: user.id }).from(user).where(eq(user.email, emailNuevo)).limit(1);
  if (usado) return { ok: false, errores: { email: "Ese email ya está registrado en otra cuenta." } };

  const { ventana, maximo } = LIMITE_ENVIOS_EMAIL_NUEVO;
  if (!(await consumirIntento(claveDeLimite("perfil-email-envio", usuarioId), ventana, maximo))) {
    return { ok: false, errores: {}, general: "Ya pediste varios cambios de email. Probá de nuevo en una hora." };
  }
  try {
    await auth.api.changeEmail({ body: { newEmail: emailNuevo, callbackURL: RUTA_EMAIL_CAMBIADO }, headers });
  } catch (error) {
    console.error("Error al pedir el cambio de email:", codigoDeError(error) ?? "error");
    return { ok: false, errores: {}, general: "No pudimos enviar el email. Probá de nuevo en unos minutos." };
  }
  await registrarEvento("cambio_email_pedido", { usuarioId });
  return { ok: true, emailNuevo };
}

// ─── Eliminar la cuenta (CA-01-17) ───

export type ErroresEliminar = { contrasena?: string; confirmacion?: string };
export type ResultadoEliminar = { ok: true } | { ok: false; errores: ErroresEliminar; general?: string };

/**
 * Elimina la cuenta y todos sus datos. Pide la contraseña y escribir ELIMINAR. Better Auth borra
 * el usuario (y en cascada sus sesiones, cuentas y fincas), borra la cookie de sesión y llama a
 * afterDelete (src/lib/auth.ts), que borra los enlaces pendientes y manda el email de confirmación.
 */
export async function eliminarCuenta(
  usuarioId: string,
  entrada: { contrasena: string; confirmacion: string },
  headers: Headers,
): Promise<ResultadoEliminar> {
  const errores: ErroresEliminar = {};
  if (entrada.confirmacion.trim() !== PALABRA_PARA_ELIMINAR)
    errores.confirmacion = `Escribí ${PALABRA_PARA_ELIMINAR} en mayúsculas para confirmar.`;
  if (!entrada.contrasena) errores.contrasena = "Ingresá tu contraseña.";
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const resultado = await conContrasenaActual(usuarioId, () =>
    auth.api.deleteUser({ body: { password: entrada.contrasena }, headers }),
  );
  if (!resultado.ok) {
    if (resultado.error === "demasiados") return { ok: false, errores: {}, general: DEMASIADOS };
    if (resultado.error === "incorrecta") return { ok: false, errores: { contrasena: "La contraseña no es correcta." } };
    console.error("Error al eliminar la cuenta:", resultado.codigo ?? "error");
    return { ok: false, errores: {}, general: "No pudimos eliminar la cuenta. Probá de nuevo en unos minutos." };
  }
  // La cuenta ya no existe: el evento queda sin id de usuario (no se guarda ningún dato personal).
  await registrarEvento("cuenta_eliminada");
  return { ok: true };
}
