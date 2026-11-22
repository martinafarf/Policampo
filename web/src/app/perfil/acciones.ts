"use server";
// Acciones del servidor de Mi perfil (especificación 01, flujo 4.6, T5).
// Cada una verifica la sesión en el servidor (RS-02) y llama al servicio del perfil (src/lib/perfil.ts).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ErroresNombre } from "@/dominio/usuarios/validaciones";
import {
  actualizarNombre,
  cambiarContrasena,
  eliminarCuenta,
  pedirCambioEmail,
  type ErroresCambioContrasena,
  type ErroresCambioEmail,
  type ErroresEliminar,
} from "@/lib/perfil";
import { requerirUsuario } from "@/lib/sesion";

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

// ─── Nombre y apellido ───

export type EstadoNombre = { guardado?: boolean; errores?: ErroresNombre };

export async function guardarNombre(_previo: EstadoNombre, formulario: FormData): Promise<EstadoNombre> {
  const usuario = await requerirUsuario("/perfil");
  // Solo se leen nombre y apellido: aunque el formulario mande "usuario", se ignora (CA-01-14).
  const resultado = await actualizarNombre(usuario.id, {
    nombre: texto(formulario, "nombre"),
    apellido: texto(formulario, "apellido"),
  });
  if (!resultado.ok) return { errores: resultado.errores };
  revalidatePath("/", "layout"); // el saludo de Inicio usa el nombre
  return { guardado: true };
}

// ─── Contraseña ───

export type EstadoContrasena = { guardada?: boolean; errores?: ErroresCambioContrasena; general?: string };

export async function cambiarContrasenaAccion(_previo: EstadoContrasena, formulario: FormData): Promise<EstadoContrasena> {
  const usuario = await requerirUsuario("/perfil");
  const resultado = await cambiarContrasena(
    usuario.id,
    {
      actual: texto(formulario, "actual"),
      contrasena: texto(formulario, "contrasena"),
      repetirContrasena: texto(formulario, "repetirContrasena"),
    },
    await headers(),
  );
  if (!resultado.ok) return { errores: resultado.errores, general: resultado.general };
  return { guardada: true };
}

// ─── Email ───

export type EstadoEmail = { enviadoA?: string; errores?: ErroresCambioEmail; general?: string; email?: string };

export async function pedirCambioEmailAccion(_previo: EstadoEmail, formulario: FormData): Promise<EstadoEmail> {
  const usuario = await requerirUsuario("/perfil");
  const email = texto(formulario, "email");
  const resultado = await pedirCambioEmail(usuario.id, { email, contrasena: texto(formulario, "contrasena") }, await headers());
  if (!resultado.ok) return { errores: resultado.errores, general: resultado.general, email };
  return { enviadoA: resultado.emailNuevo };
}

// ─── Eliminar la cuenta ───

export type EstadoEliminar = { errores?: ErroresEliminar; general?: string };

/**
 * Elimina la cuenta y va a la landing con "Tu cuenta fue eliminada". La landing borra los
 * borradores del navegador, como al cerrar sesión (RS-08, componentes/cuentas/limpiar-borradores.tsx).
 */
export async function eliminarCuentaAccion(_previo: EstadoEliminar, formulario: FormData): Promise<EstadoEliminar> {
  const usuario = await requerirUsuario("/perfil");
  const resultado = await eliminarCuenta(
    usuario.id,
    { contrasena: texto(formulario, "contrasena"), confirmacion: texto(formulario, "confirmacion") },
    await headers(),
  );
  if (!resultado.ok) return { errores: resultado.errores, general: resultado.general };
  redirect("/?cuenta=eliminada");
}
