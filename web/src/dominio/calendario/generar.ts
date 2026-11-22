// Generación pura del calendario agroecológico a 12 meses (Esp. 06, §4, CA-06-01 a 05).
// Sin acceso a base de datos ni reloj; recibe "hoyIso" explícitamente.
import type { RangoSemanas } from "@/dominio/catalogo/tipos";
import {
  agruparRangosSemanasContinuos,
  formatearFechaCortaEsAr,
  proximaOcurrenciaEnTemporada,
  sumarDiasIso,
  sumarMesesIso,
} from "./fechas";
import {
  LIMITES_CALENDARIO,
  VERSION_REGLAS_CALENDARIO,
  type AvisoCalendario,
  type EntradaGeneracionCalendario,
  type ResultadoGeneracionCalendario,
  type TareaGenerada,
} from "./tipos";

function semanaSiguiente(semana: number): number {
  return semana >= 52 ? 1 : semana + 1;
}

export function generarCalendario(
  entrada: EntradaGeneracionCalendario,
): ResultadoGeneracionCalendario {
  const temporadaInicio = entrada.hoyIso;
  const temporadaFin =
    entrada.temporadaFinIso ?? sumarMesesIso(temporadaInicio, LIMITES_CALENDARIO.mesesTemporada);

  const tareas: TareaGenerada[] = [];
  const avisos: AvisoCalendario[] = [];

  if (entrada.plantas.length === 0) {
    avisos.push({
      codigo: "sin_plantas_en_mezcla",
      mensaje: "Tu propuesta no tiene plantas recomendadas: no hay tareas para generar.",
    });
    return {
      versionReglas: VERSION_REGLAS_CALENDARIO,
      temporadaInicio,
      temporadaFin,
      tareas: [],
      avisos,
    };
  }

  // 1. Períodos informativos de cultivos y búsqueda del cultivo que florece primero (§4.3).
  let primeraFloracionCultivo: { cultivoNombre: string; fechaInicio: string } | null = null;

  for (const cult of entrada.cultivos) {
    const periodosFlor = agruparRangosSemanasContinuos(cult.floracionSemanas);
    for (const p of periodosFlor) {
      const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
      if (!oc) continue;

      tareas.push({
        tipo: "info_floracion_cultivo",
        plantaNombre: null,
        cultivoNombre: cult.nombre,
        titulo: `Floración de ${cult.nombre}`,
        descripcion: `Período informativo de floración de ${cult.nombre} en la ecorregión.`,
        fechaInicio: oc.fechaInicio,
        fechaFin: oc.fechaFin,
        estimada: false,
        orden: 0,
      });

      if (
        !primeraFloracionCultivo ||
        oc.fechaInicio < primeraFloracionCultivo.fechaInicio
      ) {
        primeraFloracionCultivo = {
          cultivoNombre: cult.nombre,
          fechaInicio: oc.fechaInicio,
        };
      }
    }

    const periodosCosecha = agruparRangosSemanasContinuos(cult.cosechaSemanas);
    for (const p of periodosCosecha) {
      const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
      if (!oc) continue;

      tareas.push({
        tipo: "info_cosecha_cultivo",
        plantaNombre: null,
        cultivoNombre: cult.nombre,
        titulo: `Cosecha de ${cult.nombre}`,
        descripcion: `Período informativo de cosecha de ${cult.nombre}.`,
        fechaInicio: oc.fechaInicio,
        fechaFin: oc.fechaFin,
        estimada: false,
        orden: 0,
      });
    }
  }

  if (!primeraFloracionCultivo) {
    avisos.push({
      codigo: "sin_floracion_cultivos",
      mensaje: "No sabemos cuándo florecen tus cultivos: no podemos calcular la fecha límite.",
    });
  }

  // 2. Tareas por cada planta de la mezcla (siembra, fecha límite, corte e info floración).
  const todosLosRangosFloracionPlantas: RangoSemanas[] = [];

  for (const planta of entrada.plantas) {
    // 2a. Siembra
    const periodosSiembra = agruparRangosSemanasContinuos(planta.siembraSemanas);
    let primeraVentanaSiembra: { fechaInicio: string; fechaFin: string } | null = null;

    for (const p of periodosSiembra) {
      const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
      if (!oc) continue;
      if (!primeraVentanaSiembra || oc.fechaInicio < primeraVentanaSiembra.fechaInicio) {
        primeraVentanaSiembra = oc;
      }

      const dosisTexto = planta.dosisSiembra ? ` (${planta.dosisSiembra})` : "";
      tareas.push({
        tipo: "siembra",
        plantaNombre: planta.nombreComun,
        cultivoNombre: null,
        titulo: `Sembrar ${planta.nombreComun}`,
        descripcion: `Sembrá ${planta.nombreComun} en las franjas${dosisTexto}.`,
        fechaInicio: oc.fechaInicio,
        fechaFin: oc.fechaFin,
        estimada: false,
        orden: 0,
      });
    }

    // 2b. Fecha límite de siembra (§4.3, CA-06-01, CA-06-05)
    if (primeraFloracionCultivo && planta.semanasHastaFloracionMax && planta.semanasHastaFloracionMax > 0) {
      const semanasResta = LIMITES_CALENDARIO.semanasAnticipacion + planta.semanasHastaFloracionMax;
      const fechaLimite = sumarDiasIso(primeraFloracionCultivo.fechaInicio, -(semanasResta * 7));

      const descripcionCalculo =
        `Última fecha para sembrar ${planta.nombreComun} y que florezca antes que ${primeraFloracionCultivo.cultivoNombre}. ` +
        `${primeraFloracionCultivo.cultivoNombre} florece desde el ${formatearFechaCortaEsAr(primeraFloracionCultivo.fechaInicio)}; ` +
        `${planta.nombreComun} tarda hasta ${planta.semanasHastaFloracionMax} semanas en florecer; se suma ${LIMITES_CALENDARIO.semanasAnticipacion} semana de anticipación.`;

      tareas.push({
        tipo: "limite_siembra",
        plantaNombre: planta.nombreComun,
        cultivoNombre: primeraFloracionCultivo.cultivoNombre,
        titulo: `Fecha límite de siembra: ${planta.nombreComun}`,
        descripcion: descripcionCalculo,
        fechaInicio: fechaLimite,
        fechaFin: fechaLimite,
        estimada: false,
        orden: 0,
      });

      if (primeraVentanaSiembra && fechaLimite < primeraVentanaSiembra.fechaInicio) {
        avisos.push({
          codigo: "limite_antes_siembra",
          mensaje: `Para que ${planta.nombreComun} florezca antes que ${primeraFloracionCultivo.cultivoNombre} convendría sembrar antes del ${formatearFechaCortaEsAr(fechaLimite)}, pero la siembra recomendada empieza el ${formatearFechaCortaEsAr(primeraVentanaSiembra.fechaInicio)}.`,
        });
      }

      if (fechaLimite < temporadaInicio) {
        avisos.push({
          codigo: "limite_pasado",
          mensaje: `Para esta temporada ya pasó la fecha ideal de ${planta.nombreComun} (${formatearFechaCortaEsAr(fechaLimite)}): si sembrás ahora, puede florecer después que ${primeraFloracionCultivo.cultivoNombre}.`,
        });
      }
    }

    // 2c. Floración de la planta (informativa + acumular para "No pulverizar")
    const periodosFlorPlanta = agruparRangosSemanasContinuos(planta.floracionSemanas);
    for (const r of planta.floracionSemanas) {
      todosLosRangosFloracionPlantas.push(r);
    }
    for (const p of periodosFlorPlanta) {
      const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
      if (!oc) continue;

      tareas.push({
        tipo: "info_floracion_planta",
        plantaNombre: planta.nombreComun,
        cultivoNombre: null,
        titulo: `Floración de ${planta.nombreComun}`,
        descripcion: `Período informativo de floración de ${planta.nombreComun} en las franjas.`,
        fechaInicio: oc.fechaInicio,
        fechaFin: oc.fechaFin,
        estimada: false,
        orden: 0,
      });
    }

    // 2d. Corte / manejo (RN-11, CA-06-04: si falta corteSemanas, semana siguiente al fin de floración con estimada=true)
    const periodosCorte = agruparRangosSemanasContinuos(planta.corteSemanas);
    const manejoTexto = planta.manejoCorte ? ` ${planta.manejoCorte}` : "";

    if (periodosCorte.length > 0) {
      for (const p of periodosCorte) {
        const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
        if (!oc) continue;
        tareas.push({
          tipo: "corte",
          plantaNombre: planta.nombreComun,
          cultivoNombre: null,
          titulo: `Cortar / manejar ${planta.nombreComun}`,
          descripcion: `Cortá ${planta.nombreComun} antes de que forme semillas y se vuelva maleza.${manejoTexto}`,
          fechaInicio: oc.fechaInicio,
          fechaFin: oc.fechaFin,
          estimada: false,
          orden: 0,
        });
      }
    } else if (periodosFlorPlanta.length > 0) {
      for (const pFlor of periodosFlorPlanta) {
        const semCorte = semanaSiguiente(pFlor.finSemana);
        const oc = proximaOcurrenciaEnTemporada(
          { inicioSemana: semCorte, finSemana: semCorte, cruzaAnio: false },
          temporadaInicio,
          temporadaFin,
        );
        if (!oc) continue;
        tareas.push({
          tipo: "corte",
          plantaNombre: planta.nombreComun,
          cultivoNombre: null,
          titulo: `Cortar / manejar ${planta.nombreComun} (fecha estimada)`,
          descripcion: `Cortá ${planta.nombreComun} antes de que forme semillas y se vuelva maleza.${manejoTexto}`,
          fechaInicio: oc.fechaInicio,
          fechaFin: oc.fechaFin,
          estimada: true,
          orden: 0,
        });
      }
    }
  }

  // 3. No pulverizar: unión de los períodos de floración de toda la mezcla (§4.3).
  const periodosNoPulverizar = agruparRangosSemanasContinuos(todosLosRangosFloracionPlantas);
  for (const p of periodosNoPulverizar) {
    const oc = proximaOcurrenciaEnTemporada(p, temporadaInicio, temporadaFin);
    if (!oc) continue;
    tareas.push({
      tipo: "no_pulverizar",
      plantaNombre: null,
      cultivoNombre: null,
      titulo: "No pulverizar (franjas en flor)",
      descripcion:
        "Las franjas están en flor: evitá aplicar insecticidas, sobre todo en las horas de mayor actividad de los polinizadores. Consultá con tu ingeniero agrónomo.",
      fechaInicio: oc.fechaInicio,
      fechaFin: oc.fechaFin,
      estimada: false,
      orden: 0,
    });
  }

  // Ordenar cronológicamente y asignar orden secuencial.
  tareas.sort(
    (a, b) =>
      a.fechaInicio.localeCompare(b.fechaInicio) ||
      a.fechaFin.localeCompare(b.fechaFin) ||
      a.titulo.localeCompare(b.titulo, "es-AR"),
  );
  tareas.forEach((t, idx) => {
    t.orden = idx + 1;
  });

  return {
    versionReglas: VERSION_REGLAS_CALENDARIO,
    temporadaInicio,
    temporadaFin,
    tareas,
    avisos,
  };
}
