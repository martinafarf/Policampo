// Insignia accesible de nivel de diagnóstico (siempre con texto e ícono, no solo color — CA-04-17, CA-04-18).
import {
  ETIQUETAS_NIVEL_RIESGO,
  ICONOS_NIVEL_RIESGO,
  type NivelRiesgo,
} from "@/dominio/diagnostico";

interface Props {
  nivel: NivelRiesgo;
  desactualizado?: boolean;
}

const CLASES_NIVEL: Readonly<Record<NivelRiesgo, string>> = {
  adecuado: "bg-emerald-100 text-emerald-900 border-emerald-200",
  moderado: "bg-amber-100 text-amber-950 border-amber-200",
  critico: "bg-red-100 text-red-900 border-red-200",
};

export function BadgeNivelDiagnostico({ nivel, desactualizado = false }: Props) {
  if (desactualizado) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
        <span aria-hidden>↻</span>
        <span>Desactualizado</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${CLASES_NIVEL[nivel]}`}
    >
      <span aria-hidden>{ICONOS_NIVEL_RIESGO[nivel]}</span>
      <span>{ETIQUETAS_NIVEL_RIESGO[nivel]}</span>
    </span>
  );
}
