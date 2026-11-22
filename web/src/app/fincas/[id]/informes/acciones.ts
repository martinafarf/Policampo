"use server";

// Acciones del servidor para emitir y borrar informes técnicos (Esp. 07 §7, RS-02, RS-06).
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  borrarInformeDeFinca,
  emitirInformeEnBase,
} from "@/dominio/informe/foto";
import { requerirUsuario } from "@/lib/sesion";

export async function emitirInformeAccion(
  establecimientoId: string,
  incluirNombre: boolean,
): Promise<{ ok: false; error: string }> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/informes`);
  const res = await emitirInformeEnBase({
    establecimientoId,
    usuarioId: usuario.id,
    incluirNombre: Boolean(incluirNombre),
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") notFound();
    return { ok: false, error: res.mensaje };
  }

  revalidatePath("/informes");
  revalidatePath(`/fincas/${establecimientoId}/informes`);
  redirect(`/fincas/${establecimientoId}/informes/${res.informeId}`);
}

export async function borrarInformeAccion(
  establecimientoId: string,
  informeId: string,
  volverA: "finca" | "global" = "finca",
): Promise<void> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/informes`);
  const ok = await borrarInformeDeFinca({
    establecimientoId,
    informeId,
    usuarioId: usuario.id,
  });
  if (!ok) notFound();

  revalidatePath("/informes");
  revalidatePath(`/fincas/${establecimientoId}/informes`);
  redirect(
    volverA === "global"
      ? "/informes?borrado=1"
      : `/fincas/${establecimientoId}/informes?borrado=1`,
  );
}
