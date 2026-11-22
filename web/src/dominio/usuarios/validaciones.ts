// Validaciones del registro (especificación 01, sección 6.2). Funciones puras: sin base de datos.
// Se usan en el servidor (regla RS-06); la pantalla puede mostrar los mismos mensajes antes de enviar.

export const NOMBRES_RESERVADOS = new Set(["admin", "administrador", "policampo", "soporte"]);
export const USUARIO_MIN = 3;
export const USUARIO_MAX = 30;
export const CONTRASENA_MIN = 8;
export const CONTRASENA_MAX = 128;
const EMAIL_MAX = 254;

/** Letras sin acentos, números, punto y guion bajo; sin "@" (no puede confundirse con un email). */
export function nombreDeUsuarioValido(nombre: string): boolean {
  return /^[a-zA-Z0-9._]+$/.test(nombre) && !NOMBRES_RESERVADOS.has(nombre.toLowerCase());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type DatosRegistro = {
  email: string;
  usuario: string;
  contrasena: string;
  repetirContrasena: string;
  aceptaPrivacidad: boolean;
};

export type CampoRegistro = keyof DatosRegistro;
export type ErroresRegistro = Partial<Record<CampoRegistro, string>>;

export type ResultadoValidacion =
  | { ok: true; datos: DatosRegistro }
  | { ok: false; errores: ErroresRegistro };

export function validarRegistro(entrada: DatosRegistro): ResultadoValidacion {
  const email = normalizarEmail(entrada.email);
  const usuario = entrada.usuario.trim();
  const { contrasena, repetirContrasena, aceptaPrivacidad } = entrada;
  const errores: ErroresRegistro = {};

  if (!email) errores.email = "Ingresá tu email.";
  else if (!emailValido(email)) errores.email = "El email no es válido.";

  if (!usuario) errores.usuario = "Elegí un nombre de usuario.";
  else if (usuario.length < USUARIO_MIN || usuario.length > USUARIO_MAX)
    errores.usuario = `El nombre de usuario tiene que tener entre ${USUARIO_MIN} y ${USUARIO_MAX} caracteres.`;
  else if (NOMBRES_RESERVADOS.has(usuario.toLowerCase())) errores.usuario = "Ese nombre de usuario no está disponible.";
  else if (!nombreDeUsuarioValido(usuario))
    errores.usuario = "Usá solo letras sin acentos, números, punto (.) y guion bajo (_).";

  Object.assign(errores, validarContrasena(contrasena, repetirContrasena, { usuario, email }));

  if (!aceptaPrivacidad) errores.aceptaPrivacidad = "Para registrarte tenés que aceptar la política de privacidad.";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { email, usuario, contrasena, repetirContrasena, aceptaPrivacidad } };
}

export type ErroresContrasena = { contrasena?: string; repetirContrasena?: string };

/**
 * Reglas de la contraseña (especificación 01, sección 6.2), compartidas por el registro, la
 * recuperación y el cambio de contraseña: de 8 a 128 caracteres, distinta del usuario y del email,
 * y repetida igual. Que no esté filtrada lo controla Better Auth (Have I Been Pwned).
 */
export function validarContrasena(
  contrasena: string,
  repetirContrasena: string,
  cuenta: { usuario: string; email: string },
): ErroresContrasena {
  const errores: ErroresContrasena = {};
  const minuscula = contrasena.toLowerCase();
  const email = cuenta.email.toLowerCase();
  if (!contrasena) errores.contrasena = "Elegí una contraseña.";
  else if (contrasena.length < CONTRASENA_MIN)
    errores.contrasena = `La contraseña tiene que tener al menos ${CONTRASENA_MIN} caracteres.`;
  else if (contrasena.length > CONTRASENA_MAX)
    errores.contrasena = `La contraseña puede tener hasta ${CONTRASENA_MAX} caracteres.`;
  else if (
    (cuenta.usuario && minuscula === cuenta.usuario.toLowerCase()) ||
    (email && (minuscula === email || minuscula === email.split("@")[0]))
  )
    errores.contrasena = "La contraseña no puede ser igual a tu usuario ni a tu email.";

  if (!errores.contrasena && repetirContrasena !== contrasena) errores.repetirContrasena = "Las contraseñas no coinciden.";
  return errores;
}

export const NOMBRE_MAX = 60;
export type ErroresNombre = { nombre?: string; apellido?: string };
export type ResultadoNombre =
  | { ok: true; datos: { nombre: string | null; apellido: string | null } }
  | { ok: false; errores: ErroresNombre };

/**
 * Nombre y apellido del perfil (especificación 01, sección 6.2): opcionales, hasta 60 caracteres y
 * sin etiquetas HTML. Vacíos se guardan como null (se muestra el nombre de usuario).
 */
export function validarNombreYApellido(entrada: { nombre: string; apellido: string }): ResultadoNombre {
  const errores: ErroresNombre = {};
  const limpiar = (valor: string, campo: keyof ErroresNombre, etiqueta: string) => {
    const texto = valor.trim().replace(/\s+/g, " ");
    if (texto.length > NOMBRE_MAX) errores[campo] = `${etiqueta} puede tener hasta ${NOMBRE_MAX} caracteres.`;
    else if (/[<>]/.test(texto)) errores[campo] = `${etiqueta} no puede tener los signos < ni >.`;
    return texto || null;
  };
  const nombre = limpiar(entrada.nombre, "nombre", "El nombre");
  const apellido = limpiar(entrada.apellido, "apellido", "El apellido");
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { nombre, apellido } };
}

export function emailValido(email: string): boolean {
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** "ana@ejemplo.com" → "a…@ejemplo.com", para mostrar sin exponer el email completo. */
export function enmascararEmail(email: string): string {
  const [local, dominio] = email.split("@");
  if (!local || !dominio) return "tu email";
  return `${local[0]}…@${dominio}`;
}
