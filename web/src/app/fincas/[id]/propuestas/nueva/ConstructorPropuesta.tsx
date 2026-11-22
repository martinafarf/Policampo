"use client";

// Constructor interactivo de propuestas de rediseño (Esp. 05 §6.1, §7, CA-05-06, 07, 14, 15, 21).
// Incluye ajuste de objetivo (10–40 %), comparador de alternativas, parámetros de disposición,
// ajuste de reparto (cuestionario), cambio de especies candidatas y borrador local (RS-08).
import { useMemo, useState, useTransition } from "react";
import type { SectorDibujable } from "@/app/fincas/[id]/VistaPreviaDibujo";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import type {
  MetodoCaracterizacion,
  PoligonoGeoJson,
  UbicacionRelativa,
} from "@/dominio/establecimientos";
import {
  ETIQUETAS_DISPOSICION,
  LIMITES_PROPUESTA,
  evaluarFloracionMezcla,
  validarRepartoCuestionario,
  type AlternativaEspacial,
  type CultivoParaMezcla,
  type DisposicionPropuesta,
  type EspecieEnMezcla,
  type ParametrosDisposicion,
  type PropuestaCuestionario,
  type RepartoUbicacionItem,
  type ResultadoMezcla,
} from "@/dominio/propuesta";
import {
  guardarPropuestaAccion,
  recalcularAlternativasPorObjetivoAccion,
  recalcularUnaDisposicionAccion,
} from "../acciones";

interface Props {
  establecimientoId: string;
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number;
  superficieFloresActualHa: number;
  contorno: PoligonoGeoJson | null;
  sectores: readonly (SectorDibujable & { ubicacionRelativa?: UbicacionRelativa | null })[];
  cultivosParaMezcla: readonly CultivoParaMezcla[];
  objetivoInicialPct: number;
  superficieAAgregarInicialHa: number;
  alternativasIniciales: readonly AlternativaEspacial[];
  cuestionarioInicial: PropuestaCuestionario | null;
  mezclaInicial: ResultadoMezcla;
  nombreInicial?: string;
  disposicionInicial?: DisposicionPropuesta;
  especiesInicialesIds?: readonly string[];
}

function claveBorrador(establecimientoId: string) {
  return `policampo_borrador_propuesta_${establecimientoId}`;
}

export function ConstructorPropuesta({
  establecimientoId,
  metodo,
  superficieTotalHa,
  superficieFloresActualHa,
  contorno,
  sectores,
  cultivosParaMezcla,
  objetivoInicialPct,
  superficieAAgregarInicialHa,
  alternativasIniciales,
  cuestionarioInicial,
  mezclaInicial,
  nombreInicial = "",
  disposicionInicial,
  especiesInicialesIds,
}: Props) {
  const [objetivoPct, setObjetivoPct] = useState<number>(objetivoInicialPct);
  const [superficieAAgregarHa, setSuperficieAAgregarHa] = useState<number>(
    superficieAAgregarInicialHa,
  );
  const [alternativas, setAlternativas] = useState<AlternativaEspacial[]>([...alternativasIniciales]);
  const [propCuestionario, setPropCuestionario] = useState<PropuestaCuestionario | null>(
    cuestionarioInicial,
  );
  const [repartoEditado, setRepartoEditado] = useState<RepartoUbicacionItem[]>(
    cuestionarioInicial?.reparto ?? [],
  );

  const dispInicialValida =
    disposicionInicial &&
    disposicionInicial !== "texto" &&
    alternativasIniciales.some((a) => a.disposicion === disposicionInicial)
      ? disposicionInicial
      : (alternativasIniciales[0]?.disposicion ?? "perimetral");

  const [disposicionElegida, setDisposicionElegida] =
    useState<Exclude<DisposicionPropuesta, "texto">>(dispInicialValida);

  const [plantaIdsSeleccionadas, setPlantaIdsSeleccionadas] = useState<string[]>(() => {
    if (especiesInicialesIds && especiesInicialesIds.length > 0) {
      const validas = new Set(mezclaInicial.candidatasDisponibles.map((c) => c.plantaId));
      const filtradas = especiesInicialesIds.filter((id) => validas.has(id));
      if (filtradas.length > 0) return filtradas;
    }
    return mezclaInicial.especies.map((e) => e.plantaId);
  });

  const [nombre, setNombre] = useState<string>(nombreInicial);
  const [errores, setErrores] = useState<string[]>([]);
  const [pendienteCalc, iniciarCalculo] = useTransition();
  const [pendienteGuardar, iniciarGuardado] = useTransition();

  const alternativaActual = useMemo(() => {
    return alternativas.find((a) => a.disposicion === disposicionElegida) ?? alternativas[0] ?? null;
  }, [alternativas, disposicionElegida]);

  // Recalcular en vivo la mezcla elegida y su cobertura de floración (§5.6).
  const { especiesActivas, floracionActiva } = useMemo(() => {
    const mapa = new Map(mezclaInicial.candidatasDisponibles.map((c) => [c.plantaId, c]));
    const seleccion = plantaIdsSeleccionadas
      .map((id) => mapa.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const n = seleccion.length;
    const propPct = n > 0 ? Math.round((100 / n) * 10) / 10 : 0;
    const especies: EspecieEnMezcla[] = seleccion.map((p, idx) => ({
      plantaId: p.plantaId,
      clave: p.clave,
      nombreComun: p.nombreComun,
      nombreCientifico: p.nombreCientifico,
      proporcionPct: propPct,
      orden: idx + 1,
      puntajeCompatibilidad: p.puntajeCompatibilidad,
      funciones: p.funciones,
      ciclo: p.ciclo,
      origen: p.origen,
      esEspontanea: p.esEspontanea,
      enMercadoLocal: p.enMercadoLocal,
      necesidadAgua: p.necesidadAgua,
      riesgoMaleza: p.riesgoMaleza,
      manejoCorte: p.manejoCorte,
      dosisSiembra: p.dosisSiembra,
      fuenteTipo: p.fuenteTipo,
      fuenteDetalle: p.fuenteDetalle,
      validadoPor: p.validadoPor,
      siembraSemanas: p.siembraSemanas,
      floracionSemanas: p.floracionSemanas,
      corteSemanas: p.corteSemanas,
      compatibilidades: p.compatibilidades,
    }));

    const floracion = evaluarFloracionMezcla({
      cultivos: cultivosParaMezcla,
      especies: seleccion,
      prioridad: mezclaInicial.prioridad,
    });

    return { especiesActivas: especies, floracionActiva: floracion };
  }, [plantaIdsSeleccionadas, mezclaInicial, cultivosParaMezcla]);

  function guardarBorradorLocal(datos: {
    objetivoPct: number;
    disposicion: string;
    plantaIds: string[];
    nombre: string;
  }) {
    try {
      window.localStorage.setItem(claveBorrador(establecimientoId), JSON.stringify(datos));
    } catch {
      // Ignorar si localStorage no está disponible.
    }
  }

  function aplicarObjetivo(nuevoObjetivo: number) {
    setObjetivoPct(nuevoObjetivo);
    setErrores([]);
    if (
      nuevoObjetivo < LIMITES_PROPUESTA.objetivoMinPct ||
      nuevoObjetivo > LIMITES_PROPUESTA.objetivoMaxPct
    ) {
      setErrores([
        `El objetivo debe estar entre ${LIMITES_PROPUESTA.objetivoMinPct} % y ${LIMITES_PROPUESTA.objetivoMaxPct} %.`,
      ]);
      return;
    }

    iniciarCalculo(async () => {
      const res = await recalcularAlternativasPorObjetivoAccion(establecimientoId, nuevoObjetivo);
      if (!res.ok) {
        setErrores([res.error]);
        return;
      }
      setSuperficieAAgregarHa(res.superficieAAgregarHa);
      setAlternativas(res.alternativasEspaciales);
      setPropCuestionario(res.propuestaCuestionario);
      if (res.propuestaCuestionario) {
        setRepartoEditado(res.propuestaCuestionario.reparto);
      }
      if (
        res.alternativasEspaciales.length > 0 &&
        !res.alternativasEspaciales.some((a) => a.disposicion === disposicionElegida)
      ) {
        setDisposicionElegida(res.alternativasEspaciales[0].disposicion);
      }
      guardarBorradorLocal({
        objetivoPct: nuevoObjetivo,
        disposicion: disposicionElegida,
        plantaIds: plantaIdsSeleccionadas,
        nombre,
      });
    });
  }

  function ajustarParametros(nuevosParametros: ParametrosDisposicion) {
    if (!alternativaActual) return;
    setErrores([]);
    iniciarCalculo(async () => {
      const res = await recalcularUnaDisposicionAccion(
        establecimientoId,
        objetivoPct,
        alternativaActual.disposicion,
        nuevosParametros,
      );
      if (!res.ok) {
        setErrores([res.error]);
        return;
      }
      setAlternativas((prev) =>
        prev.map((a) => (a.disposicion === res.alternativa.disposicion ? res.alternativa : a)),
      );
    });
  }

  function alternarEspecie(plantaId: string) {
    setErrores([]);
    setPlantaIdsSeleccionadas((prev) => {
      if (prev.includes(plantaId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== plantaId);
      }
      if (prev.length >= LIMITES_PROPUESTA.maxEspeciesMezcla) {
        setErrores([
          `Podés elegir hasta ${LIMITES_PROPUESTA.maxEspeciesMezcla} especies en la mezcla. Quitá una antes de sumar otra.`,
        ]);
        return prev;
      }
      return [...prev, plantaId];
    });
  }

  function actualizarHaReparto(idx: number, valor: string) {
    const num = Number.parseFloat(valor.replace(",", "."));
    setRepartoEditado((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, ha: Number.isFinite(num) ? num : 0 } : item)),
    );
  }

  const validacionReparto = useMemo(() => {
    if (metodo !== "cuestionario") return { valido: true, sumaHa: 0 };
    return validarRepartoCuestionario(repartoEditado, superficieAAgregarHa);
  }, [metodo, repartoEditado, superficieAAgregarHa]);

  function alGuardar(e: React.FormEvent) {
    e.preventDefault();
    setErrores([]);

    if (metodo === "cuestionario" && !validacionReparto.valido) {
      setErrores([validacionReparto.error ?? "Revisá el reparto de hectáreas."]);
      return;
    }

    iniciarGuardado(async () => {
      try {
        window.localStorage.removeItem(claveBorrador(establecimientoId));
      } catch {
        // Ignorar
      }

      const res = await guardarPropuestaAccion(establecimientoId, {
        nombre: nombre.trim() || null,
        objetivoPct,
        disposicion: metodo === "cuestionario" ? "texto" : (alternativaActual?.disposicion ?? "perimetral"),
        parametros: metodo === "cuestionario" ? {} : (alternativaActual?.parametros ?? {}),
        editadaAMano: false,
        reparto: metodo === "cuestionario" ? repartoEditado : null,
        plantaIds: plantaIdsSeleccionadas,
      });

      if (res && !res.ok) {
        setErrores(res.errores);
      }
    });
  }

  const candidatasNoElegidas = mezclaInicial.candidatasDisponibles.filter(
    (c) => !plantaIdsSeleccionadas.includes(c.plantaId),
  );

  return (
    <form onSubmit={alGuardar} className="flex flex-col gap-6">
      {/* 1. Objetivo ajustable (10 % a 40 %, CA-05-06) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">1. Objetivo de superficie con flores</h2>
            <p className="text-xs text-stone-600">
              Por defecto 20 % recomendado (RN-01). Podés ajustarlo entre 10 % y 40 %.
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900">
            Objetivo: {formatearNumeroEsAr(objetivoPct, 1, 0)} %
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="range"
            aria-label="Porcentaje objetivo de flores"
            min={LIMITES_PROPUESTA.objetivoMinPct}
            max={LIMITES_PROPUESTA.objetivoMaxPct}
            step={1}
            value={objetivoPct}
            onChange={(e) => setObjetivoPct(Number(e.target.value))}
            className="h-2 min-w-44 flex-1 accent-emerald-700"
          />
          <button
            type="button"
            disabled={pendienteCalc}
            onClick={() => aplicarObjetivo(objetivoPct)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-700 px-3.5 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
          >
            {pendienteCalc ? "Recalculando…" : "Aplicar objetivo"}
          </button>
        </div>

        <p className="mt-2 text-xs text-stone-600">
          Flores actuales: <strong>{formatearNumeroEsAr(superficieFloresActualHa, 4, 1)} ha</strong>{" "}
          · Superficie nueva a agregar:{" "}
          <strong>{formatearNumeroEsAr(superficieAAgregarHa, 4, 1)} ha</strong>
        </p>

        {objetivoPct < LIMITES_PROPUESTA.objetivoRecomendadoPct ? (
          <p
            role="status"
            className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950"
          >
            ⚠️ Este objetivo está por debajo del 20 % recomendado por la bibliografía (RN-01).
          </p>
        ) : null}
      </section>

      {/* 2. Disposición espacial (Croquis / Mapa) o Reparto (Cuestionario) */}
      {metodo === "cuestionario" && propCuestionario ? (
        <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              2. Disposición sugerida: {propCuestionario.tituloDisposicion}
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Porcentaje logrado: <strong>{formatearNumeroEsAr(propCuestionario.porcentajeLogrado, 1, 1)} %</strong>
            </p>
          </div>

          <EsquemaCuestionario3x3
            reparto={repartoEditado}
            ocupadasPorSectores={sectores}
          />

          {repartoEditado.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-stone-700">
                Reparto editable por ubicación (debe sumar{" "}
                {formatearNumeroEsAr(superficieAAgregarHa, 4, 2)} ha):
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {repartoEditado.map((item, idx) => (
                  <label
                    key={`${item.ubicacion}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-stone-800">{item.etiqueta}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.ha}
                        onChange={(e) => actualizarHaReparto(idx, e.target.value)}
                        className="w-20 rounded-md border border-stone-300 bg-white px-2 py-1 text-right text-sm font-semibold text-stone-900"
                      />
                      <span className="text-stone-500">ha</span>
                    </div>
                  </label>
                ))}
              </div>
              {!validacionReparto.valido ? (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {validacionReparto.error}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              2. Elegí una alternativa de disposición
            </h2>
            <p className="text-xs text-stone-600">
              Ordenadas por menor pérdida de superficie cultivada (primero la superficie libre).
            </p>
          </div>

          {/* Carrusel horizontal en celular / grilla en desktop */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
            {alternativas.map((alt) => {
              const seleccionada = alt.disposicion === alternativaActual?.disposicion;
              return (
                <button
                  key={alt.disposicion}
                  type="button"
                  onClick={() => setDisposicionElegida(alt.disposicion)}
                  className={`flex w-64 shrink-0 flex-col gap-2 rounded-xl border p-3 text-left transition sm:w-auto ${
                    seleccionada
                      ? "border-emerald-700 bg-emerald-50/50 ring-2 ring-emerald-700/20"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <VistaDibujoPropuesta
                    metodo={metodo}
                    superficieTotalHa={superficieTotalHa}
                    contorno={contorno}
                    sectores={sectores}
                    franjas={alt.franjas}
                    compacta
                  />
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-stone-900">{alt.titulo}</span>
                    {seleccionada ? (
                      <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white">
                        Elegida
                      </span>
                    ) : null}
                  </div>
                  <dl className="grid grid-cols-2 gap-1 text-[11px] text-stone-600">
                    <div>
                      <dt>Logrado</dt>
                      <dd className="font-bold text-stone-900">
                        {formatearNumeroEsAr(alt.porcentajeLogrado, 1, 1)} %
                      </dd>
                    </div>
                    <div>
                      <dt>Pérdida cultivo</dt>
                      <dd className="font-bold text-stone-900">
                        {formatearNumeroEsAr(alt.perdidaTotalCultivoHa, 4, 2)} ha
                      </dd>
                    </div>
                    {alt.anchoResultanteM !== null ? (
                      <div className="col-span-2">
                        <dt>Ancho estimado</dt>
                        <dd className="font-bold text-stone-900">
                          {formatearNumeroEsAr(alt.anchoResultanteM, 1, 1)} m
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </button>
              );
            })}
          </div>

          {/* Detalle y ajuste de parámetros de la alternativa seleccionada */}
          {alternativaActual ? (
            <div className="flex flex-col gap-4 border-t border-stone-100 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  Detalle: {ETIQUETAS_DISPOSICION[alternativaActual.disposicion]}
                </h3>
                <span className="text-xs font-semibold text-stone-600">
                  Franjas nuevas: {formatearNumeroEsAr(alternativaActual.superficieFranjasHa, 4, 2)} ha ·
                  Logrado: {formatearNumeroEsAr(alternativaActual.porcentajeLogrado, 1, 1)} %
                </span>
              </div>

              {/* Parámetros ajustables según disposición */}
              {(alternativaActual.disposicion === "transversal" ||
                alternativaActual.disposicion === "matriz") && (
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
                    Cantidad de corredores ({alternativaActual.parametros.cantidadCorredores ?? 2})
                    <input
                      type="range"
                      min={LIMITES_PROPUESTA.minCorredores}
                      max={LIMITES_PROPUESTA.maxCorredores}
                      value={alternativaActual.parametros.cantidadCorredores ?? 2}
                      disabled={pendienteCalc}
                      onChange={(e) =>
                        ajustarParametros({
                          ...alternativaActual.parametros,
                          cantidadCorredores: Number(e.target.value),
                        })
                      }
                      className="accent-emerald-700"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
                    Ángulo ({alternativaActual.parametros.anguloGrados ?? 0}°)
                    <input
                      type="range"
                      min={0}
                      max={180}
                      step={15}
                      value={alternativaActual.parametros.anguloGrados ?? 0}
                      disabled={pendienteCalc}
                      onChange={(e) =>
                        ajustarParametros({
                          ...alternativaActual.parametros,
                          anguloGrados: Number(e.target.value),
                        })
                      }
                      className="accent-emerald-700"
                    />
                  </label>
                </div>
              )}

              {alternativaActual.disposicion === "islas" && (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
                    Cantidad de islas ({alternativaActual.parametros.cantidadIslas ?? 4})
                    <input
                      type="range"
                      min={LIMITES_PROPUESTA.minIslas}
                      max={LIMITES_PROPUESTA.maxIslas}
                      value={alternativaActual.parametros.cantidadIslas ?? 4}
                      disabled={pendienteCalc}
                      onChange={(e) =>
                        ajustarParametros({
                          cantidadIslas: Number(e.target.value),
                        })
                      }
                      className="accent-emerald-700"
                    />
                  </label>
                </div>
              )}

              <VistaDibujoPropuesta
                metodo={metodo}
                superficieTotalHa={superficieTotalHa}
                contorno={contorno}
                sectores={sectores}
                franjas={alternativaActual.franjas}
              />

              {/* Avisos de la alternativa */}
              {alternativaActual.avisos.length > 0 ? (
                <ul className="space-y-1.5">
                  {alternativaActual.avisos.map((av, i) => (
                    <li
                      key={`${av.codigo}-${i}`}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                    >
                      ⚠️ {av.mensaje}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Pérdida por cultivo */}
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs">
                <p className="font-semibold text-stone-800">Impacto sobre sectores de cultivo:</p>
                {alternativaActual.perdidaPorCultivo.length === 0 ? (
                  <p className="mt-1 text-emerald-800">
                    ✓ Sin pérdida de superficie cultivada (se aprovecha superficie libre).
                  </p>
                ) : (
                  <ul className="mt-1.5 space-y-1 text-stone-700">
                    {alternativaActual.perdidaPorCultivo.map((p, i) => (
                      <li key={`${p.sector}-${i}`}>
                        <strong>{p.sector}</strong> ({p.cultivo}):{" "}
                        {formatearNumeroEsAr(p.ha, 4, 2)} ha ({formatearNumeroEsAr(p.pct, 1, 1)} %
                        del sector)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* 3. Mezcla de plantas de servicio (RN-08, RN-09, RN-10, CA-05-14, CA-05-15) */}
      <section className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              3. Mezcla de plantas de servicio recomendada
            </h2>
            <p className="text-xs text-stone-600">
              Prioridad:{" "}
              <strong>
                {mezclaInicial.prioridad === "polinizadores"
                  ? "Atraer polinizadores (floración obligatoria)"
                  : "Control biológico y cobertura de suelo"}
              </strong>
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-700">
            {especiesActivas.length}{" "}
            {especiesActivas.length === 1 ? "especie" : "especies"}
          </span>
        </div>

        {/* Avisos de la mezcla (sin candidatas, una sola especie, cultivos sin datos) */}
        {mezclaInicial.avisos.length > 0 ? (
          <ul className="space-y-1.5">
            {mezclaInicial.avisos.map((av, i) => (
              <li
                key={`${av.codigo}-${i}`}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
              >
                ⚠️ {av.mensaje}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Gráfico de semanas de floración (CA-05-15, CA-05-21) */}
        <GraficoFloracionSemanas floracion={floracionActiva} />

        {/* Tarjetas explicativas de cada especie seleccionada */}
        {especiesActivas.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {especiesActivas.map((esp) => (
              <div key={esp.plantaId} className="flex flex-col gap-1.5">
                <TarjetaEspecieMezcla especie={esp} />
                {especiesActivas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => alternarEspecie(esp.plantaId)}
                    className="self-end text-xs font-semibold text-red-700 hover:underline"
                  >
                    Quitar de la mezcla
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {/* Reemplazar / agregar solo desde candidatas publicadas (§5.6, CA-05-14) */}
        {candidatasNoElegidas.length > 0 ? (
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold text-stone-800">
              Otras plantas candidatas compatibles (podés sumar hasta{" "}
              {LIMITES_PROPUESTA.maxEspeciesMezcla} especies):
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {candidatasNoElegidas.map((cand) => (
                <button
                  key={cand.plantaId}
                  type="button"
                  onClick={() => alternarEspecie(cand.plantaId)}
                  className="inline-flex min-h-9 items-center rounded-lg border border-emerald-700 bg-white px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  + {cand.nombreComun}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* 4. Nombre opcional y Guardar */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <label className="flex flex-col gap-1 text-sm font-semibold text-stone-800">
          Nombre de la propuesta (opcional)
          <input
            type="text"
            maxLength={LIMITES_PROPUESTA.maxNombreLargo}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Perimetral 20 % primavera"
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal text-stone-900"
          />
        </label>

        {errores.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
          >
            <ul className="list-disc pl-4">
              {errores.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pendienteGuardar || pendienteCalc}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50 sm:w-auto sm:self-start"
        >
          {pendienteGuardar ? "Guardando propuesta…" : "Guardar propuesta"}
        </button>
      </section>
    </form>
  );
}
