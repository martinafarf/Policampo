// Tests unitarios de validación y formateo de establecimientos (especificación 02, tarea T2).
// Cubren CA-02-01, CA-02-03, CA-02-20, RS-06 y RS-08.
import { describe, expect, it } from "vitest";
import {
  claveBorradorLocal,
  coincideNombreParaBorrar,
  esUuidValido,
  formatearSuperficieCompleta,
  parsearNumeroDecimal,
  validarDatosEstablecimiento,
} from "@/dominio/establecimientos";

const BASE_VALIDA = {
  nombre: "Finca Los Lapachos",
  direccion: "Ruta Provincial 47 km 4,5",
  departamento: "El Carmen",
  localidad: "Perico",
  localidadEsOtra: false,
  ecorregion: "valles_templados",
  metodoCaracterizacion: "cuestionario",
  superficieTotalTexto: "4,5",
};

describe("Validación de datos generales del establecimiento (CA-02-01, CA-02-03, RS-06)", () => {
  it("acepta datos válidos en cuestionario y croquis, incluyendo coma decimal", () => {
    const resCuestionario = validarDatosEstablecimiento(BASE_VALIDA);
    expect(resCuestionario.valido).toBe(true);
    if (resCuestionario.valido) {
      expect(resCuestionario.datos.superficieTotalHa).toBe(4.5);
    }

    const resCroquis = validarDatosEstablecimiento({
      ...BASE_VALIDA,
      metodoCaracterizacion: "croquis",
      superficieTotalTexto: "12.34567",
    });
    expect(resCroquis.valido).toBe(true);
    if (resCroquis.valido) {
      expect(resCroquis.datos.superficieTotalHa).toBe(12.3457);
    }
  });

  it("en método mapa deja la superficie total nula aunque llegue un texto (CA-02-01)", () => {
    const resMapa = validarDatosEstablecimiento({
      ...BASE_VALIDA,
      metodoCaracterizacion: "mapa",
      superficieTotalTexto: "999",
    });
    expect(resMapa.valido).toBe(true);
    if (resMapa.valido) {
      expect(resMapa.datos.superficieTotalHa).toBeNull();
    }
  });

  it("acepta 'Otra' localidad con texto libre de 2 a 120 caracteres y rechaza localidades de otro departamento (CA-02-03)", () => {
    const resOtra = validarDatosEstablecimiento({
      ...BASE_VALIDA,
      localidad: "Paraje El Ceibal",
      localidadEsOtra: true,
    });
    expect(resOtra.valido).toBe(true);

    const resCruzada = validarDatosEstablecimiento({
      ...BASE_VALIDA,
      departamento: "El Carmen",
      localidad: "Tilcara", // pertenece a Tilcara, no a El Carmen
      localidadEsOtra: false,
    });
    expect(resCruzada.valido).toBe(false);
    if (!resCruzada.valido) {
      expect(resCruzada.errores.localidad).toBeTruthy();
    }
  });

  it("rechaza campos fuera de rango o inválidos", () => {
    const res = validarDatosEstablecimiento({
      nombre: "A",
      direccion: "X",
      departamento: "Salta",
      localidad: "",
      localidadEsOtra: true,
      ecorregion: "patagonia",
      metodoCaracterizacion: "otro",
      superficieTotalTexto: "0",
    });

    expect(res.valido).toBe(false);
    if (!res.valido) {
      expect(res.errores.nombre).toBeTruthy();
      expect(res.errores.direccion).toBeTruthy();
      expect(res.errores.departamento).toBeTruthy();
      expect(res.errores.localidad).toBeTruthy();
      expect(res.errores.ecorregion).toBeTruthy();
      expect(res.errores.metodoCaracterizacion).toBeTruthy();
    }

    const resSupInvalida = validarDatosEstablecimiento({
      ...BASE_VALIDA,
      superficieTotalTexto: "0.001", // menor al mínimo de 0,01 ha
    });
    expect(resSupInvalida.valido).toBe(false);
    if (!resSupInvalida.valido) {
      expect(resSupInvalida.errores.superficieTotalHa).toBeTruthy();
    }
  });
});

describe("Confirmación de borrado, UUID, borrador local y formateo (CA-02-20, RS-08)", () => {
  it("exige escribir el nombre exacto del establecimiento para borrar (CA-02-20)", () => {
    expect(coincideNombreParaBorrar("Finca Los Lapachos", "Finca Los Lapachos")).toBe(true);
    expect(coincideNombreParaBorrar("Finca Los Lapachos", "  Finca Los Lapachos  ")).toBe(true);
    expect(coincideNombreParaBorrar("Finca Los Lapachos", "finca los lapachos")).toBe(false);
    expect(coincideNombreParaBorrar("Finca Los Lapachos", "Otra finca")).toBe(false);
  });

  it("valida UUIDs y genera la clave de borrador por establecimiento (RS-08)", () => {
    expect(esUuidValido("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(esUuidValido("no-es-uuid")).toBe(false);
    expect(claveBorradorLocal("abc-123")).toBe("policampo_borrador_abc-123");
  });

  it("parsea decimales y formatea hectáreas y m²", () => {
    expect(parsearNumeroDecimal("2,5")).toBe(2.5);
    expect(parsearNumeroDecimal("abc")).toBeNull();
    expect(formatearSuperficieCompleta(4)).toContain("4 ha");
    expect(formatearSuperficieCompleta(4)).toContain("m²");
  });
});
