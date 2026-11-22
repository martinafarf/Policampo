// Tests unitarios del dominio de mezcla de plantas de servicio (Esp. 05, T2).
// Cubre CA-05-10, CA-05-11, CA-05-12, CA-05-13 y CA-05-14.
import { describe, expect, it } from "vitest";
import {
  elegirMezclaOptima,
  evaluarFloracionMezcla,
  filtrarCandidatasMezcla,
  validarYEvaluarMezclaPersonalizada,
  type CultivoParaMezcla,
  type PlantaCandidataEntrada,
} from "@/dominio/propuesta";

function crearPlanta(overrides: Partial<PlantaCandidataEntrada> & { plantaId: string; clave: string; nombreComun: string }): PlantaCandidataEntrada {
  return {
    nombreCientifico: "Species sp.",
    funciones: ["atrae_polinizadores"],
    ciclo: "anual",
    origen: "introducida",
    esEspontanea: false,
    enMercadoLocal: true,
    necesidadAgua: "baja",
    riesgoMaleza: "bajo",
    manejoCorte: "Corte al finalizar floración.",
    dosisSiembra: "10 kg/ha",
    fuenteTipo: "entrevista",
    fuenteDetalle: "Entrevista Especialista 1",
    validadoPor: "Equipo",
    siembraSemanas: [[28, 35]],
    floracionSemanas: [[38, 52], [1, 2]],
    corteSemanas: [[3, 5]],
    semanasHastaFloracionMin: 8,
    semanasHastaFloracionMax: 10,
    compatibilidades: [
      {
        cultivoId: "cult-tomate",
        cultivoNombre: "Tomate",
        grado: 5,
        justificacion: "Sinergia demostrada con polinizadores del tomate.",
      },
    ],
    ...overrides,
  };
}

const TOMATE: CultivoParaMezcla = {
  id: "cult-tomate",
  clave: "tomate",
  nombre: "Tomate",
  superficieHa: 8,
  dependenciaPolinizacion: "alta",
  floracionSemanas: [
    [40, 52],
    [1, 4],
  ],
  tieneDatosPublicados: true,
};

describe("Mezcla de plantas de servicio (Esp. 05 T2)", () => {
  it("descarta plantas con grado negativo y aplica filtro de control biológico cuando no hay dependencia alta/media (CA-05-10)", () => {
    const pimiento: CultivoParaMezcla = {
      id: "cult-pimiento",
      clave: "pimiento",
      nombre: "Pimiento",
      superficieHa: 2,
      dependenciaPolinizacion: "media",
      floracionSemanas: [[42, 52]],
      tieneDatosPublicados: true,
    };

    const buena = crearPlanta({ plantaId: "p1", clave: "calendula", nombreComun: "Caléndula" });
    const antagonica = crearPlanta({
      plantaId: "p2",
      clave: "mala",
      nombreComun: "Antagónica",
      compatibilidades: [
        { cultivoId: "cult-tomate", cultivoNombre: "Tomate", grado: 5, justificacion: "Buena con tomate" },
        { cultivoId: "cult-pimiento", cultivoNombre: "Pimiento", grado: -2, justificacion: "Antagonismo con pimiento" },
      ],
    });

    const resPol = filtrarCandidatasMezcla({
      cultivos: [TOMATE, pimiento],
      plantasPublicadasEnEcorregion: [buena, antagonica],
    });
    expect(resPol.prioridad).toBe("polinizadores");
    expect(resPol.candidatas.map((c) => c.clave)).toEqual(["calendula"]);

    // Con todos los cultivos de dependencia baja -> prioridad control_biologico:
    // excluye plantas que solo tienen atrae_polinizadores.
    const lechuga: CultivoParaMezcla = {
      id: "cult-lechuga",
      clave: "lechuga",
      nombre: "Lechuga",
      superficieHa: 5,
      dependenciaPolinizacion: "ninguna",
      floracionSemanas: [],
      tieneDatosPublicados: true,
    };
    const soloPol = crearPlanta({
      plantaId: "p3",
      clave: "borraja",
      nombreComun: "Borraja",
      funciones: ["atrae_polinizadores"],
      compatibilidades: [{ cultivoId: "cult-lechuga", cultivoNombre: "Lechuga", grado: 4, justificacion: "Néctar" }],
    });
    const controlBio = crearPlanta({
      plantaId: "p4",
      clave: "vicia",
      nombreComun: "Vicia",
      funciones: ["control_biologico", "cobertura_suelo"],
      compatibilidades: [{ cultivoId: "cult-lechuga", cultivoNombre: "Lechuga", grado: 4, justificacion: "Predadores" }],
    });

    const resCtrl = filtrarCandidatasMezcla({
      cultivos: [lechuga],
      plantasPublicadasEnEcorregion: [soloPol, controlBio],
    });
    expect(resCtrl.prioridad).toBe("control_biologico");
    expect(resCtrl.candidatas.map((c) => c.clave)).toEqual(["vicia"]);
  });

  it("evalúa anticipación (semana 39) y cobertura 15/17 = 88,2 % en el ejemplo del tomate (CA-05-11)", () => {
    const cumple = evaluarFloracionMezcla({
      cultivos: [TOMATE],
      especies: [{ floracionSemanas: [[38, 52], [1, 2]] }],
      prioridad: "polinizadores",
    });

    expect(cumple.porCultivo).toHaveLength(1);
    expect(cumple.porCultivo[0].semanasAnticipacionRequeridas).toEqual([39]);
    expect(cumple.porCultivo[0].cumpleAnticipacion).toBe(true);
    expect(cumple.porCultivo[0].coberturaPct).toBe(88.2); // 15/17 = 88.2 % > 80 %
    expect(cumple.porCultivo[0].semanasDescubiertas).toEqual([3, 4]);
    expect(cumple.porCultivo[0].cumple).toBe(true);

    // Mezcla que florece recién desde semana 41 -> NO cumple anticipación (falta semana 39)
    const noCumple = evaluarFloracionMezcla({
      cultivos: [TOMATE],
      especies: [{ floracionSemanas: [[41, 52], [1, 4]] }],
      prioridad: "polinizadores",
    });
    expect(noCumple.porCultivo[0].cumpleAnticipacion).toBe(false);
    expect(noCumple.porCultivo[0].cumple).toBe(false);
  });

  it("prefiere menos especies cuando empatan en cumplimiento y cobertura (CA-05-12)", () => {
    const p1 = crearPlanta({
      plantaId: "p1",
      clave: "calendula",
      nombreComun: "Caléndula",
      floracionSemanas: [[38, 52]],
    });
    const p2 = crearPlanta({
      plantaId: "p2",
      clave: "albahaca",
      nombreComun: "Albahaca",
      floracionSemanas: [[45, 52], [1, 4]],
    });
    const p3 = crearPlanta({
      plantaId: "p3",
      clave: "borraja",
      nombreComun: "Borraja",
      floracionSemanas: [[40, 52]],
    });

    // {p1, p2} ya cubre 100 % y anticipa semana 39 con 2 especies; {p1, p2, p3} también cubre 100 % pero con 3 especies.
    const res = elegirMezclaOptima({
      ecorregion: "valles_templados",
      cultivos: [TOMATE],
      plantasPublicadasEnEcorregion: [p1, p2, p3],
    });

    expect(res.especies).toHaveLength(2);
    expect(res.especies.map((e) => e.clave).sort()).toEqual(["albahaca", "calendula"]);
    expect(res.especies[0].proporcionPct).toBe(50);
    expect(res.floracion.cumpleTodoObligatorio).toBe(true);
  });

  it("informa claramente cuando no hay candidatas y permite guardar sin mezcla (CA-05-13)", () => {
    const res = elegirMezclaOptima({
      ecorregion: "puna",
      cultivos: [TOMATE],
      plantasPublicadasEnEcorregion: [],
    });

    expect(res.especies).toEqual([]);
    expect(res.avisos.some((a) => a.codigo === "sin_candidatas")).toBe(true);
    expect(res.avisos.find((a) => a.codigo === "sin_candidatas")?.mensaje).toContain(
      "No se encontraron cultivos de servicio compatibles",
    );
  });

  it("rechaza al guardar una especie no candidata enviada por el navegador (CA-05-14)", () => {
    const p1 = crearPlanta({ plantaId: "p1", clave: "calendula", nombreComun: "Caléndula" });
    const resInvalida = validarYEvaluarMezclaPersonalizada({
      ecorregion: "valles_templados",
      cultivos: [TOMATE],
      plantasPublicadasEnEcorregion: [p1],
      plantaIdsSeleccionadas: ["p1", "planta-borrador-o-antagonica"],
    });
    expect(resInvalida.valido).toBe(false);

    const resValida = validarYEvaluarMezclaPersonalizada({
      ecorregion: "valles_templados",
      cultivos: [TOMATE],
      plantasPublicadasEnEcorregion: [p1],
      plantaIdsSeleccionadas: ["p1"],
    });
    expect(resValida.valido).toBe(true);
  });
});
