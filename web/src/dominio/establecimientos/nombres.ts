// Generación de nombres automáticos para sectores (RN-02, especificación 02, CA-02-07).
import type { TipoSector } from "./tipos";

export interface EntradaNombreSector {
  tipo: TipoSector;
  nombreCultivo?: string | null;
  nombrePersonalizado?: string | null;
}

const LARGO_MAX_NOMBRE_SECTOR = 60;

// Genera el nombre automático de un sector dado los nombres/tipos ya usados antes en la finca:
// - Cultivo: "Tomate", y si se repite, "Tomate 2", "Tomate 3"...
// - Flores: "Sector de flores 1", "Sector de flores 2"...
export function generarNombresSectores(sectores: readonly EntradaNombreSector[]): string[] {
  const conteoCultivos = new Map<string, number>();
  let numeroFlores = 0;

  return sectores.map((sector) => {
    const personalizado = sector.nombrePersonalizado?.trim();
    if (sector.tipo === "sector_flores") {
      numeroFlores += 1;
      if (personalizado) {
        return personalizado.slice(0, LARGO_MAX_NOMBRE_SECTOR);
      }
      return `Sector de flores ${numeroFlores}`;
    }

    const base = sector.nombreCultivo?.trim() || "Cultivo";
    const clave = base.toLocaleLowerCase("es-AR");
    const cantidad = (conteoCultivos.get(clave) ?? 0) + 1;
    conteoCultivos.set(clave, cantidad);

    if (personalizado) {
      return personalizado.slice(0, LARGO_MAX_NOMBRE_SECTOR);
    }

    const generado = cantidad === 1 ? base : `${base} ${cantidad}`;
    return generado.slice(0, LARGO_MAX_NOMBRE_SECTOR);
  });
}

export function validarNombreSector(nombre: string): { valido: boolean; error?: string } {
  const limpio = nombre.trim();
  if (limpio.length < 1 || limpio.length > LARGO_MAX_NOMBRE_SECTOR) {
    return {
      valido: false,
      error: `El nombre del sector debe tener entre 1 y ${LARGO_MAX_NOMBRE_SECTOR} caracteres.`,
    };
  }
  return { valido: true };
}
