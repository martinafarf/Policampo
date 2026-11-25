// Tests del camino de pasos de la ficha de la finca (etapa estilos/01-fincas).
import { describe, expect, it } from "vitest";
import { calcularPasosFinca, pasoActual, type DatosPasos } from "@/app/fincas/[id]/pasos";

const base: DatosPasos = {
  terrenoCompleto: true,
  faltaEnTerreno: null,
  diagnostico: null,
  tienePropuestaElegida: false,
  tieneCalendario: false,
  cantidadInformes: 0,
};

const estados = (d: DatosPasos) => calcularPasosFinca(d).map((p) => p.estado);

describe("Camino de pasos de la finca", () => {
  it("son siempre 5 pasos, numerados del 1 al 5", () => {
    const pasos = calcularPasosFinca(base);
    expect(pasos.map((p) => p.numero)).toEqual([1, 2, 3, 4, 5]);
    expect(pasos.map((p) => p.clave)).toEqual(["terreno", "diagnostico", "rediseno", "calendario", "informe"]);
  });

  it("sin terreno completo, toca cargar el terreno y todo lo demás espera", () => {
    const pasos = calcularPasosFinca({ ...base, terrenoCompleto: false, faltaEnTerreno: "Cargá al menos un cultivo" });
    expect(pasos.map((p) => p.estado)).toEqual(["ahora", "espera", "espera", "espera", "espera"]);
    expect(pasos[0].detalle).toBe("Cargá al menos un cultivo");
    expect(pasoActual(pasos)?.clave).toBe("terreno");
  });

  it("con el terreno listo y sin diagnóstico, toca el diagnóstico", () => {
    expect(estados(base)).toEqual(["listo", "ahora", "espera", "espera", "espera"]);
  });

  it("con diagnóstico al día, toca el rediseño", () => {
    expect(estados({ ...base, diagnostico: { desactualizado: false } })).toEqual([
      "listo",
      "listo",
      "ahora",
      "espera",
      "espera",
    ]);
  });

  it("si el diagnóstico quedó viejo, ese es el próximo paso (y el rediseño espera)", () => {
    const pasos = calcularPasosFinca({ ...base, diagnostico: { desactualizado: true } });
    expect(pasos.map((p) => p.estado)).toEqual(["listo", "atencion", "espera", "espera", "espera"]);
    expect(pasoActual(pasos)?.clave).toBe("diagnostico");
  });

  it("con rediseño elegido y sin calendario, toca el calendario y el informe queda disponible", () => {
    expect(estados({ ...base, diagnostico: { desactualizado: false }, tienePropuestaElegida: true })).toEqual([
      "listo",
      "listo",
      "listo",
      "ahora",
      "disponible",
    ]);
  });

  it("con todo hecho no hay paso actual y el informe muestra cuántos hay", () => {
    const pasos = calcularPasosFinca({
      ...base,
      diagnostico: { desactualizado: false },
      tienePropuestaElegida: true,
      tieneCalendario: true,
      cantidadInformes: 2,
    });
    expect(pasos.every((p) => p.estado === "listo")).toBe(true);
    expect(pasos[4].etiqueta).toBe("2 informes");
    expect(pasoActual(pasos)).toBeNull();
  });

  it("nunca hay más de un paso marcado como 'lo próximo'", () => {
    // Diagnóstico viejo + rediseño elegido sin calendario: el diagnóstico manda, el calendario queda disponible.
    const pasos = calcularPasosFinca({ ...base, diagnostico: { desactualizado: true }, tienePropuestaElegida: true });
    const proximos = pasos.filter((p) => p.estado === "ahora" || p.estado === "atencion");
    expect(proximos.map((p) => p.clave)).toEqual(["diagnostico"]);
    expect(pasos[3].estado).toBe("disponible");
  });
});
