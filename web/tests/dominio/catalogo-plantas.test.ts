// Tests unitarios de validación de plantas de servicio (Esp. 03, T2, CA-03-01, RN-12).
import { describe, expect, it } from "vitest";
import { validarEntradaPlantaServicio } from "@/dominio/catalogo";

const BASE_PLANTA = {
  clave: "trigo_sarraceno",
  nombreComun: "Trigo sarraceno",
  nombreCientifico: "Fagopyrum esculentum",
  funciones: ["atrae_polinizadores", "cobertura_suelo"],
  ciclo: "anual",
  origen: "introducida",
  esEspontanea: false,
  enMercadoLocal: true,
  necesidadAgua: "baja",
  riesgoMaleza: "bajo",
  periodos: [
    {
      ecorregion: "valles_templados",
      siembraSemanas: [[35, 42]] as [number, number][],
      floracionSemanas: [[40, 52], [1, 4]] as [number, number][],
      corteSemanas: [[5, 6]] as [number, number][],
      semanasHastaFloracionMin: 5,
      semanasHastaFloracionMax: 7,
    },
  ],
};

describe("Validación de plantas de servicio (CA-03-01, RN-12)", () => {
  it("acepta una planta válida con períodos por ecorregión", () => {
    const res = validarEntradaPlantaServicio(BASE_PLANTA);
    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.datos.clave).toBe("trigo_sarraceno");
      expect(res.datos.periodos).toHaveLength(1);
    }
  });

  it("rechaza clave inválida, falta de disponibilidad local (RN-12) y períodos incoherentes", () => {
    const res = validarEntradaPlantaServicio({
      ...BASE_PLANTA,
      clave: "Con Espacios!",
      esEspontanea: false,
      enMercadoLocal: false,
      funciones: [],
      periodos: [
        {
          ecorregion: "valles_templados",
          siembraSemanas: [[40, 10]] as [number, number][], // inicio > fin
          floracionSemanas: [],
          corteSemanas: [],
          semanasHastaFloracionMin: 10,
          semanasHastaFloracionMax: 5, // max < min
        },
      ],
    });

    expect(res.valido).toBe(false);
    if (!res.valido) {
      expect(res.errores.length).toBeGreaterThanOrEqual(4);
    }
  });
});
