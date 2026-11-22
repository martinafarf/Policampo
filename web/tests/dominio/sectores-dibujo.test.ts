// Tests unitarios de validación combinada (metadatos + geometría) para croquis y mapa (Esp. 02, T4/T5).
// Cubren RN-02, RN-05, CA-02-06, CA-02-07, CA-02-10, CA-02-11, CA-02-12 y CA-02-13.
import { describe, expect, it } from "vitest";
import {
  validarSectoresConDibujo,
  type CultivoCatalogoItem,
  type PoligonoGeoJson,
} from "@/dominio/establecimientos";

const ID_TOMATE = "11111111-1111-4111-8111-111111111111";

const CATALOGO = new Map<string, CultivoCatalogoItem>([
  [ID_TOMATE, { id: ID_TOMATE, clave: "tomate", nombre: "Tomate", activo: true }],
]);

function rectangulo(x0: number, y0: number, x1: number, y1: number): PoligonoGeoJson {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

describe("Validación completa de sectores con dibujo (croquis y mapa)", () => {
  it("recalcula superficies desde el croquis, asigna nombres automáticos e ignora valores falsos (CA-02-10, CA-02-13)", () => {
    const res = validarSectoresConDibujo(
      {
        metodo: "croquis",
        superficieTotalHa: 4, // lado 200 m
        sectores: [
          {
            tipo: "cultivo",
            cultivoId: ID_TOMATE,
            geometria: rectangulo(0, 0, 100, 100), // 1 ha real
            superficieHaIgnorada: 50,
          },
          {
            tipo: "sector_flores",
            subtipoFlores: "borde_silvestre",
            geometria: rectangulo(100, 0, 150, 100), // 0,5 ha real
            superficieHaIgnorada: 0.01,
          },
        ],
      },
      CATALOGO,
    );

    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.sectores.map((s) => s.nombre)).toEqual(["Tomate", "Sector de flores 1"]);
      expect(res.sectores[0].superficieHa).toBe(1);
      expect(res.sectores[1].superficieHa).toBe(0.5);
    }
  });

  it("rechaza metadatos inválidos (cultivo sin cultivoId/Otro o sector_flores con cultivo) aunque la geometría sea válida", () => {
    const res = validarSectoresConDibujo(
      {
        metodo: "croquis",
        superficieTotalHa: 4,
        sectores: [
          {
            tipo: "sector_flores",
            cultivoId: ID_TOMATE,
            geometria: rectangulo(0, 0, 50, 50),
          },
        ],
      },
      CATALOGO,
    );

    expect(res.valido).toBe(false);
    if (!res.valido) {
      expect(res.errores[0]).toMatch(/no lleva cultivo/i);
    }
  });

  it("en mapa recalcula la superficie total desde el contorno y cada sector con Turf.js (CA-02-11, CA-02-12)", () => {
    const contornoPerico: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.1258, -24.3872],
          [-65.1235, -24.387],
          [-65.1232, -24.3883],
          [-65.1243, -24.3885],
          [-65.1242, -24.3891],
          [-65.1259, -24.3889],
          [-65.1258, -24.3872],
        ],
      ],
    };

    const sectorDentro: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.1257, -24.3873],
          [-65.1236, -24.3871],
          [-65.1234, -24.3879],
          [-65.1257, -24.3879],
          [-65.1257, -24.3873],
        ],
      ],
    };

    const res = validarSectoresConDibujo(
      {
        metodo: "mapa",
        contorno: contornoPerico,
        sectores: [
          {
            tipo: "cultivo",
            cultivoId: ID_TOMATE,
            geometria: sectorDentro,
            superficieHaIgnorada: 999,
          },
        ],
      },
      CATALOGO,
    );

    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.superficieTotalHa).toBeGreaterThan(3);
      expect(res.sectores[0].nombre).toBe("Tomate");
      expect(res.sectores[0].superficieHa).toBeGreaterThan(1);
      expect(res.sectores[0].superficieHa).toBeLessThan(res.superficieTotalHa);
    }
  });
});
