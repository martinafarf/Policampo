// Tests unitarios del dominio de establecimientos y sectores (especificación 02, tarea T1).
// Cubren CA-02-07, CA-02-08, CA-02-10, CA-02-11, CA-02-12 y CA-02-13, además de los datos de Jujuy.
import { describe, expect, it } from "vitest";
import {
  CULTIVOS_INICIALES,
  DEPARTAMENTOS_JUJUY,
  ECORREGIONES,
  LIMITES_JUJUY,
  NOMBRES_DEPARTAMENTOS_JUJUY,
  esDepartamentoValido,
  esEcorregionValida,
  obtenerEcorregionSugerida,
  obtenerLocalidades,
} from "@/datos/jujuy";
import {
  calcularAreaGeograficaHa,
  calcularAreaPlanaHa,
  calcularAreaPlanaM2,
  calcularLadoCroquisMetros,
  calcularMetricasEstablecimiento,
  crearContornoCroquis,
  generarNombresSectores,
  validarCoordenadasEnJujuy,
  validarNombreSector,
  validarPoligonoBasico,
  validarSumaSuperficies,
  validarYRecalcularDibujo,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";

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

function poligonoCircular(cx: number, cy: number, radio: number, vertices: number): PoligonoGeoJson {
  const anillo: Posicion2D[] = [];
  for (let i = 0; i < vertices; i += 1) {
    const angulo = (2 * Math.PI * i) / vertices;
    anillo.push([cx + radio * Math.cos(angulo), cy + radio * Math.sin(angulo)]);
  }
  anillo.push([...anillo[0]]);
  return { type: "Polygon", coordinates: [anillo] };
}

describe("Datos geográficos de Jujuy y catálogo inicial (CA-02-03)", () => {
  it("incluye los 16 departamentos, las 5 ecorregiones y los 9 cultivos iniciales de la v1", () => {
    expect(NOMBRES_DEPARTAMENTOS_JUJUY).toHaveLength(16);
    expect(Object.keys(DEPARTAMENTOS_JUJUY)).toHaveLength(16);
    expect(ECORREGIONES).toHaveLength(5);
    expect(CULTIVOS_INICIALES).toHaveLength(9);
  });

  it("sugiere la ecorregión correcta y ofrece localidades con coordenadas dentro de Jujuy", () => {
    expect(esDepartamentoValido("El Carmen")).toBe(true);
    expect(esDepartamentoValido("Inexistente")).toBe(false);
    expect(obtenerEcorregionSugerida("El Carmen")).toBe("valles_templados");
    expect(obtenerEcorregionSugerida("Tilcara")).toBe("quebrada_de_humahuaca");
    expect(obtenerEcorregionSugerida("Ledesma")).toBe("yungas");
    expect(obtenerEcorregionSugerida("Yavi")).toBe("puna");

    for (const depto of NOMBRES_DEPARTAMENTOS_JUJUY) {
      expect(esEcorregionValida(obtenerEcorregionSugerida(depto))).toBe(true);
      const localidades = obtenerLocalidades(depto);
      expect(localidades.length).toBeGreaterThan(0);
      for (const loc of localidades) {
        expect(loc.lat).toBeGreaterThanOrEqual(LIMITES_JUJUY.latMin);
        expect(loc.lat).toBeLessThanOrEqual(LIMITES_JUJUY.latMax);
        expect(loc.lng).toBeGreaterThanOrEqual(LIMITES_JUJUY.lngMin);
        expect(loc.lng).toBeLessThanOrEqual(LIMITES_JUJUY.lngMax);
      }
    }
  });
});

describe("Nombres automáticos de sectores (RN-02, CA-02-07)", () => {
  it("nombra cultivos como el cultivo, numera repeticiones y numera sectores de flores", () => {
    const nombres = generarNombresSectores([
      { tipo: "cultivo", nombreCultivo: "Tomate" },
      { tipo: "sector_flores" },
      { tipo: "cultivo", nombreCultivo: "tomate" },
      { tipo: "cultivo", nombreCultivo: "Frutilla" },
      { tipo: "sector_flores" },
      { tipo: "cultivo", nombreCultivo: "Tomate" },
    ]);

    expect(nombres).toEqual([
      "Tomate",
      "Sector de flores 1",
      "tomate 2",
      "Frutilla",
      "Sector de flores 2",
      "Tomate 3",
    ]);
  });

  it("respeta el nombre personalizado del usuario y valida su largo (1 a 60 caracteres)", () => {
    const nombres = generarNombresSectores([
      { tipo: "cultivo", nombreCultivo: "Tomate", nombrePersonalizado: "Lote Norte" },
      { tipo: "sector_flores", nombrePersonalizado: "Borde Oeste" },
    ]);
    expect(nombres).toEqual(["Lote Norte", "Borde Oeste"]);
    expect(validarNombreSector("Lote Norte").valido).toBe(true);
    expect(validarNombreSector("   ").valido).toBe(false);
    expect(validarNombreSector("a".repeat(61)).valido).toBe(false);
  });
});

describe("Suma de superficies y métricas (RN-06, CA-02-08, CA-02-19)", () => {
  it("acepta sumas dentro de la superficie total o hasta 0,5 % de tolerancia", () => {
    expect(validarSumaSuperficies(10, [6, 4]).valida).toBe(true);
    expect(validarSumaSuperficies(10, [6, 4.04]).valida).toBe(true); // +0,4 %
  });

  it("rechaza sumas que superan el total en más de 0,5 % e indica el exceso (CA-02-08)", () => {
    const resultado = validarSumaSuperficies(10, [7, 3.5]);
    expect(resultado.valida).toBe(false);
    expect(resultado.excesoHa).toBe(0.5);
    expect(resultado.mensaje).toContain("0.5 ha");
  });

  it("rechaza superficies menores o iguales a cero", () => {
    expect(validarSumaSuperficies(10, [0]).valida).toBe(false);
    expect(validarSumaSuperficies(10, [-1]).valida).toBe(false);
  });

  it("calcula las métricas de la ficha y la regla del 20 %", () => {
    const metricas = calcularMetricasEstablecimiento(10, [
      { tipo: "cultivo", superficieHa: 7 },
      { tipo: "sector_flores", superficieHa: 2 },
    ]);
    expect(metricas.superficieDistribuidaHa).toBe(9);
    expect(metricas.superficieRestanteHa).toBe(1);
    expect(metricas.superficieFloresHa).toBe(2);
    expect(metricas.porcentajeFlores).toBe(20);
    expect(metricas.llegaAl20PorCiento).toBe(true);
  });
});

describe("Croquis: plano cuadrado a escala y recálculo en el servidor (CA-02-10, CA-02-11, CA-02-13)", () => {
  it("arma un plano cuadrado de lado √(ha × 10.000) m y el área del rectángulo coincide con ancho × alto (CA-02-13)", () => {
    expect(calcularLadoCroquisMetros(4)).toBe(200); // √(4 * 10000) = 200 m
    const contorno = crearContornoCroquis(4);
    expect(calcularAreaPlanaM2(contorno)).toBe(40_000);
    expect(calcularAreaPlanaHa(contorno)).toBe(4);

    // Rectángulo de 80 m × 50 m = 4.000 m² = 0,4 ha
    const lote = rectangulo(0, 0, 80, 50);
    expect(calcularAreaPlanaM2(lote)).toBe(4_000);
    expect(calcularAreaPlanaHa(lote)).toBe(0.4);
  });

  it("ignora la superficie enviada por el navegador y guarda la calculada desde la geometría (CA-02-10)", () => {
    const resultado = validarYRecalcularDibujo({
      metodo: "croquis",
      superficieTotalHa: 4, // lado 200 m
      sectores: [
        { geometria: rectangulo(0, 0, 100, 100), superficieHaIgnorada: 999 }, // real: 1 ha
        { geometria: rectangulo(100, 0, 200, 50), superficieHaIgnorada: 0.0001 }, // real: 0,5 ha
      ],
    });

    expect(resultado.valido).toBe(true);
    expect(resultado.superficieTotalHa).toBe(4);
    expect(resultado.sectoresCalculados?.[0].superficieHa).toBe(1);
    expect(resultado.sectoresCalculados?.[1].superficieHa).toBe(0.5);
  });

  it("rechaza sectores fuera del contorno o superpuestos en más de 1 % (CA-02-11)", () => {
    // Sector que sobresale 50 % fuera del cuadrado de 100 m × 100 m (1 ha)
    const fuera = validarYRecalcularDibujo({
      metodo: "croquis",
      superficieTotalHa: 1,
      sectores: [{ geometria: rectangulo(50, 0, 150, 50) }],
    });
    expect(fuera.valido).toBe(false);
    expect(fuera.errores[0]).toMatch(/contorno/i);

    // Dos sectores que se superponen en 50 %
    const superpuestos = validarYRecalcularDibujo({
      metodo: "croquis",
      superficieTotalHa: 1,
      sectores: [
        { geometria: rectangulo(0, 0, 60, 50) },
        { geometria: rectangulo(30, 0, 90, 50) },
      ],
    });
    expect(superpuestos.valido).toBe(false);
    expect(superpuestos.errores[0]).toMatch(/superponen/i);

    // Polígono autointersectado en croquis (metros)
    const monoCroquis: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [10, 10],
          [80, 80],
          [80, 10],
          [10, 80],
          [10, 10],
        ],
      ],
    };
    const resMono = validarYRecalcularDibujo({
      metodo: "croquis",
      superficieTotalHa: 1,
      sectores: [{ geometria: monoCroquis }],
    });
    expect(resMono.valido).toBe(false);
    expect(resMono.errores[0]).toMatch(/cruza/i);

    // Más de 50 sectores (tope de sección 7.2)
    const muchosSectores = Array.from({ length: 51 }, (_, i) => ({
      geometria: rectangulo(i, 0, i + 1, 10),
    }));
    const resTope = validarYRecalcularDibujo({
      metodo: "croquis",
      superficieTotalHa: 1,
      sectores: muchosSectores,
    });
    expect(resTope.valido).toBe(false);
    expect(resTope.errores[0]).toMatch(/50/);
  });
});

describe("Mapa: contorno en Jujuy, recálculo con Turf y validaciones (CA-02-10, CA-02-11, CA-02-12)", () => {
  // Parcela real de ejemplo en Perico, Jujuy (migrada de policampo_common.js)
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

  const loteNorte: PoligonoGeoJson = {
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

  const loteSur: PoligonoGeoJson = {
    type: "Polygon",
    coordinates: [
      [
        [-65.1257, -24.388],
        [-65.1235, -24.388],
        [-65.1243, -24.3884],
        [-65.1243, -24.3889],
        [-65.1258, -24.3888],
        [-65.1257, -24.388],
      ],
    ],
  };

  it("calcula la superficie total del contorno y de los sectores desde GeoJSON ignorando valores enviados (CA-02-10, CA-02-12)", () => {
    const areaEsperadaContorno = calcularAreaGeograficaHa(contornoPerico);
    const areaEsperadaNorte = calcularAreaGeograficaHa(loteNorte);

    const resultado = validarYRecalcularDibujo({
      metodo: "mapa",
      superficieTotalHa: 500, // el servidor la ignora en mapa
      contorno: contornoPerico,
      sectores: [
        { geometria: loteNorte, superficieHaIgnorada: 123 },
        { geometria: loteSur, superficieHaIgnorada: 456 },
      ],
    });

    expect(resultado.valido).toBe(true);
    expect(resultado.superficieTotalHa).toBe(areaEsperadaContorno);
    expect(resultado.superficieTotalHa).toBeGreaterThan(3);
    expect(resultado.superficieTotalHa).toBeLessThan(6);
    expect(resultado.sectoresCalculados?.[0].superficieHa).toBe(areaEsperadaNorte);
  });

  it("rechaza polígonos autointersectados, con más de 500 vértices y coordenadas fuera de Jujuy (CA-02-11)", () => {
    // Figura en moño (autointersección)
    const mono: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.125, -24.387],
          [-65.123, -24.389],
          [-65.123, -24.387],
          [-65.125, -24.389],
          [-65.125, -24.387],
        ],
      ],
    };
    const resMono = validarPoligonoBasico(mono, "mapa");
    expect(resMono.valido).toBe(false);
    expect(resMono.error).toMatch(/cruza/i);

    // 501 vértices (supera el tope de 500)
    const muchosVertices = poligonoCircular(-65.12, -24.38, 0.01, 501);
    const resVertices = validarPoligonoBasico(muchosVertices, "mapa");
    expect(resVertices.valido).toBe(false);
    expect(resVertices.error).toMatch(/500/);

    // Coordenadas en Buenos Aires (fuera de Jujuy)
    const fueraDeJujuy: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-58.4, -34.6],
          [-58.39, -34.6],
          [-58.39, -34.61],
          [-58.4, -34.61],
          [-58.4, -34.6],
        ],
      ],
    };
    expect(validarCoordenadasEnJujuy(fueraDeJujuy).valido).toBe(false);

    const resMapaFuera = validarYRecalcularDibujo({
      metodo: "mapa",
      contorno: fueraDeJujuy,
      sectores: [],
    });
    expect(resMapaFuera.valido).toBe(false);
    expect(resMapaFuera.errores[0]).toMatch(/Jujuy/i);
  });

  it("rechaza sectores que sobresalen del contorno o se superponen en el mapa (CA-02-11)", () => {
    const sectorFuera: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.13, -24.387],
          [-65.128, -24.387],
          [-65.128, -24.388],
          [-65.13, -24.388],
          [-65.13, -24.387],
        ],
      ],
    };

    const resFuera = validarYRecalcularDibujo({
      metodo: "mapa",
      contorno: contornoPerico,
      sectores: [{ geometria: sectorFuera }],
    });
    expect(resFuera.valido).toBe(false);
    expect(resFuera.errores[0]).toMatch(/contorno/i);

    // Dos sectores iguales (100 % superpuestos)
    const resSuperpuestos = validarYRecalcularDibujo({
      metodo: "mapa",
      contorno: contornoPerico,
      sectores: [{ geometria: loteNorte }, { geometria: loteNorte }],
    });
    expect(resSuperpuestos.valido).toBe(false);
    expect(resSuperpuestos.errores[0]).toMatch(/superponen/i);
  });
});
