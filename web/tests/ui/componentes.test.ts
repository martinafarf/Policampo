// Tests de las piezas comunes de las pantallas internas (componentes/ui, etapa estilos/00-base).
// Se dibujan a HTML con renderToStaticMarkup y se revisa lo que importa para entender la pantalla y
// para la accesibilidad: que los estados tengan texto, que las migas digan dónde estás, que los
// botones sean del tipo correcto y que lo escondido esté marcado como escondido.
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IconoFinca } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace, clasesBoton } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Desplegable, MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";

const html = (elemento: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(elemento);

describe("Botones", () => {
  it("<Boton> es un botón común (no envía formularios sin querer) y respeta la variante", () => {
    const salida = html(h(Boton, { variante: "peligro", children: "Borrar finca" }));
    expect(salida).toContain('type="button"');
    expect(salida).toContain("text-error");
    expect(salida).toContain("Borrar finca");
  });

  it("<BotonEnlace> es un enlace a otra página", () => {
    const salida = html(h(BotonEnlace, { href: "/fincas/nueva" }, "Cargar mi primera finca"));
    expect(salida).toMatch(/^<a [^>]*href="\/fincas\/nueva"/);
    expect(salida).toContain("bg-hoja");
  });

  it("todas las variantes miden 48 px de alto (min-h-12) y son píldoras", () => {
    for (const variante of ["principal", "contorno", "peligro", "texto"] as const) {
      expect(clasesBoton(variante)).toContain("min-h-12");
      expect(clasesBoton(variante)).toContain("rounded-full");
    }
    expect(clasesBoton("principal", true)).toContain("w-full");
  });
});

describe("Etiqueta", () => {
  it("muestra el texto y un ícono: el color solo no alcanza", () => {
    const salida = html(h(Etiqueta, { tono: "error", children: "Atrasada" }));
    expect(salida).toContain("Atrasada");
    expect(salida).toContain("<svg");
  });

  it("se puede mostrar sin ícono, pero nunca sin texto", () => {
    const salida = html(h(Etiqueta, { tono: "listo", conIcono: false, children: "Listo" }));
    expect(salida).not.toContain("<svg");
    expect(salida).toContain("Listo");
  });
});

describe("EncabezadoPagina", () => {
  it("dice dónde estás: migas con enlaces y la pantalla actual marcada", () => {
    const salida = html(
      h(EncabezadoPagina, {
        titulo: "Finca El Molle",
        migas: [{ texto: "Mis fincas", href: "/fincas" }],
        datos: ["4,2 ha"],
      }),
    );
    expect(salida).toContain('aria-label="Estás en"');
    expect(salida).toContain('href="/fincas"');
    expect(salida).toContain('aria-current="page"');
    expect(salida).toMatch(/<h1[^>]*>Finca El Molle<\/h1>/);
    expect(salida).toContain("4,2 ha");
  });

  it("sin migas no dibuja la navegación", () => {
    expect(html(h(EncabezadoPagina, { titulo: "Mis tareas" }))).not.toContain("Estás en");
  });
});

describe("Tarjeta y EstadoVacio", () => {
  it("la tarjeta usa h2 por defecto y h3 si se pide", () => {
    expect(html(h(Tarjeta, { titulo: "Flores en tu finca", children: "x" }))).toMatch(/<h2[^>]*>Flores en tu finca<\/h2>/);
    expect(html(h(Tarjeta, { titulo: "Detalle", nivel: 3, children: "x" }))).toMatch(/<h3[^>]*>Detalle<\/h3>/);
  });

  it("el estado vacío dice qué falta y ofrece la acción", () => {
    const salida = html(
      h(EstadoVacio, {
        Icono: IconoFinca,
        titulo: "Todavía no tenés fincas",
        accion: h(BotonEnlace, { href: "/fincas/nueva" }, "Cargar mi primera finca"),
      }),
    );
    expect(salida).toContain("Todavía no tenés fincas");
    expect(salida).toContain('href="/fincas/nueva"');
  });
});

describe("Explicaciones escondidas", () => {
  it("<Desplegable> empieza cerrado y muestra la pregunta", () => {
    const salida = html(h(Desplegable, { pregunta: "¿Por qué 20 %?", children: "Porque..." }));
    expect(salida).toMatch(/^<details(?![^>]*\bopen\b)/);
    expect(salida).toContain("¿Por qué 20 %?");
  });

  it("<MasInfo> es un botón (válido dentro de un párrafo) con la explicación escondida", () => {
    const salida = html(h("p", null, "Sumá plantas de servicio", h(MasInfo, { sobre: "plantas de servicio", children: "Plantas que..." })));
    expect(salida).not.toContain("<details");
    expect(salida).not.toContain("<div");
    expect(salida).toContain('aria-label="Más información sobre plantas de servicio"');
    expect(salida).toContain('aria-expanded="false"');
    expect(salida).toMatch(/role="note"[^>]*hidden/);
  });
});
