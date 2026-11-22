// Utilidades puras para construir y comparar entradas del historial de cambios del catálogo (CA-03-07, CA-03-15).
import type { AccionCatalogo, EntidadCatalogo } from "./tipos";

export interface DiferenciaCampo {
  campo: string;
  antes: unknown;
  despues: unknown;
}

// Compara dos snapshots de una entidad y devuelve únicamente los campos que cambiaron.
export function calcularDiferenciasCatalogo(
  antes: Record<string, unknown> | null,
  despues: Record<string, unknown> | null,
): DiferenciaCampo[] {
  const claves = new Set<string>([
    ...Object.keys(antes ?? {}),
    ...Object.keys(despues ?? {}),
  ]);

  const diferencias: DiferenciaCampo[] = [];
  for (const campo of Array.from(claves).sort()) {
    const valorAntes = antes ? antes[campo] : undefined;
    const valorDespues = despues ? despues[campo] : undefined;
    if (JSON.stringify(valorAntes) !== JSON.stringify(valorDespues)) {
      diferencias.push({
        campo,
        antes: valorAntes ?? null,
        despues: valorDespues ?? null,
      });
    }
  }
  return diferencias;
}

export interface EntradaCambioCatalogo {
  entidad: EntidadCatalogo;
  entidadId: string;
  accion: AccionCatalogo;
  administradorId: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  motivo?: string | null;
}

export function validarYPrepararCambioCatalogo(entrada: EntradaCambioCatalogo): EntradaCambioCatalogo {
  const motivoLimpio = entrada.motivo?.trim() || null;
  if (entrada.accion === "retiro" && !motivoLimpio) {
    throw new Error("Retirar un registro del catálogo exige indicar un motivo (CA-03-07).");
  }
  return {
    ...entrada,
    motivo: motivoLimpio,
  };
}
