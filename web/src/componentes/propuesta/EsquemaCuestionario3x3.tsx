// Esquema visual 3x3 para propuestas de fincas cargadas con cuestionario (Esp. 05 §4.4).
import { ETIQUETAS_UBICACION_RELATIVA, formatearNumeroEsAr } from "@/dominio/diagnostico";
import { UBICACIONES_RELATIVAS, type UbicacionRelativa } from "@/dominio/establecimientos";
import type { RepartoUbicacionItem } from "@/dominio/propuesta";

interface Props {
  reparto: readonly RepartoUbicacionItem[];
  ocupadasPorSectores?: readonly {
    ubicacionRelativa?: UbicacionRelativa | null;
    tipo: "cultivo" | "sector_flores";
    nombre?: string;
  }[];
}

export function EsquemaCuestionario3x3({ reparto, ocupadasPorSectores = [] }: Props) {
  const mapaReparto = new Map<UbicacionRelativa, number>();
  for (const r of reparto) {
    if (r.ubicacion !== "bordes_cultivos" && r.ha > 0) {
      mapaReparto.set(r.ubicacion, (mapaReparto.get(r.ubicacion) ?? 0) + r.ha);
    }
  }

  const mapaSectores = new Map<UbicacionRelativa, string[]>();
  for (const s of ocupadasPorSectores) {
    if (!s.ubicacionRelativa) continue;
    const lista = mapaSectores.get(s.ubicacionRelativa) ?? [];
    lista.push(s.nombre ?? (s.tipo === "sector_flores" ? "Flores" : "Cultivo"));
    mapaSectores.set(s.ubicacionRelativa, lista);
  }

  return (
    <div className="rounded-2xl border-[1.5px] border-borde bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-tinta-suave">
        Esquema 3×3 de ubicaciones propuestas
      </p>
      <div
        role="grid"
        aria-label="Esquema de ubicaciones de la finca con franjas propuestas resaltadas"
        className="grid grid-cols-3 gap-1.5"
      >
        {UBICACIONES_RELATIVAS.map((ubic) => {
          const haProp = mapaReparto.get(ubic) ?? 0;
          const existentes = mapaSectores.get(ubic) ?? [];
          const propuestaAqui = haProp > 0;

          return (
            <div
              key={ubic}
              role="gridcell"
              className={`flex min-h-20 flex-col justify-between rounded-xl border p-2 text-xs ${
                propuestaAqui
                  ? "border-pink-400 bg-pink-50 text-pink-950"
                  : existentes.length > 0
                    ? "border-menta-fuerte bg-menta text-tinta"
                    : "border-borde bg-papel text-tinta-suave"
              }`}
            >
              <span className="text-xs font-medium leading-tight">
                {ETIQUETAS_UBICACION_RELATIVA[ubic]}
              </span>
              {propuestaAqui ? (
                <span className="mt-1 inline-block rounded-md bg-pink-700 px-1.5 py-0.5 text-xs font-bold text-white">
                  +{formatearNumeroEsAr(haProp, 4, 2)} ha
                </span>
              ) : existentes.length > 0 ? (
                <span className="mt-1 truncate text-xs font-medium text-bosque">
                  {existentes.join(", ")}
                </span>
              ) : (
                <span className="mt-1 text-xs text-tinta-suave">Libre</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
