// Tests unitarios del dominio del catálogo de especies y compatibilidades (Esp. 03, T1).
// Cubren CA-03-02, CA-03-03, CA-03-05, CA-03-06, CA-03-07 y CA-03-15.
import { describe, expect, it } from "vitest";
import {
  QUINCENAS,
  calcularDiferenciasCatalogo,
  describirRangosEnMeses,
  formatearRangosCsv,
  mesesARangosSemanas,
  parsearRangosCsv,
  quincenasARangosSemanas,
  rangosSemanasAMeses,
  rangosSemanasAQuincenas,
  validarPublicacionCompatibilidad,
  validarPublicacionCultivo,
  validarPublicacionPlanta,
  validarRangosSemanas,
  validarYPrepararCambioCatalogo,
} from "@/dominio/catalogo";

describe("Semanas, quincenas y meses (CA-03-02, CA-03-03)", () => {
  it("acepta rangos válidos de 1 a 52 incluyendo cruce de fin de año y rechaza inválidos (CA-03-02)", () => {
    expect(validarRangosSemanas([[40, 52], [1, 4]]).valido).toBe(true);
    expect(validarRangosSemanas([[1, 52]]).valido).toBe(true);
    expect(validarRangosSemanas([]).valido).toBe(true);

    expect(validarRangosSemanas([[0, 10]]).valido).toBe(false);
    expect(validarRangosSemanas([[10, 53]]).valido).toBe(false);
    expect(validarRangosSemanas([[40, 4]]).valido).toBe(false); // inicio > fin en el mismo rango
    expect(validarRangosSemanas([[1.5, 4]]).valido).toBe(false);
  });

  it("convierte quincenas <-> semanas <-> meses de forma reversible (CA-03-03)", () => {
    expect(QUINCENAS).toHaveLength(24);

    // Ejemplo exacto de CA-03-03: 1ª quincena de enero = semanas 1 y 2
    expect(quincenasARangosSemanas([1])).toEqual([[1, 2]]);
    expect(rangosSemanasAQuincenas([[1, 2]])).toEqual([1]);

    // Todas las 24 quincenas cubren exactamente semanas 1..52 sin huecos
    const todas = Array.from({ length: 24 }, (_, i) => i + 1);
    expect(quincenasARangosSemanas(todas)).toEqual([[1, 52]]);
    expect(rangosSemanasAQuincenas([[1, 52]])).toEqual(todas);

    // Selección cruzando fin de año: oct..dic (19..24) + ene (1..2)
    const seleccion = [1, 2, 19, 20, 21, 22, 23, 24];
    const rangos = quincenasARangosSemanas(seleccion);
    expect(rangos).toEqual([
      [1, 4],
      [40, 52],
    ]);
    expect(rangosSemanasAQuincenas(rangos)).toEqual(seleccion);

    // Semanas <-> meses y descripción legible
    expect(rangosSemanasAMeses([[40, 52], [1, 4]])).toEqual([1, 10, 11, 12]);
    expect(describirRangosEnMeses([[40, 52], [1, 4]])).toBe("octubre a enero");
    expect(rangosSemanasAMeses(mesesARangosSemanas([3, 4, 5]))).toEqual([3, 4, 5]);
  });

  it("parsea y formatea rangos de semanas en formato CSV (40-52;1-4)", () => {
    const parseado = parsearRangosCsv("40-52;1-4");
    expect(parseado).toEqual({ valido: true, rangos: [[40, 52], [1, 4]] });
    if (parseado.valido) {
      expect(formatearRangosCsv(parseado.rangos)).toBe("40-52;1-4");
    }
    expect(parsearRangosCsv("50-10").valido).toBe(false);
    expect(parsearRangosCsv("octubre").valido).toBe(false);
  });
});

describe("Reglas de publicación (RN-12, RN-13, CA-03-05, CA-03-06)", () => {
  it("falla indicando qué falta si una planta no tiene campos obligatorios o floración (CA-03-05)", () => {
    const incompleta = validarPublicacionPlanta(
      {
        nombreComun: "Caléndula",
        nombreCientifico: "",
        funciones: ["atrae_polinizadores"],
        esEspontanea: false,
        enMercadoLocal: false,
        beneficios: "",
        manejoCorte: "",
        fuenteTipo: null,
        fuenteDetalle: "",
        validadoPor: "",
      },
      [],
    );

    expect(incompleta.puedePublicar).toBe(false);
    expect(incompleta.faltantes.length).toBeGreaterThanOrEqual(6);

    const completa = validarPublicacionPlanta(
      {
        nombreComun: "Caléndula",
        nombreCientifico: "Calendula officinalis",
        funciones: ["atrae_polinizadores", "control_biologico"],
        esEspontanea: false,
        enMercadoLocal: true,
        beneficios: "Atrae sírfidos y polinizadores.",
        manejoCorte: "Despunte post-floración.",
        fuenteTipo: "bibliografia",
        fuenteDetalle: "Garibaldi y otros",
        validadoPor: "Especialista 1",
      },
      [{ ecorregion: "valles_templados", floracionSemanas: [[36, 52]] }],
    );

    expect(completa).toEqual({ puedePublicar: true, faltantes: [] });
  });

  it("valida la publicación de cultivos con dependencia de polinización y floración", () => {
    expect(
      validarPublicacionCultivo(
        {
          dependenciaPolinizacion: "alta",
          fuenteTipo: "entrevista",
          fuenteDetalle: "Entrevista Especialista 1",
          validadoPor: "Analista de dominio (Integrante 2)",
        },
        [{ ecorregion: "valles_templados", floracionSemanas: [[40, 52], [1, 4]] }],
      ),
    ).toEqual({ puedePublicar: true, faltantes: [] });
  });

  it("no permite publicar compatibilidad si cultivo o planta no están publicados o faltan datos (CA-03-06)", () => {
    const borradorPadre = validarPublicacionCompatibilidad({
      grado: 5,
      justificacion: "Sinergia excelente para polinización y control biológico.",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
      estadoCultivo: "borrador",
      estadoPlanta: "publicado",
    });
    expect(borradorPadre.puedePublicar).toBe(false);
    expect(borradorPadre.faltantes).toContain("El cultivo debe estar publicado");

    const gradoInvalido = validarPublicacionCompatibilidad({
      grado: 6,
      justificacion: "Corto",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Fuente",
      validadoPor: "Especialista 1",
      estadoCultivo: "publicado",
      estadoPlanta: "publicado",
    });
    expect(gradoInvalido.puedePublicar).toBe(false);
    expect(gradoInvalido.faltantes).toHaveLength(2);

    const valida = validarPublicacionCompatibilidad({
      grado: 5,
      justificacion: "Sinergia excelente para polinización y control biológico.",
      fuenteTipo: "bibliografia",
      fuenteDetalle: "Manual agroecológico",
      validadoPor: "Especialista 1",
      estadoCultivo: "publicado",
      estadoPlanta: "publicado",
    });
    expect(valida).toEqual({ puedePublicar: true, faltantes: [] });
  });
});

describe("Historial de cambios del catálogo (CA-03-07, CA-03-15)", () => {
  it("detecta únicamente los campos modificados y exige motivo al retirar", () => {
    const diffs = calcularDiferenciasCatalogo(
      { estado: "borrador", grado: 4, justificacion: "Inicial" },
      { estado: "publicado", grado: 4, justificacion: "Validada por especialista" },
    );
    expect(diffs).toEqual([
      { campo: "estado", antes: "borrador", despues: "publicado" },
      { campo: "justificacion", antes: "Inicial", despues: "Validada por especialista" },
    ]);

    expect(() =>
      validarYPrepararCambioCatalogo({
        entidad: "planta_servicio",
        entidadId: "11111111-1111-4111-8111-111111111111",
        accion: "retiro",
        administradorId: "admin-1",
        antes: { estado: "publicado" },
        despues: { estado: "retirado" },
        motivo: "   ",
      }),
    ).toThrow(/motivo/i);
  });
});
