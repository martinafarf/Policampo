// Armado de la entrada del diagnóstico desde PostgreSQL, persistencia y consultas (Esp. 04, T2).
// Reglas: RS-02 (dueño, 404 lo ajeno), RS-06 (cálculo solo en servidor + límite 20/h), RN-07.
import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import { cultivo, diagnostico, establecimiento, sector } from "@/db/schema";
import { crearContornoCroquis } from "@/dominio/establecimientos";
import { claveDeLimite, consumirIntento } from "@/lib/limites";
import { formatearDecimalFijo1, formatearHaFijo4 } from "./decimales";
import { diagnosticar } from "./diagnosticar";
import {
  UMBRALES_DIAGNOSTICO,
  evaluarRequisitosDiagnostico,
  type EntradaDiagnostico,
  type EvaluacionRequisitosDiagnostico,
  type NivelRiesgo,
  type SectorEntradaDiagnostico,
} from "./tipos";

const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuidValido(valor: string): boolean {
  return REGEX_UUID.test(valor);
}

export type FilaDiagnostico = typeof diagnostico.$inferSelect;

export interface DiagnosticoNormalizado {
  id: string;
  establecimientoId: string;
  creadoEn: Date;
  versionReglas: string;
  entrada: EntradaDiagnostico;
  superficieTotalHa: number;
  superficieFloresHa: number;
  superficieCultivosHa: number;
  superficieSinAsignarHa: number;
  hectareasACompensar: number;
  porcentajeFlores: number;
  deficitPp: number;
  nivelRiesgo: NivelRiesgo;
  perimetroM: number | null;
  anchoFranjaM: number | null;
  areasAptas: FilaDiagnostico["areasAptas"];
  superficieLibre: FilaDiagnostico["superficieLibre"];
  alertas: FilaDiagnostico["alertas"];
}

export function normalizarFilaDiagnostico(fila: FilaDiagnostico): DiagnosticoNormalizado {
  return {
    id: fila.id,
    establecimientoId: fila.establecimientoId,
    creadoEn: fila.creadoEn,
    versionReglas: fila.versionReglas,
    entrada: fila.entrada,
    superficieTotalHa: Number(fila.superficieTotalHa),
    superficieFloresHa: Number(fila.superficieFloresHa),
    superficieCultivosHa: Number(fila.superficieCultivosHa),
    superficieSinAsignarHa: Number(fila.superficieSinAsignarHa),
    hectareasACompensar: Number(fila.hectareasACompensar),
    porcentajeFlores: Number(fila.porcentajeFlores),
    deficitPp: Number(fila.deficitPp),
    nivelRiesgo: fila.nivelRiesgo,
    perimetroM: fila.perimetroM !== null ? Number(fila.perimetroM) : null,
    anchoFranjaM: fila.anchoFranjaM !== null ? Number(fila.anchoFranjaM) : null,
    areasAptas: fila.areasAptas,
    superficieLibre: fila.superficieLibre,
    alertas: fila.alertas,
  };
}

export function estaDiagnosticoDesactualizado(
  diagnosticoCreadoEn: Date,
  establecimientoActualizadoEn: Date,
): boolean {
  return establecimientoActualizadoEn.getTime() > diagnosticoCreadoEn.getTime();
}

export interface ContextoEstablecimientoDiagnostico {
  establecimiento: typeof establecimiento.$inferSelect;
  requisitos: EvaluacionRequisitosDiagnostico;
  entrada: EntradaDiagnostico | null;
}

// Arma la foto completa de la finca desde PostgreSQL filtrando por dueño (RS-02, Esp. 04 4.1).
export async function armarEntradaDiagnosticoDesdeBase(
  establecimientoId: string,
  usuarioId: string,
): Promise<ContextoEstablecimientoDiagnostico | null> {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);

  if (!est) return null;

  const filasSectores = await db
    .select({
      id: sector.id,
      nombre: sector.nombre,
      tipo: sector.tipo,
      superficieHa: sector.superficieHa,
      cultivoOtro: sector.cultivoOtro,
      subtipoFlores: sector.subtipoFlores,
      ubicacionRelativa: sector.ubicacionRelativa,
      geometria: sector.geometria,
      cultivoClave: cultivo.clave,
      cultivoNombre: cultivo.nombre,
      cultivoEstado: cultivo.estado,
    })
    .from(sector)
    .leftJoin(cultivo, eq(cultivo.id, sector.cultivoId))
    .where(eq(sector.establecimientoId, est.id))
    .orderBy(asc(sector.orden), asc(sector.creadoEn));

  const cantidadSectoresCultivo = filasSectores.filter((s) => s.tipo === "cultivo").length;
  const requisitos = evaluarRequisitosDiagnostico({
    superficieTotalHa: est.superficieTotalHa,
    cantidadSectoresCultivo,
  });

  if (!requisitos.cumple || est.superficieTotalHa === null) {
    return { establecimiento: est, requisitos, entrada: null };
  }

  const superficieTotalNum = Number(est.superficieTotalHa);
  const contornoFoto =
    est.metodoCaracterizacion === "croquis"
      ? crearContornoCroquis(superficieTotalNum)
      : (est.contorno ?? null);

  const sectoresEntrada: SectorEntradaDiagnostico[] = filasSectores.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    tipo: s.tipo,
    superficieHa: s.superficieHa,
    cultivoClave: s.cultivoClave,
    cultivoNombre: s.cultivoNombre,
    cultivoOtro: s.cultivoOtro,
    // Solo cuentan como "con datos en el catálogo" los cultivos publicados (Esp. 04 4.1 y 4.5).
    tieneDatosPublicadosCatalogo: s.cultivoEstado === "publicado",
    subtipoFlores: s.subtipoFlores,
    ubicacionRelativa: s.ubicacionRelativa,
    geometria: s.geometria,
  }));

  const entrada: EntradaDiagnostico = {
    metodo: est.metodoCaracterizacion,
    ecorregion: est.ecorregion as ClaveEcorregion,
    superficieTotalHa: est.superficieTotalHa,
    contorno: contornoFoto,
    sectores: sectoresEntrada,
  };

  return { establecimiento: est, requisitos, entrada };
}

export type ResultadoSolicitarDiagnostico =
  | { ok: true; creado: boolean; diagnostico: DiagnosticoNormalizado }
  | {
      ok: false;
      motivo: "no_encontrado" | "requisitos_incompletos" | "limite_excedido";
      mensaje: string;
    };

// Ejecuta el cálculo en el servidor y guarda un diagnóstico inmutable en una transacción.
// Reglas: CA-04-08, CA-04-09, CA-04-10, CA-04-13, CA-04-14, CA-04-15, RS-02, RS-06, RS-13.
export async function ejecutarYSolicitarDiagnostico(params: {
  establecimientoId: string;
  usuarioId: string;
}): Promise<ResultadoSolicitarDiagnostico> {
  const contexto = await armarEntradaDiagnosticoDesdeBase(
    params.establecimientoId,
    params.usuarioId,
  );
  if (!contexto) {
    return {
      ok: false,
      motivo: "no_encontrado",
      mensaje: "Establecimiento no encontrado.",
    };
  }

  if (!contexto.requisitos.cumple || !contexto.entrada) {
    return {
      ok: false,
      motivo: "requisitos_incompletos",
      mensaje: contexto.requisitos.mensajeFaltante ?? "Faltan datos para calcular el diagnóstico.",
    };
  }

  // Si ya existe un diagnóstico vigente (la finca no cambió después), devolverlo sin crear otro (CA-04-09).
  const [ultimo] = await db
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.establecimientoId, contexto.establecimiento.id))
    .orderBy(desc(diagnostico.creadoEn))
    .limit(1);

  if (ultimo && !estaDiagnosticoDesactualizado(ultimo.creadoEn, contexto.establecimiento.actualizadoEn)) {
    return {
      ok: true,
      creado: false,
      diagnostico: normalizarFilaDiagnostico(ultimo),
    };
  }

  // Límite anti-abuso: 20 diagnósticos por hora por usuario (RS-06, RS-13, CA-04-15).
  const claveLimite = claveDeLimite("diagnostico", params.usuarioId);
  const permitido = await consumirIntento(
    claveLimite,
    3600,
    UMBRALES_DIAGNOSTICO.maxDiagnosticosPorHora,
  );
  if (!permitido) {
    return {
      ok: false,
      motivo: "limite_excedido",
      mensaje: "Demasiadas solicitudes. Esperá un momento antes de volver a calcular el diagnóstico.",
    };
  }

  // Cálculo estrictamente en el servidor con datos de la base (CA-04-14).
  const entrada = contexto.entrada;
  const resultado = diagnosticar(entrada);
  const fechaCreacion = new Date(
    Math.max(Date.now(), contexto.establecimiento.actualizadoEn.getTime()),
  );

  const [creado] = await db.transaction(async (tx) => {
    return tx
      .insert(diagnostico)
      .values({
        establecimientoId: contexto.establecimiento.id,
        creadoEn: fechaCreacion,
        versionReglas: resultado.versionReglas,
        entrada,
        superficieTotalHa: formatearHaFijo4(resultado.superficieTotalHa),
        superficieFloresHa: formatearHaFijo4(resultado.superficieFloresHa),
        superficieCultivosHa: formatearHaFijo4(resultado.superficieCultivosHa),
        superficieSinAsignarHa: formatearHaFijo4(resultado.superficieSinAsignarHa),
        hectareasACompensar: formatearHaFijo4(resultado.hectareasACompensar),
        porcentajeFlores: formatearDecimalFijo1(resultado.porcentajeFlores),
        deficitPp: formatearDecimalFijo1(resultado.deficitPp),
        nivelRiesgo: resultado.nivelRiesgo,
        perimetroM:
          resultado.perimetroM !== null ? formatearDecimalFijo1(resultado.perimetroM) : null,
        anchoFranjaM:
          resultado.anchoFranjaM !== null ? formatearDecimalFijo1(resultado.anchoFranjaM) : null,
        areasAptas: resultado.areasAptas,
        superficieLibre: resultado.superficieLibre,
        alertas: resultado.alertas,
      })
      .returning();
  });

  return {
    ok: true,
    creado: true,
    diagnostico: normalizarFilaDiagnostico(creado),
  };
}

// Consulta el último diagnóstico de una finca propia (RS-02: null si no es del usuario).
export async function obtenerUltimoDiagnostico(establecimientoId: string, usuarioId: string) {
  const contexto = await armarEntradaDiagnosticoDesdeBase(establecimientoId, usuarioId);
  if (!contexto) return null;

  const [ultimo] = await db
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.establecimientoId, contexto.establecimiento.id))
    .orderBy(desc(diagnostico.creadoEn))
    .limit(1);

  const normalizado = ultimo ? normalizarFilaDiagnostico(ultimo) : null;
  const desactualizado = normalizado
    ? estaDiagnosticoDesactualizado(normalizado.creadoEn, contexto.establecimiento.actualizadoEn)
    : false;

  return {
    establecimiento: contexto.establecimiento,
    requisitos: contexto.requisitos,
    diagnostico: normalizado,
    desactualizado,
  };
}

// Consulta un diagnóstico puntual del historial verificando pertenencia de finca y dueño (CA-04-13).
export async function obtenerDiagnosticoPorId(
  establecimientoId: string,
  diagnosticoId: string,
  usuarioId: string,
) {
  if (!esUuidValido(establecimientoId) || !esUuidValido(diagnosticoId)) return null;

  const [fila] = await db
    .select({
      diagnostico,
      establecimiento,
    })
    .from(diagnostico)
    .innerJoin(establecimiento, eq(establecimiento.id, diagnostico.establecimientoId))
    .where(
      and(
        eq(diagnostico.id, diagnosticoId),
        eq(diagnostico.establecimientoId, establecimientoId),
        eq(establecimiento.usuarioId, usuarioId),
      ),
    )
    .limit(1);

  if (!fila) return null;

  const normalizado = normalizarFilaDiagnostico(fila.diagnostico);
  return {
    establecimiento: fila.establecimiento,
    diagnostico: normalizado,
    desactualizado: estaDiagnosticoDesactualizado(
      normalizado.creadoEn,
      fila.establecimiento.actualizadoEn,
    ),
  };
}

// Lista el historial completo de una finca propia del más nuevo al más viejo (CA-04-11).
export async function listarHistorialDiagnosticos(establecimientoId: string, usuarioId: string) {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);

  if (!est) return null;

  const filas = await db
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.establecimientoId, est.id))
    .orderBy(desc(diagnostico.creadoEn));

  return {
    establecimiento: est,
    diagnosticos: filas.map(normalizarFilaDiagnostico),
  };
}

export interface ResumenDiagnosticoFinca {
  establecimientoId: string;
  diagnosticoId: string;
  nivelRiesgo: NivelRiesgo;
  porcentajeFlores: number;
  creadoEn: Date;
  desactualizado: boolean;
}

// Resumen del último diagnóstico por cada finca del usuario (para etiquetas en Mis fincas, CA-04-18).
export async function obtenerResumenDiagnosticosPorEstablecimientos(
  establecimientos: readonly { id: string; actualizadoEn: Date }[],
): Promise<Map<string, ResumenDiagnosticoFinca>> {
  const resultado = new Map<string, ResumenDiagnosticoFinca>();
  if (establecimientos.length === 0) return resultado;

  const mapaActualizado = new Map(establecimientos.map((e) => [e.id, e.actualizadoEn]));
  const filas = await db
    .select({
      id: diagnostico.id,
      establecimientoId: diagnostico.establecimientoId,
      nivelRiesgo: diagnostico.nivelRiesgo,
      porcentajeFlores: diagnostico.porcentajeFlores,
      creadoEn: diagnostico.creadoEn,
    })
    .from(diagnostico)
    .where(
      inArray(
        diagnostico.establecimientoId,
        establecimientos.map((e) => e.id),
      ),
    )
    .orderBy(desc(diagnostico.creadoEn));

  for (const f of filas) {
    if (resultado.has(f.establecimientoId)) continue;
    const estAct = mapaActualizado.get(f.establecimientoId) ?? f.creadoEn;
    resultado.set(f.establecimientoId, {
      establecimientoId: f.establecimientoId,
      diagnosticoId: f.id,
      nivelRiesgo: f.nivelRiesgo,
      porcentajeFlores: Number(f.porcentajeFlores),
      creadoEn: f.creadoEn,
      desactualizado: estaDiagnosticoDesactualizado(f.creadoEn, estAct),
    });
  }

  return resultado;
}
