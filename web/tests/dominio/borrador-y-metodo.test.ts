// Tests unitarios de borradores locales y cambio de método (especificación 02, tarea T6).
// Cubren RN-03, RS-08, CA-02-16 y CA-02-17.
import { describe, expect, it } from "vitest";
import {
  eliminarBorrador,
  esBorradorMasNuevo,
  escribirBorrador,
  leerBorrador,
  type AlmacenTexto,
} from "@/componentes/borrador/almacenBorrador";
import { claveBorradorLocal, validarCambioMetodo } from "@/dominio/establecimientos";

function crearAlmacenMemoria(): AlmacenTexto & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => {
      datos.set(clave, valor);
    },
    removeItem: (clave) => {
      datos.delete(clave);
    },
  };
}

describe("Borradores en el navegador por establecimiento (RS-08, CA-02-17)", () => {
  it("separa borradores por establecimiento en policampo_borrador_<id> y recupera solo si es más nuevo", () => {
    const almacen = crearAlmacenMemoria();
    const fechaServidor = "2026-11-21T10:00:00.000Z";
    const fechaBorradorNuevo = new Date("2026-11-21T10:05:00.000Z");
    const fechaBorradorViejo = new Date("2026-11-21T09:50:00.000Z");

    escribirBorrador(almacen, "finca-1", "cuestionario", [{ nombre: "Tomate" }], fechaBorradorNuevo);
    escribirBorrador(almacen, "finca-2", "croquis", [{ nombre: "Frutilla" }], fechaBorradorViejo);

    expect(almacen.datos.has(claveBorradorLocal("finca-1"))).toBe(true);
    expect(almacen.datos.has(claveBorradorLocal("finca-2"))).toBe(true);

    // finca-1 es más nuevo que el servidor → se ofrece recuperar
    const recuperado1 = leerBorrador<{ nombre: string }[]>(
      almacen,
      "finca-1",
      "cuestionario",
      fechaServidor,
    );
    expect(recuperado1?.datos).toEqual([{ nombre: "Tomate" }]);

    // Si se pide para otro método, se ignora (RN-03)
    expect(leerBorrador(almacen, "finca-1", "mapa", fechaServidor)).toBeNull();

    // finca-2 es más viejo que el servidor → no se ofrece recuperar
    expect(leerBorrador(almacen, "finca-2", "croquis", fechaServidor)).toBeNull();

    // Al guardar o borrar se elimina solo el borrador de esa finca
    eliminarBorrador(almacen, "finca-1");
    expect(almacen.datos.has(claveBorradorLocal("finca-1"))).toBe(false);
    expect(almacen.datos.has(claveBorradorLocal("finca-2"))).toBe(true);
  });

  it("compara fechas de borrador vs servidor de forma segura", () => {
    expect(esBorradorMasNuevo("2026-11-21T12:00:00.000Z", "2026-11-21T11:59:59.000Z")).toBe(true);
    expect(esBorradorMasNuevo("2026-11-21T11:00:00.000Z", "2026-11-21T12:00:00.000Z")).toBe(false);
    expect(esBorradorMasNuevo("fecha-invalida", "2026-11-21T12:00:00.000Z")).toBe(false);
  });
});

describe("Validación de 'Cargar de nuevo con otro método' (RN-03, CA-02-16)", () => {
  it("rechaza elegir el mismo método actual", () => {
    const res = validarCambioMetodo({
      metodoActual: "cuestionario",
      nuevoMetodo: "cuestionario",
      superficieActualHa: 5,
    });
    expect(res.valido).toBe(false);
  });

  it("al pasar a mapa deja la superficie total en null", () => {
    const res = validarCambioMetodo({
      metodoActual: "croquis",
      nuevoMetodo: "mapa",
      superficieActualHa: 5,
    });
    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.nuevoMetodo).toBe("mapa");
      expect(res.nuevaSuperficieTotalHa).toBeNull();
    }
  });

  it("al pasar de mapa a cuestionario o croquis exige ingresar una superficie total válida", () => {
    const sinSup = validarCambioMetodo({
      metodoActual: "mapa",
      nuevoMetodo: "croquis",
      superficieActualHa: 3.2,
      superficieNuevaTexto: "",
    });
    expect(sinSup.valido).toBe(false);

    const conSup = validarCambioMetodo({
      metodoActual: "mapa",
      nuevoMetodo: "cuestionario",
      superficieActualHa: null,
      superficieNuevaTexto: "6,25",
    });
    expect(conSup.valido).toBe(true);
    if (conSup.valido) {
      expect(conSup.nuevaSuperficieTotalHa).toBe(6.25);
    }
  });

  it("al pasar entre cuestionario y croquis conserva la superficie actual si no se ingresa una nueva", () => {
    const res = validarCambioMetodo({
      metodoActual: "cuestionario",
      nuevoMetodo: "croquis",
      superficieActualHa: 8.5,
    });
    expect(res.valido).toBe(true);
    if (res.valido) {
      expect(res.nuevaSuperficieTotalHa).toBe(8.5);
    }
  });
});
