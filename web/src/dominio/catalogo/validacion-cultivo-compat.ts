// Validación pura para datos agronómicos de cultivos y compatibilidades (Esp. 03, 4.3, 4.4, CA-03-04, CA-03-09).
import { esEcorregionValida, type ClaveEcorregion } from "@/datos/jujuy";
import { validarRangosSemanas } from "./semanas";
import {
  DEPENDENCIAS_POLINIZACION,
  FUENTES_TIPO,
  LIMITES_CATALOGO,
  type DependenciaPolinizacion,
  type FuenteTipo,
  type RangoSemanas,
} from "./tipos";
import { esClaveCatalogoValida } from "./validacion-planta";

export const ETIQUETAS_DEPENDENCIA_POLINIZACION: Readonly<Record<DependenciaPolinizacion, string>> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  ninguna: "Ninguna",
};

export interface EntradaPeriodoCultivo {
  ecorregion: string;
  floracionSemanas: RangoSemanas[];
  cosechaSemanas: RangoSemanas[];
}

export interface PeriodoCultivoValidado {
  ecorregion: ClaveEcorregion;
  floracionSemanas: RangoSemanas[];
  cosechaSemanas: RangoSemanas[];
}

export interface EntradaCultivoCatalogo {
  clave: string;
  nombre: string;
  activo: boolean;
  dependenciaPolinizacion?: string | null;
  tipoPolinizacion?: string | null;
  polinizadoresNecesarios?: string | null;
  fuenteTipo?: string | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
  periodos: EntradaPeriodoCultivo[];
}

export interface CultivoCatalogoValidado {
  clave: string;
  nombre: string;
  activo: boolean;
  dependenciaPolinizacion: DependenciaPolinizacion | null;
  tipoPolinizacion: string | null;
  polinizadoresNecesarios: string | null;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  periodos: PeriodoCultivoValidado[];
}

export type ResultadoValidacionCultivo =
  | { valido: true; datos: CultivoCatalogoValidado }
  | { valido: false; errores: string[] };

export function validarEntradaCultivo(entrada: EntradaCultivoCatalogo): ResultadoValidacionCultivo {
  const errores: string[] = [];

  const clave = entrada.clave.trim().toLowerCase();
  if (!esClaveCatalogoValida(clave)) {
    errores.push("La clave debe tener de 2 a 60 caracteres en minúsculas, números o guiones bajos.");
  }

  const nombre = entrada.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) {
    errores.push("El nombre del cultivo debe tener entre 2 y 80 caracteres.");
  }

  let dependenciaPolinizacion: DependenciaPolinizacion | null = null;
  if (entrada.dependenciaPolinizacion && entrada.dependenciaPolinizacion.trim().length > 0) {
    if ((DEPENDENCIAS_POLINIZACION as readonly string[]).includes(entrada.dependenciaPolinizacion)) {
      dependenciaPolinizacion = entrada.dependenciaPolinizacion as DependenciaPolinizacion;
    } else {
      errores.push("La dependencia de la polinización elegida no es válida.");
    }
  }

  const tipoPolinizacion = entrada.tipoPolinizacion?.trim() || null;
  if (tipoPolinizacion && tipoPolinizacion.length > 200) {
    errores.push("El tipo de polinización no puede superar los 200 caracteres.");
  }

  const polinizadoresNecesarios = entrada.polinizadoresNecesarios?.trim() || null;
  if (polinizadoresNecesarios && polinizadoresNecesarios.length > 300) {
    errores.push("Los polinizadores necesarios no pueden superar los 300 caracteres.");
  }

  let fuenteTipo: FuenteTipo | null = null;
  if (entrada.fuenteTipo && entrada.fuenteTipo.trim().length > 0) {
    if ((FUENTES_TIPO as readonly string[]).includes(entrada.fuenteTipo)) {
      fuenteTipo = entrada.fuenteTipo as FuenteTipo;
    } else {
      errores.push("El tipo de fuente no es válido.");
    }
  }

  const fuenteDetalle = entrada.fuenteDetalle?.trim() || null;
  if (fuenteDetalle && fuenteDetalle.length > 300) {
    errores.push("La descripción de la fuente no puede superar los 300 caracteres.");
  }

  const validadoPor = entrada.validadoPor?.trim() || null;
  if (validadoPor && validadoPor.length > 120) {
    errores.push("El campo «Validado por» no puede superar los 120 caracteres.");
  }

  const vistas = new Set<string>();
  const periodosValidados: PeriodoCultivoValidado[] = [];
  for (const p of entrada.periodos) {
    if (!esEcorregionValida(p.ecorregion)) {
      errores.push(`La ecorregión «${p.ecorregion}» no es válida.`);
      continue;
    }
    if (vistas.has(p.ecorregion)) {
      errores.push(`La ecorregión «${p.ecorregion}» está repetida.`);
      continue;
    }
    vistas.add(p.ecorregion);

    const fl = validarRangosSemanas(p.floracionSemanas);
    if (!fl.valido) errores.push(`Floración (${p.ecorregion}): ${fl.error}`);
    const cos = validarRangosSemanas(p.cosechaSemanas);
    if (!cos.valido) errores.push(`Cosecha (${p.ecorregion}): ${cos.error}`);

    periodosValidados.push({
      ecorregion: p.ecorregion,
      floracionSemanas: p.floracionSemanas,
      cosechaSemanas: p.cosechaSemanas,
    });
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    datos: {
      clave,
      nombre,
      activo: Boolean(entrada.activo),
      dependenciaPolinizacion,
      tipoPolinizacion,
      polinizadoresNecesarios,
      fuenteTipo,
      fuenteDetalle,
      validadoPor,
      periodos: periodosValidados,
    },
  };
}

export interface EntradaCompatibilidad {
  grado: number;
  justificacion: string;
  fuenteTipo?: string | null;
  fuenteDetalle?: string | null;
  validadoPor?: string | null;
}

export interface CompatibilidadValidada {
  grado: number;
  justificacion: string;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
}

export type ResultadoValidacionCompatibilidad =
  | { valido: true; datos: CompatibilidadValidada }
  | { valido: false; errores: string[] };

// Regla CA-03-09: grado entero de -5 a +5 y justificación agronómica de 10 a 500 caracteres.
export function validarEntradaCompatibilidad(
  entrada: EntradaCompatibilidad,
): ResultadoValidacionCompatibilidad {
  const errores: string[] = [];

  if (
    !Number.isInteger(entrada.grado) ||
    entrada.grado < LIMITES_CATALOGO.gradoMin ||
    entrada.grado > LIMITES_CATALOGO.gradoMax
  ) {
    errores.push(
      `El grado de compatibilidad debe ser un entero entre ${LIMITES_CATALOGO.gradoMin} y +${LIMITES_CATALOGO.gradoMax}.`,
    );
  }

  const justificacion = entrada.justificacion.trim();
  if (
    justificacion.length < LIMITES_CATALOGO.justificacionMin ||
    justificacion.length > LIMITES_CATALOGO.justificacionMax
  ) {
    errores.push(
      `La justificación agronómica debe tener entre ${LIMITES_CATALOGO.justificacionMin} y ${LIMITES_CATALOGO.justificacionMax} caracteres.`,
    );
  }

  let fuenteTipo: FuenteTipo | null = null;
  if (entrada.fuenteTipo && entrada.fuenteTipo.trim().length > 0) {
    if ((FUENTES_TIPO as readonly string[]).includes(entrada.fuenteTipo)) {
      fuenteTipo = entrada.fuenteTipo as FuenteTipo;
    } else {
      errores.push("El tipo de fuente no es válido.");
    }
  }

  const fuenteDetalle = entrada.fuenteDetalle?.trim() || null;
  if (fuenteDetalle && fuenteDetalle.length > 300) {
    errores.push("La descripción de la fuente no puede superar los 300 caracteres.");
  }

  const validadoPor = entrada.validadoPor?.trim() || null;
  if (validadoPor && validadoPor.length > 120) {
    errores.push("El campo «Validado por» no puede superar los 120 caracteres.");
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    datos: {
      grado: entrada.grado,
      justificacion,
      fuenteTipo,
      fuenteDetalle,
      validadoPor,
    },
  };
}
