// Disposición del dibujo de sectores del cuestionario: en el cuestionario no hay plano, solo "cuántas hectáreas"
// y "en qué parte del terreno" (una de 9 zonas). Esta función arma un dibujo APROXIMADO para que se vea lo que
// la persona va cargando:
// - El plano es un cuadrado (como en el croquis) que representa toda la finca.
// - Cada sector es un rectángulo cuya superficie es proporcional a sus hectáreas.
// - La zona elegida decide la ubicación: los sectores de "arriba" van arriba, los de "abajo" abajo y los
//   de "centro" en el medio; dentro de cada franja se ordenan de izquierda a derecha.
// - Lo que no se cargó queda libre (se dibuja con rayas).
// Es una función pura (sin React) para poder probarla.
import type { TipoSector, UbicacionRelativa } from "@/dominio/establecimientos";

/** Lado del plano en unidades del dibujo (el SVG tiene viewBox 0 0 LADO LADO). */
export const LADO_PLANO = 300;

export interface SectorParaDibujar {
  id: string;
  nombre: string;
  tipo: TipoSector;
  /** Clave del cultivo del catálogo (para el color); sin clave se usa el verde general. */
  claveCultivo?: string;
  superficieHa: number;
  ubicacion: UbicacionRelativa | "";
}

export interface RectanguloSector {
  id: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  /** Hectáreas que se dibujaron (si la suma se pasó del total, se achican todos por igual). */
  superficieHa: number;
}

export interface Disposicion {
  rectangulos: RectanguloSector[];
  /** true si los sectores suman más que la finca (el dibujo los achica para que entren). */
  excedido: boolean;
}

type Franja = 0 | 1 | 2; // arriba, centro, abajo

function franjaDe(ubicacion: UbicacionRelativa | ""): Franja {
  if (ubicacion.startsWith("arriba")) return 0;
  if (ubicacion.startsWith("abajo")) return 2;
  return 1;
}

function columnaDe(ubicacion: UbicacionRelativa | ""): 0 | 1 | 2 {
  if (ubicacion.endsWith("izquierda")) return 0;
  if (ubicacion.endsWith("derecha")) return 2;
  return 1;
}

export function disponerSectores(
  superficieTotalHa: number,
  sectores: readonly SectorParaDibujar[],
): Disposicion {
  const validos = sectores.filter((s) => Number.isFinite(s.superficieHa) && s.superficieHa > 0);
  if (superficieTotalHa <= 0 || validos.length === 0) return { rectangulos: [], excedido: false };

  const suma = validos.reduce((acum, s) => acum + s.superficieHa, 0);
  const excedido = suma > superficieTotalHa;
  // Si se pasó, todos se achican por igual para que el dibujo entre en el plano.
  const factor = excedido ? superficieTotalHa / suma : 1;
  const areaPlano = LADO_PLANO * LADO_PLANO;

  const franjas: { sector: SectorParaDibujar; orden: number; area: number }[][] = [[], [], []];
  validos.forEach((sector, orden) => {
    franjas[franjaDe(sector.ubicacion)].push({
      sector,
      orden,
      area: ((sector.superficieHa * factor) / superficieTotalHa) * areaPlano,
    });
  });

  // Cada franja ocupa todo el ancho; su alto sale de la superficie que suma.
  const altos = franjas.map((items) => items.reduce((acum, it) => acum + it.area, 0) / LADO_PLANO);

  // Arriba pegada al borde de arriba, abajo pegada al de abajo, y el centro en el medio sin pisarlas.
  const yArriba = 0;
  const yAbajo = LADO_PLANO - altos[2];
  const yCentro = Math.max(altos[0], Math.min(yAbajo - altos[1], (LADO_PLANO - altos[1]) / 2));
  const ys = [yArriba, yCentro, yAbajo];

  const rectangulos: RectanguloSector[] = [];
  franjas.forEach((items, f) => {
    if (items.length === 0) return;
    const ordenados = [...items].sort(
      (a, b) => columnaDe(a.sector.ubicacion) - columnaDe(b.sector.ubicacion) || a.orden - b.orden,
    );
    let x = 0;
    for (const it of ordenados) {
      const ancho = it.area / altos[f];
      rectangulos.push({
        id: it.sector.id,
        x,
        y: ys[f],
        ancho,
        alto: altos[f],
        superficieHa: it.sector.superficieHa * factor,
      });
      x += ancho;
    }
  });

  return { rectangulos, excedido };
}
