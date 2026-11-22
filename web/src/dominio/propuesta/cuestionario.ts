// Reparto espacial en texto + esquema 3x3 para fincas de cuestionario (Esp. 05, §4.4, CA-05-07).
import { ETIQUETAS_UBICACION_RELATIVA } from "@/dominio/diagnostico/textos";
import {
  UBICACIONES_RELATIVAS,
  redondearHectareas,
  type UbicacionRelativa,
} from "@/dominio/establecimientos";
import {
  LIMITES_PROPUESTA,
  type AvisoPropuesta,
  type PerdidaCultivoItem,
  type PropuestaCuestionario,
  type RepartoUbicacionItem,
} from "./tipos";

const UBICACIONES_BORDE: readonly UbicacionRelativa[] = UBICACIONES_RELATIVAS.filter(
  (u) => u !== "centro",
);

export interface SectorCuestionarioEntrada {
  id?: string;
  nombre: string;
  tipo: "cultivo" | "sector_flores";
  cultivoNombre?: string;
  superficieHa: number;
  ubicacionRelativa?: UbicacionRelativa | null;
}

export function generarPropuestaCuestionario(entrada: {
  superficieTotalHa: number;
  superficieFloresActualHa: number;
  objetivoPct: number;
  sectores: readonly SectorCuestionarioEntrada[];
}): PropuestaCuestionario {
  const avisos: AvisoPropuesta[] = [];

  if (entrada.objetivoPct < LIMITES_PROPUESTA.objetivoRecomendadoPct) {
    avisos.push({
      codigo: "objetivo_bajo_20",
      mensaje: `El objetivo elegido (${entrada.objetivoPct.toLocaleString("es-AR")} %) está por debajo del 20 % recomendado (RN-01).`,
    });
  }

  const floresObjetivoHa = (entrada.superficieTotalHa * entrada.objetivoPct) / 100;
  const superficieAAgregarHa = redondearHectareas(
    Math.max(0, floresObjetivoHa - entrada.superficieFloresActualHa),
  );

  const ocupadas = new Set<UbicacionRelativa>();
  for (const s of entrada.sectores) {
    if (s.ubicacionRelativa) ocupadas.add(s.ubicacionRelativa);
  }
  const bordesLibres = UBICACIONES_BORDE.filter((u) => !ocupadas.has(u));

  // §4.4 y CA-05-07: perimetral si hay al menos 3 ubicaciones de borde libres; si no, corredores entre lotes.
  const disposicionSugerida =
    bordesLibres.length >= 3 ? "perimetral" : "corredores_entre_lotes";
  const tituloDisposicion =
    disposicionSugerida === "perimetral"
      ? "Cerco perimetral en bordes libres"
      : "Corredores florales entre lotes de cultivo";

  if (superficieAAgregarHa <= 0) {
    avisos.push({
      codigo: "ya_alcanza_objetivo",
      mensaje:
        "Tu finca ya alcanza el porcentaje objetivo: no hace falta agregar franjas nuevas, solo te recomendamos la mezcla de especies para los sectores de flores existentes.",
    });
    const pctActual =
      entrada.superficieTotalHa > 0
        ? Math.round((entrada.superficieFloresActualHa / entrada.superficieTotalHa) * 1000) / 10
        : 0;
    return {
      disposicionSugerida,
      tituloDisposicion,
      superficieAAgregarHa: 0,
      porcentajeLogrado: pctActual,
      reparto: [],
      ubicacionesResaltadas: [],
      perdidaPorCultivo: [],
      avisos,
    };
  }

  const reparto: RepartoUbicacionItem[] = [];
  const perdidaPorCultivo: PerdidaCultivoItem[] = [];
  let ubicacionesResaltadas: UbicacionRelativa[] = [];

  if (bordesLibres.length > 0) {
    // Reparto en partes iguales entre ubicaciones de borde libres (CA-05-07), ajustando resto en la primera.
    const porUbicacion = redondearHectareas(superficieAAgregarHa / bordesLibres.length);
    let acumulado = 0;
    bordesLibres.forEach((u, idx) => {
      const ha =
        idx === bordesLibres.length - 1
          ? redondearHectareas(Math.max(0, superficieAAgregarHa - acumulado))
          : porUbicacion;
      acumulado = redondearHectareas(acumulado + ha);
      reparto.push({
        ubicacion: u,
        etiqueta: ETIQUETAS_UBICACION_RELATIVA[u],
        ha,
      });
    });
    ubicacionesResaltadas = [...bordesLibres];
  } else {
    // Sin bordes libres: se reparte en los bordes de los sectores de cultivo en proporción a su superficie.
    reparto.push({
      ubicacion: "bordes_cultivos",
      etiqueta: "Bordes y cabeceras de los sectores de cultivo",
      ha: superficieAAgregarHa,
    });

    const cultivos = entrada.sectores.filter((s) => s.tipo === "cultivo" && s.superficieHa > 0);
    const totalCultivosHa = cultivos.reduce((acc, s) => acc + s.superficieHa, 0);
    if (totalCultivosHa > 0) {
      for (const c of cultivos) {
        const proporcion = c.superficieHa / totalCultivosHa;
        const perdidaHa = redondearHectareas(Math.min(c.superficieHa, superficieAAgregarHa * proporcion));
        const pct = Math.round((perdidaHa / c.superficieHa) * 1000) / 10;
        perdidaPorCultivo.push({
          sectorId: c.id,
          sector: c.nombre,
          cultivo: c.cultivoNombre ?? c.nombre,
          ha: perdidaHa,
          pct,
        });
      }
    }
  }

  const pctLogrado =
    entrada.superficieTotalHa > 0
      ? Math.round(
          ((entrada.superficieFloresActualHa + superficieAAgregarHa) / entrada.superficieTotalHa) *
            1000,
        ) / 10
      : 0;

  return {
    disposicionSugerida,
    tituloDisposicion,
    superficieAAgregarHa,
    porcentajeLogrado: pctLogrado,
    reparto,
    ubicacionesResaltadas,
    perdidaPorCultivo,
    avisos,
  };
}

// Valida que un reparto editado por el usuario en cuestionario sume la superficie a agregar (CA-05-07).
export function validarRepartoCuestionario(
  reparto: readonly RepartoUbicacionItem[],
  superficieAAgregarHa: number,
): { valido: boolean; error?: string; sumaHa: number } {
  if (superficieAAgregarHa <= 0) {
    return { valido: true, sumaHa: 0 };
  }

  for (const item of reparto) {
    if (!Number.isFinite(item.ha) || item.ha < 0) {
      return {
        valido: false,
        error: "Todas las superficies del reparto deben ser mayores o iguales a 0 ha.",
        sumaHa: 0,
      };
    }
  }

  const sumaHa = redondearHectareas(reparto.reduce((acc, item) => acc + item.ha, 0));
  const tolerancia = Math.max(0.0005, superficieAAgregarHa * LIMITES_PROPUESTA.toleranciaSuperficie);

  if (Math.abs(sumaHa - superficieAAgregarHa) > tolerancia) {
    return {
      valido: false,
      error: `El reparto suma ${sumaHa.toLocaleString("es-AR")} ha y debe sumar ${superficieAAgregarHa.toLocaleString("es-AR")} ha.`,
      sumaHa,
    };
  }

  return { valido: true, sumaHa };
}
