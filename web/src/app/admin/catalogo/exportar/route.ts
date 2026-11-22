// Endpoint GET /admin/catalogo/exportar: descarga plantas.csv, periodos.csv o compatibilidades.csv.
// Protegido para administradores (sin rol responde 404, CA-03-16) y con escape contra fórmulas Excel (CA-03-14).
import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  compatibilidad,
  cultivo,
  plantaServicio,
  plantaServicioEcorregion,
} from "@/db/schema";
import {
  ESTADOS_CATALOGO,
  ejemploCsv,
  exportarCompatibilidadesCsv,
  exportarPeriodosCsv,
  exportarPlantasCsv,
  type EstadoCatalogo,
  type TipoArchivoCsv,
} from "@/dominio/catalogo";
import { obtenerUsuario } from "@/lib/sesion";

const TIPOS_VALIDOS = new Set<TipoArchivoCsv>(["plantas", "periodos", "compatibilidades"]);

export async function GET(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario || usuario.rol !== "administrador") {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") as TipoArchivoCsv | null;
  if (!tipo || !TIPOS_VALIDOS.has(tipo)) {
    return NextResponse.json(
      { error: "Indicá tipo=plantas, tipo=periodos o tipo=compatibilidades." },
      { status: 400 },
    );
  }

  const esEjemplo = searchParams.get("ejemplo") === "1";
  if (esEjemplo) {
    return new NextResponse(ejemploCsv(tipo), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ejemplo_${tipo}.csv"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const estadoParam = searchParams.get("estado") ?? "";
  const estadoFiltro = (ESTADOS_CATALOGO as readonly string[]).includes(estadoParam)
    ? (estadoParam as EstadoCatalogo)
    : null;

  let contenido = "";

  if (tipo === "plantas") {
    const filas = estadoFiltro
      ? await db
          .select()
          .from(plantaServicio)
          .where(eq(plantaServicio.estado, estadoFiltro))
          .orderBy(asc(plantaServicio.clave))
      : await db.select().from(plantaServicio).orderBy(asc(plantaServicio.clave));
    contenido = exportarPlantasCsv(filas);
  } else if (tipo === "periodos") {
    const filas = await db
      .select({
        plantaClave: plantaServicio.clave,
        ecorregion: plantaServicioEcorregion.ecorregion,
        siembraSemanas: plantaServicioEcorregion.siembraSemanas,
        floracionSemanas: plantaServicioEcorregion.floracionSemanas,
        corteSemanas: plantaServicioEcorregion.corteSemanas,
        semanasHastaFloracionMin: plantaServicioEcorregion.semanasHastaFloracionMin,
        semanasHastaFloracionMax: plantaServicioEcorregion.semanasHastaFloracionMax,
      })
      .from(plantaServicioEcorregion)
      .innerJoin(plantaServicio, eq(plantaServicio.id, plantaServicioEcorregion.plantaId))
      .where(estadoFiltro ? eq(plantaServicio.estado, estadoFiltro) : undefined)
      .orderBy(asc(plantaServicio.clave), asc(plantaServicioEcorregion.ecorregion));
    contenido = exportarPeriodosCsv(filas);
  } else {
    const filas = await db
      .select({
        cultivoClave: cultivo.clave,
        plantaClave: plantaServicio.clave,
        grado: compatibilidad.grado,
        justificacion: compatibilidad.justificacion,
        fuenteTipo: compatibilidad.fuenteTipo,
        fuenteDetalle: compatibilidad.fuenteDetalle,
        validadoPor: compatibilidad.validadoPor,
      })
      .from(compatibilidad)
      .innerJoin(cultivo, eq(cultivo.id, compatibilidad.cultivoId))
      .innerJoin(plantaServicio, eq(plantaServicio.id, compatibilidad.plantaId))
      .where(estadoFiltro ? eq(compatibilidad.estado, estadoFiltro) : undefined)
      .orderBy(asc(cultivo.clave), asc(plantaServicio.clave));
    contenido = exportarCompatibilidadesCsv(filas);
  }

  return new NextResponse(contenido, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tipo}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
