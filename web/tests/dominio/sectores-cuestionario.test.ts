// Tests unitarios de validación de sectores en cuestionario (especificación 02, tarea T3).
// Cubren CA-02-06, CA-02-07, CA-02-08, CA-02-09 y el tope de 50 sectores.
import { describe, expect, it } from "vitest";
import {
  validarSectoresCuestionario,
  type CultivoCatalogoItem,
} from "@/dominio/establecimientos";

const ID_TOMATE = "11111111-1111-4111-8111-111111111111";
const ID_FRUTILLA = "22222222-2222-4222-8222-222222222222";

const CATALOGO = new Map<string, CultivoCatalogoItem>([
  [ID_TOMATE, { id: ID_TOMATE, clave: "tomate", nombre: "Tomate", activo: true }],
  [ID_FRUTILLA, { id: ID_FRUTILLA, clave: "frutilla", nombre: "Frutilla", activo: true }],
]);

describe("Validación de sectores del cuestionario (CA-02-06 a CA-02-09)", () => {
  it("acepta sectores de cultivo (catálogo y 'Otro') y sectores de flores con nombres automáticos", () => {
    const res = validarSectoresCuestionario(
      10,
      [
        {
          tipo: "cultivo",
          cultivoId: ID_TOMATE,
          superficieTexto: "3,5",
          ubicacionRelativa: "arriba_izquierda",
        },
        {
          tipo: "cultivo",
          cultivoId: ID_TOMATE,
          superficieTexto: "2",
          ubicacionRelativa: "centro",
        },
        {
          tipo: "cultivo",
          cultivoOtro: "Papa andina",
          superficieTexto: "1.5",
          ubicacionRelativa: "abajo_derecha",
        },
        {
          tipo: "sector_flores",
          subtipoFlores: "flora_espontanea",
          superficieTexto: "2",
          ubicacionRelativa: "arriba_derecha",
        },
      ],
      CATALOGO,
    );

    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.sectores.map((s) => s.nombre)).toEqual([
        "Tomate",
        "Tomate 2",
        "Papa andina",
        "Sector de flores 1",
      ]);
      expect(res.sectores[0].superficieHa).toBe(3.5);
      expect(res.sectores[3].cultivoId).toBeNull();
      expect(res.sectores[3].subtipoFlores).toBe("flora_espontanea");
    }
  });

  it("exige cultivo o 'Otro' en sector de cultivo y prohíbe cultivo en sector de flores (CA-02-06)", () => {
    const sinCultivo = validarSectoresCuestionario(
      10,
      [{ tipo: "cultivo", superficieTexto: "1", ubicacionRelativa: "centro" }],
      CATALOGO,
    );
    expect(sinCultivo.valido).toBe(false);

    const floresConCultivo = validarSectoresCuestionario(
      10,
      [
        {
          tipo: "sector_flores",
          cultivoId: ID_FRUTILLA,
          superficieTexto: "1",
          ubicacionRelativa: "centro",
        },
      ],
      CATALOGO,
    );
    expect(floresConCultivo.valido).toBe(false);

    const cultivoConSubtipo = validarSectoresCuestionario(
      10,
      [
        {
          tipo: "cultivo",
          cultivoId: ID_TOMATE,
          subtipoFlores: "borde_silvestre",
          superficieTexto: "1",
          ubicacionRelativa: "centro",
        },
      ],
      CATALOGO,
    );
    expect(cultivoConSubtipo.valido).toBe(false);
  });

  it("exige superficie > 0 y ubicación relativa válida en cada sector (CA-02-09)", () => {
    const res = validarSectoresCuestionario(
      10,
      [
        {
          tipo: "cultivo",
          cultivoId: ID_TOMATE,
          superficieTexto: "0",
          ubicacionRelativa: "centro",
        },
        {
          tipo: "sector_flores",
          superficieTexto: "2",
          ubicacionRelativa: "cualquier_lado",
        },
      ],
      CATALOGO,
    );

    expect(res.valido).toBe(false);
    if (!res.valido) {
      expect(res.errores).toHaveLength(2);
      expect(res.errores[0].indice).toBe(0);
      expect(res.errores[1].indice).toBe(1);
    }
  });

  it("rechaza cuando la suma supera la superficie total en más de 0,5 % (CA-02-08) y más de 50 sectores", () => {
    const exceso = validarSectoresCuestionario(
      5,
      [
        { tipo: "cultivo", cultivoId: ID_TOMATE, superficieTexto: "4", ubicacionRelativa: "centro" },
        { tipo: "sector_flores", superficieTexto: "1.5", ubicacionRelativa: "arriba_centro" },
      ],
      CATALOGO,
    );
    expect(exceso.valido).toBe(false);
    if (!exceso.valido) {
      expect(exceso.errorGeneral).toContain("0.5 ha");
    }

    const cincuentaYUno = Array.from({ length: 51 }, () => ({
      tipo: "sector_flores",
      superficieTexto: "0.01",
      ubicacionRelativa: "centro",
    }));
    const tope = validarSectoresCuestionario(10, cincuentaYUno, CATALOGO);
    expect(tope.valido).toBe(false);
    if (!tope.valido) {
      expect(tope.errorGeneral).toMatch(/50/);
    }
  });
});
