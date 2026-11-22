"use server";

// Acción del servidor "Solicitar diagnóstico" (especificación 04, 7.1 y 7.2).
// Ignora cualquier resultado o superficie que envíe el navegador (CA-04-14, RS-06).
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { ejecutarYSolicitarDiagnostico } from "@/dominio/diagnostico/entrada";
import { requerirUsuario } from "@/lib/sesion";

export interface EstadoAccionDiagnostico {
  error?: string;
}

export async function solicitarDiagnosticoAccion(
  establecimientoId: string,
): Promise<EstadoAccionDiagnostico> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/diagnostico`);

  const res = await ejecutarYSolicitarDiagnostico({
    establecimientoId,
    usuarioId: usuario.id,
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") {
      notFound();
    }
    return { error: res.mensaje };
  }

  revalidatePath("/fincas");
  revalidatePath(`/fincas/${establecimientoId}`);
  revalidatePath(`/fincas/${establecimientoId}/diagnostico`);
  revalidatePath(`/fincas/${establecimientoId}/diagnostico/historial`);

  redirect(`/fincas/${establecimientoId}/diagnostico`);
}
