"use client";

// Constructor interactivo de propuestas de rediseño (Esp. 05 §6.1, §7, CA-05-06, 07, 14, 15, 21).
// Incluye ajuste de objetivo (10–40 %), comparador de alternativas, parámetros de disposición,
// ajuste de reparto (cuestionario), cambio de especies candidatas y borrador local (RS-08).
//
// Se arma en 2 pasos (Dónde van las flores, con la meta arriba → Plantas) y Guardar, con flechas naranjas arriba
// como en el mapa. Al costado queda siempre un resumen («Tu propuesta») con el dibujo chico, los números y «Guardar».
import { useMemo, useRef, useState, useTransition } from "react";
import type { SectorDibujable } from "@/app/fincas/[id]/VistaPreviaDibujo";
import { IconoAlerta, IconoFlecha, IconoMas, IconoOk } from "@/componentes/marca/Iconos";
import { EsquemaCuestionario3x3 } from "@/componentes/propuesta/EsquemaCuestionario3x3";
import { GraficoFloracionSemanas } from "@/componentes/propuesta/GraficoFloracionSemanas";
import { TarjetaEspecieMezcla } from "@/componentes/propuesta/TarjetaEspecieMezcla";
import { VistaDibujoPropuesta } from "@/componentes/propuesta/VistaDibujoPropuesta";
import { clasesBoton } from "@/componentes/ui/boton";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Aviso } from "@/componentes/ui/formulario";
import { Desplegable, DesplegableAtencion } from "@/componentes/ui/mas-info";
import { Pasos, type EstadoPaso, type PasoDeProceso } from "@/componentes/ui/pasos";
import { Tarjeta } from "@/componentes/ui/tarjeta";
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
  respetarCultivosInicial?: boolean;
  especiesInicialesIds?: readonly string[];
  /** En qué paso se abre (2 = Plantas, cuando se viene a completar las plantas de una propuesta). */
  pasoInicial?: 1 | 2;
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
  respetarCultivosInicial = false,
  especiesInicialesIds,
  pasoInicial = 1,
}: Props) {
  const [objetivoPct, setObjetivoPct] = useState<number>(objetivoInicialPct);
  const [respetarCultivos, setRespetarCultivos] = useState<boolean>(respetarCultivosInicial);
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

  function aplicarObjetivo(nuevoObjetivo: number, nuevoRespetar: boolean = respetarCultivos) {
    setObjetivoPct(nuevoObjetivo);
    setRespetarCultivos(nuevoRespetar);
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
      const res = await recalcularAlternativasPorObjetivoAccion(
        establecimientoId,
        nuevoObjetivo,
        nuevoRespetar,
      );
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
        {
          ...nuevosParametros,
          ...(respetarCultivos ? { respetarCultivos: true } : { respetarCultivos: undefined }),
        },
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
    if (paso !== 2) {
      irAPaso(2);
      return;
    }
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

  // ── Pasos (como en el mapa): se ve un paso por vez para no abrumar; el resumen con «Guardar» queda siempre al
  //    costado. Son pocos a propósito (la meta y el lugar van juntos) para que no sea engorroso. Todos traen valores
  //    recomendados, así que se puede guardar en cualquier momento.
  const [paso, setPaso] = useState<1 | 2>(pasoInicial);

  function irAPaso(nuevo: 1 | 2 | 3) {
    if (nuevo === 3) {
      // «Guardar»: el botón está en el paso «Plantas»; se pasa ahí (si hace falta) y se lleva la vista al botón
      setPaso(2);
      window.setTimeout(() => {
        const boton = document.querySelector<HTMLElement>("[data-guardar-propuesta]");
        boton?.scrollIntoView({ block: "center", behavior: "smooth" });
        boton?.focus();
      }, 50);
      return;
    }
    setPaso(nuevo);
    document.getElementById("pasos-propuesta")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Orden fijo del carrusel (el mismo siempre, para que la persona se ubique). La «Recomendada» sigue siendo la
  // que menos le quita a los cultivos: la primera que devuelve el cálculo.
  const ORDEN_CARRUSEL: readonly DisposicionPropuesta[] = ["perimetral", "superficie_libre", "matriz", "islas", "transversal"];
  const alternativasEnOrden = [...alternativas].sort(
    (a, b) => ORDEN_CARRUSEL.indexOf(a.disposicion) - ORDEN_CARRUSEL.indexOf(b.disposicion),
  );
  const disposicionRecomendada = alternativas[0]?.disposicion;

  // Carrusel de alternativas: ‹ › mueven una tarjeta por vez y se apagan en los extremos.
  const carruselRef = useRef<HTMLDivElement | null>(null);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(true);

  function actualizarFlechas() {
    const c = carruselRef.current;
    if (!c) return;
    setPuedeIzquierda(c.scrollLeft > 4);
    setPuedeDerecha(c.scrollLeft + c.clientWidth < c.scrollWidth - 4);
  }

  function moverCarrusel(direccion: 1 | -1) {
    const c = carruselRef.current;
    const tarjeta = c?.firstElementChild as HTMLElement | null;
    if (!c || !tarjeta) return;
    c.scrollBy({ left: direccion * (tarjeta.offsetWidth + 12), behavior: "smooth" });
  }

  const estadoDe = (n: number): EstadoPaso => (n === paso ? "actual" : n < paso ? "hecho" : "pendiente");
  const pasos: PasoDeProceso[] = [
    { titulo: "Dónde van las flores", estado: estadoDe(1), onClick: () => irAPaso(1) },
    { titulo: "Plantas", estado: estadoDe(2), onClick: () => irAPaso(2) },
    { titulo: "Guardar", estado: "pendiente", onClick: () => irAPaso(3) },
  ];

  // Números del resumen: los de la alternativa elegida (o del reparto, en el cuestionario)
  const porcentajeResumen =
    metodo === "cuestionario"
      ? (propCuestionario?.porcentajeLogrado ?? objetivoPct)
      : (alternativaActual?.porcentajeLogrado ?? objetivoPct);
  const floresNuevasResumen =
    metodo === "cuestionario" ? superficieAAgregarHa : (alternativaActual?.superficieFranjasHa ?? 0);
  const leQuitaResumen = metodo === "cuestionario" ? 0 : (alternativaActual?.perdidaTotalCultivoHa ?? 0);

  const ha = (valor: number) => `${formatearNumeroEsAr(valor, 2, 0)} ha`;

  /** Botón para pasar al paso que sigue, al final de cada paso. */
  function botonSiguiente(a: 2 | 3, texto: string) {
    return (
      <div className="flex justify-end border-t-[1.5px] border-borde pt-4">
        <button type="button" onClick={() => irAPaso(a)} className={clasesBoton("principal")}>
          {texto}
          <IconoFlecha className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // Meta de flores (10 % a 40 %, CA-05-06): compacta, arriba del lugar donde van. Se recalcula al soltar el control.
  // El control tiene una escala de colores para que se entienda sin leer: rojo = poco, naranja = casi,
  // verde = lo recomendado o más. El número y la etiqueta toman el color de donde está parado.
  const { objetivoMinPct: minMeta, objetivoMaxPct: maxMeta, objetivoRecomendadoPct: recomendada } = LIMITES_PROPUESTA;
  const umbralCasi = recomendada - 5; // desde acá ya no es "poco"
  const posicion = (pct: number) => ((pct - minMeta) / (maxMeta - minMeta)) * 100; // % del ancho del control
  const nivelMeta =
    objetivoPct < umbralCasi
      ? { tono: "error" as const, texto: "Poco", color: "text-error" }
      : objetivoPct < recomendada
        ? { tono: "atencion" as const, texto: "Casi", color: "text-naranja-oscuro" }
        : { tono: "listo" as const, texto: objetivoPct === recomendada ? "Recomendado" : "Muy bien", color: "text-hoja" };
  // Rojo → naranja → verde: el naranja justo en el "casi" y el verde desde lo recomendado
  const escalaColores = `linear-gradient(to right, #d92d20 0%, #ff9900 ${posicion(umbralCasi)}%, #ff9900 ${posicion(recomendada - 1)}%, #597931 ${posicion(recomendada)}%, #597931 100%)`;

  const bloqueMeta = (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-papel p-4">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-tinta">Meta:</span>
        <strong className={`font-titulos text-3xl font-extrabold ${nivelMeta.color}`}>
          {formatearNumeroEsAr(objetivoPct, 0, 0)} %
        </strong>
        <span className="text-tinta-suave">de tu finca con flores</span>
        <Etiqueta tono={nivelMeta.tono}>{nivelMeta.texto}</Etiqueta>
        <span className="ml-auto text-sm text-tinta-suave">
          {pendienteCalc
            ? "Calculando…"
            : `Ya tenés ${ha(superficieFloresActualHa)} · hay que sumar ${ha(superficieAAgregarHa)}`}
        </span>
      </p>
      {/* Control con la escala pintada en la barra y una bolita blanca para arrastrar (grande para el dedo) */}
      <input
        type="range"
        aria-label="Porcentaje de la finca con flores"
        aria-valuetext={`${objetivoPct} %, ${nivelMeta.texto}`}
        min={minMeta}
        max={maxMeta}
        step={1}
        value={objetivoPct}
        onChange={(e) => setObjetivoPct(Number(e.target.value))}
        onPointerUp={(e) => aplicarObjetivo(Number(e.currentTarget.value))}
        onKeyUp={(e) => aplicarObjetivo(Number(e.currentTarget.value))}
        style={{ background: escalaColores }}
        className="my-1.5 h-3 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-bosque [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-bosque [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-chica"
      />
      {/* Referencias debajo de la barra, cada una en su lugar (la del recomendado, justo debajo del 20 %) */}
      <div aria-hidden="true" className="relative h-5 text-sm font-semibold text-tinta-suave">
        <span className="absolute left-0">{minMeta} %</span>
        <span
          className="absolute -translate-x-1/2 whitespace-nowrap text-hoja"
          style={{ left: `${posicion(recomendada)}%` }}
        >
          ▲ <span className="max-sm:hidden">Recomendado </span>
          {recomendada} %
        </span>
        <span className="absolute right-0">{maxMeta} %</span>
      </div>
      {objetivoPct < recomendada ? (
        <p role="status" className="flex items-start gap-2 text-[#7a4100]">
          <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
          Con menos del {recomendada} % los beneficios para tus cultivos son menores.
        </p>
      ) : null}
    </div>
  );

  const cajaErrores =
    errores.length > 0 ? (
      <Aviso tipo="error">
        <ul className="flex flex-col gap-1">
          {errores.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </Aviso>
    ) : null;

  return (
    <form onSubmit={alGuardar} className="flex flex-col gap-5">
      <div id="pasos-propuesta" className="scroll-mt-24">
        <Pasos pasos={pasos} etiqueta="Pasos para armar tu propuesta" />
      </div>

      <div
        className={`grid items-start gap-5 ${
          paso === 1 ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_22rem]"
        }`}
      >
        {/* ── Columna principal: el paso actual ── */}
        <div className="flex min-w-0 flex-col gap-5">
          {cajaErrores}

          {/* Paso 1. Cuántas flores y dónde van: alternativas (croquis / mapa) o reparto (cuestionario) */}
          {paso === 1 && metodo === "cuestionario" && propCuestionario ? (
            <Tarjeta titulo="¿Dónde van las flores?">
              {bloqueMeta}
              <p className="text-tinta-suave">
                Te sugerimos: <strong className="text-tinta">{propCuestionario.tituloDisposicion}</strong>. Podés
                cambiar cuántas hectáreas van en cada lugar.
              </p>

              <EsquemaCuestionario3x3 reparto={repartoEditado} ocupadasPorSectores={sectores} />

              {repartoEditado.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-tinta">
                    Hectáreas en cada lugar (tienen que sumar {ha(superficieAAgregarHa)}):
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {repartoEditado.map((item, idx) => (
                      <label
                        key={`${item.ubicacion}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-2xl border-[1.5px] border-borde bg-papel px-3 py-2"
                      >
                        <span className="font-semibold text-tinta">{item.etiqueta}</span>
                        <span className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.ha}
                            onChange={(e) => actualizarHaReparto(idx, e.target.value)}
                            className="min-h-10 w-24 rounded-xl border-[1.5px] border-borde bg-white px-2 text-right font-semibold text-tinta outline-none focus:border-hoja focus:ring-4 focus:ring-naranja/45"
                          />
                          <span className="text-tinta-suave">ha</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {!validacionReparto.valido ? (
                    <p role="alert" className="font-semibold text-error">
                      {validacionReparto.error}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {botonSiguiente(2, "Siguiente: plantas")}
            </Tarjeta>
          ) : null}

          {paso === 1 && !(metodo === "cuestionario" && propCuestionario) ? (
            <Tarjeta titulo="¿Dónde van las flores?">
              {bloqueMeta}

              {/* Respetar cultivos: una opción grande y clara, en vez de una casilla chica */}
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-3.5 transition ${
                  respetarCultivos ? "border-hoja bg-menta" : "border-borde bg-white hover:bg-papel"
                }`}
              >
                <input
                  type="checkbox"
                  checked={respetarCultivos}
                  disabled={pendienteCalc}
                  onChange={(e) => aplicarObjetivo(objetivoPct, e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span>
                  <strong className="block text-bosque">No tocar mis cultivos</strong>
                  <span className="text-[0.95rem] text-tinta-suave">
                    Las flores van solo en los bordes y en los lugares libres.
                  </span>
                </span>
              </label>

              {/* Alternativas: carrusel de una fila. Se ven 1 (celular) o 2; con › se ven más formas.
                  También se puede deslizar con el dedo. La «Recomendada» es la que menos lugar le quita a los cultivos. */}
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-tinta">
                  Elegí una forma{" "}
                  <span className="font-normal text-tinta-suave">
                    ({alternativas.length} {alternativas.length === 1 ? "opción" : "opciones"})
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moverCarrusel(-1)}
                    disabled={!puedeIzquierda}
                    aria-label="Ver las formas anteriores"
                    className="grid h-11 w-11 place-items-center rounded-full border-2 border-hoja bg-white text-hoja transition hover:bg-menta disabled:cursor-not-allowed disabled:border-borde disabled:text-tinta-suave/50 disabled:hover:bg-white"
                  >
                    <IconoFlecha className="h-5 w-5 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverCarrusel(1)}
                    disabled={!puedeDerecha}
                    aria-label="Ver más formas"
                    className="grid h-11 w-11 place-items-center rounded-full border-2 border-hoja bg-hoja text-white transition hover:bg-hoja-oscura disabled:cursor-not-allowed disabled:border-borde disabled:bg-white disabled:text-tinta-suave/50"
                  >
                    <IconoFlecha className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div
                ref={carruselRef}
                onScroll={actualizarFlechas}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {alternativasEnOrden.map((alt) => {
                  const seleccionada = alt.disposicion === alternativaActual?.disposicion;
                  return (
                    <button
                      key={alt.disposicion}
                      type="button"
                      aria-pressed={seleccionada}
                      onClick={() => setDisposicionElegida(alt.disposicion)}
                      className={`flex w-[85%] shrink-0 snap-start flex-col gap-2 rounded-2xl border-2 p-3 text-left transition sm:w-[calc((100%-0.75rem)/2)] ${
                        seleccionada ? "border-naranja bg-[#fff8ec]" : "border-borde bg-white hover:border-hoja"
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
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-bosque">{alt.titulo}</span>
                        {alt.disposicion === disposicionRecomendada ? (
                          <Etiqueta tono="listo" conIcono={false}>
                            Recomendada
                          </Etiqueta>
                        ) : null}
                      </span>
                      <span className="text-sm text-tinta-suave">
                        Llega a <strong className="text-tinta">{formatearNumeroEsAr(alt.porcentajeLogrado, 1, 1)} %</strong>
                        {" · "}
                        {alt.perdidaTotalCultivoHa > 0 ? (
                          <>
                            le quita <strong className="text-tinta">{ha(alt.perdidaTotalCultivoHa)}</strong> a cultivos
                          </>
                        ) : (
                          "no le quita a tus cultivos"
                        )}
                      </span>
                      {seleccionada ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-[#7a4100]">
                          <IconoOk className="h-4 w-4" />
                          Elegida
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </Tarjeta>
          ) : null}

          {/* Paso 2. Plantas para sembrar (RN-08, RN-09, RN-10, CA-05-14, CA-05-15) */}
          {paso === 2 ? (
            <Tarjeta titulo="¿Qué plantas sembrar?">
              <p className={`-mt-2 text-tinta-suave ${mezclaInicial.candidatasDisponibles.length === 0 ? "hidden" : ""}`}>
                Las elegimos para tus cultivos: sirven sobre todo para{" "}
                <strong className="text-tinta">
                  {mezclaInicial.prioridad === "polinizadores"
                    ? "atraer abejas y otros polinizadores"
                    : "controlar plagas y cubrir el suelo"}
                </strong>
                . Podés sacar o sumar hasta {LIMITES_PROPUESTA.maxEspeciesMezcla}.
              </p>

              {mezclaInicial.avisos.length > 0 ? (
                <DesplegableAtencion titulo={`Para revisar (${mezclaInicial.avisos.length})`}>
                  <ul className="flex flex-col gap-3">
                    {mezclaInicial.avisos.map((av, i) => (
                      <li key={`${av.codigo}-${i}`} className="rounded-2xl bg-white p-3.5 text-[0.95rem] text-tinta">
                        {av.mensaje}
                      </li>
                    ))}
                  </ul>
                </DesplegableAtencion>
              ) : null}

              {especiesActivas.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {especiesActivas.map((esp) => (
                    <div key={esp.plantaId} className="flex flex-col gap-1.5">
                      <TarjetaEspecieMezcla especie={esp} />
                      {especiesActivas.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => alternarEspecie(esp.plantaId)}
                          className={`${clasesBoton("texto")} min-h-10 self-end text-error hover:bg-error-claro hover:text-error`}
                        >
                          Sacar esta planta
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-papel p-4 text-tinta-suave">
                  Todavía no hay plantas cargadas en el catálogo para tus cultivos en tu zona (lo ves en «Para revisar»).
                  Cuando estén cargadas, vas a poder elegirlas acá. Igual podés guardar la propuesta con las franjas de
                  flores.
                </p>
              )}

              {/* Sumar otra: solo de las candidatas publicadas (§5.6, CA-05-14) */}
              {candidatasNoElegidas.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-semibold text-tinta">Otras plantas que también sirven:</p>
                  <div className="flex flex-wrap gap-2">
                    {candidatasNoElegidas.map((cand) => (
                      <button
                        key={cand.plantaId}
                        type="button"
                        onClick={() => alternarEspecie(cand.plantaId)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-hoja bg-white px-4 font-semibold text-hoja hover:bg-menta"
                      >
                        <IconoMas className="h-4 w-4" />
                        {cand.nombreComun}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Gráfico de semanas de floración (CA-05-15, CA-05-21) */}
              <Desplegable pregunta="¿Cuándo florecen?">
                <GraficoFloracionSemanas floracion={floracionActiva} />
              </Desplegable>

              {botonSiguiente(3, "Siguiente: guardar")}
            </Tarjeta>
          ) : null}
        </div>

        {/* ── Costado (en la computadora queda fijo mientras se baja) ──
            Paso 1: cómo quedaría la finca con la forma elegida (plano grande) y sus números. Sin «Guardar»: primero
            se eligen las plantas. Paso 2: el resumen con el nombre y «Guardar propuesta». */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
          {paso === 1 ? (
            <Tarjeta compacta titulo="Así quedaría tu finca">
              {metodo !== "cuestionario" && alternativaActual ? (
                <VistaDibujoPropuesta
                  metodo={metodo}
                  superficieTotalHa={superficieTotalHa}
                  contorno={contorno}
                  sectores={sectores}
                  franjas={alternativaActual.franjas}
                />
              ) : null}
              <dl className="grid grid-cols-3 gap-2">
                {[
                  { titulo: "Con flores", valor: `${formatearNumeroEsAr(porcentajeResumen, 1, 1)} %` },
                  { titulo: "Flores nuevas", valor: ha(floresNuevasResumen) },
                  { titulo: "Le quita a cultivos", valor: ha(leQuitaResumen) },
                ].map((dato) => (
                  <div key={dato.titulo} className="flex flex-col gap-0.5 rounded-2xl bg-papel px-3 py-2.5">
                    <dt className="text-sm font-semibold text-tinta-suave">{dato.titulo}</dt>
                    <dd className="font-titulos text-lg font-bold text-bosque">{dato.valor}</dd>
                  </div>
                ))}
              </dl>
              {/* La forma elegida: su nombre, sus ajustes y qué le quita a cada cultivo; y el paso siguiente */}
              {!(metodo === "cuestionario" && propCuestionario) ? (
                <>
                  {/* La alternativa elegida, en grande, con sus ajustes */}
                  {alternativaActual ? (
                    <div className="flex flex-col gap-4 border-t-[1.5px] border-borde pt-4">
                      <h3 className="text-lg font-bold text-bosque">
                        {ETIQUETAS_DISPOSICION[alternativaActual.disposicion]}
                        {alternativaActual.anchoResultanteM !== null
                          ? ` · franjas de ${formatearNumeroEsAr(alternativaActual.anchoResultanteM, 1, 1)} m de ancho`
                          : ""}
                      </h3>

                      {/* Ajustes según la forma elegida */}
                      {(alternativaActual.disposicion === "transversal" || alternativaActual.disposicion === "matriz") && (
                        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-papel p-4 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5 font-semibold text-tinta">
                            Cantidad de corredores: {alternativaActual.parametros.cantidadCorredores ?? 2}
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
                              className="h-3 cursor-pointer accent-naranja"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 font-semibold text-tinta">
                            Ángulo: {alternativaActual.parametros.anguloGrados ?? 0}°
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
                              className="h-3 cursor-pointer accent-naranja"
                            />
                          </label>
                        </div>
                      )}

                      {alternativaActual.disposicion === "islas" && (
                        <label className="flex flex-col gap-1.5 rounded-2xl bg-papel p-4 font-semibold text-tinta">
                          Cantidad de islas: {alternativaActual.parametros.cantidadIslas ?? 4}
                          <input
                            type="range"
                            min={LIMITES_PROPUESTA.minIslas}
                            max={LIMITES_PROPUESTA.maxIslas}
                            value={alternativaActual.parametros.cantidadIslas ?? 4}
                            disabled={pendienteCalc}
                            onChange={(e) => ajustarParametros({ cantidadIslas: Number(e.target.value) })}
                            className="h-3 cursor-pointer accent-naranja"
                          />
                        </label>
                      )}


                      {alternativaActual.perdidaPorCultivo.length === 0 ? (
                        <p className="flex items-center gap-2 font-semibold text-bosque">
                          <IconoOk className="h-5 w-5 text-hoja" />
                          No le quita lugar a tus cultivos: usa el lugar libre.
                        </p>
                      ) : (
                        <Desplegable pregunta="¿De qué cultivos sale el lugar?">
                          <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                            {alternativaActual.perdidaPorCultivo.map((pc, i) => (
                              <li key={`${pc.sector}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                                <span>
                                  <strong className="text-tinta">{pc.sector}</strong> ({pc.cultivo})
                                </span>
                                <span className="text-right font-semibold text-tinta">
                                  {ha(pc.ha)}
                                  <span className="block text-sm font-normal text-tinta-suave">
                                    {formatearNumeroEsAr(pc.pct, 1, 1)} % del sector
                                  </span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </Desplegable>
                      )}

                      {alternativaActual.avisos.length > 0 ? (
                        <DesplegableAtencion titulo={`Para revisar (${alternativaActual.avisos.length})`}>
                          <ul className="flex flex-col gap-3">
                            {alternativaActual.avisos.map((av, i) => (
                              <li key={`${av.codigo}-${i}`} className="rounded-2xl bg-white p-3.5 text-[0.95rem] text-tinta">
                                {av.mensaje}
                              </li>
                            ))}
                          </ul>
                        </DesplegableAtencion>
                      ) : null}
                    </div>
                  ) : null}

                  {botonSiguiente(2, "Siguiente: plantas")}
                </>
              ) : null}
            </Tarjeta>
          ) : (
            <Tarjeta compacta titulo="Tu propuesta">
              {metodo !== "cuestionario" && alternativaActual ? (
                <VistaDibujoPropuesta
                  metodo={metodo}
                  superficieTotalHa={superficieTotalHa}
                  contorno={contorno}
                  sectores={sectores}
                  franjas={alternativaActual.franjas}
                  compacta
                />
              ) : null}
              <p className="flex items-baseline gap-2">
                <strong className="font-titulos text-3xl font-extrabold text-bosque">
                  {formatearNumeroEsAr(porcentajeResumen, 1, 1)} %
                </strong>
                <span className="text-tinta-suave">con flores</span>
              </p>
              <dl className="flex flex-col divide-y-[1.5px] divide-borde">
                <div className="flex justify-between gap-2 py-1.5">
                  <dt className="text-tinta-suave">Flores nuevas</dt>
                  <dd className="font-semibold text-tinta">{ha(floresNuevasResumen)}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1.5">
                  <dt className="text-tinta-suave">Le quita a tus cultivos</dt>
                  <dd className="font-semibold text-tinta">{ha(leQuitaResumen)}</dd>
                </div>
                <div className="flex justify-between gap-2 py-1.5">
                  <dt className="text-tinta-suave">Plantas</dt>
                  <dd className="font-semibold text-tinta">{especiesActivas.length}</dd>
                </div>
              </dl>

              <label className="flex flex-col gap-1.5 font-semibold text-tinta">
                Nombre (opcional)
                <input
                  type="text"
                  maxLength={LIMITES_PROPUESTA.maxNombreLargo}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej.: Bordes de primavera"
                  className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 font-normal outline-none focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
                />
              </label>

              {cajaErrores}

              <button
                type="submit"
                data-guardar-propuesta
                disabled={pendienteGuardar || pendienteCalc}
                className={clasesBoton("principal", true)}
              >
                {pendienteGuardar ? "Guardando…" : "Guardar propuesta"}
              </button>
            </Tarjeta>
          )}
        </aside>
      </div>
    </form>
  );
}
