"use server";

// Acciones del servidor del calendario agroecológico y checklist (Esp. 06, §7, RS-02).
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  actualizarPreferenciaResumenSemanal,
  desmarcarTareaEnBase,
  generarCalendarioEnBase,
  marcarTareaHechaEnBase,
} from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export async function generarCalendarioAccion(
  establecimientoId: string,
  modo: "nuevo" | "regenerar" | "proxima_temporada" = "nuevo",
): Promise<{ ok: false; error: string }> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/calendario`);
  const res = await generarCalendarioEnBase({
    establecimientoId,
    usuarioId: usuario.id,
    modo,
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") notFound();
    return { ok: false, error: res.mensaje };
  }

  revalidatePath("/inicio");
  revalidatePath("/tareas");
  revalidatePath(`/fincas/${establecimientoId}`);
  revalidatePath(`/fincas/${establecimientoId}/calendario`);
  revalidatePath(`/fincas/${establecimientoId}/calendario/historial`);
  redirect(`/fincas/${establecimientoId}/calendario`);
}

export async function marcarTareaHechaAccion(params: {
  tareaId: string;
  establecimientoId: string;
  fechaHechaIso: string;
  nota?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requerirUsuario(`/fincas/${params.establecimientoId}/calendario`);
  const res = await marcarTareaHechaEnBase({
    tareaId: params.tareaId,
    usuarioId: usuario.id,
    fechaHechaIso: params.fechaHechaIso,
    nota: params.nota,
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") notFound();
    return { ok: false, error: res.error };
  }

  revalidatePath("/inicio");
  revalidatePath("/tareas");
  revalidatePath(`/fincas/${params.establecimientoId}/calendario`);
  return { ok: true };
}

export async function desmarcarTareaAccion(params: {
  tareaId: string;
  establecimientoId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requerirUsuario(`/fincas/${params.establecimientoId}/calendario`);
  const res = await desmarcarTareaEnBase({
    tareaId: params.tareaId,
    usuarioId: usuario.id,
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") notFound();
    return { ok: false, error: res.error };
  }

  revalidatePath("/inicio");
  revalidatePath("/tareas");
  revalidatePath(`/fincas/${params.establecimientoId}/calendario`);
  return { ok: true };
}

export async function cambiarResumenSemanalAccion(
  activo: boolean,
): Promise<{ ok: boolean; activo: boolean }> {
  const usuario = await requerirUsuario("/perfil");
  await actualizarPreferenciaResumenSemanal(usuario.id, Boolean(activo));
  revalidatePath("/perfil");
  return { ok: true, activo: Boolean(activo) };
}
