// Aritmética decimal exacta basada en BigInt para el diagnóstico (Esp. 04, 4.2, CA-04-01).
// Escala base: 1 ha = 10.000 unidades (1 unidad = 0,0001 ha = 1 m² exacto).
// Así se evitan por completo los errores de coma flotante (0,1 + 0,2 = 0,3 exacto).

const CERO = BigInt(0);
const UNO = BigInt(1);
const DOS = BigInt(2);
const ESCALA_HA = BigInt(10_000);
const DECIMALES_HA = 4;

// Convierte un número o cadena decimal (hasta 4 decimales, redondeando mitad arriba si trae más)
// a entero BigInt en diezmilésimas de hectárea (m²).
export function parsearHaAEnteroEscalado(valor: number | string): bigint {
  const textoCrudo =
    typeof valor === "number"
      ? Number.isFinite(valor)
        ? valor.toFixed(8)
        : ""
      : valor.trim().replace(",", ".");

  if (!textoCrudo || !/^-?\d+(?:\.\d+)?$/.test(textoCrudo)) {
    throw new Error(`Valor de superficie inválido: «${String(valor)}».`);
  }

  const negativo = textoCrudo.startsWith("-");
  const sinSigno = negativo ? textoCrudo.slice(1) : textoCrudo;
  const [enteraStr, fracStr = ""] = sinSigno.split(".");

  const entera = BigInt(enteraStr) * ESCALA_HA;
  const padded = fracStr.padEnd(DECIMALES_HA + 1, "0");
  let frac = BigInt(padded.slice(0, DECIMALES_HA));
  const digitoSiguiente = Number(padded[DECIMALES_HA]);
  if (digitoSiguiente >= 5) {
    frac += UNO;
  }

  const total = entera + frac;
  return negativo ? -total : total;
}

// Divide dividendo / divisor (ambos >= 0) con redondeo mitad hacia arriba (half-up).
export function dividirRedondeandoMitadArriba(dividendo: bigint, divisor: bigint): bigint {
  if (divisor <= CERO) {
    throw new Error("El divisor debe ser mayor que cero.");
  }
  if (dividendo <= CERO) return CERO;
  return (dividendo * DOS + divisor) / (divisor * DOS);
}

// Convierte entero escalado (diezmilésimas de ha) a número JS exacto a 4 decimales.
export function enteroEscaladoAHa(valor: bigint): number {
  return Number(valor) / 10_000;
}

// Convierte décimas (escala 10) a número JS exacto a 1 decimal (ej. 63 -> 6.3).
export function decimasANumero(valor: bigint): number {
  return Number(valor) / 10;
}

// Formatea entero escalado (diezmilésimas de ha) a cadena fija para numeric(12, 4) de PostgreSQL.
export function formatearHaFijo4(ha: number): string {
  const esc = parsearHaAEnteroEscalado(ha);
  const signo = esc < CERO ? "-" : "";
  const abs = esc < CERO ? -esc : esc;
  const ent = abs / ESCALA_HA;
  const frac = (abs % ESCALA_HA).toString().padStart(4, "0");
  return `${signo}${ent.toString()}.${frac}`;
}

// Formatea un número con 1 decimal fijo para numeric(5, 1) / numeric(10, 1) de PostgreSQL.
export function formatearDecimalFijo1(valor: number): string {
  return valor.toFixed(1);
}
