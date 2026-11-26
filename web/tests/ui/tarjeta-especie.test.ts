// Test de la tarjeta de cada planta de la mezcla (componentes/propuesta/TarjetaEspecieMezcla).
// El «Por qué se recomienda» es largo: tiene que venir cerrado (desplegable), con solo los cultivos a la vista.
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import type { EspecieEnMezcla } from "@/dominio/propuesta";

const especie = {
  plantaId: "p1",
  clave: "borraja",
  nombreComun: "Borraja",
  nombreCientifico: "Borago officinalis",
  proporcionPct: 50,
  orden: 1,
  puntajeCompatibilidad: 4,
  funciones: ["polinizadores"],
  ciclo: "anual",
  origen: "desconocido",
  esEspontanea: false,
  enMercadoLocal: true,
  necesidadAgua: "media",
  riesgoMaleza: "medio",
  manejoCorte: null,
  dosisSiembra: "8–12 kg/ha",
  fuenteTipo: null,
  fuenteDetalle: null,
  validadoPor: null,
  siembraSemanas: [],
  floracionSemanas: [],
  corteSemanas: [],
  compatibilidades: [
    { cultivoId: "c1", cultivoNombre: "Arándano", grado: 4, justificacion: "Atrae abejas que polinizan el arándano." },
    { cultivoId: "c2", cultivoNombre: "Tomate", grado: 3, justificacion: "Atrae abejorros para el tomate." },
  ],
} as unknown as EspecieEnMezcla;

describe("TarjetaEspecieMezcla", () => {
  const html = renderToStaticMarkup(h(TarjetaEspecieMezcla, { especie }));

  it("muestra el «Por qué se recomienda» como desplegable cerrado", () => {
    expect(html).toContain("<details");
    expect(html).not.toMatch(/<details[^>]*\sopen/);
    expect(html).toContain("¿Por qué se recomienda?");
  });

  it("deja a la vista para qué cultivos sirve, y el texto largo adentro del desplegable", () => {
    expect(html).toContain("Sirve para Arándano, Tomate");
    const adentro = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
    expect(adentro).toContain("Atrae abejas que polinizan el arándano.");
  });
});
