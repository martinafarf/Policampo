// Tests unitarios del dominio espacial y cuestionario de propuestas (Esp. 05, T1).
// Cubre CA-05-01 a CA-05-08.
import { describe, expect, it } from "vitest";
import {
  calcularAreaGeograficaHa,
  crearContornoCroquis,
  type PoligonoGeoJson,
} from "@/dominio/establecimientos";
import {
  calcularSuperficieAAgregarHa,
  generarAlternativasEspaciales,
  generarPropuestaCuestionario,
  generarUnaDisposicionEspacial,
  validarObjetivoPct,
  validarRepartoCuestionario,
  validarYRecalcularFranjasEditadasAMano,
  type EntradaEspacialPropuesta,
} from "@/dominio/propuesta";

describe("Diseño espacial de propuestas de rediseño (Esp. 05 T1)", () => {
  it("calcula superficie a agregar y no genera franjas si ya llega al objetivo (CA-05-01, CA-05-06)", () => {
    expect(calcularSuperficieAAgregarHa(10, 0.5, 20)).toBe(1.5);
    expect(calcularSuperficieAAgregarHa(10, 2.5, 20)).toBe(0);

    expect(validarObjetivoPct(9).valido).toBe(false);
    expect(validarObjetivoPct(41).valido).toBe(false);
    expect(validarObjetivoPct(15).valido).toBe(true);

    const contorno = crearContornoCroquis(4);
    const alts = generarAlternativasEspaciales({
      metodo: "croquis",
      superficieTotalHa: 4,
      superficieFloresActualHa: 1.0, // 25 % >= 20 %
      objetivoPct: 20,
      contorno,
      sectores: [],
    });
    expect(alts).toHaveLength(1);
    expect(alts[0].franjas).toEqual([]);
    expect(alts[0].avisos.some((a) => a.codigo === "ya_alcanza_objetivo")).toBe(true);
  });

  it("resuelve el ejemplo perimetral de 4 ha (lado 200 m) con ancho ≈ 10,6 m y tolerancia < 1 % (CA-05-05)", () => {
    const contorno = crearContornoCroquis(4); // 200 m x 200 m
    const entrada: EntradaEspacialPropuesta = {
      metodo: "croquis",
      superficieTotalHa: 4,
      superficieFloresActualHa: 0,
      objetivoPct: 20,
      contorno,
      sectores: [
        {
          id: "s1",
          nombre: "Lote tomate",
          tipo: "cultivo",
          cultivoNombre: "Tomate",
          superficieHa: 4,
          geometria: contorno,
        },
      ],
    };

    const perim = generarUnaDisposicionEspacial(entrada, "perimetral");
    expect(perim).not.toBeNull();
    // 200^2 - (200 - 2w)^2 = 8000 => w = (200 - sqrt(32000)) / 2 ≈ 10.557 -> 10.6 m
    expect(perim!.anchoResultanteM).toBe(10.6);
    expect(perim!.llegaAlObjetivo).toBe(true);
    expect(Math.abs(perim!.superficieNuevaFloresHa - 0.8) / 0.8).toBeLessThan(0.01);
    // Todo el terreno era tomate, así que la pérdida de cultivo es ~0,8 ha (20 % del lote).
    expect(perim!.perdidaPorCultivo).toHaveLength(1);
    expect(perim!.perdidaPorCultivo[0].ha).toBeCloseTo(0.8, 2);
    expect(perim!.perdidaPorCultivo[0].pct).toBeCloseTo(20, 0);
  });

  it("genera las 5 disposiciones en croquis y prioriza 'Usar la superficie libre' con pérdida 0 (CA-05-02, CA-05-03, CA-05-04)", () => {
    const contorno = crearContornoCroquis(4); // 200x200 = 4 ha
    // Cultivo ocupa 2,5 ha en el centro-izquierda, dejando 1,5 ha libres (> 0,8 ha necesarias).
    const cultivo: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [125, 0],
          [125, 200],
          [0, 200],
          [0, 0],
        ],
      ],
    };

    const alts = generarAlternativasEspaciales({
      metodo: "croquis",
      superficieTotalHa: 4,
      superficieFloresActualHa: 0,
      objetivoPct: 20,
      contorno,
      sectores: [
        {
          id: "c1",
          nombre: "Lote 1",
          tipo: "cultivo",
          cultivoNombre: "Tomate",
          superficieHa: 2.5,
          geometria: cultivo,
        },
      ],
    });

    const tipos = alts.map((a) => a.disposicion);
    expect(tipos).toContain("superficie_libre");
    expect(tipos).toContain("perimetral");
    expect(tipos).toContain("transversal");
    expect(tipos).toContain("islas");
    expect(tipos).toContain("matriz");

    // CA-05-03: "Usar la superficie libre" queda primera con pérdida de cultivo 0.
    expect(alts[0].disposicion).toBe("superficie_libre");
    expect(alts[0].perdidaTotalCultivoHa).toBe(0);
    expect(alts[0].llegaAlObjetivo).toBe(true);

    // Orden monotónico por pérdida total de cultivo.
    for (let i = 1; i < alts.length; i += 1) {
      expect(alts[i].perdidaTotalCultivoHa).toBeGreaterThanOrEqual(alts[i - 1].perdidaTotalCultivoHa);
    }
  });

  it("funciona también en coordenadas geográficas de mapa en Jujuy (CA-05-02, CA-05-06)", () => {
    const contorno: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [-65.25, -24.25],
          [-65.247, -24.25],
          [-65.247, -24.247],
          [-65.25, -24.247],
          [-65.25, -24.25],
        ],
      ],
    };
    const totalHa = calcularAreaGeograficaHa(contorno);

    const alts = generarAlternativasEspaciales({
      metodo: "mapa",
      superficieTotalHa: totalHa,
      superficieFloresActualHa: 0,
      objetivoPct: 15, // debajo de 20 % -> debe mostrar aviso objetivo_bajo_20
      contorno,
      sectores: [
        {
          id: "c1",
          nombre: "Tomate",
          tipo: "cultivo",
          cultivoNombre: "Tomate",
          superficieHa: totalHa,
          geometria: contorno,
        },
      ],
    });

    expect(alts.length).toBeGreaterThanOrEqual(4);
    for (const alt of alts) {
      expect(alt.avisos.some((a) => a.codigo === "objetivo_bajo_20")).toBe(true);
      expect(alt.franjas.length).toBeGreaterThan(0);
      expect(alt.llegaAlObjetivo).toBe(true);
    }
  });

  it("genera propuesta en texto de cuestionario y valida el reparto editado (CA-05-07)", () => {
    const prop = generarPropuestaCuestionario({
      superficieTotalHa: 10,
      superficieFloresActualHa: 0,
      objetivoPct: 20,
      sectores: [
        {
          nombre: "Lote centro",
          tipo: "cultivo",
          cultivoNombre: "Tomate",
          superficieHa: 8,
          ubicacionRelativa: "centro",
        },
        {
          nombre: "Lote norte",
          tipo: "cultivo",
          cultivoNombre: "Pimiento",
          superficieHa: 2,
          ubicacionRelativa: "arriba_centro",
        },
      ],
    });

    // Quedan 7 bordes libres (>= 3) -> perimetral, reparto en partes iguales sumando 2,0 ha.
    expect(prop.disposicionSugerida).toBe("perimetral");
    expect(prop.superficieAAgregarHa).toBe(2);
    expect(prop.reparto).toHaveLength(7);
    expect(validarRepartoCuestionario(prop.reparto, 2).valido).toBe(true);

    // Reparto editado que no suma 2,0 ha -> rechazado.
    expect(
      validarRepartoCuestionario(
        [{ ubicacion: "arriba_izquierda", etiqueta: "arriba a la izquierda", ha: 1.5 }],
        2,
      ).valido,
    ).toBe(false);
  });

  it("rechaza franjas editadas a mano fuera del contorno, superpuestas o de menos de 3 m de ancho (CA-05-08)", () => {
    const contorno = crearContornoCroquis(4); // 200x200
    const entrada: EntradaEspacialPropuesta = {
      metodo: "croquis",
      superficieTotalHa: 4,
      superficieFloresActualHa: 0,
      objetivoPct: 20,
      contorno,
      sectores: [],
    };

    // 1. Franja de 2 m de ancho (< 3 m) -> rechazada
    const angosta: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [200, 0],
          [200, 2],
          [0, 2],
          [0, 0],
        ],
      ],
    };
    const resAngosta = validarYRecalcularFranjasEditadasAMano({
      entrada,
      disposicion: "perimetral",
      parametros: {},
      franjasCrudas: [{ geometria: angosta }],
    });
    expect(resAngosta.valido).toBe(false);

    // 2. Franja fuera del contorno -> rechazada
    const afuera: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [190, 0],
          [220, 0],
          [220, 100],
          [190, 100],
          [190, 0],
        ],
      ],
    };
    const resAfuera = validarYRecalcularFranjasEditadasAMano({
      entrada,
      disposicion: "perimetral",
      parametros: {},
      franjasCrudas: [{ geometria: afuera }],
    });
    expect(resAfuera.valido).toBe(false);

    // 3. Dos franjas superpuestas -> rechazadas
    const f1: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [20, 0],
          [20, 100],
          [0, 100],
          [0, 0],
        ],
      ],
    };
    const f2: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [
        [
          [10, 0],
          [30, 0],
          [30, 100],
          [10, 100],
          [10, 0],
        ],
      ],
    };
    const resSuperp = validarYRecalcularFranjasEditadasAMano({
      entrada,
      disposicion: "transversal",
      parametros: {},
      franjasCrudas: [{ geometria: f1 }, { geometria: f2 }],
    });
    expect(resSuperp.valido).toBe(false);

    // 4. Franja válida de 10 m x 200 m -> aceptada y superficie recalculada = 0,2 ha
    const valida: PoligonoGeoJson = {
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
    };
    const resOk = validarYRecalcularFranjasEditadasAMano({
      entrada,
      disposicion: "transversal",
      parametros: {},
      franjasCrudas: [{ geometria: valida }],
    });
    expect(resOk.valido).toBe(true);
    if (resOk.valido) {
      expect(resOk.alternativa.superficieFranjasHa).toBe(0.2);
    }
  });
});
