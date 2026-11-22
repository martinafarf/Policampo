// Gráfico accesible de semanas de floración: cultivo vs mezcla de plantas (Esp. 05 §5.5, §7, CA-05-15, CA-05-21).
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import type { EvaluacionFloracionMezcla } from "@/dominio/propuesta";

const MESES = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;
const SEMANAS_52 = Array.from({ length: 52 }, (_, i) => i + 1);

interface Props {
  floracion: EvaluacionFloracionMezcla;
}

export function GraficoFloracionSemanas({ floracion }: Props) {
  if (floracion.porCultivo.length === 0) {
    return (
      <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
        Todavía no hay semanas de floración publicadas para los cultivos de esta finca.
      </p>
    );
  }

  const semanasMezclaSet = new Set(floracion.semanasMezcla);

  return (
    <div className="flex flex-col gap-4">
      {floracion.porCultivo.map((ev) => {
        const semanasCultivoSet = new Set(ev.semanasCultivo);
        const anticipacionSet = new Set(ev.semanasAnticipacionRequeridas);
        const resumenAccesible = `Para ${ev.cultivoNombre}: la mezcla cubre el ${formatearNumeroEsAr(ev.coberturaPct, 1, 1)} % de su floración y ${ev.cumpleAnticipacion ? "cumple" : "no cumple"} la anticipación de 1 semana.`;

        return (
          <div
            key={ev.cultivoId}
            className="rounded-xl border border-stone-200 bg-white p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-stone-900">{ev.cultivoNombre}</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  ev.cumple
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-amber-100 text-amber-950"
                }`}
              >
                {ev.cumple ? "✓ Cubierto" : "▲ Cobertura parcial"} ·{" "}
                {formatearNumeroEsAr(ev.coberturaPct, 1, 1)} %
              </span>
            </div>

            {/* Encabezado de 12 meses */}
            <div
              role="img"
              aria-label={resumenAccesible}
              className="mt-3 flex flex-col gap-1.5"
            >
              <div className="grid grid-cols-12 text-center text-[10px] font-semibold text-stone-500">
                {MESES.map((m, idx) => (
                  <span key={`${m}-${idx}`}>{m}</span>
                ))}
              </div>

              {/* Barra Cultivo */}
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] font-medium text-stone-600">
                  Cultivo
                </span>
                <div className="grid flex-1 grid-cols-52 gap-px rounded-xs bg-stone-100 p-0.5">
                  {SEMANAS_52.map((s) => {
                    const florece = semanasCultivoSet.has(s);
                    const esAnticip = anticipacionSet.has(s);
                    return (
                      <span
                        key={s}
                        title={`Semana ${s}${florece ? " — floración cultivo" : esAnticip ? " — anticipación requerida" : ""}`}
                        className={`h-3 rounded-[1px] ${
                          florece
                            ? "bg-emerald-600"
                            : esAnticip
                              ? "bg-amber-400"
                              : "bg-stone-200/70"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Barra Mezcla */}
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] font-medium text-stone-600">
                  Mezcla
                </span>
                <div className="grid flex-1 grid-cols-52 gap-px rounded-xs bg-stone-100 p-0.5">
                  {SEMANAS_52.map((s) => {
                    const florece = semanasMezclaSet.has(s);
                    return (
                      <span
                        key={s}
                        title={`Semana ${s}${florece ? " — floración mezcla" : ""}`}
                        className={`h-3 rounded-[1px] ${
                          florece ? "bg-pink-600" : "bg-stone-200/70"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-stone-600">
              {resumenAccesible}
              {ev.semanasDescubiertas.length > 0
                ? ` Semanas descubiertas: ${ev.semanasDescubiertas.join(", ")}.`
                : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
