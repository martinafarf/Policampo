// Endpoint GET /fincas/[id]/informes/[informeId]/pdf: genera y descarga el PDF desde la foto (Esp. 07 §5.3, §7).
// Encabezados obligatorios CA-07-10: application/pdf, PoliCampo-{código}.pdf, Cache-Control: private, no-store.
import { NextResponse } from "next/server";
import {
  consumirLimiteDescargaPdf,
  obtenerInformePorId,
} from "@/dominio/informe/foto";
import { renderizarInformePdfBuffer } from "@/informe-pdf/DocumentoInformePdf";
import { obtenerUsuario } from "@/lib/sesion";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; informeId: string }> },
) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { id, informeId } = await context.params;
  const inf = await obtenerInformePorId(id, informeId, usuario.id);
  if (!inf) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  // Límite de 60 descargas por hora por usuario (RS-06, CA-07-13)
  const permitido = await consumirLimiteDescargaPdf(usuario.id);
  if (!permitido) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Esperá un momento antes de descargar otro PDF." },
      { status: 429 },
    );
  }

  try {
    const buffer = await renderizarInformePdfBuffer(inf.contenido);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="PoliCampo-${inf.codigo}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Regla RS-05: sin datos personales en logs.
    console.error("[informe-pdf] Error o tiempo excedido al generar PDF");
    return NextResponse.json(
      { error: "No se pudo generar el PDF, probá de nuevo." },
      { status: 500 },
    );
  }
}
