// Insignia accesible de nivel de diagnóstico (siempre con texto e ícono, no solo color — CA-04-17, CA-04-18).
// Usa la Etiqueta común (DESIGN.md): adecuado = listo, moderado = atención, crítico = error.
import { Etiqueta, type TonoEtiqueta } from "@/componentes/ui/etiqueta";
import { ETIQUETAS_NIVEL_RIESGO, type NivelRiesgo } from "@/dominio/diagnostico";

interface Props {
  nivel: NivelRiesgo;
  desactualizado?: boolean;
}

const TONO_NIVEL: Readonly<Record<NivelRiesgo, TonoEtiqueta>> = {
  adecuado: "listo",
  moderado: "atencion",
  critico: "error",
};

export function BadgeNivelDiagnostico({ nivel, desactualizado = false }: Props) {
  if (desactualizado) {
    return <Etiqueta tono="atencion">Desactualizado</Etiqueta>;
  }
  return <Etiqueta tono={TONO_NIVEL[nivel]}>{ETIQUETAS_NIVEL_RIESGO[nivel]}</Etiqueta>;
}
