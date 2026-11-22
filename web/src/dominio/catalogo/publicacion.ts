// Reglas puras de publicación y validación editorial del catálogo (RN-08, RN-12, RN-13, CA-03-05 y CA-03-06).
import { validarRangosSemanas } from "./semanas";
import {
  FUENTES_TIPO,
  LIMITES_CATALOGO,
  type DependenciaPolinizacion,
  type EstadoCatalogo,
  type FuenteTipo,
  type FuncionPlanta,
  type RangoSemanas,
} from "./tipos";

export interface ResultadoPublicacion {
  puedePublicar: boolean;
  faltantes: string[];
}

function esFuenteValida(tipo: string | null | undefined, detalle: string | null | undefined): boolean {
  const tipoOk = Boolean(tipo && (FUENTES_TIPO as readonly string[]).includes(tipo));
  const detalleOk = Boolean(detalle && detalle.trim().length > 0);
  return tipoOk && detalleOk;
}

export interface DatosPlantaParaPublicar {
  nombreComun?: string | null;
  nombreCientifico?: string | null;
  funciones?: readonly FuncionPlanta[] | null;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  beneficios?: string | null;
  manejoCorte?: string | null;
  fuenteTipo?: FuenteTipo | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
}

export interface PeriodoEcorregionPlanta {
  ecorregion: string;
  floracionSemanas: readonly RangoSemanas[];
}

// Regla CA-03-05: publicar una planta falla indicando todo lo que falta si faltan
// nombre científico, beneficios, manejo y corte, disponibilidad local, fuente, quién validó
// o al menos una ecorregión con floración válida.
export function validarPublicacionPlanta(
  planta: DatosPlantaParaPublicar,
  periodos: readonly PeriodoEcorregionPlanta[],
): ResultadoPublicacion {
  const faltantes: string[] = [];

  if (!planta.nombreComun?.trim()) {
    faltantes.push("Nombre común");
  }
  if (!planta.nombreCientifico?.trim()) {
    faltantes.push("Nombre científico");
  }
  if (!planta.funciones || planta.funciones.length === 0) {
    faltantes.push("Al menos una función agroecológica");
  }
  if (!planta.esEspontanea && !planta.enMercadoLocal) {
    faltantes.push("Disponibilidad local (flora espontánea o mercado local, RN-12)");
  }
  if (!planta.beneficios?.trim()) {
    faltantes.push("Beneficios");
  }
  if (!planta.manejoCorte?.trim()) {
    faltantes.push("Manejo y corte");
  }
  if (!esFuenteValida(planta.fuenteTipo, planta.fuenteDetalle)) {
    faltantes.push("Fuente (tipo y descripción)");
  }
  if (!planta.validadoPor?.trim()) {
    faltantes.push("Quién validó el dato");
  }

  const tieneEcorregionConFloracion = periodos.some(
    (p) => p.floracionSemanas.length > 0 && validarRangosSemanas(p.floracionSemanas).valido,
  );
  if (!tieneEcorregionConFloracion) {
    faltantes.push("Al menos una ecorregión con período de floración");
  }

  return {
    puedePublicar: faltantes.length === 0,
    faltantes,
  };
}

export interface DatosCultivoParaPublicar {
  dependenciaPolinizacion?: DependenciaPolinizacion | null;
  fuenteTipo?: FuenteTipo | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
}

export function validarPublicacionCultivo(
  cultivo: DatosCultivoParaPublicar,
  periodos: readonly PeriodoEcorregionPlanta[],
): ResultadoPublicacion {
  const faltantes: string[] = [];

  if (!cultivo.dependenciaPolinizacion) {
    faltantes.push("Dependencia de la polinización");
  }
  if (!esFuenteValida(cultivo.fuenteTipo, cultivo.fuenteDetalle)) {
    faltantes.push("Fuente (tipo y descripción)");
  }
  if (!cultivo.validadoPor?.trim()) {
    faltantes.push("Quién validó el dato");
  }

  const tieneEcorregionConFloracion = periodos.some(
    (p) => p.floracionSemanas.length > 0 && validarRangosSemanas(p.floracionSemanas).valido,
  );
  if (!tieneEcorregionConFloracion) {
    faltantes.push("Al menos una ecorregión con período de floración");
  }

  return {
    puedePublicar: faltantes.length === 0,
    faltantes,
  };
}

export interface DatosCompatibilidadParaPublicar {
  grado: number;
  justificacion?: string | null;
  fuenteTipo?: FuenteTipo | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
  estadoCultivo: EstadoCatalogo;
  estadoPlanta: EstadoCatalogo;
}

// Regla CA-03-06 y CA-03-09: una compatibilidad solo se puede publicar si su cultivo y su planta
// están publicados, tiene grado entero entre -5 y +5, justificación de 10 a 500 caracteres, fuente y validador.
export function validarPublicacionCompatibilidad(
  entrada: DatosCompatibilidadParaPublicar,
): ResultadoPublicacion {
  const faltantes: string[] = [];

  if (
    !Number.isInteger(entrada.grado) ||
    entrada.grado < LIMITES_CATALOGO.gradoMin ||
    entrada.grado > LIMITES_CATALOGO.gradoMax
  ) {
    faltantes.push(`Grado entero entre ${LIMITES_CATALOGO.gradoMin} y +${LIMITES_CATALOGO.gradoMax}`);
  }

  const justificacion = entrada.justificacion?.trim() ?? "";
  if (
    justificacion.length < LIMITES_CATALOGO.justificacionMin ||
    justificacion.length > LIMITES_CATALOGO.justificacionMax
  ) {
    faltantes.push(
      `Justificación agronómica (${LIMITES_CATALOGO.justificacionMin} a ${LIMITES_CATALOGO.justificacionMax} caracteres)`,
    );
  }

  if (!esFuenteValida(entrada.fuenteTipo, entrada.fuenteDetalle)) {
    faltantes.push("Fuente (tipo y descripción)");
  }
  if (!entrada.validadoPor?.trim()) {
    faltantes.push("Quién validó el dato");
  }
  if (entrada.estadoCultivo !== "publicado") {
    faltantes.push("El cultivo debe estar publicado");
  }
  if (entrada.estadoPlanta !== "publicado") {
    faltantes.push("La planta de servicio debe estar publicada");
  }

  return {
    puedePublicar: faltantes.length === 0,
    faltantes,
  };
}
