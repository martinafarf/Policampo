// Tests de la barra de pasos y de la paleta con grupos del mapa (componentes/ui/pasos, sectores/PaletaSectores).
// Se dibujan a HTML con renderToStaticMarkup y se revisa lo que importa para entender la pantalla: qué paso es el
// actual, cuáles están hechos o deshabilitados, y que los cultivos estén en el grupo que corresponde.
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaletaAgrupada, type SeleccionPaleta } from "@/componentes/sectores/PaletaSectores";
import { Pasos, type PasoDeProceso } from "@/componentes/ui/pasos";

describe("Pasos", () => {
  const pasos: PasoDeProceso[] = [
    { titulo: "Delimitar finca", estado: "hecho" },
    { titulo: "Distribuir cultivos", estado: "actual" },
    { titulo: "Revisar distribución", estado: "pendiente", deshabilitado: true },
    { titulo: "Guardar finca", estado: "pendiente", deshabilitado: true },
  ];
  const html = renderToStaticMarkup(h(Pasos, { pasos, etiqueta: "Pasos para marcar tu finca" }));

  it("es una lista de pasos con nombre para quien usa lector de pantalla", () => {
    expect(html).toContain('aria-label="Pasos para marcar tu finca"');
    expect(html.match(/<li/g)).toHaveLength(4);
  });

  it("marca el paso actual y solo ese", () => {
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain(", paso actual");
  });

  it("dice con palabras (no solo con el color) qué paso está hecho", () => {
    expect(html).toContain(", hecho");
    expect(html).toContain("✓");
  });

  it("deshabilita los pasos que todavía no se pueden tocar", () => {
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});

describe("PaletaAgrupada", () => {
  const cultivos = [
    { id: "1", clave: "arandano", nombre: "Arándano", activo: true },
    { id: "2", clave: "durazno", nombre: "Durazno", activo: true },
    { id: "3", clave: "tomate", nombre: "Tomate", activo: true },
    { id: "4", clave: "quinua_inventada", nombre: "Quinua", activo: true },
    { id: "5", clave: "palta", nombre: "Palta", activo: false },
  ];
  const seleccion: SeleccionPaleta = {
    tipo: "cultivo",
    cultivoId: "1",
    cultivoOtro: "",
    subtipoFlores: null,
    etiqueta: "Arándano",
  };
  const html = renderToStaticMarkup(h(PaletaAgrupada, { cultivos, seleccion, onCambiar: () => undefined }));

  it("tiene buscador y los cuatro grupos", () => {
    expect(html).toContain("Buscar cultivo…");
    for (const grupo of ["Frutales", "Hortalizas", "Otros cultivos", "Flores y vegetación"]) {
      expect(html).toContain(grupo);
    }
  });

  it("abre solo el grupo del cultivo elegido y deja los demás cerrados", () => {
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    // 3 grupos cerrados + el botón ⓘ de ayuda (que también avisa si está abierto)
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(4);
    expect(html).toContain("Arándano");
    expect(html).toContain("Durazno");
    // los de los grupos cerrados no se dibujan
    expect(html).not.toContain("Tomate");
  });

  it("marca el cultivo elegido como presionado y no muestra los inactivos", () => {
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Palta");
  });

  it("explica para qué sirve elegir un cultivo", () => {
    expect(html).toContain("próximo sector");
  });
});
