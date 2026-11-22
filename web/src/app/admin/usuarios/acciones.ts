"use server";
// Acciones de /admin/usuarios (especificación 01, T6). Cada una verifica en el servidor que quien
// la llama es administrador; si no, responde 404, como la pantalla (CA-01-19).
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desactivarCuenta, reactivarCuenta } from "@/lib/administracion";
import { requerirAdministrador } from "@/lib/sesion";

export type EstadoModeracion = { error?: string };

export async function cambiarEstadoCuenta(_previo: EstadoModeracion, formulario: FormData): Promise<EstadoModeracion> {
  const admin = await requerirAdministrador();
  const usuarioId = formulario.get("usuarioId");
  const accion = formulario.get("accion");
  if (typeof usuarioId !== "string" || !usuarioId) return { error: "Falta la cuenta." };
  const resultado =
    accion === "reactivar"
      ? await reactivarCuenta(admin.id, usuarioId, await headers())
      : await desactivarCuenta(admin.id, usuarioId, await headers());
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/admin/usuarios");
  return {};
}
