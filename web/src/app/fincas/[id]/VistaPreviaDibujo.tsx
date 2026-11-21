// Dibujo de solo lectura en SVG para la ficha de fincas cargadas con croquis o mapa (Esp. 02, 5.4).
// No descarga imágenes satelitales para ahorrar datos móviles en el campo (sección 12).
import {
  crearContornoCroquis,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";
import type { SectorDetalle } from "../_lib/consultas";

interface Props {
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number | null;
  contorno: PoligonoGeoJson | null;
  sectores: readonly SectorDetalle[];
}

function puntosDePoligono(poligono: PoligonoGeoJson): Posicion2D[] {
  return poligono.coordinates[0] ?? [];
}

export function VistaPreviaDibujo({ metodo, superficieTotalHa, contorno, sectores }: Props) {
  if (metodo === "cuestionario") return null;

  const poligonoContorno =
    metodo === "croquis" && superficieTotalHa !== null && superficieTotalHa > 0
      ? crearContornoCroquis(superficieTotalHa)
      : contorno;

  const sectoresConGeometria = sectores.filter(
    (s): s is SectorDetalle & { geometria: PoligonoGeoJson } => s.geometria !== null,
  );

  if (!poligonoContorno && sectoresConGeometria.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-600">
        {metodo === "mapa"
          ? "Todavía no dibujaste el contorno de la finca en el mapa."
          : "Todavía no dibujaste sectores en el croquis."}
      </div>
    );
  }

  const todosLosPuntos: Posicion2D[] = [];
  if (poligonoContorno) {
    todosLosPuntos.push(...puntosDePoligono(poligonoContorno));
  }
  for (const s of sectoresConGeometria) {
    todosLosPuntos.push(...puntosDePoligono(s.geometria));
  }

  if (todosLosPuntos.length === 0) return null;

  const xs = todosLosPuntos.map((p) => p[0]);
  const ys = todosLosPuntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const ancho = Math.max(maxX - minX, 0.0001);
  const alto = Math.max(maxY - minY, 0.0001);

  const anchoSvg = 400;
  const altoSvg = 260;
  const margen = 16;
  const escala = Math.min((anchoSvg - margen * 2) / ancho, (altoSvg - margen * 2) / alto);
  const offsetX = (anchoSvg - ancho * escala) / 2;
  const offsetY = (altoSvg - alto * escala) / 2;

  // En croquis el origen (0, 0) está arriba a la izquierda; en mapa (WGS 84) la latitud crece hacia arriba.
  const invertirY = metodo === "mapa";

  function proyectar(poligono: PoligonoGeoJson): string {
    return puntosDePoligono(poligono)
      .map(([x, y]) => {
        const px = offsetX + (x - minX) * escala;
        const py = invertirY
          ? offsetY + (maxY - y) * escala
          : offsetY + (y - minY) * escala;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3">
      <svg
        viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
        role="img"
        aria-label="Dibujo esquemático del terreno y sus sectores"
        className="h-56 w-full rounded-lg bg-stone-50"
      >
        {poligonoContorno ? (
          <polygon
            points={proyectar(poligonoContorno)}
            fill="#f5f5f4"
            stroke="#57534e"
            strokeWidth={2}
            strokeDasharray={metodo === "croquis" ? "6 4" : undefined}
          />
        ) : null}

        {sectoresConGeometria.map((s) => {
          const esFlores = s.tipo === "sector_flores";
          return (
            <polygon
              key={s.id}
              points={proyectar(s.geometria)}
              fill={esFlores ? "rgba(147, 51, 234, 0.35)" : "rgba(22, 163, 74, 0.35)"}
              stroke={esFlores ? "#7e22ce" : "#15803d"}
              strokeWidth={1.8}
            >
              <title>{s.nombre}</title>
            </polygon>
          );
        })}
      </svg>

      <figcaption className="flex flex-wrap items-center gap-4 px-1 text-xs text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-green-700 bg-green-600/35" />
          Cultivo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-purple-700 bg-purple-600/35" />
          Sector de flores
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-stone-600 bg-stone-100" />
          Contorno del terreno
        </span>
      </figcaption>
    </figure>
  );
}
