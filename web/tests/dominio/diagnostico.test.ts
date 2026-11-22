// Tests unitarios del dominio de diagnóstico (especificación 04, T1).
// Cubre CA-04-01 a CA-04-07 y la explicación de cálculo (CA-04-12).
import { describe, expect, it } from "vitest";
import {
  VERSION_REGLAS_DIAGNOSTICO,
  construirExplicacionCalculo,
  construirTextoAlerta,
  diagnosticar,
  type EntradaDiagnostico,
} from "@/dominio/diagnostico";
import {
  UBICACIONES_RELATIVAS,
  calcularAreaGeograficaHa,
  crearContornoCroquis,
  type PoligonoGeoJson,
} from "@/dominio/establecimientos";

describe("Diagnóstico agroecológico — función pura diagnosticar()", () => {
  it("cumple la tabla de ejemplos de referencia de 10 ha con redondeos exactos (CA-04-01)", () => {
    const casos = [
      { flores: 2.5, pct: 25.0, deficit: 0.0, compensar: 0, nivel: "adecuado" as const, sinFlores: false },
      { flores: 2.0, pct: 20.0, deficit: 0.0, compensar: 0, nivel: "adecuado" as const, sinFlores: false },
      { flores: 1.0, pct: 10.0, deficit: 10.0, compensar: 1.0, nivel: "moderado" as const, sinFlores: false },
      { flores: 0.5, pct: 5.0, deficit: 15.0, compensar: 1.5, nivel: "critico" as const, sinFlores: false },
      { flores: 0.0, pct: 0.0, deficit: 20.0, compensar: 2.0, nivel: "critico" as const, sinFlores: true },
    ];

    for (const c of casos) {
      const sectores: EntradaDiagnostico["sectores"] = [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 10 - c.flores,
          ubicacionRelativa: "centro",
        },
        ...(c.flores > 0
          ? [
              {
                tipo: "sector_flores" as const,
                subtipoFlores: "banda_implantada" as const,
                superficieHa: c.flores,
                ubicacionRelativa: "arriba_izquierda" as const,
              },
            ]
          : []),
      ];

      const res = diagnosticar({
        metodo: "cuestionario",
        ecorregion: "valles_templados",
        superficieTotalHa: 10,
        sectores,
      });

      expect(res.superficieFloresHa).toBe(c.flores);
      expect(res.porcentajeFlores).toBe(c.pct);
      expect(res.deficitPp).toBe(c.deficit);
      expect(res.hectareasACompensar).toBe(c.compensar);
      expect(res.nivelRiesgo).toBe(c.nivel);
      expect(res.alertas.some((a) => a.tipo === "sin_flores")).toBe(c.sinFlores);
      expect(res.versionReglas).toBe(VERSION_REGLAS_DIAGNOSTICO);
    }
  });

  it("evita errores de coma flotante al sumar 0,1 + 0,2 ha de flores (CA-04-01)", () => {
    const res = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: "1.5",
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: "1.2",
        },
        { tipo: "sector_flores", subtipoFlores: "flora_espontanea", superficieHa: "0.1" },
        { tipo: "sector_flores", subtipoFlores: "borde_silvestre", superficieHa: "0.2" },
      ],
    });

    // 0,1 + 0,2 = 0,3 exacto sobre 1,5 ha = 20,0 % exacto -> Adecuado, 0 déficit, 0 a compensar.
    expect(res.superficieFloresHa).toBe(0.3);
    expect(res.superficieSinAsignarHa).toBe(0);
    expect(res.porcentajeFlores).toBe(20);
    expect(res.deficitPp).toBe(0);
    expect(res.hectareasACompensar).toBe(0);
    expect(res.nivelRiesgo).toBe("adecuado");
  });

  it("suma todos los subtipos de flores por igual y no cuenta la superficie sin asignar (CA-04-02)", () => {
    const res = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 10,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 5,
        },
        { tipo: "sector_flores", subtipoFlores: "flora_espontanea", superficieHa: 0.5 },
        { tipo: "sector_flores", subtipoFlores: "borde_silvestre", superficieHa: 0.5 },
        { tipo: "sector_flores", subtipoFlores: "banda_implantada", superficieHa: 0.5 },
        { tipo: "sector_flores", subtipoFlores: "vegetacion_natural", superficieHa: 0.5 },
      ],
    });

    // 4 subtipos x 0,5 = 2,0 ha (20 %); quedan 3,0 ha sin asignar que NO suman a flores.
    expect(res.superficieFloresHa).toBe(2);
    expect(res.superficieCultivosHa).toBe(5);
    expect(res.superficieSinAsignarHa).toBe(3);
    expect(res.porcentajeFlores).toBe(20);
    expect(res.nivelRiesgo).toBe("adecuado");
    expect(res.areasAptas.esOpcional).toBe(true);
  });

  it("calcula perímetro 800 m y ancho de franja 6,3 m en croquis de 4 ha con 1,5 ha de flores? (CA-04-03)", () => {
    // Croquis 4 ha -> cuadrado de 200 m x 200 m (perímetro 800 m).
    // Si 20 % = 0,8 ha y tiene 0,3 ha de flores -> faltan 0,5 ha (5.000 m²).
    // 5.000 m² / 800 m = 6,25 m -> redondeo half-up = 6,3 m.
    const contorno = crearContornoCroquis(4);
    const sectorCultivo: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [100, 0],
          [100, 200],
          [0, 200],
          [0, 0],
        ],
      ],
    }; // 2 ha
    const sectorFlores: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [100, 0],
          [115, 0],
          [115, 200],
          [100, 200],
          [100, 0],
        ],
      ],
    }; // 0,3 ha

    const res = diagnosticar({
      metodo: "croquis",
      ecorregion: "valles_templados",
      superficieTotalHa: 4,
      contorno,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 2,
          geometria: sectorCultivo,
        },
        {
          tipo: "sector_flores",
          subtipoFlores: "banda_implantada",
          superficieHa: 0.3,
          geometria: sectorFlores,
        },
      ],
    });

    expect(res.perimetroM).toBe(800);
    expect(res.hectareasACompensar).toBe(0.5);
    expect(res.anchoFranjaM).toBe(6.3);
    expect(res.superficieLibre).not.toBeNull();
    // 4 ha - 2 ha - 0,3 ha = 1,7 ha libres
    expect(res.areasAptas.superficieLibreHa).toBeCloseTo(1.7, 2);
  });

  it("calcula perímetro geodésico y superficie libre en mapa dentro de 1 % de tolerancia (CA-04-04)", () => {
    // Rectángulo aproximado en Valles Templados, Jujuy.
    const contorno: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.25, -24.25],
          [-65.246, -24.25],
          [-65.246, -24.246],
          [-65.25, -24.246],
          [-65.25, -24.25],
        ],
      ],
    };
    const sectorCultivo: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.25, -24.25],
          [-65.248, -24.25],
          [-65.248, -24.246],
          [-65.25, -24.246],
          [-65.25, -24.25],
        ],
      ],
    };

    const areaTotalHa = calcularAreaGeograficaHa(contorno);
    const areaCultivoHa = calcularAreaGeograficaHa(sectorCultivo);

    const res = diagnosticar({
      metodo: "mapa",
      ecorregion: "valles_templados",
      superficieTotalHa: areaTotalHa,
      contorno,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: areaCultivoHa,
          geometria: sectorCultivo,
        },
      ],
    });

    expect(res.perimetroM).not.toBeNull();
    expect(res.perimetroM!).toBeGreaterThan(1500);
    expect(res.anchoFranjaM).not.toBeNull();
    expect(res.anchoFranjaM!).toBeGreaterThan(0);
    expect(res.superficieLibre).not.toBeNull();

    const esperadaLibre = areaTotalHa - areaCultivoHa;
    const errorRelativo = Math.abs(res.areasAptas.superficieLibreHa! - esperadaLibre) / esperadaLibre;
    expect(errorRelativo).toBeLessThan(0.01);
  });

  it("lista ubicaciones libres con bordes primero y texto alternativo si todas están ocupadas (CA-04-05)", () => {
    const resParcial = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 10,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 7,
          ubicacionRelativa: "arriba_izquierda",
        },
        {
          tipo: "sector_flores",
          subtipoFlores: "borde_silvestre",
          superficieHa: 1,
          ubicacionRelativa: "centro",
        },
      ],
    });

    expect(resParcial.perimetroM).toBeNull();
    expect(resParcial.superficieLibre).toBeNull();
    expect(resParcial.areasAptas.bordesLibres).not.toContain("arriba_izquierda");
    expect(resParcial.areasAptas.bordesLibres).not.toContain("centro");
    expect(resParcial.areasAptas.bordesLibres).toHaveLength(7);
    expect(resParcial.areasAptas.textos[0]).toContain("Bordes libres");
    expect(resParcial.areasAptas.textos.some((t) => t.includes("sin asignar"))).toBe(true);

    // Todas las 9 ubicaciones ocupadas -> texto alternativo
    const sectoresTodos = UBICACIONES_RELATIVAS.map((u, idx) =>
      idx === 0
        ? {
            tipo: "sector_flores" as const,
            subtipoFlores: "banda_implantada" as const,
            superficieHa: 1,
            ubicacionRelativa: u,
          }
        : {
            tipo: "cultivo" as const,
            cultivoClave: "tomate",
            cultivoNombre: "Tomate",
            tieneDatosPublicadosCatalogo: true,
            superficieHa: 1,
            ubicacionRelativa: u,
          },
    );

    const resLleno = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 9,
      sectores: sectoresTodos,
    });
    expect(resLleno.areasAptas.bordesLibres).toEqual([]);
    expect(resLleno.areasAptas.textos[0]).toContain("cabeceras de los lotes de cultivo");
  });

  it("dispara cada alerta solo cuando se cumple su condición exacta (CA-04-06)", () => {
    // Fronteras exactas que NO disparan monocultivo (80,0 %) ni sin asignar (1,0 %).
    const sinAlertas = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 10,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 8.0, // exactamente 80 % -> NO es > 80 %
        },
        {
          tipo: "sector_flores",
          subtipoFlores: "banda_implantada",
          superficieHa: 1.9, // quedan 0,1 ha sin asignar = exactamente 1 % -> NO es > 1 %
        },
      ],
    });
    expect(sinAlertas.alertas).toEqual([]);

    // Dispara las 4 alertas a la vez (incluyendo agrupación case-insensitive de "Otro").
    const conCuatro = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 10,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: null,
          cultivoOtro: "Quinoa",
          superficieHa: 5.0,
        },
        {
          tipo: "cultivo",
          cultivoClave: null,
          cultivoOtro: "  quinoa ",
          superficieHa: 3.5, // total 8,5 ha = 85 % (> 80 %)
        },
        {
          tipo: "cultivo",
          cultivoClave: "pimiento",
          cultivoNombre: "Pimiento",
          tieneDatosPublicadosCatalogo: false, // en borrador -> sin datos publicados
          superficieHa: 1.0,
        },
      ],
    });

    const tipos = conCuatro.alertas.map((a) => a.tipo);
    expect(tipos).toContain("monocultivo");
    expect(tipos).toContain("sin_flores");
    expect(tipos).toContain("superficie_sin_asignar");
    expect(conCuatro.alertas.filter((a) => a.tipo === "cultivo_sin_datos")).toHaveLength(2);

    // Verifica que todas las alertas generen texto claro en español.
    for (const alerta of conCuatro.alertas) {
      const texto = construirTextoAlerta(alerta);
      expect(texto.titulo.length).toBeGreaterThan(3);
      expect(texto.descripcion.length).toBeGreaterThan(10);
    }
  });

  it("guarda versionReglas y arma pasos legibles para 'Cómo se calculó' (CA-04-07, CA-04-12)", () => {
    const res = diagnosticar({
      metodo: "cuestionario",
      ecorregion: "valles_templados",
      superficieTotalHa: 10,
      sectores: [
        {
          tipo: "cultivo",
          cultivoClave: "tomate",
          cultivoNombre: "Tomate",
          tieneDatosPublicadosCatalogo: true,
          superficieHa: 9,
        },
        {
          tipo: "sector_flores",
          subtipoFlores: "banda_implantada",
          superficieHa: 1,
        },
      ],
    });

    expect(res.versionReglas).toBe("1");
    const pasos = construirExplicacionCalculo(res);
    expect(pasos.some((p) => p.includes("10,0 %"))).toBe(true);
    expect(pasos.some((p) => p.includes("10.000 m²"))).toBe(true);
    expect(pasos.some((p) => p.includes("v1"))).toBe(true);
  });
});
