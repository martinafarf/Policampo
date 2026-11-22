// Tests unitarios del dominio de calendario agroecológico (Esp. 06, T1 y T5).
// Cubre CA-06-01 a CA-06-05, CA-06-07 a CA-06-09, CA-06-15 y CA-06-16.
import { describe, expect, it } from "vitest";
import {
  agruparRangosSemanasContinuos,
  calcularEstadoTarea,
  generarArchivoIcs,
  generarCalendario,
  obtenerHoyJujuyIso,
  semanaAFechas,
  validarMarcarTareaHecha,
} from "@/dominio/calendario";
import {
  firmarTokenBajaResumen,
  verificarTokenBajaResumen,
} from "@/dominio/calendario/tokens";

describe("Calendario agroecológico — dominio puro (Esp. 06 T1)", () => {
  it("cumple el ejemplo de referencia exacto de Valles Templados 2026 (CA-06-01, CA-06-02)", () => {
    // Semana 52 llega al 31/12 (CA-06-02)
    expect(semanaAFechas(2026, 52).fin).toBe("2026-12-31");
    expect(semanaAFechas(2024, 52).fin).toBe("2024-12-31"); // bisiesto

    // Rangos que cruzan año se funden en 1 período continuo
    const continuos = agruparRangosSemanasContinuos([
      [40, 52],
      [1, 4],
    ]);
    expect(continuos).toEqual([{ inicioSemana: 40, finSemana: 4, cruzaAnio: true }]);

    // Ejemplo exacto §10: Tomate [40,52]+[1,4], Caléndula siembra [30,35], flor [38,52]+[1,10], max 10 sem, hoy 2026-07-01
    const res = generarCalendario({
      hoyIso: "2026-07-01",
      cultivos: [
        {
          nombre: "Tomate",
          floracionSemanas: [
            [40, 52],
            [1, 4],
          ],
          cosechaSemanas: [[49, 52], [1, 12]],
        },
      ],
      plantas: [
        {
          nombreComun: "Caléndula",
          dosisSiembra: "8 kg/ha",
          manejoCorte: "Despunte post-floración.",
          siembraSemanas: [[30, 35]],
          floracionSemanas: [
            [38, 52],
            [1, 10],
          ],
          corteSemanas: [],
          semanasHastaFloracionMax: 10,
        },
      ],
    });

    const florTomate = res.tareas.find((t) => t.tipo === "info_floracion_cultivo");
    expect(florTomate?.fechaInicio).toBe("2026-10-01");
    expect(florTomate?.fechaFin).toBe("2027-01-28"); // semana 4 de 2027

    const limite = res.tareas.find((t) => t.tipo === "limite_siembra");
    expect(limite?.fechaInicio).toBe("2026-07-16");
    expect(limite?.fechaFin).toBe("2026-07-16");

    const siembra = res.tareas.find((t) => t.tipo === "siembra");
    expect(siembra?.fechaInicio).toBe("2026-07-23");
    expect(siembra?.fechaFin).toBe("2026-09-02");

    // Aviso porque el límite (16/7) cae antes del inicio de siembra (23/7)
    expect(res.avisos.some((a) => a.codigo === "limite_antes_siembra")).toBe(true);

    // CA-06-04: sin semanas de corte -> corte en semana siguiente al fin de floración (semana 11) con estimada = true
    const corte = res.tareas.find((t) => t.tipo === "corte");
    expect(corte).toBeDefined();
    expect(corte?.estimada).toBe(true);
    expect(corte?.fechaInicio).toBe(semanaAFechas(2027, 11).inicio);

    // CA-06-03: genera también "no_pulverizar"
    expect(res.tareas.some((t) => t.tipo === "no_pulverizar")).toBe(true);
  });

  it("avisa si la fecha límite ya pasó o si ningún cultivo tiene floración (CA-06-05)", () => {
    // Hoy = 2026-08-01 -> límite 2026-07-16 ya pasó
    const pasado = generarCalendario({
      hoyIso: "2026-08-01",
      cultivos: [{ nombre: "Tomate", floracionSemanas: [[40, 52]], cosechaSemanas: [] }],
      plantas: [
        {
          nombreComun: "Caléndula",
          dosisSiembra: null,
          manejoCorte: null,
          siembraSemanas: [[30, 35]],
          floracionSemanas: [[38, 52]],
          corteSemanas: [[1, 2]],
          semanasHastaFloracionMax: 10,
        },
      ],
    });
    expect(pasado.avisos.some((a) => a.codigo === "limite_pasado")).toBe(true);

    // Sin floración en cultivos -> no genera limite_siembra y avisa
    const sinFlor = generarCalendario({
      hoyIso: "2026-07-01",
      cultivos: [{ nombre: "Lechuga", floracionSemanas: [], cosechaSemanas: [] }],
      plantas: [
        {
          nombreComun: "Vicia",
          dosisSiembra: null,
          manejoCorte: null,
          siembraSemanas: [[30, 35]],
          floracionSemanas: [[40, 50]],
          corteSemanas: [[51, 52]],
          semanasHastaFloracionMax: 10,
        },
      ],
    });
    expect(sinFlor.tareas.some((t) => t.tipo === "limite_siembra")).toBe(false);
    expect(sinFlor.avisos.some((a) => a.codigo === "sin_floracion_cultivos")).toBe(true);
  });

  it("calcula estados según hoy en Jujuy y valida marcar/desmarcar hecha (CA-06-07, CA-06-08, CA-06-09)", () => {
    // 2026-07-02T01:30:00Z en UTC es todavía 2026-07-01 22:30 en Jujuy (UTC-3).
    expect(obtenerHoyJujuyIso(new Date("2026-07-02T01:30:00Z"))).toBe("2026-07-01");

    expect(
      calcularEstadoTarea({ fechaInicio: "2026-07-10", fechaFin: "2026-07-20", hechaEn: null }, "2026-07-05"),
    ).toBe("proxima");
    expect(
      calcularEstadoTarea({ fechaInicio: "2026-07-10", fechaFin: "2026-07-20", hechaEn: null }, "2026-07-15"),
    ).toBe("en_curso");
    expect(
      calcularEstadoTarea({ fechaInicio: "2026-07-10", fechaFin: "2026-07-20", hechaEn: null }, "2026-07-25"),
    ).toBe("atrasada");
    expect(
      calcularEstadoTarea({ fechaInicio: "2026-07-10", fechaFin: "2026-07-20", hechaEn: "2026-07-12" }, "2026-07-25"),
    ).toBe("hecha");

    // CA-06-09: rechaza marcar tareas informativas
    expect(
      validarMarcarTareaHecha({
        tipo: "info_floracion_cultivo",
        fechaHechaIso: "2026-07-10",
        nota: null,
        temporadaInicioIso: "2026-07-01",
        hoyIso: "2026-07-10",
      }).valido,
    ).toBe(false);

    // CA-06-08: rechaza fecha futura y nota > 300 caracteres
    expect(
      validarMarcarTareaHecha({
        tipo: "siembra",
        fechaHechaIso: "2026-07-11",
        nota: "ok",
        temporadaInicioIso: "2026-07-01",
        hoyIso: "2026-07-10",
      }).valido,
    ).toBe(false);

    expect(
      validarMarcarTareaHecha({
        tipo: "siembra",
        fechaHechaIso: "2026-07-10",
        nota: "x".repeat(301),
        temporadaInicioIso: "2026-07-01",
        hoyIso: "2026-07-10",
      }).valido,
    ).toBe(false);
  });

  it("firma y verifica tokens de baja de resumen rechazando alteraciones (CA-06-15)", () => {
    const secreto = "secreto-prueba-muy-largo-123456";
    const token = firmarTokenBajaResumen("usr-123", secreto);
    expect(verificarTokenBajaResumen(token, secreto)).toEqual({
      valido: true,
      usuarioId: "usr-123",
    });

    // Token alterado -> rechazado
    expect(verificarTokenBajaResumen(`${token}x`, secreto)).toEqual({ valido: false });
    expect(verificarTokenBajaResumen(token, "otro-secreto-totalmente-distinto")).toEqual({
      valido: false,
    });
  });

  it("genera archivo .ics RFC 5545 con eventos día completo, UID estable, escape y plegado 75 octetos (CA-06-16)", () => {
    const ics = generarArchivoIcs([
      {
        id: "tarea-abc-1",
        tipo: "siembra",
        titulo: "Sembrar Caléndula, franja norte; urgente",
        descripcion: "Línea 1\nLínea 2 con texto muy largo para verificar el plegado correcto a 75 octetos según RFC 5545.",
        fechaInicio: "2026-07-23",
        fechaFin: "2026-09-02",
        fincaNombre: "Finca El Carmen",
      },
      {
        id: "tarea-info-2",
        tipo: "info_floracion_cultivo",
        titulo: "Floración de Tomate",
        descripcion: "Período informativo",
        fechaInicio: "2026-10-01",
        fechaFin: "2026-10-05",
      },
    ]);

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:policampo-tarea-tarea-abc-1@policampo.app");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260723");
    expect(ics).toContain("DTEND;VALUE=DATE:20260903"); // exclusivo +1 día
    expect(ics).toContain("Sembrar Caléndula\\, franja norte\\; urgente");
    expect(ics).toContain("Línea 1\\nLínea 2");
    expect(ics).toContain("SUMMARY:ℹ️ Floración de Tomate");

    // Todas las líneas físicas <= 75 octetos UTF-8
    const encoder = new TextEncoder();
    for (const linea of ics.split("\r\n")) {
      expect(encoder.encode(linea).byteLength).toBeLessThanOrEqual(75);
    }
  });
});
