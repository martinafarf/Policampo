// Tests unitarios del módulo de informe técnico y generación PDF (Esp. 07, T5).
// Cubre CA-07-02, CA-07-05, CA-07-06, CA-07-07, CA-07-08.
import { describe, expect, it } from "vitest";
import { crearContornoCroquis } from "@/dominio/establecimientos";
import {
  ALFABETO_CODIGO_INFORME,
  esCodigoInformeValido,
  generarCodigoInforme,
} from "@/dominio/informe/codigo";
import { VERSION_PLANTILLA_INFORME, type FotoInforme } from "@/dominio/informe/tipos";
import { renderizarInformePdfBuffer } from "@/informe-pdf/DocumentoInformePdf";

function crearFotoEjemplo(overrides?: Partial<FotoInforme>): FotoInforme {
  const contorno = crearContornoCroquis(4);
  return {
    codigo: "INF-2026-K7M3P9",
    emitidoEnIso: "2026-08-15T14:30:00.000Z",
    versionPlantilla: VERSION_PLANTILLA_INFORME,
    preparadoPara: "Solange Ñandú",
    desactualizado: {
      hayAviso: false,
      fechaReferenciaIso: "2026-08-15T14:00:00.000Z",
      motivos: [],
    },
    finca: {
      nombre: "Finca San José — Ñandú",
      localidad: "San Salvador de Jujuy",
      departamento: "Dr. Manuel Belgrano",
      ecorregion: "valles",
      ecorregionNombre: "Valles",
      metodo: "croquis",
      superficieTotalHa: 4,
      contorno,
      sectores: [
        {
          nombre: "Lote Tomate",
          tipo: "cultivo",
          detalleTipo: "Tomate",
          subtipoFlores: null,
          superficieHa: 3.6,
          porcentajeTotal: 90,
          ubicacionRelativa: null,
          geometria: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [180, 0],
                [180, 200],
                [0, 200],
                [0, 0],
              ],
            ],
          },
        },
        {
          nombre: "Borde nativo",
          tipo: "sector_flores",
          detalleTipo: "Borde floral",
          subtipoFlores: "borde_silvestre",
          superficieHa: 0.4,
          porcentajeTotal: 10,
          ubicacionRelativa: null,
          geometria: {
            type: "Polygon",
            coordinates: [
              [
                [180, 0],
                [200, 0],
                [200, 200],
                [180, 200],
                [180, 0],
              ],
            ],
          },
        },
      ],
    },
    diagnostico: {
      creadoEnIso: "2026-08-15T14:00:00.000Z",
      versionReglas: "1",
      nivelRiesgo: "moderado",
      porcentajeFlores: 10,
      deficitPp: 10,
      superficieTotalHa: 4,
      superficieCultivosHa: 3.6,
      superficieFloresHa: 0.4,
      superficieSinAsignarHa: 0,
      hectareasACompensar: 0.4,
      perimetroM: 800,
      anchoFranjaM: 5,
      areasAptas: {
        esOpcional: false,
        bordesLibres: ["arriba_centro", "abajo_centro"],
        ubicacionesLibres: [],
        textos: ["Sumar franjas florales en el perímetro y entre surcos."],
        superficieLibreHa: 0,
      },
      alertas: [
        {
          tipo: "monocultivo",
          datos: {
            cultivoNombre: "Tomate",
            porcentaje: 90,
          },
        },
      ],
      pasosCalculo: [
        "Superficie total: 4 ha; flores actuales: 0,4 ha (10 %).",
        "Déficit frente al 20 %: 10 puntos porcentuales (0,4 ha).",
      ],
    },
    propuesta: {
      nombre: "Franja perimetral",
      creadoEnIso: "2026-08-15T14:10:00.000Z",
      versionReglas: "1",
      disposicion: "perimetral",
      parametros: { anchoResultanteM: 5.2 },
      objetivoPct: 20,
      porcentajeLogrado: 20.1,
      superficieFranjasHa: 0.404,
      superficieLibreUsadaHa: 0,
      editadaAMano: false,
      franjas: [
        {
          id: "franja-1",
          etiqueta: "Franja perimetral",
          subtipo: "borde",
          geometria: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [200, 0],
                [200, 10],
                [0, 10],
                [0, 0],
              ],
            ],
          },
        },
      ],
      reparto: null,
      perdidaPorCultivo: [
        { sector: "Lote Tomate", cultivo: "Tomate", ha: 0.404, pct: 11.2 },
      ],
      perdidaTotalCultivoHa: 0.404,
      floracion: {
        prioridad: "polinizadores",
        semanasMezcla: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
        porCultivo: [
          {
            cultivoId: "cult-tomate",
            cultivoNombre: "Tomate",
            obligatorio: true,
            semanasCultivo: [14, 15, 16, 17, 18, 19, 20],
            semanasAnticipacionRequeridas: [13],
            cumpleAnticipacion: true,
            coberturaPct: 100,
            semanasDescubiertas: [],
            cumple: true,
          },
        ],
        cultivosObligatoriosCumplidos: 1,
        cultivosObligatoriosTotal: 1,
        coberturaPromedioPct: 100,
        cumpleTodoObligatorio: true,
      },
      avisos: [],
      especies: [
        {
          plantaId: "pl-1",
          clave: "calendula",
          nombreComun: "Caléndula",
          nombreCientifico: "Calendula officinalis",
          proporcionPct: 100,
          orden: 1,
          puntajeCompatibilidad: 3,
          funciones: ["atrae_polinizadores", "control_biologico"],
          ciclo: "anual",
          origen: "introducida",
          esEspontanea: false,
          enMercadoLocal: true,
          necesidadAgua: "baja",
          riesgoMaleza: "bajo",
          manejoCorte: "Cortar antes de fructificación si invade surcos.",
          dosisSiembra: "8 a 10 kg/ha",
          fuenteTipo: "bibliografia",
          fuenteDetalle: "Manual agroecológico",
          validadoPor: "Especialista 1",
          siembraSemanas: [[4, 8]],
          floracionSemanas: [[12, 22]],
          corteSemanas: [[24, 26]],
          compatibilidades: [
            {
              cultivoId: "cult-tomate",
              cultivoNombre: "Tomate",
              grado: 3,
              justificacion: "Atrae polinizadores y sírfidos.",
            },
          ],
        },
      ],
    },
    calendario: {
      temporadaInicio: "2026-07-01",
      temporadaFin: "2027-06-30",
      avisos: [],
      proximaTarea: { titulo: "Sembrar Caléndula", fechaInicio: "2026-08-20" },
      tareas: [
        {
          tipo: "siembra",
          titulo: "Sembrar Caléndula",
          descripcion: "Preparar cama de siembra en bordes.",
          plantaNombre: "Caléndula",
          fechaInicio: "2026-08-20",
          fechaFin: "2026-09-10",
          estimada: false,
          estadoAlEmitir: "proxima",
          hechaEn: null,
        },
        {
          tipo: "no_pulverizar",
          titulo: "No pulverizar durante floración de Caléndula",
          descripcion: "Proteger insectos polinizadores activos.",
          plantaNombre: "Caléndula",
          fechaInicio: "2026-10-01",
          fechaFin: "2026-12-15",
          estimada: false,
          estadoAlEmitir: "proxima",
          hechaEn: null,
        },
      ],
    },
    fuentes: [
      "Garibaldi y otros, Paisajes agrícolas multifuncionales; entrevistas a especialistas.",
      "Manual agroecológico (Especialista 1)",
    ],
    ...overrides,
  };
}

describe("Dominio de informe técnico — códigos (CA-07-02)", () => {
  it("genera códigos INF-YYYY-XXXXXX sin caracteres confusos (0, O, 1, I, L)", () => {
    const generados = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const codigo = generarCodigoInforme(2026);
      expect(codigo).toMatch(/^INF-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
      expect(esCodigoInformeValido(codigo)).toBe(true);
      const sufijo = codigo.slice("INF-2026-".length);
      expect(sufijo).not.toMatch(/[0O1IL]/);
      for (const ch of sufijo) {
        expect(ALFABETO_CODIGO_INFORME).toContain(ch);
      }
      generados.add(codigo);
    }
    expect(generados.size).toBeGreaterThan(50);
    expect(esCodigoInformeValido("INF-2026-0O1IL2")).toBe(false);
    expect(esCodigoInformeValido("OTRO-2026-ABCDEF")).toBe(false);
  });
});

describe("Generación de PDF A4 (CA-07-05, CA-07-06, CA-07-07, CA-07-08)", () => {
  it("genera un PDF válido (%PDF-) para finca con croquis, acentos/ñ y calendario", async () => {
    const foto = crearFotoEjemplo();
    const buffer = await renderizarInformePdfBuffer(foto);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.byteLength).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("genera un PDF válido para finca con mapa satelital (incluye flecha Norte y escala)", async () => {
    const foto = crearFotoEjemplo();
    foto.finca.metodo = "mapa";
    const buffer = await renderizarInformePdfBuffer(foto);
    expect(buffer.byteLength).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("genera un PDF válido para finca por cuestionario (esquema 3×3) y sin calendario", async () => {
    const foto = crearFotoEjemplo({
      preparadoPara: null,
      desactualizado: {
        hayAviso: true,
        fechaReferenciaIso: "2026-08-10T10:00:00.000Z",
        motivos: ["La finca se editó después del diagnóstico."],
      },
      calendario: null,
    });
    foto.finca.metodo = "cuestionario";
    foto.finca.contorno = null;
    foto.finca.sectores = [
      {
        nombre: "Sector central",
        tipo: "cultivo",
        detalleTipo: "Pimiento",
        subtipoFlores: null,
        superficieHa: 3.6,
        porcentajeTotal: 90,
        ubicacionRelativa: "centro",
        geometria: null,
      },
    ];
    foto.propuesta.disposicion = "texto";
    foto.propuesta.franjas = null;
    foto.propuesta.reparto = [
      { ubicacion: "arriba_centro", etiqueta: "Arriba al centro", ha: 0.2 },
      { ubicacion: "abajo_centro", etiqueta: "Abajo al centro", ha: 0.2 },
    ];

    const buffer = await renderizarInformePdfBuffer(foto);
    expect(buffer.byteLength).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
