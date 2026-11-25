"use client";

// Dibujo aproximado de lo que se va cargando en el cuestionario (ver disposicion.ts para cómo se arma):
// una tarjeta con el plano de la finca y un rectángulo por cada sector, con su nombre y sus hectáreas.
// Se actualiza solo a medida que la persona escribe. Usa los mismos colores que la paleta del croquis.
import { useId } from "react";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearHectareas } from "@/dominio/establecimientos";
import { colorDeSector } from "./PaletaSectores";
import { LADO_PLANO, disponerSectores, type SectorParaDibujar } from "./disposicion";

interface Props {
  superficieTotalHa: number;
  sectores: readonly SectorParaDibujar[];
}

export function DibujoSectores({ superficieTotalHa, sectores }: Props) {
  const idPatron = useId();
  const { rectangulos } = disponerSectores(superficieTotalHa, sectores);
  const porId = new Map(sectores.map((s) => [s.id, s]));
  const lado = Math.sqrt(superficieTotalHa * 10000);
  const ladoTexto = lado.toLocaleString("es-AR", { maximumFractionDigits: 0 });

  return (
    <Tarjeta titulo="Así va tu finca">
      <figure className="flex flex-col gap-2">
        <svg
          viewBox={`0 0 ${LADO_PLANO} ${LADO_PLANO}`}
          role="img"
          aria-label={
            rectangulos.length === 0
              ? "Dibujo de tu finca, todavía sin sectores"
              : `Dibujo aproximado de tu finca con ${rectangulos.length} ${rectangulos.length === 1 ? "sector" : "sectores"}`
          }
          className="mx-auto block aspect-square w-full max-w-[min(100%,max(11rem,calc(100dvh-33rem)))] rounded-2xl border-2 border-borde bg-papel"
        >
          <defs>
            <pattern id={idPatron} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#d3e0cc" strokeWidth="3" />
            </pattern>
          </defs>

          {/* Lo que todavía no se cargó queda con rayas */}
          <rect width={LADO_PLANO} height={LADO_PLANO} fill={`url(#${idPatron})`} />

          {rectangulos.map((r) => {
            const sector = porId.get(r.id);
            if (!sector) return null;
            const color = colorDeSector(sector.tipo, sector.claveCultivo);
            // El texto solo se escribe si entra; si no, queda en el cartelito al pasar el mouse.
            const entraNombre = r.ancho > 62 && r.alto > 34;
            const maxLetras = Math.max(3, Math.floor(r.ancho / 6.4));
            const nombre =
              sector.nombre.length > maxLetras ? `${sector.nombre.slice(0, maxLetras - 1)}…` : sector.nombre;
            return (
              <g key={r.id}>
                {/* Un solo texto: React no admite varios dentro de <title> */}
                <title>{`${sector.nombre}: ${formatearHectareas(sector.superficieHa)}`}</title>
                {/* Base blanca para que las rayas de "sin cargar" no se vean a través del color */}
                <rect x={r.x} y={r.y} width={r.ancho} height={r.alto} fill="#ffffff" />
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.ancho}
                  height={r.alto}
                  fill={color.relleno}
                  stroke={color.borde}
                  strokeWidth={1.5}
                />
                {entraNombre ? (
                  <>
                    <text
                      x={r.x + r.ancho / 2}
                      y={r.y + r.alto / 2 - 2}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight="bold"
                      fill="#0f220f"
                      className="pointer-events-none"
                    >
                      {nombre}
                    </text>
                    <text
                      x={r.x + r.ancho / 2}
                      y={r.y + r.alto / 2 + 12}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#45573a"
                      className="pointer-events-none"
                    >
                      {formatearHectareas(sector.superficieHa)}
                    </text>
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>

        <figcaption className="text-center text-sm text-tinta-suave">
          {rectangulos.length === 0
            ? "Cuando cargues las hectáreas de un sector, aparece acá."
            : `Dibujo aproximado de tu finca (${ladoTexto} m por ${ladoTexto} m). Lo que queda con rayas todavía no lo cargaste.`}
        </figcaption>
      </figure>
    </Tarjeta>
  );
}
