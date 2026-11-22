// Dibujo SVG de una propuesta de rediseño: contorno, sectores existentes y franjas propuestas (Esp. 05 §7).
import type { SectorDibujable } from "@/app/fincas/[id]/VistaPreviaDibujo";
import {
  crearContornoCroquis,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";
import type { FranjaPropuesta, GeometriaFranja } from "@/dominio/propuesta";

interface Props {
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number;
  contorno: PoligonoGeoJson | null;
  sectores: readonly SectorDibujable[];
  franjas: readonly FranjaPropuesta[];
  compacta?: boolean;
}

function anillosDeGeometria(geo: GeometriaFranja): Posicion2D[][] {
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

export function VistaDibujoPropuesta({
  metodo,
  superficieTotalHa,
  contorno,
  sectores,
  franjas,
  compacta = false,
}: Props) {
  if (metodo === "cuestionario") return null;

  const poligonoContorno =
    contorno ?? (metodo === "croquis" && superficieTotalHa > 0 ? crearContornoCroquis(superficieTotalHa) : null);

  if (!poligonoContorno) return null;

  const sectoresConGeo = sectores.filter(
    (s): s is SectorDibujable & { geometria: PoligonoGeoJson } => Boolean(s.geometria),
  );

  const puntos: Posicion2D[] = [...(poligonoContorno.coordinates[0] ?? [])];
  for (const s of sectoresConGeo) {
    puntos.push(...(s.geometria.coordinates[0] ?? []));
  }
  if (puntos.length === 0) return null;

  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const ancho = Math.max(maxX - minX, 0.0001);
  const alto = Math.max(maxY - minY, 0.0001);
  const anchoSvg = compacta ? 240 : 420;
  const altoSvg = compacta ? 150 : 270;
  const margen = compacta ? 10 : 16;
  const escala = Math.min((anchoSvg - margen * 2) / ancho, (altoSvg - margen * 2) / alto);
  const offsetX = (anchoSvg - ancho * escala) / 2;
  const offsetY = (altoSvg - alto * escala) / 2;
  const invertirY = metodo === "mapa";

  function proyectarPunto([x, y]: Posicion2D): [number, number] {
    const px = offsetX + (x - minX) * escala;
    const py = invertirY ? offsetY + (maxY - y) * escala : offsetY + (y - minY) * escala;
    return [px, py];
  }

  function pathDeGeometria(geo: GeometriaFranja): string {
    return anillosDeGeometria(geo)
      .filter((a) => a.length >= 3)
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
    <figure className={compacta ? "w-full" : "flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3"}>
      <svg
        viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
        role="img"
        aria-label="Esquema espacial de la propuesta de franjas florales sobre la finca"
        className={`w-full rounded-lg bg-stone-50 ${compacta ? "h-32" : "h-60"}`}
      >
        <path
          d={pathDeGeometria(poligonoContorno)}
          fill="#f5f5f4"
          stroke="#57534e"
          strokeWidth={compacta ? 1.5 : 2}
          strokeDasharray={metodo === "croquis" ? "5 3" : undefined}
        />

        {sectoresConGeo.map((s, idx) => {
          const esFlores = s.tipo === "sector_flores";
          return (
            <path
              key={s.id ?? `sec-${idx}`}
              d={pathDeGeometria(s.geometria)}
              fill={esFlores ? "rgba(147, 51, 234, 0.25)" : "rgba(22, 163, 74, 0.25)"}
              stroke={esFlores ? "#7e22ce" : "#15803d"}
              strokeWidth={compacta ? 1 : 1.4}
            >
              <title>{s.nombre ?? (esFlores ? "Flores existentes" : "Cultivo")}</title>
            </path>
          );
        })}

        {franjas.map((franja, idx) => (
          <path
            key={franja.id || `franja-${idx}`}
            d={pathDeGeometria(franja.geometria)}
            fill="rgba(219, 39, 119, 0.45)"
            fillRule="evenodd"
            stroke="#be185d"
            strokeWidth={compacta ? 1.4 : 2}
          >
            <title>{franja.etiqueta}</title>
          </path>
        ))}
      </svg>

      {!compacta ? (
        <figcaption className="flex flex-wrap items-center gap-4 px-1 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-pink-700 bg-pink-600/45" />
            Franjas propuestas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-green-700 bg-green-600/25" />
            Cultivo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs border border-purple-700 bg-purple-600/25" />
            Flores existentes
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
