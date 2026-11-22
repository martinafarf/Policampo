// Gráfico liviano en SVG de la evolución del % con flores a lo largo del tiempo (Esp. 04, §5.4).
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import type { DiagnosticoNormalizado } from "@/dominio/diagnostico/entrada";

interface Props {
  diagnosticos: readonly DiagnosticoNormalizado[];
}

export function GraficoEvolucion({ diagnosticos }: Props) {
  if (diagnosticos.length === 0) return null;

  // Mostrar de izquierda (más viejo) a derecha (más nuevo).
  const ordenados = [...diagnosticos].reverse();
  const maxPct = Math.max(25, ...ordenados.map((d) => d.porcentajeFlores + 5));

  const ancho = 420;
  const alto = 180;
  const padIzq = 38;
  const padDer = 18;
  const padArr = 16;
  const padAba = 28;
  const anchoUtil = ancho - padIzq - padDer;
  const altoUtil = alto - padArr - padAba;

  const yDePct = (pct: number) => padArr + altoUtil - (Math.min(pct, maxPct) / maxPct) * altoUtil;
  const xDeIdx = (idx: number) =>
    ordenados.length === 1
      ? padIzq + anchoUtil / 2
      : padIzq + (idx / (ordenados.length - 1)) * anchoUtil;

  const puntos = ordenados.map((d, idx) => ({
    id: d.id,
    x: xDeIdx(idx),
    y: yDePct(d.porcentajeFlores),
    pct: d.porcentajeFlores,
    fecha: new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(
      d.creadoEn,
    ),
  }));

  const polylinePoints = puntos.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const y20 = yDePct(20);
  const y10 = yDePct(10);

  return (
    <figure className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-base font-bold text-stone-900">Evolución del % con flores</h2>
      <p className="mt-0.5 text-xs text-stone-600">
        Referencia: línea verde en 20 % (recomendado) y línea amarilla en 10 % (moderado).
      </p>

      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        role="img"
        aria-label={`Evolución del porcentaje con flores en ${ordenados.length} diagnósticos`}
        className="mt-3 h-44 w-full"
      >
        {/* Líneas de referencia */}
        <line
          x1={padIzq}
          y1={y20}
          x2={ancho - padDer}
          y2={y20}
          stroke="#15803d"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <text x={padIzq - 6} y={y20 + 3} textAnchor="end" fontSize="10" fill="#15803d">
          20%
        </text>

        <line
          x1={padIzq}
          y1={y10}
          x2={ancho - padDer}
          y2={y10}
          stroke="#d97706"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <text x={padIzq - 6} y={y10 + 3} textAnchor="end" fontSize="10" fill="#b45309">
          10%
        </text>

        {/* Eje base 0 % */}
        <line
          x1={padIzq}
          y1={padArr + altoUtil}
          x2={ancho - padDer}
          y2={padArr + altoUtil}
          stroke="#d6d3d1"
          strokeWidth={1}
        />
        <text x={padIzq - 6} y={padArr + altoUtil + 3} textAnchor="end" fontSize="10" fill="#78716c">
          0%
        </text>

        {/* Línea de evolución */}
        {puntos.length > 1 ? (
          <polyline
            fill="none"
            stroke="#047857"
            strokeWidth={2.2}
            points={polylinePoints}
          />
        ) : null}

        {/* Puntos */}
        {puntos.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={4.5} fill="#047857" stroke="#ffffff" strokeWidth={1.5}>
              <title>
                {p.fecha}: {formatearNumeroEsAr(p.pct, 1, 1)} %
              </title>
            </circle>
            <text
              x={p.x}
              y={alto - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#57534e"
            >
              {p.fecha}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
