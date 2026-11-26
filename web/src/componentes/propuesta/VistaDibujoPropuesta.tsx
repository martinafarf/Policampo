"use client";

// Dibujo SVG 2D y vista 3D interactiva de una propuesta de rediseño (Esp. 05 §7).
import { colorDeSector } from "@/componentes/sectores/colores";
import { useState } from "react";
import { armarLeyenda, type SectorDibujable } from "@/app/fincas/[id]/VistaPreviaDibujo";
import {
  crearContornoCroquis,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";
import type { FranjaPropuesta, GeometriaFranja } from "@/dominio/propuesta";
import { Vista3DPropuesta } from "./Vista3DPropuesta";

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
  const [modoVista, setModoVista] = useState<"2d" | "3d">("2d");

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
    // Sin borde propio: va dentro de una Tarjeta (sin tarjeta en tarjeta).
    <figure className={compacta ? "w-full" : "flex flex-col gap-3"}>
      {!compacta ? (
        // Plano o 3D: dos botones pegados (el elegido, relleno)
        <div className="flex justify-end">
          <div role="group" aria-label="Cómo ver el dibujo" className="inline-flex rounded-full bg-menta p-1">
            <button
              type="button"
              onClick={() => setModoVista("2d")}
              aria-pressed={modoVista === "2d"}
              className={`min-h-9 rounded-full px-4 text-sm font-bold transition ${
                modoVista === "2d" ? "bg-white text-bosque shadow-chica" : "text-tinta-suave hover:text-bosque"
              }`}
            >
              Plano
            </button>
            <button
              type="button"
              onClick={() => setModoVista("3d")}
              aria-pressed={modoVista === "3d"}
              className={`min-h-9 rounded-full px-4 text-sm font-bold transition ${
                modoVista === "3d" ? "bg-white text-bosque shadow-chica" : "text-tinta-suave hover:text-bosque"
              }`}
            >
              En 3D
            </button>
          </div>
        </div>
      ) : null}

      {!compacta && modoVista === "3d" ? (
        <Vista3DPropuesta
          metodo={metodo}
          superficieTotalHa={superficieTotalHa}
          contorno={poligonoContorno}
          sectores={sectoresConGeo}
          franjas={franjas}
        />
      ) : (
        <svg
          viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
          role="img"
          aria-label="Esquema espacial de la propuesta de franjas florales sobre la finca"
          className={`w-full rounded-2xl bg-papel ${compacta ? "h-32" : "h-72 sm:h-80"}`}
        >
          <path
            d={pathDeGeometria(poligonoContorno)}
            fill="#ffffff"
            stroke="#45573a"
            strokeWidth={compacta ? 1.5 : 2}
            strokeDasharray={metodo === "croquis" ? "5 3" : undefined}
          />

          {sectoresConGeo.map((s, idx) => {
            const esFlores = s.tipo === "sector_flores";
            // El mismo color de cada cultivo que en el mapa, el croquis y la ficha
            const color = colorDeSector(s.tipo, s.cultivoClave);
            return (
              <path
                key={s.id ?? `sec-${idx}`}
                d={pathDeGeometria(s.geometria)}
                fill={color.relleno}
                stroke={color.borde}
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
      )}

      {!compacta ? (
        <figcaption className="flex flex-wrap items-center gap-2 text-sm font-semibold text-tinta-suave">
          {[
            { texto: "Flores nuevas", borde: "#be185d", relleno: "rgba(219, 39, 119, 0.45)" },
            // Después, cada cultivo con su color (y las flores que ya hay), como en la ficha
            ...armarLeyenda(sectoresConGeo).map((e) => ({
              texto: e.clave === "flores" ? "Flores que ya tenés" : e.etiqueta,
              borde: e.borde,
              relleno: e.relleno,
            })),
          ].map((e) => (
            <span
              key={e.texto}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-borde bg-white px-3 py-1"
            >
              <span className="h-3 w-3 rounded-full border" style={{ borderColor: e.borde, backgroundColor: e.relleno }} />
              {e.texto}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
