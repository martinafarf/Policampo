// Textos, etiquetas, beneficios y explicaciones del diagnóstico (Esp. 04, secciones 4.3 a 4.6 y 5.2).
// Reglas: RN-07 (explicable y sin cifras económicas inventadas), RD-02 (español), CA-04-12 y CA-04-17.
import type { UbicacionRelativa } from "@/dominio/establecimientos";
import type { AlertaDiagnostico, NivelRiesgo } from "./tipos";

export const ETIQUETAS_UBICACION_RELATIVA: Readonly<Record<UbicacionRelativa, string>> = {
  arriba_izquierda: "arriba a la izquierda",
  arriba_centro: "arriba al centro",
  arriba_derecha: "arriba a la derecha",
  centro_izquierda: "al centro a la izquierda",
  centro: "al centro",
  centro_derecha: "al centro a la derecha",
  abajo_izquierda: "abajo a la izquierda",
  abajo_centro: "abajo al centro",
  abajo_derecha: "abajo a la derecha",
};

export const ETIQUETAS_NIVEL_RIESGO: Readonly<Record<NivelRiesgo, string>> = {
  adecuado: "Adecuado",
  moderado: "Moderado",
  critico: "Crítico",
};

export const ICONOS_NIVEL_RIESGO: Readonly<Record<NivelRiesgo, string>> = {
  adecuado: "✓",
  moderado: "▲",
  critico: "!",
};

export function formatearNumeroEsAr(valor: number, maxDecimales = 2, minDecimales = 0): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: minDecimales,
    maximumFractionDigits: maxDecimales,
  }).format(valor);
}

export function obtenerMensajeNivelRiesgo(
  nivel: NivelRiesgo,
  hectareasACompensar: number,
): string {
  const haTexto = formatearNumeroEsAr(hectareasACompensar, 4, 1);
  if (nivel === "adecuado") {
    return "Tu finca alcanza el 20 % recomendado de flores y vegetación natural.";
  }
  if (nivel === "moderado") {
    return `Tu finca tiene flores, pero le faltan ${haTexto} ha para llegar al 20 %.`;
  }
  return `Tu finca tiene muy poca superficie con flores: le faltan ${haTexto} ha para llegar al 20 %.`;
}

export function construirTextoAlerta(alerta: AlertaDiagnostico): {
  titulo: string;
  descripcion: string;
} {
  switch (alerta.tipo) {
    case "monocultivo":
      return {
        titulo: `Monocultivo (${alerta.datos.cultivoNombre}, ${formatearNumeroEsAr(alerta.datos.porcentaje, 1, 1)} %)`,
        descripcion:
          "Un solo cultivo ocupa la mayor parte de la finca. Los monocultivos tienen menos polinizadores e insectos benéficos.",
      };
    case "sin_flores":
      return {
        titulo: "Sin sectores con flores",
        descripcion:
          "No cargaste sectores con flores o vegetación natural. Si ya existen, cargalos como 'Sector de flores'.",
      };
    case "superficie_sin_asignar":
      return {
        titulo: "Superficie sin asignar",
        descripcion: `Tenés ${formatearNumeroEsAr(alerta.datos.superficieSinAsignarHa, 4, 1)} ha sin asignar. Si tienen flores o vegetación natural, cargalas como Sector de flores.`,
      };
    case "cultivo_sin_datos":
      return {
        titulo: `Cultivo sin datos en el catálogo (${alerta.datos.cultivoNombre})`,
        descripcion: `No tenemos información validada sobre ${alerta.datos.cultivoNombre}: el diagnóstico es general y no vamos a poder recomendarte plantas específicas para ese cultivo.`,
      };
  }
}

// Bloque fijo de beneficios en palabras, sin promesas económicas para la finca (Esp. 04, 4.6, RN-07).
export const BENEFICIOS_DIAGNOSTICO = {
  items: [
    {
      titulo: "Más polinizadores",
      texto:
        "Mejor cuaje, y frutos más grandes y parejos en los cultivos que dependen de la polinización.",
    },
    {
      titulo: "Control biológico",
      texto:
        "Los insectos benéficos ayudan a controlar las plagas y se reduce el uso de insecticidas.",
    },
    {
      titulo: "Suelo y agua",
      texto: "Menos agroquímicos protegen el suelo y las fuentes de agua.",
    },
  ],
  fuente:
    "Fuente: Garibaldi y otros, Paisajes agrícolas multifuncionales; entrevistas a especialistas. Los resultados dependen de cada finca.",
} as const;

// Genera los pasos legibles de "Cómo se calculó" con los números concretos del diagnóstico (CA-04-12).
export function construirExplicacionCalculo(datos: {
  superficieTotalHa: number;
  superficieFloresHa: number;
  superficieCultivosHa: number;
  superficieSinAsignarHa: number;
  porcentajeFlores: number;
  deficitPp: number;
  hectareasACompensar: number;
  perimetroM: number | null;
  anchoFranjaM: number | null;
  versionReglas: string;
}): string[] {
  const f = formatearNumeroEsAr(datos.superficieFloresHa, 4, 1);
  const t = formatearNumeroEsAr(datos.superficieTotalHa, 4, 1);
  const c = formatearNumeroEsAr(datos.superficieCultivosHa, 4, 1);
  const l = formatearNumeroEsAr(datos.superficieSinAsignarHa, 4, 1);
  const pct = formatearNumeroEsAr(datos.porcentajeFlores, 1, 1);
  const def = formatearNumeroEsAr(datos.deficitPp, 1, 1);
  const compHa = formatearNumeroEsAr(datos.hectareasACompensar, 4, 1);
  const compM2 = formatearNumeroEsAr(Math.round(datos.hectareasACompensar * 10_000), 0, 0);

  const pasos = [
    `Superficies sumadas: ${f} ha de flores, ${c} ha de cultivos y ${l} ha sin asignar sobre ${t} ha totales.`,
    `Porcentaje con flores: ${f} ha ÷ ${t} ha × 100 = ${pct} %.`,
    datos.deficitPp > 0
      ? `Déficit frente al 20 % recomendado: 20,0 % − ${pct} % = ${def} puntos porcentuales.`
      : `Sin déficit: ${pct} % alcanza o supera el 20 % recomendado.`,
    datos.hectareasACompensar > 0
      ? `Superficie a compensar: 20 % de ${t} ha − ${f} ha = ${compHa} ha (${compM2} m²).`
      : "Superficie a compensar: 0 ha.",
  ];

  if (datos.perimetroM !== null && datos.anchoFranjaM !== null && datos.hectareasACompensar > 0) {
    const p = formatearNumeroEsAr(datos.perimetroM, 1, 1);
    const a = formatearNumeroEsAr(datos.anchoFranjaM, 1, 1);
    pasos.push(
      `Ancho aproximado de franja perimetral: ${compM2} m² ÷ ${p} m de perímetro = ${a} m (sin descontar esquinas).`,
    );
  }

  pasos.push(`Versión de reglas aplicada: v${datos.versionReglas}.`);
  return pasos;
}
