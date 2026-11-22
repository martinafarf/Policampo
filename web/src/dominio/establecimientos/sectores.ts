// Validación pura de sectores para cuestionario y atributos comunes de sector (RN-02, RN-06, CA-02-06 a 09).
import { generarNombresSectores, validarNombreSector } from "./nombres";
import { redondearHectareas, validarSumaSuperficies } from "./superficies";
import {
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  TIPOS_SECTOR,
  UBICACIONES_RELATIVAS,
  type SubtipoFlores,
  type TipoSector,
  type UbicacionRelativa,
} from "./tipos";
import { esUuidValido, parsearNumeroDecimal } from "./validacion";

export const LARGO_MIN_CULTIVO_OTRO = 2;
export const LARGO_MAX_CULTIVO_OTRO = 80;

export interface CultivoCatalogoItem {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
}

export interface EntradaSectorCuestionario {
  tipo: string;
  cultivoId?: string | null;
  cultivoOtro?: string | null;
  subtipoFlores?: string | null;
  nombrePersonalizado?: string | null;
  superficieTexto: string;
  ubicacionRelativa: string;
}

export interface SectorCuestionarioValidado {
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string | null;
  subtipoFlores: SubtipoFlores | null;
  nombre: string;
  superficieHa: number;
  ubicacionRelativa: UbicacionRelativa;
  orden: number;
}

export interface ErrorSector {
  indice: number;
  mensaje: string;
}

export type ResultadoValidacionCuestionario =
  | { valido: true; sectores: SectorCuestionarioValidado[] }
  | { valido: false; errores: ErrorSector[]; errorGeneral?: string };

export function esTipoSectorValido(valor: string): valor is TipoSector {
  return (TIPOS_SECTOR as readonly string[]).includes(valor);
}

export function esSubtipoFloresValido(valor: string): valor is SubtipoFlores {
  return (SUBTIPOS_FLORES as readonly string[]).includes(valor);
}

export function esUbicacionRelativaValida(valor: string): valor is UbicacionRelativa {
  return (UBICACIONES_RELATIVAS as readonly string[]).includes(valor);
}

// Valida todos los sectores enviados en el método cuestionario (CA-02-06, 07, 08 y 09).
// Si algún sector falla, devuelve los errores para que el servidor rechace toda la operación (CA-02-14).
export function validarSectoresCuestionario(
  superficieTotalHa: number,
  entradas: readonly EntradaSectorCuestionario[],
  cultivosPermitidos: ReadonlyMap<string, CultivoCatalogoItem>,
): ResultadoValidacionCuestionario {
  if (entradas.length > LIMITES_ESTABLECIMIENTO.maxSectores) {
    return {
      valido: false,
      errores: [],
      errorGeneral: `No se pueden guardar más de ${LIMITES_ESTABLECIMIENTO.maxSectores} sectores por establecimiento.`,
    };
  }

  const errores: ErrorSector[] = [];
  const intermedios: {
    tipo: TipoSector;
    cultivoId: string | null;
    cultivoOtro: string | null;
    nombreCultivoBase: string | null;
    subtipoFlores: SubtipoFlores | null;
    nombrePersonalizado: string | null;
    superficieHa: number;
    ubicacionRelativa: UbicacionRelativa;
  }[] = [];

  for (let i = 0; i < entradas.length; i += 1) {
    const entrada = entradas[i];
    const numero = i + 1;

    if (!esTipoSectorValido(entrada.tipo)) {
      errores.push({ indice: i, mensaje: `Sector ${numero}: elegí si es Cultivo o Sector de flores.` });
      continue;
    }

    const tipo = entrada.tipo;
    let cultivoId: string | null = null;
    let cultivoOtro: string | null = null;
    let nombreCultivoBase: string | null = null;
    let subtipoFlores: SubtipoFlores | null = null;

    if (tipo === "cultivo") {
      // Un sector de cultivo no acepta subtipo de flores (RN-02, CA-02-06).
      if (entrada.subtipoFlores && entrada.subtipoFlores.trim().length > 0) {
        errores.push({
          indice: i,
          mensaje: `Sector ${numero}: un sector de cultivo no lleva subtipo de flores.`,
        });
        continue;
      }

      const idLimpio = entrada.cultivoId?.trim() || "";
      const otroLimpio = entrada.cultivoOtro?.trim() || "";

      if (idLimpio && otroLimpio) {
        errores.push({
          indice: i,
          mensaje: `Sector ${numero}: elegí un cultivo del catálogo o escribí «Otro», no ambos.`,
        });
        continue;
      }

      if (idLimpio) {
        if (!esUuidValido(idLimpio)) {
          errores.push({ indice: i, mensaje: `Sector ${numero}: el cultivo elegido no es válido.` });
          continue;
        }
        const cultivoCatalogo = cultivosPermitidos.get(idLimpio);
        if (!cultivoCatalogo) {
          errores.push({
            indice: i,
            mensaje: `Sector ${numero}: el cultivo elegido no existe o no está disponible.`,
          });
          continue;
        }
        cultivoId = cultivoCatalogo.id;
        nombreCultivoBase = cultivoCatalogo.nombre;
      } else if (otroLimpio) {
        if (
          otroLimpio.length < LARGO_MIN_CULTIVO_OTRO ||
          otroLimpio.length > LARGO_MAX_CULTIVO_OTRO
        ) {
          errores.push({
            indice: i,
            mensaje: `Sector ${numero}: el nombre del cultivo («Otro») debe tener entre ${LARGO_MIN_CULTIVO_OTRO} y ${LARGO_MAX_CULTIVO_OTRO} caracteres.`,
          });
          continue;
        }
        cultivoOtro = otroLimpio;
        nombreCultivoBase = otroLimpio;
      } else {
        errores.push({
          indice: i,
          mensaje: `Sector ${numero}: elegí un cultivo del catálogo o ingresá «Otro».`,
        });
        continue;
      }
    } else {
      // Un sector de flores no acepta cultivo (RN-02, CA-02-06) y acepta subtipo opcional.
      const tieneCultivo =
        Boolean(entrada.cultivoId?.trim()) || Boolean(entrada.cultivoOtro?.trim());
      if (tieneCultivo) {
        errores.push({
          indice: i,
          mensaje: `Sector ${numero}: un sector de flores no lleva cultivo.`,
        });
        continue;
      }

      const subtipoLimpio = entrada.subtipoFlores?.trim() || "";
      if (subtipoLimpio) {
        if (!esSubtipoFloresValido(subtipoLimpio)) {
          errores.push({
            indice: i,
            mensaje: `Sector ${numero}: el subtipo de flores elegido no es válido.`,
          });
          continue;
        }
        subtipoFlores = subtipoLimpio;
      }
    }

    const nombrePersonalizado = entrada.nombrePersonalizado?.trim() || null;
    if (nombrePersonalizado !== null) {
      const chequeoNombre = validarNombreSector(nombrePersonalizado);
      if (!chequeoNombre.valido) {
        errores.push({
          indice: i,
          mensaje: `Sector ${numero}: ${chequeoNombre.error}`,
        });
        continue;
      }
    }

    const supNumero = parsearNumeroDecimal(entrada.superficieTexto);
    if (supNumero === null || supNumero <= 0) {
      errores.push({
        indice: i,
        mensaje: `Sector ${numero}: ingresá una superficie mayor que 0 ha.`,
      });
      continue;
    }

    if (!esUbicacionRelativaValida(entrada.ubicacionRelativa)) {
      errores.push({
        indice: i,
        mensaje: `Sector ${numero}: elegí la ubicación relativa del sector en el terreno.`,
      });
      continue;
    }

    intermedios.push({
      tipo,
      cultivoId,
      cultivoOtro,
      nombreCultivoBase,
      subtipoFlores,
      nombrePersonalizado,
      superficieHa: redondearHectareas(supNumero),
      ubicacionRelativa: entrada.ubicacionRelativa,
    });
  }

  if (errores.length > 0) {
    return { valido: false, errores };
  }

  // Regla RN-06 y CA-02-08: suma de superficies ≤ superficie total (tolerancia 0,5 %).
  if (intermedios.length > 0) {
    const suma = validarSumaSuperficies(
      superficieTotalHa,
      intermedios.map((s) => s.superficieHa),
    );
    if (!suma.valida) {
      return {
        valido: false,
        errores: [],
        errorGeneral: suma.mensaje,
      };
    }
  }

  const nombres = generarNombresSectores(
    intermedios.map((s) => ({
      tipo: s.tipo,
      nombreCultivo: s.nombreCultivoBase,
      nombrePersonalizado: s.nombrePersonalizado,
    })),
  );

  return {
    valido: true,
    sectores: intermedios.map((s, indice) => ({
      tipo: s.tipo,
      cultivoId: s.cultivoId,
      cultivoOtro: s.cultivoOtro,
      subtipoFlores: s.subtipoFlores,
      nombre: nombres[indice],
      superficieHa: s.superficieHa,
      ubicacionRelativa: s.ubicacionRelativa,
      orden: indice,
    })),
  };
}
