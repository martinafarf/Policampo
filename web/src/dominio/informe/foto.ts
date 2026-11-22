// Armado de la foto inmutable del informe técnico, emisión, consulta y borrado (Esp. 07, T1/T2).
// Reglas: RN-07, RS-02, RS-05, RS-06, RS-13, CA-07-01 a CA-07-04, CA-07-09, CA-07-11 a CA-07-14.
import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import {
  calendario,
  cultivo,
  diagnostico,
  establecimiento,
  informe,
  plantaServicio,
  propuesta,
  propuestaEspecie,
  sector,
  tarea,
  user,
} from "@/db/schema";
import {
  calcularEstadoTarea,
  esTareaInformativa,
  obtenerHoyJujuyIso,
} from "@/dominio/calendario";
import { construirExplicacionCalculo } from "@/dominio/diagnostico";
import {
  esUuidValido,
  estaDiagnosticoDesactualizado,
  normalizarFilaDiagnostico,
} from "@/dominio/diagnostico/entrada";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  crearContornoCroquis,
} from "@/dominio/establecimientos";
import { calcularEstadoDesactualizadaPropuesta } from "@/dominio/propuesta/servicio";
import { claveDeLimite, consumirIntento } from "@/lib/limites";
import { generarCodigoInforme } from "./codigo";
import {
  LIMITES_INFORME,
  VERSION_PLANTILLA_INFORME,
  type FotoInforme,
  type SectorFotoInforme,
  type TareaFotoInforme,
} from "./tipos";

const FUENTE_BIBLIOGRAFICA_BASE =
  "Garibaldi y otros, Paisajes agrícolas multifuncionales; entrevistas a especialistas.";

export interface RequisitosInformeFinca {
  establecimientoId: string;
  establecimientoNombre: string;
  tieneDiagnostico: boolean;
  tienePropuestaElegida: boolean;
  cumple: boolean;
  mensajeFaltante: string | null;
  nombrePerfilCompleto: string | null;
}

export async function obtenerRequisitosEmisionInforme(
  establecimientoId: string,
  usuarioId: string,
): Promise<RequisitosInformeFinca | null> {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select({ id: establecimiento.id, nombre: establecimiento.nombre })
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);
  if (!est) return null;

  const [[diag], [prop], [perfil]] = await Promise.all([
    db
      .select({ id: diagnostico.id })
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, est.id))
      .orderBy(desc(diagnostico.creadoEn))
      .limit(1),
    db
      .select({ id: propuesta.id })
      .from(propuesta)
      .where(and(eq(propuesta.establecimientoId, est.id), eq(propuesta.elegida, true)))
      .limit(1),
    db
      .select({ nombre: user.nombre, apellido: user.apellido })
      .from(user)
      .where(eq(user.id, usuarioId))
      .limit(1),
  ]);

  const tieneDiagnostico = Boolean(diag);
  const tienePropuestaElegida = Boolean(prop);
  const nombrePerfil = [perfil?.nombre?.trim(), perfil?.apellido?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();

  let mensajeFaltante: string | null = null;
  if (!tieneDiagnostico) mensajeFaltante = "Primero pedí un diagnóstico";
  else if (!tienePropuestaElegida) mensajeFaltante = "Primero elegí una propuesta";

  return {
    establecimientoId: est.id,
    establecimientoNombre: est.nombre,
    tieneDiagnostico,
    tienePropuestaElegida,
    cumple: tieneDiagnostico && tienePropuestaElegida,
    mensajeFaltante,
    nombrePerfilCompleto: nombrePerfil || null,
  };
}

export type ResultadoEmitirInforme =
  | { ok: true; informeId: string; codigo: string }
  | {
      ok: false;
      motivo: "no_encontrado" | "requisitos_incompletos" | "limite_excedido" | "tope_finca";
      mensaje: string;
    };

function esErrorCodigoDuplicado(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && typeof error.code === "string"
      ? error.code
      : "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause
        ? String(error.cause.code)
        : "";
  return code === "23505";
}

// Emite un informe técnico guardando su foto completa e inmutable en PostgreSQL (CA-07-01 a 04, 09, 13).
export async function emitirInformeEnBase(params: {
  establecimientoId: string;
  usuarioId: string;
  incluirNombre?: boolean;
}): Promise<ResultadoEmitirInforme> {
  if (!esUuidValido(params.establecimientoId)) {
    return { ok: false, motivo: "no_encontrado", mensaje: "Establecimiento no encontrado." };
  }

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.id, params.establecimientoId),
        eq(establecimiento.usuarioId, params.usuarioId),
      ),
    )
    .limit(1);
  if (!est) {
    return { ok: false, motivo: "no_encontrado", mensaje: "Establecimiento no encontrado." };
  }

  // Tope de 50 informes por finca (CA-07-13)
  const [{ totalInformes }] = await db
    .select({ totalInformes: count() })
    .from(informe)
    .where(eq(informe.establecimientoId, est.id));

  if (Number(totalInformes) >= LIMITES_INFORME.maxInformesPorFinca) {
    return {
      ok: false,
      motivo: "tope_finca",
      mensaje: `Alcanzaste el máximo de ${LIMITES_INFORME.maxInformesPorFinca} informes guardados en esta finca. Borrá alguno para emitir uno nuevo.`,
    };
  }

  // Requisitos: diagnóstico + propuesta elegida (CA-07-01)
  const [[ultimoDiagFila], [propFila], [calFila], [perfil], filasSectores] = await Promise.all([
    db
      .select()
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, est.id))
      .orderBy(desc(diagnostico.creadoEn))
      .limit(1),
    db
      .select()
      .from(propuesta)
      .where(and(eq(propuesta.establecimientoId, est.id), eq(propuesta.elegida, true)))
      .limit(1),
    db
      .select()
      .from(calendario)
      .where(and(eq(calendario.establecimientoId, est.id), isNull(calendario.cerradoEn)))
      .limit(1),
    db
      .select({ nombre: user.nombre, apellido: user.apellido })
      .from(user)
      .where(eq(user.id, params.usuarioId))
      .limit(1),
    db
      .select({
        nombre: sector.nombre,
        tipo: sector.tipo,
        cultivoOtro: sector.cultivoOtro,
        subtipoFlores: sector.subtipoFlores,
        superficieHa: sector.superficieHa,
        ubicacionRelativa: sector.ubicacionRelativa,
        geometria: sector.geometria,
        cultivoNombre: cultivo.nombre,
      })
      .from(sector)
      .leftJoin(cultivo, eq(cultivo.id, sector.cultivoId))
      .where(eq(sector.establecimientoId, est.id))
      .orderBy(asc(sector.orden), asc(sector.creadoEn)),
  ]);

  if (!ultimoDiagFila) {
    return {
      ok: false,
      motivo: "requisitos_incompletos",
      mensaje: "Primero pedí un diagnóstico.",
    };
  }
  if (!propFila) {
    return {
      ok: false,
      motivo: "requisitos_incompletos",
      mensaje: "Primero elegí una propuesta.",
    };
  }

  // Límite de 20 emisiones por hora por usuario (RS-06, RS-13, CA-07-13)
  const permitido = await consumirIntento(
    claveDeLimite("informe_emitir", params.usuarioId),
    3600,
    LIMITES_INFORME.maxEmisionesPorHora,
  );
  if (!permitido) {
    return {
      ok: false,
      motivo: "limite_excedido",
      mensaje: "Demasiadas solicitudes. Esperá un momento antes de emitir otro informe.",
    };
  }

  const [filasEspecies, filasTareas] = await Promise.all([
    db
      .select({
        copia: propuestaEspecie.copia,
        estadoActual: plantaServicio.estado,
      })
      .from(propuestaEspecie)
      .leftJoin(plantaServicio, eq(plantaServicio.id, propuestaEspecie.plantaId))
      .where(eq(propuestaEspecie.propuestaId, propFila.id))
      .orderBy(asc(propuestaEspecie.orden)),
    calFila
      ? db
          .select()
          .from(tarea)
          .where(eq(tarea.calendarioId, calFila.id))
          .orderBy(asc(tarea.fechaInicio), asc(tarea.orden))
      : Promise.resolve([]),
  ]);

  // Preparado para (CA-07-03): solo si la casilla vino activa y el perfil tiene nombre o apellido.
  const nombrePerfil = [perfil?.nombre?.trim(), perfil?.apellido?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  const incluyeNombre = Boolean(params.incluirNombre && nombrePerfil.length > 0);
  const preparadoPara = incluyeNombre ? nombrePerfil : null;

  const diag = normalizarFilaDiagnostico(ultimoDiagFila);
  const hoyIso = obtenerHoyJujuyIso();
  const emitidoEn = new Date();
  const emitidoEnIso = emitidoEn.toISOString();

  // Estado desactualizado al momento de emitir (CA-07-04)
  const diagDesactualizado = estaDiagnosticoDesactualizado(diag.creadoEn, est.actualizadoEn);
  const propDesact = calcularEstadoDesactualizadaPropuesta({
    propuestaCreadoEn: propFila.creadoEn,
    propuestaDiagnosticoId: propFila.diagnosticoId,
    establecimientoActualizadoEn: est.actualizadoEn,
    ultimoDiagnostico: { id: diag.id, creadoEn: diag.creadoEn },
    especiesConEstadoActual: filasEspecies.map((e) => ({
      nombreComun: e.copia.nombreComun,
      estadoActual: e.estadoActual,
    })),
  });
  const motivosDesact: string[] = [];
  if (diagDesactualizado) {
    motivosDesact.push("El diagnóstico estaba desactualizado al emitir el informe.");
  }
  for (const m of propDesact.motivos) {
    if (!motivosDesact.includes(m)) motivosDesact.push(m);
  }

  const supTotalHa = est.superficieTotalHa !== null ? Number(est.superficieTotalHa) : diag.superficieTotalHa;
  const sectoresFoto: SectorFotoInforme[] = filasSectores.map((s) => {
    const sup = Number(s.superficieHa);
    const detalleTipo =
      s.tipo === "sector_flores"
        ? s.subtipoFlores
          ? ETIQUETAS_SUBTIPO_FLORES[s.subtipoFlores]
          : "Sector de flores"
        : s.cultivoNombre ?? (s.cultivoOtro ? `Otro: ${s.cultivoOtro}` : "Cultivo");

    return {
      nombre: s.nombre,
      tipo: s.tipo,
      detalleTipo,
      subtipoFlores: s.subtipoFlores,
      superficieHa: sup,
      porcentajeTotal: supTotalHa > 0 ? Math.round((sup / supTotalHa) * 1000) / 10 : 0,
      ubicacionRelativa: s.ubicacionRelativa,
      geometria: s.geometria,
    };
  });

  const especiesCopia = filasEspecies.map((e) => e.copia);
  const perdidaTotalCultivoHa =
    Math.round(propFila.perdidaPorCultivo.reduce((acc, p) => acc + p.ha, 0) * 10_000) / 10_000;

  let calendarioFoto: FotoInforme["calendario"] = null;
  if (calFila) {
    const tareasFoto: TareaFotoInforme[] = filasTareas
      .filter((t) => !esTareaInformativa(t.tipo))
      .map((t) => ({
        tipo: t.tipo,
        titulo: t.titulo,
        descripcion: t.descripcion,
        plantaNombre: t.plantaNombre,
        fechaInicio: t.fechaInicio,
        fechaFin: t.fechaFin,
        estimada: t.estimada,
        estadoAlEmitir: calcularEstadoTarea(
          { fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, hechaEn: t.hechaEn },
          hoyIso,
        ),
        hechaEn: t.hechaEn,
      }));

    const prox = tareasFoto.find(
      (t) => t.estadoAlEmitir === "atrasada" || t.estadoAlEmitir === "en_curso" || t.estadoAlEmitir === "proxima",
    );

    calendarioFoto = {
      temporadaInicio: calFila.temporadaInicio,
      temporadaFin: calFila.temporadaFin,
      avisos: calFila.avisos,
      proximaTarea: prox ? { titulo: prox.titulo, fechaInicio: prox.fechaInicio } : null,
      tareas: tareasFoto,
    };
  }

  const fuentesSet = new Set<string>([FUENTE_BIBLIOGRAFICA_BASE]);
  for (const esp of especiesCopia) {
    if (esp.fuenteDetalle?.trim()) {
      fuentesSet.add(`${esp.nombreComun}: ${esp.fuenteDetalle.trim()}`);
    }
  }

  const contornoFoto =
    est.metodoCaracterizacion === "croquis"
      ? crearContornoCroquis(supTotalHa)
      : (est.contorno ?? diag.entrada.contorno ?? null);

  // Reintentar generación de código si por azar chocara con uno existente (§7).
  const anioActual = Number(hoyIso.slice(0, 4));
  for (let intento = 0; intento < 5; intento += 1) {
    const codigo = generarCodigoInforme(anioActual);
    const foto: FotoInforme = {
      codigo,
      emitidoEnIso,
      versionPlantilla: VERSION_PLANTILLA_INFORME,
      preparadoPara,
      desactualizado: {
        hayAviso: motivosDesact.length > 0,
        fechaReferenciaIso: diag.creadoEn.toISOString(),
        motivos: motivosDesact,
      },
      finca: {
        nombre: est.nombre,
        localidad: est.localidad,
        departamento: est.departamento,
        ecorregion: est.ecorregion,
        ecorregionNombre: obtenerNombreEcorregion(est.ecorregion as ClaveEcorregion),
        metodo: est.metodoCaracterizacion,
        superficieTotalHa: supTotalHa,
        contorno: contornoFoto,
        sectores: sectoresFoto,
      },
      diagnostico: {
        creadoEnIso: diag.creadoEn.toISOString(),
        versionReglas: diag.versionReglas,
        nivelRiesgo: diag.nivelRiesgo,
        porcentajeFlores: diag.porcentajeFlores,
        deficitPp: diag.deficitPp,
        superficieTotalHa: diag.superficieTotalHa,
        superficieCultivosHa: diag.superficieCultivosHa,
        superficieFloresHa: diag.superficieFloresHa,
        superficieSinAsignarHa: diag.superficieSinAsignarHa,
        hectareasACompensar: diag.hectareasACompensar,
        perimetroM: diag.perimetroM,
        anchoFranjaM: diag.anchoFranjaM,
        areasAptas: diag.areasAptas,
        alertas: diag.alertas,
        pasosCalculo: construirExplicacionCalculo(diag),
      },
      propuesta: {
        nombre: propFila.nombre,
        creadoEnIso: propFila.creadoEn.toISOString(),
        versionReglas: propFila.versionReglas,
        disposicion: propFila.disposicion,
        parametros: propFila.parametros,
        objetivoPct: Number(propFila.objetivoPct),
        porcentajeLogrado: Number(propFila.porcentajeLogrado),
        superficieFranjasHa: Number(propFila.superficieFranjasHa),
        superficieLibreUsadaHa: Number(propFila.superficieLibreUsadaHa),
        editadaAMano: propFila.editadaAMano,
        franjas: propFila.franjas,
        reparto: propFila.reparto,
        perdidaPorCultivo: propFila.perdidaPorCultivo,
        perdidaTotalCultivoHa,
        floracion: propFila.floracion,
        avisos: propFila.avisos,
        especies: especiesCopia,
      },
      calendario: calendarioFoto,
      fuentes: Array.from(fuentesSet),
    };

    try {
      const [creado] = await db
        .insert(informe)
        .values({
          codigo,
          establecimientoId: est.id,
          diagnosticoId: diag.id,
          propuestaId: propFila.id,
          calendarioId: calFila?.id ?? null,
          emitidoEn,
          incluyeNombre,
          versionPlantilla: VERSION_PLANTILLA_INFORME,
          contenido: foto,
        })
        .returning({ id: informe.id, codigo: informe.codigo });

      return { ok: true, informeId: creado.id, codigo: creado.codigo };
    } catch (error) {
      if (esErrorCodigoDuplicado(error) && intento < 4) continue;
      throw error;
    }
  }

  throw new Error("No se pudo generar un código único para el informe.");
}

export async function obtenerInformePorId(
  establecimientoId: string,
  informeId: string,
  usuarioId: string,
) {
  if (!esUuidValido(establecimientoId) || !esUuidValido(informeId)) return null;

  const [fila] = await db
    .select({
      informe,
      establecimientoNombre: establecimiento.nombre,
    })
    .from(informe)
    .innerJoin(establecimiento, eq(establecimiento.id, informe.establecimientoId))
    .where(
      and(
        eq(informe.id, informeId),
        eq(informe.establecimientoId, establecimientoId),
        eq(establecimiento.usuarioId, usuarioId),
      ),
    )
    .limit(1);

  if (!fila) return null;
  return {
    ...fila.informe,
    establecimientoNombre: fila.establecimientoNombre,
  };
}

export async function listarInformesDeFinca(establecimientoId: string, usuarioId: string) {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);
  if (!est) return null;

  const [filas, requisitos] = await Promise.all([
    db
      .select()
      .from(informe)
      .where(eq(informe.establecimientoId, est.id))
      .orderBy(desc(informe.emitidoEn)),
    obtenerRequisitosEmisionInforme(est.id, usuarioId),
  ]);

  return {
    establecimiento: est,
    requisitos,
    informes: filas,
  };
}

export async function listarMisInformes(usuarioId: string) {
  return db
    .select({
      id: informe.id,
      codigo: informe.codigo,
      establecimientoId: informe.establecimientoId,
      establecimientoNombre: establecimiento.nombre,
      emitidoEn: informe.emitidoEn,
      contenido: informe.contenido,
    })
    .from(informe)
    .innerJoin(establecimiento, eq(establecimiento.id, informe.establecimientoId))
    .where(eq(establecimiento.usuarioId, usuarioId))
    .orderBy(desc(informe.emitidoEn));
}

export async function borrarInformeDeFinca(params: {
  establecimientoId: string;
  informeId: string;
  usuarioId: string;
}): Promise<boolean> {
  if (!esUuidValido(params.establecimientoId) || !esUuidValido(params.informeId)) return false;

  const [est] = await db
    .select({ id: establecimiento.id })
    .from(establecimiento)
    .where(
      and(
        eq(establecimiento.id, params.establecimientoId),
        eq(establecimiento.usuarioId, params.usuarioId),
      ),
    )
    .limit(1);
  if (!est) return false;

  const borrados = await db
    .delete(informe)
    .where(and(eq(informe.id, params.informeId), eq(informe.establecimientoId, est.id)))
    .returning({ id: informe.id });

  return borrados.length > 0;
}

// Verifica límite de descargas PDF (60/hora por usuario — CA-07-13, RS-06).
export async function consumirLimiteDescargaPdf(usuarioId: string): Promise<boolean> {
  return consumirIntento(
    claveDeLimite("informe_pdf", usuarioId),
    3600,
    LIMITES_INFORME.maxDescargasPorHora,
  );
}
