// Función pura del diagnóstico agroecológico (especificación 04, sección 4).
// Sin acceso a base de datos ni reloj; 100 % determinística y trazable (RN-01, RN-07, CA-04-01 a 07).
import { UBICACIONES_RELATIVAS, type PoligonoGeoJson, type UbicacionRelativa } from "@/dominio/establecimientos";
import {
  decimasANumero,
  dividirRedondeandoMitadArriba,
  enteroEscaladoAHa,
  parsearHaAEnteroEscalado,
} from "./decimales";
import { calcularPerimetroContornoMetros, calcularSuperficieLibre } from "./geometria";
import { ETIQUETAS_UBICACION_RELATIVA, formatearNumeroEsAr } from "./textos";
import {
  UMBRALES_DIAGNOSTICO,
  VERSION_REGLAS_DIAGNOSTICO,
  type AlertaDiagnostico,
  type AreasAptasDiagnostico,
  type EntradaDiagnostico,
  type GeometriaLibreGeoJson,
  type NivelRiesgo,
  type ResultadoDiagnostico,
} from "./tipos";

const CERO = BigInt(0);
const DIEZ = BigInt(10);
const CIEN = BigInt(100);
const MIL = BigInt(1000);
const DIEZ_MIL = BigInt(10_000);

const UBICACIONES_BORDE: readonly UbicacionRelativa[] = UBICACIONES_RELATIVAS.filter(
  (u) => u !== "centro",
);

function redondearDecimas(valor: number): number {
  // Redondeo half-up a 1 decimal para perímetros continuos (en metros).
  return Math.floor(valor * 10 + 0.5 + Number.EPSILON) / 10;
}

export function diagnosticar(entrada: EntradaDiagnostico): ResultadoDiagnostico {
  const totalM2 = parsearHaAEnteroEscalado(entrada.superficieTotalHa);
  if (totalM2 <= CERO) {
    throw new Error("La superficie total debe ser mayor que 0 ha para diagnosticar.");
  }

  let floresM2 = CERO;
  let cultivosM2 = CERO;

  // Acumuladores para alertas de monocultivo y cultivos sin datos en el catálogo.
  const cultivosPorClave = new Map<string, { nombre: string; superficieM2: bigint }>();
  const cultivosSinDatos = new Map<string, string>();
  const ubicacionesOcupadas = new Set<UbicacionRelativa>();
  const geometriasSectores: PoligonoGeoJson[] = [];

  for (const sector of entrada.sectores) {
    const supM2 = parsearHaAEnteroEscalado(sector.superficieHa);
    if (supM2 < CERO) {
      throw new Error("Las superficies de los sectores no pueden ser negativas.");
    }

    if (sector.ubicacionRelativa) {
      ubicacionesOcupadas.add(sector.ubicacionRelativa);
    }
    if (sector.geometria) {
      geometriasSectores.push(sector.geometria);
    }

    if (sector.tipo === "sector_flores") {
      // CA-04-02: todos los subtipos de flores suman por igual al 100 %.
      floresM2 += supM2;
    } else {
      cultivosM2 += supM2;

      const claveNorm = sector.cultivoClave
        ? `clave:${sector.cultivoClave.trim().toLowerCase()}`
        : `otro:${(sector.cultivoOtro ?? sector.cultivoNombre ?? "sin especificar").trim().toLowerCase()}`;
      const nombreVisible =
        sector.cultivoNombre?.trim() ||
        sector.cultivoOtro?.trim() ||
        sector.cultivoClave?.trim() ||
        "Otro cultivo";

      const acumulado = cultivosPorClave.get(claveNorm);
      if (acumulado) {
        acumulado.superficieM2 += supM2;
      } else {
        cultivosPorClave.set(claveNorm, { nombre: nombreVisible, superficieM2: supM2 });
      }

      // CA-04-06: alerta si el sector usa "Otro" o un cultivo sin datos publicados en el catálogo.
      const esOtro = !sector.cultivoClave;
      const sinDatosPublicados = esOtro || !sector.tieneDatosPublicadosCatalogo;
      if (sinDatosPublicados && !cultivosSinDatos.has(claveNorm)) {
        cultivosSinDatos.set(claveNorm, nombreVisible);
      }
    }
  }

  // Superficie sin asignar L = max(0, T - F - C). No suma para el 20 % (CA-04-02).
  const sumaAsignadaM2 = floresM2 + cultivosM2;
  const sinAsignarM2 = totalM2 > sumaAsignadaM2 ? totalM2 - sumaAsignadaM2 : CERO;

  // Porcentaje con flores = F / T * 100 (1 decimal, half-up, CA-04-01).
  const porcentajeDecimas = dividirRedondeandoMitadArriba(floresM2 * MIL, totalM2);
  const porcentajeFlores = decimasANumero(porcentajeDecimas);

  // Nivel de riesgo evaluado con fracciones exactas (sin errores de coma flotante).
  const umbralAdecuado = BigInt(UMBRALES_DIAGNOSTICO.adecuadoPct);
  const umbralModerado = BigInt(UMBRALES_DIAGNOSTICO.moderadoPct);
  let nivelRiesgo: NivelRiesgo;
  if (floresM2 * CIEN >= umbralAdecuado * totalM2) {
    nivelRiesgo = "adecuado";
  } else if (floresM2 * CIEN >= umbralModerado * totalM2) {
    nivelRiesgo = "moderado";
  } else {
    nivelRiesgo = "critico";
  }

  // Déficit en puntos porcentuales = max(0, 20 - % exacto), redondeado a 1 decimal al final.
  const deficitDecimas =
    floresM2 * CIEN >= umbralAdecuado * totalM2
      ? CERO
      : dividirRedondeandoMitadArriba((umbralAdecuado * totalM2 - floresM2 * CIEN) * DIEZ, totalM2);
  const deficitPp = decimasANumero(deficitDecimas);

  // Hectáreas a compensar = max(0, 0,20 * T - F), redondeado a 4 decimales (1 m²) al final.
  const objetivoEscalado = umbralAdecuado * totalM2; // escala 100 * 10.000
  const floresEscalado = floresM2 * CIEN;
  const faltanteEscalado =
    objetivoEscalado > floresEscalado ? objetivoEscalado - floresEscalado : CERO;
  const compensarM2 = dividirRedondeandoMitadArriba(faltanteEscalado, CIEN);

  const superficieTotalHa = enteroEscaladoAHa(totalM2);
  const superficieFloresHa = enteroEscaladoAHa(floresM2);
  const superficieCultivosHa = enteroEscaladoAHa(cultivosM2);
  const superficieSinAsignarHa = enteroEscaladoAHa(sinAsignarM2);
  const hectareasACompensar = enteroEscaladoAHa(compensarM2);

  // Perímetro, ancho de franja perimetral y superficie libre (solo croquis y mapa, 4.4).
  let perimetroM: number | null = null;
  let anchoFranjaM: number | null = null;
  let superficieLibre: GeometriaLibreGeoJson | null = null;
  let superficieLibreHa: number | null = null;

  if (entrada.metodo === "croquis" || entrada.metodo === "mapa") {
    const perimetroExacto = calcularPerimetroContornoMetros({
      metodo: entrada.metodo,
      superficieTotalHa,
      contorno: entrada.contorno,
    });

    if (perimetroExacto !== null && perimetroExacto > 0) {
      perimetroM = redondearDecimas(perimetroExacto);
      if (compensarM2 === CERO) {
        anchoFranjaM = 0;
      } else {
        // Ancho exacto = (compensarM2 m²) / perimetroExacto m, redondeado half-up a 1 decimal (CA-04-03).
        const perimetroMm = BigInt(Math.round(perimetroExacto * 1000));
        const anchoDecimas = dividirRedondeandoMitadArriba(compensarM2 * DIEZ_MIL, perimetroMm);
        anchoFranjaM = decimasANumero(anchoDecimas);
      }
    }

    const libre = calcularSuperficieLibre({
      metodo: entrada.metodo,
      superficieTotalHa,
      contorno: entrada.contorno,
      geometriasSectores,
    });
    superficieLibre = libre.geometria;
    superficieLibreHa = libre.superficieHa;
  }

  // Áreas aptas según método (4.4 y CA-04-05).
  const bordesLibres: UbicacionRelativa[] = [];
  const ubicacionesLibres: UbicacionRelativa[] = [];
  const textosAreasAptas: string[] = [];

  if (entrada.metodo === "cuestionario") {
    for (const ubic of UBICACIONES_BORDE) {
      if (!ubicacionesOcupadas.has(ubic)) {
        bordesLibres.push(ubic);
        ubicacionesLibres.push(ubic);
      }
    }
    if (!ubicacionesOcupadas.has("centro")) {
      ubicacionesLibres.push("centro");
    }

    if (bordesLibres.length > 0) {
      const lista = bordesLibres.map((u) => ETIQUETAS_UBICACION_RELATIVA[u]).join(", ");
      textosAreasAptas.push(`Bordes libres según lo que cargaste: ${lista}.`);
    } else {
      textosAreasAptas.push(
        "Considerá los bordes del predio y las cabeceras de los lotes de cultivo.",
      );
    }

    if (sinAsignarM2 > CERO) {
      textosAreasAptas.push(
        `También podés usar parte de las ${formatearNumeroEsAr(superficieSinAsignarHa, 4, 1)} ha sin asignar.`,
      );
    }
  } else {
    if (anchoFranjaM !== null && anchoFranjaM > 0) {
      textosAreasAptas.push(
        `Una franja de flores de ${formatearNumeroEsAr(anchoFranjaM, 1, 1)} m de ancho por todo el borde cubriría lo que falta (aproximación que no descuenta las esquinas).`,
      );
    }
    if (superficieLibreHa !== null && superficieLibreHa > 0) {
      textosAreasAptas.push(
        `Tenés ${formatearNumeroEsAr(superficieLibreHa, 4, 1)} ha de superficie libre resaltada en el dibujo donde podrías incorporar flores o vegetación natural.`,
      );
    }
    if (textosAreasAptas.length === 0) {
      textosAreasAptas.push(
        "Considerá los bordes del predio y las cabeceras de los lotes de cultivo.",
      );
    }
  }

  const areasAptas: AreasAptasDiagnostico = {
    esOpcional: nivelRiesgo === "adecuado",
    bordesLibres,
    ubicacionesLibres,
    textos: textosAreasAptas,
    superficieLibreHa,
  };

  // Alertas (4.5 y CA-04-06).
  const alertas: AlertaDiagnostico[] = [];

  // 1. Monocultivo (> 80 % de la superficie total en un mismo cultivo).
  const umbralMono = BigInt(UMBRALES_DIAGNOSTICO.monocultivoPct);
  for (const { nombre, superficieM2 } of cultivosPorClave.values()) {
    if (superficieM2 * CIEN > umbralMono * totalM2) {
      const pctCultivo = decimasANumero(dividirRedondeandoMitadArriba(superficieM2 * MIL, totalM2));
      alertas.push({
        tipo: "monocultivo",
        datos: { cultivoNombre: nombre, porcentaje: pctCultivo },
      });
    }
  }

  // 2. Sin flores (F = 0).
  if (floresM2 === CERO) {
    alertas.push({ tipo: "sin_flores", datos: {} });
  }

  // 3. Superficie sin asignar (> 1 % de T).
  const umbralSinAsignar = BigInt(UMBRALES_DIAGNOSTICO.sinAsignarAlertaPct);
  if (sinAsignarM2 * CIEN > umbralSinAsignar * totalM2) {
    alertas.push({
      tipo: "superficie_sin_asignar",
      datos: { superficieSinAsignarHa },
    });
  }

  // 4. Cultivos sin datos publicados en el catálogo (o "Otro").
  for (const nombreCultivo of cultivosSinDatos.values()) {
    alertas.push({
      tipo: "cultivo_sin_datos",
      datos: { cultivoNombre: nombreCultivo },
    });
  }

  return {
    versionReglas: VERSION_REGLAS_DIAGNOSTICO,
    superficieTotalHa,
    superficieFloresHa,
    superficieCultivosHa,
    superficieSinAsignarHa,
    porcentajeFlores,
    deficitPp,
    hectareasACompensar,
    nivelRiesgo,
    perimetroM,
    anchoFranjaM,
    areasAptas,
    superficieLibre,
    alertas,
  };
}
