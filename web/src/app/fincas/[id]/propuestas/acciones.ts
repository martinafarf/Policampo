"use server";

// Acciones del servidor para propuestas de rediseño (Esp. 05, §8, RS-02, RS-06).
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  LIMITES_PROPUESTA,
  type AlternativaEspacial,
  type DisposicionPropuesta,
  type ParametrosDisposicion,
  type PropuestaCuestionario,
} from "@/dominio/propuesta";
import {
  borrarPropuestaDeFinca,
  guardarPropuestaEnBase,
  marcarPropuestaComoElegida,
  prepararGeneracionPropuesta,
  recalcularDisposicionEnServidor,
  type PayloadGuardarPropuesta,
} from "@/dominio/propuesta/servicio";
import { requerirUsuario } from "@/lib/sesion";

export async function recalcularAlternativasPorObjetivoAccion(
  establecimientoId: string,
  objetivoPct: number,
): Promise<
  | {
      ok: true;
      objetivoPct: number;
      superficieAAgregarHa: number;
      alternativasEspaciales: AlternativaEspacial[];
      propuestaCuestionario: PropuestaCuestionario | null;
    }
  | { ok: false; error: string }
> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/propuestas/nueva`);
  const res = await prepararGeneracionPropuesta(establecimientoId, usuario.id, objetivoPct);

  if (res.estado === "no_encontrado") notFound();
  if (res.estado === "requiere_diagnostico_vigente") {
    return { ok: false, error: res.motivo };
  }
  if (res.estado === "error_calculo") {
    return { ok: false, error: res.mensaje };
  }

  return {
    ok: true,
    objetivoPct: res.objetivoPct,
    superficieAAgregarHa: res.superficieAAgregarHa,
    alternativasEspaciales: res.alternativasEspaciales,
    propuestaCuestionario: res.propuestaCuestionario,
  };
}

export async function recalcularUnaDisposicionAccion(
  establecimientoId: string,
  objetivoPct: number,
  disposicion: Exclude<DisposicionPropuesta, "texto">,
  parametros: ParametrosDisposicion,
) {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/propuestas/nueva`);
  return recalcularDisposicionEnServidor({
    establecimientoId,
    usuarioId: usuario.id,
    objetivoPct,
    disposicion,
    parametros,
  });
}

export async function guardarPropuestaAccion(
  establecimientoId: string,
  payload: PayloadGuardarPropuesta,
): Promise<{ ok: false; errores: string[] }> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/propuestas/nueva`);

  // Límite de 1 MB por petición (Esp. 05 §8, RS-06).
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  if (bytes > LIMITES_PROPUESTA.maxBytesPeticion) {
    return { ok: false, errores: ["La propuesta supera el tamaño máximo permitido de 1 MB."] };
  }

  const res = await guardarPropuestaEnBase({
    establecimientoId,
    usuarioId: usuario.id,
    payload,
  });

  if (!res.ok) {
    if (res.motivo === "no_encontrado") notFound();
    return { ok: false, errores: res.errores };
  }

  revalidatePath(`/fincas/${establecimientoId}`);
  revalidatePath(`/fincas/${establecimientoId}/propuestas`);
  redirect(`/fincas/${establecimientoId}/propuestas/${res.propuestaId}`);
}

export async function marcarPropuestaElegidaAccion(
  establecimientoId: string,
  propuestaId: string,
): Promise<{ ok: boolean; error?: string }> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/propuestas`);
  const ok = await marcarPropuestaComoElegida({
    establecimientoId,
    propuestaId,
    usuarioId: usuario.id,
  });
  if (!ok) notFound();

  revalidatePath(`/fincas/${establecimientoId}`);
  revalidatePath(`/fincas/${establecimientoId}/propuestas`);
  revalidatePath(`/fincas/${establecimientoId}/propuestas/${propuestaId}`);
  return { ok: true };
}

export async function borrarPropuestaAccion(
  establecimientoId: string,
  propuestaId: string,
): Promise<void> {
  const usuario = await requerirUsuario(`/fincas/${establecimientoId}/propuestas`);
  const ok = await borrarPropuestaDeFinca({
    establecimientoId,
    propuestaId,
    usuarioId: usuario.id,
  });
  if (!ok) notFound();

  revalidatePath(`/fincas/${establecimientoId}`);
  revalidatePath(`/fincas/${establecimientoId}/propuestas`);
  redirect(`/fincas/${establecimientoId}/propuestas?borrada=1`);
}
