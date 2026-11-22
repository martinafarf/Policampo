// Endpoint autenticado GET /tareas/ics: descarga las tareas activas de todas las fincas del usuario (CA-06-16).
import { NextResponse } from "next/server";
import { generarArchivoIcs } from "@/dominio/calendario";
import { listarMisTareas } from "@/dominio/calendario/servicio";
import { obtenerUsuario } from "@/lib/sesion";

export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const tareas = await listarMisTareas(usuario.id);
  const contenido = generarArchivoIcs(
    tareas.map((t) => ({
      id: t.id,
      tipo: t.tipo,
      titulo: t.titulo,
      descripcion: t.descripcion,
      fechaInicio: t.fechaInicio,
      fechaFin: t.fechaFin,
      fincaNombre: t.establecimientoNombre,
    })),
    "PoliCampo - Mis tareas",
  );

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="policampo-mis-tareas.ics"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
