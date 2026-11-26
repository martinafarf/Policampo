// Dibujo de solo lectura en SVG para la ficha y el diagnóstico de fincas en croquis o mapa.
// No descarga imágenes satelitales para ahorrar datos móviles en el campo (Esp. 02 §12, Esp. 04 §6).
import { colorDeSector, tieneColorPropio } from "@/componentes/sectores/colores";
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
  /** Clave del cultivo del catálogo: el sector se pinta del mismo color que tuvo al dibujarlo. */
  cultivoClave?: string | null;
  /** Nombre del cultivo, para la leyenda ("Arándano"). */
  cultivoNombre?: string | null;
  geometria?: PoligonoGeoJson | null;
}

export interface EntradaLeyenda {
  clave: string;
  etiqueta: string;
  borde: string;
  relleno: string;
}

/** Una entrada de leyenda por cada color que aparece en el dibujo (los cultivos primero, las flores al final). */
export function armarLeyenda(sectores: readonly SectorDibujable[]): EntradaLeyenda[] {
  const entradas = new Map<string, EntradaLeyenda>();
  for (const s of sectores) {
    const color = colorDeSector(s.tipo, s.cultivoClave);
    if (s.tipo === "sector_flores") {
      entradas.set("flores", { clave: "flores", etiqueta: "Flores", ...color });
    } else if (s.cultivoClave && tieneColorPropio(s.cultivoClave)) {
      if (!entradas.has(s.cultivoClave)) {
        entradas.set(s.cultivoClave, {
          clave: s.cultivoClave,
          etiqueta: s.cultivoNombre ?? s.nombre ?? "Cultivo",
          ...color,
        });
      }
    } else {
      entradas.set("otro", { clave: "otro", etiqueta: "Otros cultivos", ...color });
    }
  }
  return [...entradas.values()].sort((a, b) => Number(a.clave === "flores") - Number(b.clave === "flores"));
}

interface Props {
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number | null;
  contorno: PoligonoGeoJson | null;
  sectores: readonly SectorDibujable[];
  superficieLibre?: GeometriaLibreGeoJson | null;
  /** Miniatura (Mis fincas): solo el dibujo, chico y sin leyenda. Si no hay dibujo, no muestra nada. */
  compacta?: boolean;
  /** Alto del dibujo (clases de Tailwind). Por defecto h-56; la ficha lo agranda. */
  claseAlto?: string;
  /** Lienzo cuadrado en vez de apaisado: para cuando el dibujo va en una columna angosta (ficha). */
  cuadrada?: boolean;
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
  compacta = false,
  claseAlto = "h-56",
  cuadrada = false,
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
    if (compacta) return null;
    return (
      <div className="rounded-2xl bg-papel px-4 py-8 text-center text-tinta-suave">
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

  // La miniatura es cuadrada para que entre en la tarjeta del listado.
  const anchoSvg = compacta ? 200 : cuadrada ? 300 : 400;
  const altoSvg = compacta ? 200 : cuadrada ? 300 : 260;
  const margen = compacta ? 12 : 16;
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

  if (compacta) {
    return (
      <svg viewBox={`0 0 ${anchoSvg} ${altoSvg}`} aria-hidden="true" className="h-full w-full">
        {poligonoContorno ? (
          <polygon
            points={proyectar(poligonoContorno)}
            fill="#ffffff"
            stroke="#45573a"
            strokeWidth={3}
            strokeDasharray={metodo === "croquis" ? "8 6" : undefined}
          />
        ) : null}
        {sectoresConGeometria.map((s, idx) => {
          const color = colorDeSector(s.tipo, s.cultivoClave);
          return (
            <polygon
              key={s.id ?? `${s.tipo}-${idx}`}
              points={proyectar(s.geometria)}
              fill={color.relleno}
              stroke={color.borde}
              strokeWidth={2.5}
            />
          );
        })}
      </svg>
    );
  }

  return (
    // Sin borde propio: va dentro de una Tarjeta (DESIGN.md → sin tarjeta en tarjeta).
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
        role="img"
        aria-label={
          superficieLibre
            ? "Dibujo esquemático del terreno, sus sectores y la superficie libre disponible"
            : "Dibujo esquemático del terreno y sus sectores"
        }
        className={`${claseAlto} w-full rounded-2xl bg-papel`}
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
            fill="#ffffff"
            stroke="#45573a"
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
          const color = colorDeSector(s.tipo, s.cultivoClave);
          return (
            <polygon
              key={s.id ?? `${s.tipo}-${idx}`}
              points={proyectar(s.geometria)}
              fill={color.relleno}
              stroke={color.borde}
              strokeWidth={1.8}
            >
              <title>{s.nombre ?? (esFlores ? "Sector de flores" : "Cultivo")}</title>
            </polygon>
          );
        })}
      </svg>

      {/* Leyenda: cada muestra con el mismo color que en el dibujo. */}
      <figcaption className="flex flex-wrap items-center gap-2 text-sm font-semibold text-tinta-suave">
        {armarLeyenda(sectoresConGeometria).map((e) => (
          <span
            key={e.clave}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-borde bg-white px-3 py-1"
          >
            <span className="h-3 w-3 rounded-full border" style={{ borderColor: e.borde, backgroundColor: e.relleno }} />
            {e.etiqueta}
          </span>
        ))}
        {superficieLibre ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-borde bg-white px-3 py-1">
            <span className="h-3 w-3 rounded-full border border-amber-700 bg-amber-200/70" />
            Lugar libre
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-borde bg-white px-3 py-1">
          <span className="h-3 w-3 rounded-full border border-[#45573a] bg-white" />
          Borde del terreno
        </span>
      </figcaption>
    </figure>
  );
}
