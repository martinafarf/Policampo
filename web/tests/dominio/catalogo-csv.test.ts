// Tests unitarios de importación y exportación CSV del catálogo (Esp. 03, T5).
// Cubre CA-03-11 (ida y vuelta), CA-03-12 (errores por fila), CA-03-13 (límites) y CA-03-14 (fórmulas).
import { describe, expect, it } from "vitest";
import {
  LIMITES_CATALOGO,
  ejemploCsv,
  escaparCeldaCsv,
  exportarCompatibilidadesCsv,
  exportarPeriodosCsv,
  exportarPlantasCsv,
  parsearCsv,
  validarFilasCompatibilidadesCsv,
  validarFilasPeriodosCsv,
  validarFilasPlantasCsv,
} from "@/dominio/catalogo";

describe("Importación y exportación CSV del catálogo", () => {
  it("escapa celdas que empiezan con prefijos de fórmula Excel (CA-03-14)", () => {
    expect(escaparCeldaCsv("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(escaparCeldaCsv("+1+2")).toBe("'+1+2");
    expect(escaparCeldaCsv("-cmd|' /C calc'!A0")).toBe("'-cmd|' /C calc'!A0");
    expect(escaparCeldaCsv("@SUM(1,2)")).toBe(`"'@SUM(1,2)"`);
    expect(escaparCeldaCsv("@inicio")).toBe("'@inicio");
    expect(escaparCeldaCsv("\tdato")).toBe("'\tdato");
    expect(escaparCeldaCsv("\rdato")).toBe(`"'\rdato"`);
    expect(escaparCeldaCsv("Caléndula, flor")).toBe('"Caléndula, flor"');
  });

  it("hace ida y vuelta completa en plantas.csv sin perder ni alterar datos (CA-03-11)", () => {
    const csv = exportarPlantasCsv([
      {
        clave: "calendula",
        nombreComun: "Caléndula",
        nombreCientifico: "Calendula officinalis",
        funciones: ["atrae_polinizadores", "control_biologico"],
        ciclo: "anual",
        origen: "introducida",
        esEspontanea: false,
        enMercadoLocal: true,
        polinizadoresQueAtrae: "Abejas nativas, sírfidos",
        beneficios: "Atrae insectos benéficos y combate trips.",
        necesidadAgua: "baja",
        manejoCorte: "Corte al finalizar la floración",
        riesgoMaleza: "bajo",
        dosisSiembra: "10 kg/ha",
        costoReferenciaArsHa: "15000.00",
        costoReferenciaFecha: "2026-04-01",
        fuenteTipo: "entrevista",
        fuenteDetalle: "Entrevista al Especialista 1",
        validadoPor: "Equipo técnico",
      },
    ]);

    const parseado = parsearCsv(csv);
    expect(parseado.valido).toBe(true);

    const { validas, errores } = validarFilasPlantasCsv(parseado.filas);
    expect(errores).toEqual([]);
    expect(validas).toHaveLength(1);
    expect(validas[0].clave).toBe("calendula");
    expect(validas[0].funciones).toEqual(["atrae_polinizadores", "control_biologico"]);
    expect(validas[0].enMercadoLocal).toBe(true);
    expect(validas[0].costoReferenciaArsHa).toBe("15000.00");
  });

  it("hace ida y vuelta de periodos.csv incluyendo rangos que cruzan fin de año (CA-03-11)", () => {
    const csv = exportarPeriodosCsv([
      {
        plantaClave: "calendula",
        ecorregion: "valles_templados",
        siembraSemanas: [[27, 35]],
        floracionSemanas: [
          [40, 52],
          [1, 4],
        ],
        corteSemanas: [[5, 6]],
        semanasHastaFloracionMin: 8,
        semanasHastaFloracionMax: 10,
      },
    ]);

    const parseado = parsearCsv(csv);
    expect(parseado.valido).toBe(true);

    const { validas, errores } = validarFilasPeriodosCsv(parseado.filas, new Set(["calendula"]));
    expect(errores).toEqual([]);
    expect(validas).toHaveLength(1);
    expect(validas[0].floracionSemanas).toEqual([
      [40, 52],
      [1, 4],
    ]);
    expect(validas[0].semanasHastaFloracionMin).toBe(8);
    expect(validas[0].semanasHastaFloracionMax).toBe(10);
  });

  it("hace ida y vuelta de compatibilidades.csv con grados negativos escapados (CA-03-11, CA-03-14)", () => {
    const csv = exportarCompatibilidadesCsv([
      {
        cultivoClave: "tomate",
        plantaClave: "calendula",
        grado: -3,
        justificacion: "Ejemplo de incompatibilidad moderada.",
        fuenteTipo: "bibliografia",
        fuenteDetalle: "Manual agroecológico",
        validadoPor: "Especialista 1",
      },
    ]);

    // El grado negativo se escapa con apóstrofe al exportar (CA-03-14)...
    expect(csv).toContain("'-3");

    // ...y al reimportar vuelve intacto como -3 (CA-03-11).
    const parseado = parsearCsv(csv);
    expect(parseado.valido).toBe(true);
    const { validas, errores } = validarFilasCompatibilidadesCsv(
      parseado.filas,
      new Set(["tomate"]),
      new Set(["calendula"]),
    );
    expect(errores).toEqual([]);
    expect(validas).toHaveLength(1);
    expect(validas[0].grado).toBe(-3);
  });

  it("reporta errores exactos por número de fila cuando hay datos inválidos (CA-03-12)", () => {
    const csv = [
      "cultivo_clave,planta_clave,grado,justificacion,fuente_tipo,fuente_detalle,validado_por",
      "tomate,calendula,5,Buena asociación,entrevista,Especialista 1,Equipo",
      "tomate,inexistente,4,No existe la planta,entrevista,Especialista 1,Equipo",
      "tomate,calendula,9,Grado fuera de rango,entrevista,Especialista 1,Equipo",
    ].join("\n");

    const parseado = parsearCsv(csv);
    expect(parseado.valido).toBe(true);
    const { validas, errores } = validarFilasCompatibilidadesCsv(
      parseado.filas,
      new Set(["tomate"]),
      new Set(["calendula"]),
    );
    expect(validas).toHaveLength(1);
    expect(errores).toHaveLength(2);
    expect(errores[0].fila).toBe(3);
    expect(errores[1].fila).toBe(4);
  });

  it("rechaza archivos que superan 2 MB o 2.000 filas (CA-03-13)", () => {
    const demasiadoGrande = `clave,nombre_comun\n${"a".repeat(LIMITES_CATALOGO.csvMaxBytes + 10)}`;
    const resBytes = parsearCsv(demasiadoGrande);
    expect(resBytes.valido).toBe(false);
    expect(resBytes.error).toContain("2 MB");

    const muchasFilas = [
      "clave,nombre_comun",
      ...Array.from({ length: LIMITES_CATALOGO.csvMaxFilas + 1 }, (_, i) => `p_${i},Planta ${i}`),
    ].join("\n");
    const resFilas = parsearCsv(muchasFilas);
    expect(resFilas.valido).toBe(false);
    expect(resFilas.error).toContain("2000");
  });

  it("los 3 archivos de ejemplo son válidos al parsearse y validarse", () => {
    const ejPlantas = parsearCsv(ejemploCsv("plantas"));
    expect(ejPlantas.valido).toBe(true);
    expect(validarFilasPlantasCsv(ejPlantas.filas).errores).toEqual([]);

    const ejPeriodos = parsearCsv(ejemploCsv("periodos"));
    expect(ejPeriodos.valido).toBe(true);
    expect(validarFilasPeriodosCsv(ejPeriodos.filas, new Set(["calendula"])).errores).toEqual([]);

    const ejCompat = parsearCsv(ejemploCsv("compatibilidades"));
    expect(ejCompat.valido).toBe(true);
    expect(
      validarFilasCompatibilidadesCsv(ejCompat.filas, new Set(["tomate"]), new Set(["calendula"]))
        .errores,
    ).toEqual([]);
  });
});
