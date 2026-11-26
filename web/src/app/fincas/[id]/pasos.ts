// Camino de pasos de la ficha de la finca: Terreno → Diagnóstico → Rediseño → Calendario → Informe.
// Calcula en qué estado está cada paso a partir de lo que ya hay guardado, para que la persona vea de
// un vistazo qué hizo, qué le toca ahora y qué todavía no puede hacer (y por qué).
//
// Es una función pura (sin base de datos ni pantalla) para poder testearla sola: la página le pasa los
// datos que ya consulta y dibuja el resultado.

export type ClavePaso = "terreno" | "diagnostico" | "rediseno" | "calendario" | "informe";

/**
 * - listo: ya está hecho.
 * - ahora: es lo próximo que conviene hacer (como máximo un paso a la vez).
 * - atencion: estaba hecho, pero quedó viejo y conviene rehacerlo (también cuenta como "lo próximo").
 * - espera: todavía no se puede; falta un paso anterior.
 * - disponible: se puede hacer, pero no es lo más urgente (por ejemplo, otro informe).
 */
export type EstadoPaso = "listo" | "ahora" | "atencion" | "espera" | "disponible";

export interface Paso {
  clave: ClavePaso;
  numero: number;
  titulo: string;
  estado: EstadoPaso;
  /** Texto corto de la etiqueta de estado ("Listo", "Te toca", "Después del paso 2"). */
  etiqueta: string;
  /** Una frase que explica el estado o qué se logra con el paso. */
  detalle: string;
}

export interface DatosPasos {
  /** Si el terreno tiene lo mínimo para pedir el diagnóstico (superficie y al menos un cultivo). */
  terrenoCompleto: boolean;
  /** Qué falta en el terreno, en palabras ("Cargá al menos un cultivo"). */
  faltaEnTerreno: string | null;
  /** null si nunca se pidió un diagnóstico. */
  diagnostico: { desactualizado: boolean } | null;
  tienePropuestaElegida: boolean;
  tieneCalendario: boolean;
  cantidadInformes: number;
}

const TITULOS: Record<ClavePaso, string> = {
  terreno: "Tu terreno",
  diagnostico: "Diagnóstico",
  rediseno: "Rediseño",
  calendario: "Calendario",
  informe: "Informe",
};

export function calcularPasosFinca(d: DatosPasos): Paso[] {
  const pasos: Omit<Paso, "numero" | "titulo">[] = [];

  // 1. Terreno
  pasos.push(
    d.terrenoCompleto
      ? { clave: "terreno", estado: "listo", etiqueta: "Listo", detalle: "Cultivos y flores cargados." }
      : {
          clave: "terreno",
          estado: "ahora",
          etiqueta: "Te toca",
          detalle: d.faltaEnTerreno ?? "Cargá tus cultivos y flores.",
        },
  );

  // 2. Diagnóstico
  if (!d.terrenoCompleto) {
    pasos.push({ clave: "diagnostico", estado: "espera", etiqueta: "Después del paso 1", detalle: "Primero cargá tu terreno." });
  } else if (!d.diagnostico) {
    pasos.push({
      clave: "diagnostico",
      estado: "ahora",
      etiqueta: "Te toca",
      detalle: "Te dice cuántas flores tiene tu finca y cuántas le faltan.",
    });
  } else if (d.diagnostico.desactualizado) {
    pasos.push({
      clave: "diagnostico",
      estado: "atencion",
      etiqueta: "Desactualizado",
      detalle: "Cambiaste la finca después del último diagnóstico.",
    });
  } else {
    pasos.push({ clave: "diagnostico", estado: "listo", etiqueta: "Listo", detalle: "Al día con los datos de tu finca." });
  }

  // 3. Rediseño (se arma con un diagnóstico vigente)
  const diagnosticoVigente = d.diagnostico !== null && !d.diagnostico.desactualizado;
  if (d.tienePropuestaElegida) {
    pasos.push({ clave: "rediseno", estado: "listo", etiqueta: "Listo", detalle: "Ya elegiste dónde sumar flores." });
  } else if (diagnosticoVigente) {
    pasos.push({
      clave: "rediseno",
      estado: "ahora",
      etiqueta: "Te toca",
      detalle: "Elegí dónde poner franjas de flores y qué plantas sembrar.",
    });
  } else {
    pasos.push({ clave: "rediseno", estado: "espera", etiqueta: "Después del paso 2", detalle: "Se arma con el diagnóstico al día." });
  }

  // 4. Calendario (sale del rediseño elegido)
  if (!d.tienePropuestaElegida) {
    pasos.push({ clave: "calendario", estado: "espera", etiqueta: "Después del paso 3", detalle: "Sale del rediseño que elijas." });
  } else if (d.tieneCalendario) {
    pasos.push({ clave: "calendario", estado: "listo", etiqueta: "Listo", detalle: "Tus fechas de siembra, corte y cuidados." });
  } else {
    pasos.push({
      clave: "calendario",
      estado: "ahora",
      etiqueta: "Te toca",
      detalle: "Armá las fechas de siembra, corte y cuidados.",
    });
  }

  // 5. Informe (necesita diagnóstico y rediseño elegido; se pueden hacer varios)
  if (d.diagnostico === null || !d.tienePropuestaElegida) {
    pasos.push({ clave: "informe", estado: "espera", etiqueta: "Después del paso 3", detalle: "Un PDF para guardar o compartir." });
  } else if (d.cantidadInformes > 0) {
    pasos.push({
      clave: "informe",
      estado: "listo",
      etiqueta: d.cantidadInformes === 1 ? "1 informe" : `${d.cantidadInformes} informes`,
      detalle: "Podés generar uno nuevo cuando quieras.",
    });
  } else {
    pasos.push({ clave: "informe", estado: "disponible", etiqueta: "Disponible", detalle: "Un PDF para guardar o compartir." });
  }

  // Solo un paso es "lo próximo": si hay varios "ahora"/"atencion", el primero manda y los que siguen
  // quedan como "disponible" (se pueden hacer, pero no son lo más urgente).
  let yaHayProximo = false;
  return pasos.map((p, i) => {
    const esProximo = p.estado === "ahora" || p.estado === "atencion";
    const estado: EstadoPaso = esProximo && yaHayProximo ? "disponible" : p.estado;
    const etiqueta = esProximo && yaHayProximo ? "Disponible" : p.etiqueta;
    if (esProximo) yaHayProximo = true;
    return { ...p, estado, etiqueta, numero: i + 1, titulo: TITULOS[p.clave] };
  });
}

/** El paso que la persona tiene que hacer ahora (o null si está todo hecho). */
export function pasoActual(pasos: readonly Paso[]): Paso | null {
  return pasos.find((p) => p.estado === "ahora" || p.estado === "atencion") ?? null;
}
