// Tests unitarios de validación de cultivos y compatibilidades (Esp. 03, T3, CA-03-04, CA-03-09).
import { describe, expect, it } from "vitest";
import { validarEntradaCompatibilidad, validarEntradaCultivo } from "@/dominio/catalogo";

describe("Validación de cultivos agronómicos (CA-03-04)", () => {
  it("acepta un cultivo nuevo activo con períodos por ecorregión", () => {
    const res = validarEntradaCultivo({
      clave: "vid",
      nombre: "Vid",
      activo: true,
      dependenciaPolinizacion: "baja",
      tipoPolinizacion: "Mixta con aporte de abejas solitarias",
      periodos: [
        {
          ecorregion: "valles_templados",
          floracionSemanas: [[45, 50]],
          cosechaSemanas: [[6, 13]],
        },
      ],
    });
    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.datos.clave).toBe("vid");
      expect(res.datos.activo).toBe(true);
    }
  });

  it("rechaza clave inválida, dependencia desconocida y rangos de semanas inválidos", () => {
    const res = validarEntradaCultivo({
      clave: "X",
      nombre: "A",
      activo: true,
      dependenciaPolinizacion: "extrema",
      periodos: [
        { ecorregion: "valles_templados", floracionSemanas: [[50, 10]], cosechaSemanas: [] },
      ],
    });
    expect(res.valido).toBe(false);
  });
});

describe("Validación de compatibilidades (CA-03-09)", () => {
  it("acepta grados de -5 a +5 con justificación de 10 a 500 caracteres", () => {
    const res = validarEntradaCompatibilidad({
      grado: -4,
      justificacion: "Compite por agua y hospeda pulgones comunes con el cultivo principal.",
    });
    expect(res.valido).toBe(true);
  });

  it("rechaza grados fuera de rango y justificaciones de menos de 10 caracteres", () => {
    const fuera = validarEntradaCompatibilidad({
      grado: 6,
      justificacion: "Corta",
    });
    expect(fuera.valido).toBe(false);
    if (!fuera.valido) {
      expect(fuera.errores).toHaveLength(2);
    }
  });
});
