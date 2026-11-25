// Validación pura de datos generales de establecimientos y formateo de superficies (Esp. 02, 4.1 y 6.2).
// Se usa en las acciones del servidor (RS-06) y en los formularios del cliente.
import {
  esDepartamentoValido,
  esEcorregionValida,
  obtenerLocalidades,
  type ClaveEcorregion,
  type NombreDepartamentoJujuy,
} from "@/datos/jujuy";
import { hectareasAMetrosCuadrados, redondearHectareas } from "./superficies";
import {
  LIMITES_ESTABLECIMIENTO,
  METODOS_CARACTERIZACION,
  type MetodoCaracterizacion,
} from "./tipos";

export const ETIQUETAS_METODO: Readonly<Record<MetodoCaracterizacion, string>> = {
  cuestionario: "Cuestionario",
  croquis: "Croquis",
  mapa: "Mapa",
};

export const BOTON_EDICION_METODO: Readonly<Record<MetodoCaracterizacion, string>> = {
  cuestionario: "Editar el cuestionario",
  croquis: "Editar el croquis",
  mapa: "Editar el mapa",
};

export const RUTA_EDICION_METODO: Readonly<Record<MetodoCaracterizacion, string>> = {
  cuestionario: "cuestionario",
  croquis: "croquis",
  mapa: "mapa",
};

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuidValido(valor: string): boolean {
  return REGEX_UUID.test(valor);
}

export function esMetodoCaracterizacionValido(valor: string): valor is MetodoCaracterizacion {
  return (METODOS_CARACTERIZACION as readonly string[]).includes(valor);
}

export function claveBorradorLocal(establecimientoId: string): string {
  return `policampo_borrador_${establecimientoId}`;
}

export function formatearHectareas(ha: number): string {
  return `${redondearHectareas(ha).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })} ha`;
}

export function formatearMetrosCuadrados(ha: number): string {
  return `${hectareasAMetrosCuadrados(ha).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} m²`;
}

export function formatearSuperficieCompleta(ha: number): string {
  return `${formatearHectareas(ha)} (${formatearMetrosCuadrados(ha)})`;
}

export function parsearNumeroDecimal(texto: string): number | null {
  const normalizado = texto.trim().replace(",", ".");
  if (normalizado.length === 0) return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null;
  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

export interface EntradaDatosEstablecimiento {
  nombre: string;
  direccion: string;
  departamento: string;
  localidad: string;
  localidadEsOtra: boolean;
  ecorregion: string;
  metodoCaracterizacion: string;
  superficieTotalTexto?: string | null;
}

export interface DatosEstablecimientoValidados {
  nombre: string;
  direccion: string;
  departamento: NombreDepartamentoJujuy;
  localidad: string;
  localidadEsOtra: boolean;
  ecorregion: ClaveEcorregion;
  metodoCaracterizacion: MetodoCaracterizacion;
  // Nula cuando metodoCaracterizacion = "mapa" (se calcula desde el contorno, RN-05 / CA-02-01).
  superficieTotalHa: number | null;
}

export type ErroresDatosEstablecimiento = Partial<
  Record<
    | "nombre"
    | "direccion"
    | "departamento"
    | "localidad"
    | "ecorregion"
    | "metodoCaracterizacion"
    | "superficieTotalHa"
    | "general",
    string
  >
>;

export type ResultadoValidacionEstablecimiento =
  | { valido: true; datos: DatosEstablecimientoValidados }
  | { valido: false; errores: ErroresDatosEstablecimiento };

export function validarDatosEstablecimiento(
  entrada: EntradaDatosEstablecimiento,
): ResultadoValidacionEstablecimiento {
  const errores: ErroresDatosEstablecimiento = {};

  const nombre = entrada.nombre.trim();
  if (nombre.length < 2 || nombre.length > 150) {
    errores.nombre = "El nombre debe tener entre 2 y 150 caracteres.";
  }

  const direccion = entrada.direccion.trim();
  if (direccion.length < 2 || direccion.length > 200) {
    errores.direccion = "La dirección debe tener entre 2 y 200 caracteres.";
  }

  const departamentoValido = esDepartamentoValido(entrada.departamento);
  if (!departamentoValido) {
    errores.departamento = "Elegí un departamento válido de Jujuy.";
  }

  const localidadLimpia = entrada.localidad.trim();
  if (entrada.localidadEsOtra) {
    if (localidadLimpia.length < 2 || localidadLimpia.length > 120) {
      errores.localidad = "La localidad debe tener entre 2 y 120 caracteres.";
    }
  } else if (departamentoValido) {
    const localidadesDelDepto = obtenerLocalidades(entrada.departamento as NombreDepartamentoJujuy);
    const existe = localidadesDelDepto.some((loc) => loc.nombre === localidadLimpia);
    if (!existe) {
      errores.localidad = "Elegí una localidad del departamento seleccionado o marcá «Otra».";
    }
  } else if (localidadLimpia.length === 0) {
    errores.localidad = "Elegí una localidad.";
  }

  if (!esEcorregionValida(entrada.ecorregion)) {
    errores.ecorregion = "Elegí una ecorregión válida.";
  }

  const metodoValido = esMetodoCaracterizacionValido(entrada.metodoCaracterizacion);
  if (!metodoValido) {
    errores.metodoCaracterizacion = "Elegí un método de carga válido.";
  }

  let superficieTotalHa: number | null = null;
  if (metodoValido) {
    const metodo = entrada.metodoCaracterizacion as MetodoCaracterizacion;
    if (metodo === "mapa") {
      // En mapa la superficie total nunca se escribe a mano (CA-02-01).
      superficieTotalHa = null;
    } else {
      const numero = parsearNumeroDecimal(entrada.superficieTotalTexto ?? "");
      if (
        numero === null ||
        numero < LIMITES_ESTABLECIMIENTO.superficieMinHa ||
        numero > LIMITES_ESTABLECIMIENTO.superficieMaxHa
      ) {
        errores.superficieTotalHa = `Ingresá una superficie entre ${LIMITES_ESTABLECIMIENTO.superficieMinHa.toLocaleString("es-AR")} y ${LIMITES_ESTABLECIMIENTO.superficieMaxHa.toLocaleString("es-AR")} ha.`;
      } else {
        superficieTotalHa = redondearHectareas(numero);
      }
    }
  }

  if (Object.keys(errores).length > 0) {
    return { valido: false, errores };
  }

  return {
    valido: true,
    datos: {
      nombre,
      direccion,
      departamento: entrada.departamento as NombreDepartamentoJujuy,
      localidad: localidadLimpia,
      localidadEsOtra: entrada.localidadEsOtra,
      ecorregion: entrada.ecorregion as ClaveEcorregion,
      metodoCaracterizacion: entrada.metodoCaracterizacion as MetodoCaracterizacion,
      superficieTotalHa,
    },
  };
}

// Confirmación de borrado definitivo (Esp. 02, 5.7 y CA-02-20): exige escribir el nombre exacto.
export function coincideNombreParaBorrar(
  nombreEstablecimiento: string,
  textoConfirmacion: string,
): boolean {
  return textoConfirmacion.trim() === nombreEstablecimiento.trim();
}

export type ResultadoValidacionCambioMetodo =
  | { valido: true; nuevoMetodo: MetodoCaracterizacion; nuevaSuperficieTotalHa: number | null }
  | { valido: false; error: string };

// Reglas de "Cargar de nuevo con otro método" (Esp. 02, 5.5, RN-03, CA-02-16):
// - El nuevo método debe ser distinto al actual.
// - Si el nuevo método es "mapa", la superficie total queda vacía hasta dibujar el contorno.
// - Si se pasa a cuestionario o croquis desde mapa (o sin superficie), exige superficie total válida.
export function validarCambioMetodo(entrada: {
  metodoActual: MetodoCaracterizacion;
  nuevoMetodo: string;
  superficieActualHa: number | null;
  superficieNuevaTexto?: string | null;
}): ResultadoValidacionCambioMetodo {
  if (!esMetodoCaracterizacionValido(entrada.nuevoMetodo)) {
    return { valido: false, error: "Elegí un método de carga válido." };
  }

  if (entrada.nuevoMetodo === entrada.metodoActual) {
    return { valido: false, error: "Elegí un método distinto al que ya usa esta finca." };
  }

  if (entrada.nuevoMetodo === "mapa") {
    return {
      valido: true,
      nuevoMetodo: "mapa",
      nuevaSuperficieTotalHa: null,
    };
  }

  // Si pasa a cuestionario o croquis desde mapa (o sin superficie previa), exige superficie total.
  const texto = entrada.superficieNuevaTexto?.trim() ?? "";
  if (entrada.metodoActual === "mapa" || entrada.superficieActualHa === null || texto.length > 0) {
    const numero = parsearNumeroDecimal(texto);
    if (
      numero === null ||
      numero < LIMITES_ESTABLECIMIENTO.superficieMinHa ||
      numero > LIMITES_ESTABLECIMIENTO.superficieMaxHa
    ) {
      return {
        valido: false,
        error: `Ingresá una superficie total entre ${LIMITES_ESTABLECIMIENTO.superficieMinHa.toLocaleString("es-AR")} y ${LIMITES_ESTABLECIMIENTO.superficieMaxHa.toLocaleString("es-AR")} ha.`,
      };
    }
    return {
      valido: true,
      nuevoMetodo: entrada.nuevoMetodo,
      nuevaSuperficieTotalHa: redondearHectareas(numero),
    };
  }

  return {
    valido: true,
    nuevoMetodo: entrada.nuevoMetodo,
    nuevaSuperficieTotalHa: redondearHectareas(entrada.superficieActualHa),
  };
}
