// Endpoint autenticado GET /fincas/[id]/calendario/ics: descarga el calendario activo en .ics (CA-06-16, RS-02).
import { NextResponse } from "next/server";
import { generarArchivoIcs } from "@/dominio/calendario";
import { obtenerCalendarioActivoDeFinca } from "@/dominio/calendario/servicio";
import { obtenerUsuario } from "@/lib/sesion";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id } = await context.params;
  const datos = await obtenerCalendarioActivoDeFinca(id, usuario.id);
  if (!datos || !datos.calendario) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const contenido = generarArchivoIcs(
    datos.tareas.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      titulo: t.titulo,
      descripcion: t.descripcion,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      fincaNombre: datos.establecimiento.nombre,
    })),
    `PoliCampo - ${datos.establecimiento.nombre}`,
  );

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendario-finca.ics"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
