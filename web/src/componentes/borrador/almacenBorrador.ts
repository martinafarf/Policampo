// Almacenamiento seguro de borradores locales por establecimiento (Esp. 02, 5.6, RS-08, CA-02-17).
// Usa la clave "policampo_borrador_<id>" para que se limpien al cerrar sesión (módulo 01).
import { claveBorradorLocal, type MetodoCaracterizacion } from "@/dominio/establecimientos";

export interface BorradorAlmacenado<T> {
  metodo: MetodoCaracterizacion;
  guardadoEn: string; // ISO 8601
  datos: T;
}

export interface AlmacenTexto {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

export function esBorradorMasNuevo(guardadoEnIso: string, actualizadoEnServidorIso: string): boolean {
  const fechaBorrador = Date.parse(guardadoEnIso);
  const fechaServidor = Date.parse(actualizadoEnServidorIso);
  if (!Number.isFinite(fechaBorrador)) return false;
  if (!Number.isFinite(fechaServidor)) return true;
  return fechaBorrador > fechaServidor;
}

export function leerBorrador<T>(
  almacen: AlmacenTexto,
  establecimientoId: string,
  metodoEsperado: MetodoCaracterizacion,
  actualizadoEnServidorIso: string,
): BorradorAlmacenado<T> | null {
  try {
    const crudo = almacen.getItem(claveBorradorLocal(establecimientoId));
    if (!crudo) return null;
    const parseado = JSON.parse(crudo) as Partial<BorradorAlmacenado<T>>;
    if (
      !parseado ||
      parseado.metodo !== metodoEsperado ||
      typeof parseado.guardadoEn !== "string" ||
      parseado.datos === undefined
    ) {
      return null;
    }
    if (!esBorradorMasNuevo(parseado.guardadoEn, actualizadoEnServidorIso)) {
      return null;
    }
    return {
      metodo: parseado.metodo,
      guardadoEn: parseado.guardadoEn,
      datos: parseado.datos,
    };
  } catch {
    return null;
  }
}

export function escribirBorrador<T>(
  almacen: AlmacenTexto,
  establecimientoId: string,
  metodo: MetodoCaracterizacion,
  datos: T,
  ahora: Date = new Date(),
): BorradorAlmacenado<T> | null {
  const borrador: BorradorAlmacenado<T> = {
    metodo,
    guardadoEn: ahora.toISOString(),
    datos,
  };
  try {
    almacen.setItem(claveBorradorLocal(establecimientoId), JSON.stringify(borrador));
    return borrador;
  } catch {
    return null;
  }
}

export function eliminarBorrador(almacen: AlmacenTexto, establecimientoId: string): void {
  try {
    almacen.removeItem(claveBorradorLocal(establecimientoId));
  } catch {
    // localStorage puede no estar disponible en modo privado.
  }
}
