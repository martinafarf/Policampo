// Dibujo de solo lectura en SVG para la ficha y el diagnóstico de fincas en croquis o mapa.
// No descarga imágenes satelitales para ahorrar datos móviles en el campo (Esp. 02 §12, Esp. 04 §6).
import type { GeometriaLibreGeoJson } from "@/dominio/diagnostico/tipos";
import {
  crearContornoCroquis,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type Posicion2D,
  type TipoSector,
} from "@/dominio/establecimientos";

export interface SectorDibujable {
  id?: string;
  nombre?: string;
  tipo: TipoSector;
  geometria?: PoligonoGeoJson | null;
}

interface Props {
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number | null;
  contorno: PoligonoGeoJson | null;
  sectores: readonly SectorDibujable[];
  superficieLibre?: GeometriaLibreGeoJson | null;
}

function puntosDePoligono(poligono: PoligonoGeoJson): Posicion2D[] {
  return poligono.coordinates[0] ?? [];
}

function anillosDeGeometriaLibre(geo: GeometriaLibreGeoJson): Posicion2D[][] {
  if (geo.type === "Polygon") {
    return geo.coordinates as Posicion2D[][];
  }
  const anillos: Posicion2D[][] = [];
  for (const poli of geo.coordinates) {
    for (const anillo of poli) {
      anillos.push(anillo as Posicion2D[]);
    }
  }
  return anillos;
}

export function VistaPreviaDibujo({
  metodo,
  superficieTotalHa,
  contorno,
  sectores,
  superficieLibre = null,
}: Props) {
  if (metodo === "cuestionario") return null;

  const poligonoContorno =
    metodo === "croquis" && superficieTotalHa !== null && superficieTotalHa > 0
      ? crearContornoCroquis(superficieTotalHa)
      : contorno;

  const sectoresConGeometria = sectores.filter(
    (s): s is SectorDibujable & { geometria: PoligonoGeoJson } =>
      s.geometria !== null && s.geometria !== undefined,
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

  function proyectarPunto([x, y]: Posicion2D): [number, number] {
    const px = offsetX + (x - minX) * escala;
    const py = invertirY ? offsetY + (maxY - y) * escala : offsetY + (y - minY) * escala;
    return [px, py];
  }

  function proyectar(poligono: PoligonoGeoJson): string {
    return puntosDePoligono(poligono)
      .map((p) => {
        const [px, py] = proyectarPunto(p);
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
  }

  function proyectarPathLibre(geo: GeometriaLibreGeoJson): string {
    return anillosDeGeometriaLibre(geo)
      .filter((anillo) => anillo.length >= 3)
      .map((anillo) => {
        const cmds = anillo.map((p, idx) => {
          const [px, py] = proyectarPunto(p);
          return `${idx === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
        });
        return `${cmds.join(" ")} Z`;
      })
      .join(" ");
  }

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3">
      <svg
        viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
        role="img"
        aria-label={
          superficieLibre
            ? "Dibujo esquemático del terreno, sus sectores y la superficie libre disponible"
            : "Dibujo esquemático del terreno y sus sectores"
        }
        className="h-56 w-full rounded-lg bg-stone-50"
      >
        <defs>
          <pattern
            id="patron-superficie-libre"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="rgba(245, 158, 11, 0.14)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#d97706" strokeWidth="2" strokeOpacity="0.55" />
          </pattern>
        </defs>

        {poligonoContorno ? (
          <polygon
            points={proyectar(poligonoContorno)}
            fill="#f5f5f4"
            stroke="#57534e"
            strokeWidth={2}
            strokeDasharray={metodo === "croquis" ? "6 4" : undefined}
          />
        ) : null}

        {superficieLibre ? (
          <path
            d={proyectarPathLibre(superficieLibre)}
            fill="url(#patron-superficie-libre)"
            fillRule="evenodd"
            stroke="#b45309"
            strokeWidth={1.2}
            strokeDasharray="4 3"
          >
            <title>Superficie libre disponible</title>
          </path>
        ) : null}

        {sectoresConGeometria.map((s, idx) => {
          const esFlores = s.tipo === "sector_flores";
          return (
            <polygon
              key={s.id ?? `${s.tipo}-${idx}`}
              points={proyectar(s.geometria)}
              fill={esFlores ? "rgba(147, 51, 234, 0.35)" : "rgba(22, 163, 74, 0.35)"}
              stroke={esFlores ? "#7e22ce" : "#15803d"}
              strokeWidth={1.8}
            >
              <title>{s.nombre ?? (esFlores ? "Sector de flores" : "Cultivo")}</title>
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
        {superficieLibre ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-amber-700 bg-amber-200/70" />
            Superficie libre
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-stone-600 bg-stone-100" />
          Contorno del terreno
        </span>
      </figcaption>
    </figure>
  );
}
