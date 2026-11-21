"use server";
// Acciones del servidor de las pantallas de cuentas (especificación 01, T3).
// Reciben el formulario, llaman al servicio de cuentas (src/lib/cuentas.ts) y deciden adónde ir.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ErroresRegistro } from "@/dominio/usuarios/validaciones";
import { rutaInternaSegura } from "@/dominio/usuarios/ruta-segura";
import { auth } from "@/lib/auth";
import { ingresar, reenviarVerificacion, registrarCuenta, type MotivoIngresoFallido } from "@/lib/cuentas";
import { registrarEvento } from "@/lib/eventos";
import { ipDelPedido, obtenerUsuario } from "@/lib/sesion";

/** Cookie breve con el email recién registrado, para la pantalla "Revisá tu email" y el reenvío. */
const COOKIE_REGISTRO = "policampo_registro";

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

// ─── Registro ───

export type EstadoRegistro = {
  errores?: ErroresRegistro;
  general?: string;
  valores?: { email: string; usuario: string };
};

export async function registrar(_previo: EstadoRegistro, formulario: FormData): Promise<EstadoRegistro> {
  const datos = {
    email: texto(formulario, "email"),
    usuario: texto(formulario, "usuario"),
    contrasena: texto(formulario, "contrasena"),
    repetirContrasena: texto(formulario, "repetirContrasena"),
    aceptaPrivacidad: formulario.get("aceptaPrivacidad") === "on",
  };
  const resultado = await registrarCuenta(datos, await ipDelPedido());
  if (!resultado.ok) {
    // Se conserva lo escrito, salvo las contraseñas (especificación 01, flujo 4.1).
    return { errores: resultado.errores, general: resultado.general, valores: { email: datos.email, usuario: datos.usuario } };
  }
  (await cookies()).set(COOKIE_REGISTRO, resultado.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60,
    path: "/",
  });
  redirect("/registro/enviado");
}

export type EstadoReenvio = { mensaje?: string; error?: string };

/** Reenvío desde "Revisá tu email": usa el email guardado en la cookie del registro. */
export async function reenviarDesdeRegistro(): Promise<EstadoReenvio> {
  const email = (await cookies()).get(COOKIE_REGISTRO)?.value;
  if (!email) return { error: "No encontramos tu registro reciente. Probá ingresar o registrarte de nuevo." };
  return mensajeDeReenvio(await reenviarVerificacion(email));
}

/** Reenvío desde un formulario con el email o el usuario (ingresar o enlace vencido). */
export async function reenviarConIdentificador(_previo: EstadoReenvio, formulario: FormData): Promise<EstadoReenvio> {
  return mensajeDeReenvio(await reenviarVerificacion(texto(formulario, "identificador")));
}

function mensajeDeReenvio(resultado: { ok: boolean; demasiados?: boolean }): EstadoReenvio {
  if (resultado.demasiados) return { error: "Ya te mandamos un email hace menos de un minuto. Esperá un momento." };
  if (!resultado.ok) return { error: "No pudimos enviar el email. Probá de nuevo en unos minutos." };
  return { mensaje: "Si la cuenta existe y no está confirmada, te enviamos un email nuevo. Revisá también Spam." };
}

// ─── Ingreso ───

export type EstadoIngreso = { motivo?: MotivoIngresoFallido; identificador?: string };

export async function ingresarAccion(_previo: EstadoIngreso, formulario: FormData): Promise<EstadoIngreso> {
  const identificador = texto(formulario, "identificador");
  const resultado = await ingresar(identificador, texto(formulario, "contrasena"), await ipDelPedido(), await headers());
  if (!resultado.ok) return { motivo: resultado.motivo, identificador };
  redirect(rutaInternaSegura(texto(formulario, "volver")));
}

// ─── Cerrar sesión ───

export async function cerrarSesion(): Promise<void> {
  const usuario = await obtenerUsuario();
  await auth.api.signOut({ headers: await headers() });
  if (usuario) await registrarEvento("sesion_cerrada", { usuarioId: usuario.id });
  redirect("/?sesion=cerrada");
}
