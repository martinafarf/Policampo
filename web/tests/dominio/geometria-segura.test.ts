// Tests de restarSeguro / intersectarSeguro (dominio/geometria-segura).
// La librería de polígonos (polyclip-ts, dentro de @turf/difference y @turf/intersect) a veces falla con dibujos
// que tienen puntos casi iguales («Unable to complete output ring…»). Acá se simula esa falla para comprobar que
// se reintenta con las coordenadas redondeadas y que, si igual falla, se devuelve un resultado seguro.
import { polygon } from "@turf/helpers";
import { afterEach, describe, expect, it, vi } from "vitest";

const falla = vi.hoisted(() => ({ difference: 0, intersect: 0 }));

// Envolvemos las funciones reales: fallan las primeras N veces (según `falla`) y después funcionan normal.
vi.mock("@turf/difference", async (importOriginal) => {
  const real = (await importOriginal<{ default: (...a: unknown[]) => unknown }>()).default;
  return {
    default: vi.fn((...args: unknown[]) => {
      if (falla.difference > 0) {
        falla.difference -= 1;
        throw new Error("Unable to complete output ring starting at [295.83, 58.59].");
      }
      return real(...args);
    }),
  };
});
vi.mock("@turf/intersect", async (importOriginal) => {
  const real = (await importOriginal<{ default: (...a: unknown[]) => unknown }>()).default;
  return {
    default: vi.fn((...args: unknown[]) => {
      if (falla.intersect > 0) {
        falla.intersect -= 1;
        throw new Error("Unable to complete output ring starting at [295.83, 58.59].");
      }
      return real(...args);
    }),
  };
});

const { intersectarSeguro, redondearFigura, restarSeguro } = await import("@/dominio/geometria-segura");

const cuadrado = (x0: number, y0: number, lado: number) =>
  polygon([[[x0, y0], [x0 + lado, y0], [x0 + lado, y0 + lado], [x0, y0 + lado], [x0, y0]]]);

afterEach(() => {
  falla.difference = 0;
  falla.intersect = 0;
});

describe("restarSeguro", () => {
  it("resta normalmente cuando la librería funciona", () => {
    const resto = restarSeguro(cuadrado(0, 0, 10), cuadrado(5, 0, 10));
    expect(resto).not.toBeNull();
    // Queda la mitad izquierda: x entre 0 y 5
    const xs = (resto!.geometry.coordinates as number[][][]).flat().map((p) => p[0]);
    expect(Math.max(...xs)).toBeCloseTo(5);
  });

  it("si la librería falla una vez, reintenta con las coordenadas redondeadas y obtiene el resultado", () => {
    falla.difference = 1;
    const resto = restarSeguro(cuadrado(0, 0, 10), cuadrado(5, 0, 10));
    expect(resto).not.toBeNull();
    const xs = (resto!.geometry.coordinates as number[][][]).flat().map((p) => p[0]);
    expect(Math.max(...xs)).toBeCloseTo(5);
  });

  it("si falla siempre, no rompe: devuelve la figura sin cambios (o «nada» si se pide)", () => {
    const a = cuadrado(0, 0, 10);
    falla.difference = 2;
    expect(restarSeguro(a, cuadrado(5, 0, 10))).toBe(a);
    falla.difference = 2;
    expect(restarSeguro(a, cuadrado(5, 0, 10), { siFalla: "nada" })).toBeNull();
  });
});

describe("intersectarSeguro", () => {
  it("si falla siempre, no rompe: devuelve «no se tocan» (null)", () => {
    falla.intersect = 2;
    expect(intersectarSeguro(cuadrado(0, 0, 10), cuadrado(5, 0, 10))).toBeNull();
  });

  it("si falla una vez, reintenta y obtiene la parte compartida", () => {
    falla.intersect = 1;
    const comun = intersectarSeguro(cuadrado(0, 0, 10), cuadrado(5, 0, 10));
    expect(comun).not.toBeNull();
  });
});

describe("redondearFigura", () => {
  it("redondea las coordenadas a 7 decimales (los puntos casi iguales pasan a ser iguales)", () => {
    const fig = polygon([[[0, 0], [1.000000000001, 0], [1, 1], [0, 1], [0, 0]]]);
    const r = redondearFigura(fig);
    expect((r.geometry.coordinates as number[][][])[0][1][0]).toBe(1);
  });
});
