// Tests del dibujo aproximado de sectores del cuestionario (componentes/sectores/disposicion.ts).
// Lo que importa: que la superficie de cada rectángulo sea proporcional a sus hectáreas, que nada se salga
// del plano ni se pise, y que la zona elegida (arriba / centro / abajo) se respete.
import { describe, expect, it } from "vitest";
import {
  LADO_PLANO,
  disponerSectores,
  type RectanguloSector,
  type SectorParaDibujar,
} from "@/componentes/sectores/disposicion";

function sector(id: string, superficieHa: number, ubicacion: SectorParaDibujar["ubicacion"]): SectorParaDibujar {
  return { id, nombre: id, tipo: "cultivo", superficieHa, ubicacion };
}

const area = (r: RectanguloSector) => r.ancho * r.alto;
const PLANO = LADO_PLANO * LADO_PLANO;

function sePisan(a: RectanguloSector, b: RectanguloSector): boolean {
  const e = 0.001;
  return a.x < b.x + b.ancho - e && b.x < a.x + a.ancho - e && a.y < b.y + b.alto - e && b.y < a.y + a.alto - e;
}

describe("disponerSectores", () => {
  it("no dibuja nada sin sectores con hectáreas, o sin superficie total", () => {
    expect(disponerSectores(4, []).rectangulos).toEqual([]);
    expect(disponerSectores(4, [sector("a", 0, "centro"), sector("b", Number.NaN, "centro")]).rectangulos).toEqual([]);
    expect(disponerSectores(0, [sector("a", 1, "centro")]).rectangulos).toEqual([]);
  });

  it("cada sector ocupa una parte del plano proporcional a sus hectáreas", () => {
    const { rectangulos } = disponerSectores(4, [sector("a", 1, "arriba_izquierda"), sector("b", 2, "abajo_centro")]);
    const a = rectangulos.find((r) => r.id === "a")!;
    const b = rectangulos.find((r) => r.id === "b")!;
    expect(area(a) / PLANO).toBeCloseTo(1 / 4, 5);
    expect(area(b) / PLANO).toBeCloseTo(2 / 4, 5);
  });

  it("respeta la zona: arriba pegado arriba, abajo pegado abajo, centro entre medio", () => {
    const { rectangulos } = disponerSectores(9, [
      sector("abajo", 2, "abajo_derecha"),
      sector("centro", 2, "centro"),
      sector("arriba", 2, "arriba_izquierda"),
    ]);
    const arriba = rectangulos.find((r) => r.id === "arriba")!;
    const centro = rectangulos.find((r) => r.id === "centro")!;
    const abajo = rectangulos.find((r) => r.id === "abajo")!;
    expect(arriba.y).toBe(0);
    expect(abajo.y + abajo.alto).toBeCloseTo(LADO_PLANO, 5);
    expect(centro.y).toBeGreaterThanOrEqual(arriba.y + arriba.alto - 0.001);
    expect(centro.y + centro.alto).toBeLessThanOrEqual(abajo.y + 0.001);
  });

  it("dentro de una franja ordena de izquierda a derecha según la columna elegida", () => {
    const { rectangulos } = disponerSectores(4, [
      sector("der", 1, "arriba_derecha"),
      sector("izq", 1, "arriba_izquierda"),
      sector("med", 1, "arriba_centro"),
    ]);
    const x = (id: string) => rectangulos.find((r) => r.id === id)!.x;
    expect(x("izq")).toBeLessThan(x("med"));
    expect(x("med")).toBeLessThan(x("der"));
  });

  it("nada se sale del plano ni se pisa, aunque todos estén en la misma zona", () => {
    const { rectangulos } = disponerSectores(5, [
      sector("a", 1.5, "centro"),
      sector("b", 1, "centro"),
      sector("c", 0.75, "centro"),
      sector("d", 1, "abajo_centro"),
    ]);
    for (const r of rectangulos) {
      expect(r.x).toBeGreaterThanOrEqual(-0.001);
      expect(r.y).toBeGreaterThanOrEqual(-0.001);
      expect(r.x + r.ancho).toBeLessThanOrEqual(LADO_PLANO + 0.001);
      expect(r.y + r.alto).toBeLessThanOrEqual(LADO_PLANO + 0.001);
    }
    for (let i = 0; i < rectangulos.length; i += 1) {
      for (let j = i + 1; j < rectangulos.length; j += 1) {
        expect(sePisan(rectangulos[i], rectangulos[j])).toBe(false);
      }
    }
  });

  it("si los sectores suman más que la finca, los achica para que entren y lo avisa", () => {
    const { rectangulos, excedido } = disponerSectores(2, [
      sector("a", 2, "arriba_centro"),
      sector("b", 2, "abajo_centro"),
    ]);
    expect(excedido).toBe(true);
    const total = rectangulos.reduce((acum, r) => acum + area(r), 0);
    expect(total).toBeCloseTo(PLANO, 3);
    expect(sePisan(rectangulos[0], rectangulos[1])).toBe(false);
  });

  it("sin pasarse de superficie no marca exceso", () => {
    expect(disponerSectores(4, [sector("a", 1, "centro")]).excedido).toBe(false);
  });
});
