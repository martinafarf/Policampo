// Servicios del servidor para el calendario agroecológico, checklist y resumen semanal (Esp. 06, T2/T4).
// Reglas: RN-10, RN-11, RN-13, RS-02, RS-05, RS-07, CA-06-06 a CA-06-15.
import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { ClaveEcorregion } from "@/datos/jujuy";
import { db } from "@/db";
import {
  calendario,
  cultivo,
  cultivoEcorregion,
  diagnostico,
  establecimiento,
  plantaServicioEcorregion,
  propuesta,
  propuestaEspecie,
  tarea,
  user,
} from "@/db/schema";
import { esUuidValido } from "@/dominio/diagnostico/entrada";
import { calcularEstadoDesactualizadaPropuesta } from "@/dominio/propuesta/servicio";
import { enviarEmail, type Email } from "@/lib/email";
import {
  LIMITES_CALENDARIO,
  calcularEstadoTarea,
  diferenciaDiasIso,
  esTareaInformativa,
  formatearFechaCortaEsAr,
  generarCalendario,
  obtenerHoyJujuyIso,
  sumarDiasIso,
  sumarMesesIso,
  validarMarcarTareaHecha,
  type CultivoEntradaCalendario,
  type EstadoTarea,
  type PlantaEntradaCalendario,
  type TipoTarea,
} from "./index";
import { firmarTokenBajaResumen, verificarTokenBajaResumen } from "./tokens";

export interface TareaConEstado {
  id: string;
  calendarioId: string;
  establecimientoId: string;
  establecimientoNombre: string;
  tipo: TipoTarea;
  plantaNombre: string | null;
  cultivoNombre: string | null;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  estimada: boolean;
  hechaEn: string | null;
  nota: string | null;
  orden: number;
  estado: EstadoTarea;
  esInformativa: boolean;
}

function enriquecerTarea(
  fila: typeof tarea.$inferSelect,
  establecimientoId: string,
  establecimientoNombre: string,
  hoyIso: string,
): TareaConEstado {
  return {
    id: fila.id,
    calendarioId: fila.calendarioId,
    establecimientoId,
    establecimientoNombre,
    tipo: fila.tipo,
    plantaNombre: fila.plantaNombre,
    cultivoNombre: fila.cultivoNombre,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    fechaInicio: fila.fechaInicio,
    fechaFin: fila.fechaFin,
    estimada: fila.estimada,
    hechaEn: fila.hechaEn,
    nota: fila.nota,
    orden: fila.orden,
    estado: calcularEstadoTarea(
      { fechaInicio: fila.fechaInicio, fechaFin: fila.fechaFin, hechaEn: fila.hechaEn },
      hoyIso,
    ),
    esInformativa: esTareaInformativa(fila.tipo),
  };
}

export type ResultadoGenerarCalendarioServicio =
  | { ok: true; calendarioId: string; creado: boolean }
  | {
      ok: false;
      motivo: "no_encontrado" | "sin_propuesta_elegida" | "sin_mezcla" | "temporada_no_lista";
      mensaje: string;
    };

// Genera, regenera o abre próxima temporada de calendario para una finca propia (CA-06-06, 10, 11).
export async function generarCalendarioEnBase(params: {
  establecimientoId: string;
  usuarioId: string;
  modo?: "nuevo" | "regenerar" | "proxima_temporada";
  hoyIso?: string;
}): Promise<ResultadoGenerarCalendarioServicio> {
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

  const hoyIso = params.hoyIso ?? obtenerHoyJujuyIso();
  const modo = params.modo ?? "nuevo";

  const [activo] = await db
    .select()
    .from(calendario)
    .where(and(eq(calendario.establecimientoId, est.id), isNull(calendario.cerradoEn)))
    .limit(1);

  if (modo === "nuevo" && activo) {
    return { ok: true, calendarioId: activo.id, creado: false };
  }

  if (modo === "proxima_temporada") {
    if (!activo) {
      return {
        ok: false,
        motivo: "temporada_no_lista",
        mensaje: "Todavía no tenés una temporada activa para cerrar.",
      };
    }
    const diasRestantes = diferenciaDiasIso(activo.temporadaFin, hoyIso);
    if (diasRestantes >= LIMITES_CALENDARIO.diasAvisoProximaTemporada) {
      return {
        ok: false,
        motivo: "temporada_no_lista",
        mensaje: "Todavía falta más de un mes para que termine la temporada actual.",
      };
    }
  }

  // Cargar propuesta elegida y su mezcla (CA-06-06).
  const [propElegida] = await db
    .select()
    .from(propuesta)
    .where(and(eq(propuesta.establecimientoId, est.id), eq(propuesta.elegida, true)))
    .limit(1);

  if (!propElegida) {
    return {
      ok: false,
      motivo: "sin_propuesta_elegida",
      mensaje: "Primero elegí una propuesta de rediseño.",
    };
  }

  const filasEspecies = await db
    .select()
    .from(propuestaEspecie)
    .where(eq(propuestaEspecie.propuestaId, propElegida.id))
    .orderBy(asc(propuestaEspecie.orden));

  if (filasEspecies.length === 0) {
    return {
      ok: false,
      motivo: "sin_mezcla",
      mensaje: "Tu propuesta no tiene plantas recomendadas: no hay tareas para generar.",
    };
  }

  const ecorregion = est.ecorregion as ClaveEcorregion;

  // Buscar semanasHastaFloracionMax por planta en la ecorregión de la finca.
  const filasPeriodosPlantas = await db
    .select({
      plantaId: plantaServicioEcorregion.plantaId,
      semanasHastaFloracionMax: plantaServicioEcorregion.semanasHastaFloracionMax,
      semanasHastaFloracionMin: plantaServicioEcorregion.semanasHastaFloracionMin,
    })
    .from(plantaServicioEcorregion)
    .where(
      and(
        inArray(
          plantaServicioEcorregion.plantaId,
          filasEspecies.map((e) => e.plantaId),
        ),
        eq(plantaServicioEcorregion.ecorregion, ecorregion),
      ),
    );
  const mapaFlorMax = new Map(
    filasPeriodosPlantas.map((p) => [
      p.plantaId,
      p.semanasHastaFloracionMax ?? p.semanasHastaFloracionMin ?? null,
    ]),
  );

  const plantasEntrada: PlantaEntradaCalendario[] = filasEspecies.map((e) => ({
    nombreComun: e.copia.nombreComun,
    dosisSiembra: e.copia.dosisSiembra,
    manejoCorte: e.copia.manejoCorte,
    siembraSemanas: e.copia.siembraSemanas,
    floracionSemanas: e.copia.floracionSemanas,
    corteSemanas: e.copia.corteSemanas,
    semanasHastaFloracionMax: mapaFlorMax.get(e.plantaId) ?? null,
  }));

  // Cargar cultivos de la finca (desde el diagnóstico de la propuesta) con sus semanas publicadas.
  const [diag] = await db
    .select()
    .from(diagnostico)
    .where(eq(diagnostico.id, propElegida.diagnosticoId))
    .limit(1);

  const clavesCultivos = Array.from(
    new Set(
      (diag?.entrada.sectores ?? [])
        .filter((s) => s.tipo === "cultivo" && s.cultivoClave)
        .map((s) => s.cultivoClave as string),
    ),
  );

  const filasCultivos =
    clavesCultivos.length > 0
      ? await db
          .select({
            nombre: cultivo.nombre,
            floracionSemanas: cultivoEcorregion.floracionSemanas,
            cosechaSemanas: cultivoEcorregion.cosechaSemanas,
          })
          .from(cultivo)
          .innerJoin(
            cultivoEcorregion,
            and(
              eq(cultivoEcorregion.cultivoId, cultivo.id),
              eq(cultivoEcorregion.ecorregion, ecorregion),
            ),
          )
          .where(and(inArray(cultivo.clave, clavesCultivos), eq(cultivo.estado, "publicado")))
      : [];

  const cultivosEntrada: CultivoEntradaCalendario[] = filasCultivos.map((c) => ({
    nombre: c.nombre,
    floracionSemanas: c.floracionSemanas,
    cosechaSemanas: c.cosechaSemanas,
  }));

  // Determinar inicio y fin de temporada según modo (§5.4 y §5.5).
  let inicioTemporada = hoyIso;
  let finTemporada: string | undefined;

  if (modo === "regenerar" && activo) {
    const diasRestantes = diferenciaDiasIso(activo.temporadaFin, hoyIso);
    if (diasRestantes >= LIMITES_CALENDARIO.diasAvisoProximaTemporada) {
      finTemporada = activo.temporadaFin;
    }
  } else if (modo === "proxima_temporada" && activo) {
    inicioTemporada = sumarDiasIso(activo.temporadaFin, 1);
    finTemporada = sumarMesesIso(inicioTemporada, LIMITES_CALENDARIO.mesesTemporada);
  }

  const generado = generarCalendario({
    hoyIso: inicioTemporada,
    temporadaFinIso: finTemporada,
    plantas: plantasEntrada,
    cultivos: cultivosEntrada,
  });

  // En una sola transacción: cerrar activo (si existe) y crear el nuevo (garantizado por índice único parcial).
  const nuevoId = await db.transaction(async (tx) => {
    if (activo) {
      await tx
        .update(calendario)
        .set({ cerradoEn: new Date() })
        .where(eq(calendario.id, activo.id));
    }

    const [creado] = await tx
      .insert(calendario)
      .values({
        establecimientoId: est.id,
        propuestaId: propElegida.id,
        temporadaInicio: generado.temporadaInicio,
        temporadaFin: generado.temporadaFin,
        versionReglas: generado.versionReglas,
        avisos: generado.avisos,
      })
      .returning({ id: calendario.id });

    if (generado.tareas.length > 0) {
      await tx.insert(tarea).values(
        generado.tareas.map((t) => ({
          calendarioId: creado.id,
          tipo: t.tipo,
          plantaNombre: t.plantaNombre,
          cultivoNombre: t.cultivoNombre,
          titulo: t.titulo,
          descripcion: t.descripcion,
          fechaInicio: t.fechaInicio,
          fechaFin: t.fechaFin,
          estimada: t.estimada,
          orden: t.orden,
        })),
      );
    }

    return creado.id;
  });

  return { ok: true, calendarioId: nuevoId, creado: true };
}

export async function marcarTareaHechaEnBase(params: {
  tareaId: string;
  usuarioId: string;
  fechaHechaIso: string;
  nota?: string | null;
  hoyIso?: string;
}): Promise<{ ok: true } | { ok: false; motivo: "no_encontrado" | "invalido"; error: string }> {
  if (!esUuidValido(params.tareaId)) {
    return { ok: false, motivo: "no_encontrado", error: "Tarea no encontrada." };
  }

  const [fila] = await db
    .select({
      tarea,
      calendario,
      establecimientoUsuarioId: establecimiento.usuarioId,
    })
    .from(tarea)
    .innerJoin(calendario, eq(calendario.id, tarea.calendarioId))
    .innerJoin(establecimiento, eq(establecimiento.id, calendario.establecimientoId))
    .where(and(eq(tarea.id, params.tareaId), eq(establecimiento.usuarioId, params.usuarioId)))
    .limit(1);

  if (!fila) {
    return { ok: false, motivo: "no_encontrado", error: "Tarea no encontrada." };
  }

  if (fila.calendario.cerradoEn !== null) {
    return {
      ok: false,
      motivo: "invalido",
      error: "Este calendario ya está cerrado en el historial y no se puede modificar.",
    };
  }

  const hoyIso = params.hoyIso ?? obtenerHoyJujuyIso();
  const valid = validarMarcarTareaHecha({
    tipo: fila.tarea.tipo,
    fechaHechaIso: params.fechaHechaIso,
    nota: params.nota,
    temporadaInicioIso: fila.calendario.temporadaInicio,
    hoyIso,
  });

  if (!valid.valido) {
    return { ok: false, motivo: "invalido", error: valid.error };
  }

  await db
    .update(tarea)
    .set({ hechaEn: valid.fechaHecha, nota: valid.nota })
    .where(eq(tarea.id, fila.tarea.id));

  return { ok: true };
}

export async function desmarcarTareaEnBase(params: {
  tareaId: string;
  usuarioId: string;
}): Promise<{ ok: true } | { ok: false; motivo: "no_encontrado" | "invalido"; error: string }> {
  if (!esUuidValido(params.tareaId)) {
    return { ok: false, motivo: "no_encontrado", error: "Tarea no encontrada." };
  }

  const [fila] = await db
    .select({
      tareaId: tarea.id,
      cerradoEn: calendario.cerradoEn,
    })
    .from(tarea)
    .innerJoin(calendario, eq(calendario.id, tarea.calendarioId))
    .innerJoin(establecimiento, eq(establecimiento.id, calendario.establecimientoId))
    .where(and(eq(tarea.id, params.tareaId), eq(establecimiento.usuarioId, params.usuarioId)))
    .limit(1);

  if (!fila) {
    return { ok: false, motivo: "no_encontrado", error: "Tarea no encontrada." };
  }
  if (fila.cerradoEn !== null) {
    return { ok: false, motivo: "invalido", error: "Este calendario está cerrado en el historial." };
  }

  await db.update(tarea).set({ hechaEn: null, nota: null }).where(eq(tarea.id, fila.tareaId));
  return { ok: true };
}

export async function obtenerCalendarioActivoDeFinca(
  establecimientoId: string,
  usuarioId: string,
  hoyIso = obtenerHoyJujuyIso(),
) {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);
  if (!est) return null;

  const [[activo], [propElegida], [ultimoDiag]] = await Promise.all([
    db
      .select()
      .from(calendario)
      .where(and(eq(calendario.establecimientoId, est.id), isNull(calendario.cerradoEn)))
      .limit(1),
    db
      .select()
      .from(propuesta)
      .where(and(eq(propuesta.establecimientoId, est.id), eq(propuesta.elegida, true)))
      .limit(1),
    db
      .select({ id: diagnostico.id, creadoEn: diagnostico.creadoEn })
      .from(diagnostico)
      .where(eq(diagnostico.establecimientoId, est.id))
      .orderBy(desc(diagnostico.creadoEn))
      .limit(1),
  ]);

  let propuestaDesactualizada = false;
  let motivosPropuestaDesactualizada: string[] = [];
  if (propElegida) {
    const estadoProp = calcularEstadoDesactualizadaPropuesta({
      propuestaCreadoEn: propElegida.creadoEn,
      propuestaDiagnosticoId: propElegida.diagnosticoId,
      establecimientoActualizadoEn: est.actualizadoEn,
      ultimoDiagnostico: ultimoDiag ?? null,
      especiesConEstadoActual: [],
    });
    propuestaDesactualizada = estadoProp.desactualizada;
    motivosPropuestaDesactualizada = estadoProp.motivos;
  }

  if (!activo) {
    return {
      establecimiento: est,
      propuestaElegida: propElegida ?? null,
      calendario: null,
      tareas: [] as TareaConEstado[],
      hoyIso,
      puedeGenerarProximaTemporada: false,
      propuestaCambioDesdeCalendario: false,
      propuestaDesactualizada,
      motivosPropuestaDesactualizada,
    };
  }

  const filasTareas = await db
    .select()
    .from(tarea)
    .where(eq(tarea.calendarioId, activo.id))
    .orderBy(asc(tarea.fechaInicio), asc(tarea.orden));

  const diasRestantes = diferenciaDiasIso(activo.temporadaFin, hoyIso);

  return {
    establecimiento: est,
    propuestaElegida: propElegida ?? null,
    calendario: activo,
    tareas: filasTareas.map((t) => enriquecerTarea(t, est.id, est.nombre, hoyIso)),
    hoyIso,
    puedeGenerarProximaTemporada: diasRestantes < LIMITES_CALENDARIO.diasAvisoProximaTemporada,
    propuestaCambioDesdeCalendario: Boolean(propElegida && activo.propuestaId !== propElegida.id),
    propuestaDesactualizada,
    motivosPropuestaDesactualizada,
  };
}

export async function listarHistorialCalendariosDeFinca(
  establecimientoId: string,
  usuarioId: string,
) {
  if (!esUuidValido(establecimientoId)) return null;

  const [est] = await db
    .select()
    .from(establecimiento)
    .where(and(eq(establecimiento.id, establecimientoId), eq(establecimiento.usuarioId, usuarioId)))
    .limit(1);
  if (!est) return null;

  const cerrados = await db
    .select()
    .from(calendario)
    .where(eq(calendario.establecimientoId, est.id))
    .orderBy(desc(calendario.generadoEn));

  const soloCerrados = cerrados.filter((c) => c.cerradoEn !== null);
  const ids = soloCerrados.map((c) => c.id);

  const filasTareas =
    ids.length > 0
      ? await db
          .select()
          .from(tarea)
          .where(inArray(tarea.calendarioId, ids))
          .orderBy(asc(tarea.fechaInicio), asc(tarea.orden))
      : [];

  const porCalendario = new Map<string, (typeof tarea.$inferSelect)[]>();
  for (const t of filasTareas) {
    const lista = porCalendario.get(t.calendarioId) ?? [];
    lista.push(t);
    porCalendario.set(t.calendarioId, lista);
  }

  return {
    establecimiento: est,
    calendarios: soloCerrados.map((c) => {
      const lista = porCalendario.get(c.id) ?? [];
      return {
        ...c,
        tareasHechas: lista.filter((t) => t.hechaEn !== null),
        totalTareasAccionables: lista.filter((t) => !esTareaInformativa(t.tipo)).length,
      };
    }),
  };
}

// Todas las tareas de todos los calendarios activos de un usuario (Mis tareas + Inicio, CA-06-12).
export async function listarMisTareas(usuarioId: string, hoyIso = obtenerHoyJujuyIso()) {
  const filas = await db
    .select({
      tarea,
      establecimientoId: establecimiento.id,
      establecimientoNombre: establecimiento.nombre,
    })
    .from(tarea)
    .innerJoin(calendario, eq(calendario.id, tarea.calendarioId))
    .innerJoin(establecimiento, eq(establecimiento.id, calendario.establecimientoId))
    .where(and(eq(establecimiento.usuarioId, usuarioId), isNull(calendario.cerradoEn)))
    .orderBy(asc(tarea.fechaInicio), asc(tarea.orden));

  return filas.map((f) =>
    enriquecerTarea(f.tarea, f.establecimientoId, f.establecimientoNombre, hoyIso),
  );
}

// Inicio: atrasadas primero y después las 5 próximas o en curso (CA-06-12).
export async function obtenerResumenTareasParaInicio(
  usuarioId: string,
  hoyIso = obtenerHoyJujuyIso(),
) {
  const todas = (await listarMisTareas(usuarioId, hoyIso)).filter(
    (t) => !t.esInformativa && t.estado !== "hecha",
  );
  const atrasadas = todas.filter((t) => t.estado === "atrasada");
  const proximasOEnCurso = todas
    .filter((t) => t.estado === "en_curso" || t.estado === "proxima")
    .slice(0, LIMITES_CALENDARIO.maxTareasInicio);

  return {
    atrasadas,
    proximasOEnCurso,
    totalPendientes: todas.length,
  };
}

// --- Resumen semanal por email y baja sin sesión (§5.6, CA-06-14, CA-06-15) ---

export async function actualizarPreferenciaResumenSemanal(usuarioId: string, activo: boolean) {
  await db
    .update(user)
    .set({ resumenSemanal: activo, updatedAt: new Date() })
    .where(eq(user.id, usuarioId));
}

export async function obtenerPreferenciaResumenSemanal(usuarioId: string): Promise<boolean> {
  const [u] = await db
    .select({ resumenSemanal: user.resumenSemanal })
    .from(user)
    .where(eq(user.id, usuarioId))
    .limit(1);
  return Boolean(u?.resumenSemanal);
}

export async function procesarBajaResumenPorToken(token: string, secreto: string): Promise<boolean> {
  const verif = verificarTokenBajaResumen(token, secreto);
  if (!verif.valido) return false;

  const res = await db
    .update(user)
    .set({ resumenSemanal: false, updatedAt: new Date() })
    .where(eq(user.id, verif.usuarioId))
    .returning({ id: user.id });

  return res.length > 0;
}

// Envío semanal idempotente: no reenvía si resumenUltimoEnvio fue en los últimos 6 días (CA-06-14, RS-05).
export async function ejecutarEnvioResumenSemanal(params: {
  hoyIso?: string;
  baseUrl: string;
  secretoBaja: string;
  enviarFn?: (email: Email) => Promise<void>;
}): Promise<{ evaluados: number; enviados: number; omitidos: number }> {
  const hoyIso = params.hoyIso ?? obtenerHoyJujuyIso();
  const limiteProximasIso = sumarDiasIso(hoyIso, LIMITES_CALENDARIO.diasResumenSemanal);
  const limiteIdempotenciaIso = sumarDiasIso(hoyIso, -6);
  const enviar = params.enviarFn ?? enviarEmail;

  const suscriptos = await db
    .select({
      id: user.id,
      email: user.email,
      resumenUltimoEnvio: user.resumenUltimoEnvio,
    })
    .from(user)
    .where(and(eq(user.resumenSemanal, true), eq(user.emailVerified, true)));

  let enviados = 0;
  let omitidos = 0;

  for (const u of suscriptos) {
    // Idempotencia semanal (CA-06-14)
    if (u.resumenUltimoEnvio && u.resumenUltimoEnvio > limiteIdempotenciaIso) {
      omitidos += 1;
      continue;
    }

    const tareas = (await listarMisTareas(u.id, hoyIso)).filter(
      (t) =>
        !t.esInformativa &&
        t.estado !== "hecha" &&
        (t.estado === "atrasada" || t.estado === "en_curso" || t.fechaInicio <= limiteProximasIso),
    );

    if (tareas.length === 0) {
      omitidos += 1;
      continue;
    }

    // Agrupar por finca SIN notas ni ubicaciones (RS-05, §5.6).
    const porFinca = new Map<string, TareaConEstado[]>();
    for (const t of tareas) {
      const lista = porFinca.get(t.establecimientoNombre) ?? [];
      lista.push(t);
      porFinca.set(t.establecimientoNombre, lista);
    }

    const tokenBaja = firmarTokenBajaResumen(u.id, params.secretoBaja);
    const urlTareas = `${params.baseUrl.replace(/\/$/, "")}/tareas`;
    const urlBaja = `${params.baseUrl.replace(/\/$/, "")}/baja-resumen?token=${encodeURIComponent(tokenBaja)}`;

    const bloquesTexto: string[] = [];
    const bloquesHtml: string[] = [];

    for (const [fincaNombre, lista] of porFinca.entries()) {
      bloquesTexto.push(
        `\n${fincaNombre}:\n` +
          lista
            .map(
              (t) =>
                `- [${t.estado === "atrasada" ? "Atrasada" : t.estado === "en_curso" ? "En curso" : "Próxima"}] ${t.titulo} (${formatearFechaCortaEsAr(t.fechaInicio)})`,
            )
            .join("\n"),
      );
      bloquesHtml.push(
        `<h3>${escapeHtml(fincaNombre)}</h3><ul>` +
          lista
            .map(
              (t) =>
                `<li><strong>${escapeHtml(t.titulo)}</strong> — ${escapeHtml(formatearFechaCortaEsAr(t.fechaInicio))}</li>`,
            )
            .join("") +
          `</ul>`,
      );
    }

    const texto =
      `Hola,\n\nEstas son tus tareas agroecológicas atrasadas y de las próximas 2 semanas en PoliCampo:` +
      bloquesTexto.join("\n") +
      `\n\nVer todas tus tareas: ${urlTareas}\n` +
      `Dejar de recibir este resumen: ${urlBaja}\n`;

    const html =
      `<p>Hola,</p><p>Estas son tus tareas agroecológicas atrasadas y de las próximas 2 semanas en PoliCampo:</p>` +
      bloquesHtml.join("") +
      `<p><a href="${urlTareas}">Abrir Mis tareas</a></p>` +
      `<p style="font-size:12px;color:#666"><a href="${urlBaja}">Dejar de recibir este resumen</a></p>`;

    await enviar({
      para: u.email,
      asunto: "Tu resumen semanal de tareas en PoliCampo",
      texto,
      html,
    });

    await db
      .update(user)
      .set({ resumenUltimoEnvio: hoyIso })
      .where(eq(user.id, u.id));
    enviados += 1;
  }

  return { evaluados: suscriptos.length, enviados, omitidos };
}

function escapeHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
