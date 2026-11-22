"use client";

// Editor interactivo de croquis a escala (Esp. 02, T4, CA-02-13, CA-02-22, RD-03).
// Plano cuadrado de lado √(ha × 10.000) metros con grilla, dibujo táctil por rectángulo o polígono,
// paleta compartida y recálculo de superficies en el servidor al guardar.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaPlanaHa,
  calcularLadoCroquisMetros,
  claveBorradorLocal,
  crearContornoCroquis,
  formatearHectareas,
  formatearSuperficieCompleta,
  generarNombresSectores,
  redondearHectareas,
  validarPoligonoBasico,
  validarSectorDentroDelContorno,
  validarSectoresSinSuperposicion,
  type CultivoCatalogoItem,
  type PoligonoGeoJson,
  type Posicion2D,
  type SubtipoFlores,
  type TipoSector,
} from "@/dominio/establecimientos";
import { guardarSectoresCroquis } from "@/app/fincas/[id]/croquis/acciones";
import {
  PaletaSectores,
  colorDeSector,
  type SeleccionPaleta,
} from "@/componentes/sectores/PaletaSectores";

const VALOR_OTRO_CULTIVO = "__OTRO__";
const TAMANO_SVG = 400;
const DIVISIONES_GRILLA = 10;

type HerramientaCroquis = "rectangulo" | "poligono" | "seleccionar";

export interface SectorInicialCroquis {
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string | null;
  subtipoFlores: SubtipoFlores | null;
  nombre: string;
  geometria: PoligonoGeoJson;
}

interface SectorLocalCroquis {
  claveLocal: string;
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string;
  subtipoFlores: SubtipoFlores | null;
  nombrePersonalizado: string;
  geometria: PoligonoGeoJson;
}

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
  superficieTotalHa: number;
  versionInicial: number;
  cultivos: readonly CultivoCatalogoItem[];
  sectoresIniciales: readonly SectorInicialCroquis[];
}

function limitarAlPlano(valor: number, ladoM: number): number {
  const acotado = Math.max(0, Math.min(ladoM, valor));
  return Math.round(acotado * 100) / 100;
}

function crearRectanguloEnMetros(a: Posicion2D, b: Posicion2D): PoligonoGeoJson {
  const x0 = Math.min(a[0], b[0]);
  const x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const y1 = Math.max(a[1], b[1]);
  return {
    type: "Polygon",
    coordinates: [
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
        [x0, y0],
      ],
    ],
  };
}

function centroidePoligono(poligono: PoligonoGeoJson): Posicion2D {
  const anillo = poligono.coordinates[0] ?? [];
  const n = Math.max(1, anillo.length - 1);
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += anillo[i][0];
    sy += anillo[i][1];
  }
  return [sx / n, sy / n];
}

export function EditorCroquis({
  establecimientoId,
  nombreEstablecimiento,
  superficieTotalHa,
  versionInicial,
  cultivos,
  sectoresIniciales,
}: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ladoM = calcularLadoCroquisMetros(superficieTotalHa);
  const contornoCroquis = crearContornoCroquis(superficieTotalHa);

  const primerCultivo = cultivos.find((c) => c.activo) ?? null;

  const [herramienta, setHerramienta] = useState<HerramientaCroquis>("rectangulo");
  const [paleta, setPaleta] = useState<SeleccionPaleta>(
    primerCultivo
      ? {
          tipo: "cultivo",
          cultivoId: primerCultivo.id,
          cultivoOtro: "",
          subtipoFlores: null,
          etiqueta: primerCultivo.nombre,
        }
      : {
          tipo: "sector_flores",
          cultivoId: null,
          cultivoOtro: "",
          subtipoFlores: null,
          etiqueta: "Sector de flores",
        },
  );

  const [sectores, setSectores] = useState<SectorLocalCroquis[]>(() =>
    sectoresIniciales.map((s, idx) => ({
      claveLocal: `croquis-inicial-${idx}`,
      tipo: s.tipo,
      cultivoId: s.cultivoId,
      cultivoOtro: s.cultivoOtro ?? "",
      subtipoFlores: s.subtipoFlores,
      nombrePersonalizado: s.nombre,
      geometria: s.geometria,
    })),
  );
  const [siguienteId, setSiguienteId] = useState(sectoresIniciales.length + 1);
  const [indiceSeleccionado, setIndiceSeleccionado] = useState<number | null>(null);

  // Estado temporal de dibujo (rectángulo por arrastre o polígono por vértices).
  const [inicioRect, setInicioRect] = useState<Posicion2D | null>(null);
  const [finRect, setFinRect] = useState<Posicion2D | null>(null);
  const [verticesPoligono, setVerticesPoligono] = useState<Posicion2D[]>([]);

  const [avisoDibujo, setAvisoDibujo] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [guardando, iniciarTransicion] = useTransition();

  const mapaCultivos = new Map(cultivos.map((c) => [c.id, c]));

  const nombresCalculados = generarNombresSectores(
    sectores.map((s) => ({
      tipo: s.tipo,
      nombreCultivo:
        s.tipo === "cultivo"
          ? s.cultivoId
            ? mapaCultivos.get(s.cultivoId)?.nombre
            : s.cultivoOtro
          : null,
      nombrePersonalizado: s.nombrePersonalizado.trim() || null,
    })),
  );

  const superficiesSectores = sectores.map((s) => calcularAreaPlanaHa(s.geometria));
  const superficieDistribuida = redondearHectareas(
    superficiesSectores.reduce((acum, sup) => acum + sup, 0),
  );
  const restanteHa = redondearHectareas(Math.max(0, superficieTotalHa - superficieDistribuida));
  const excedida =
    superficieDistribuida >
    superficieTotalHa * (1 + LIMITES_ESTABLECIMIENTO.toleranciaSumaSectores);
  const cercaDeCero = !excedida && restanteHa <= superficieTotalHa * 0.1;

  const claseBarra = excedida
    ? "border-red-300 bg-red-50 text-red-900"
    : cercaDeCero
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";

  function eventoAMetros(evento: React.PointerEvent<SVGSVGElement>): Posicion2D | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const xRel = (evento.clientX - rect.left) / rect.width;
    const yRel = (evento.clientY - rect.top) / rect.height;
    return [limitarAlPlano(xRel * ladoM, ladoM), limitarAlPlano(yRel * ladoM, ladoM)];
  }

  function metrosASvg([x, y]: Posicion2D): Posicion2D {
    return [(x / ladoM) * TAMANO_SVG, (y / ladoM) * TAMANO_SVG];
  }

  function poligonoAPointsSvg(poligono: PoligonoGeoJson): string {
    return (poligono.coordinates[0] ?? [])
      .map((p) => {
        const [sx, sy] = metrosASvg(p);
        return `${sx.toFixed(1)},${sy.toFixed(1)}`;
      })
      .join(" ");
  }

  function agregarPoligonoDibujado(poligono: PoligonoGeoJson) {
    setAvisoDibujo(null);
    setErroresServidor([]);

    if (sectores.length >= LIMITES_ESTABLECIMIENTO.maxSectores) {
      setAvisoDibujo(
        `Alcanzaste el tope de ${LIMITES_ESTABLECIMIENTO.maxSectores} sectores por finca.`,
      );
      return;
    }

    if (paleta.tipo === "cultivo" && !paleta.cultivoId && paleta.cultivoOtro.trim().length < 2) {
      setAvisoDibujo("Escribí el nombre del cultivo («Otro») en la paleta antes de dibujar.");
      return;
    }

    const basico = validarPoligonoBasico(poligono, "croquis");
    if (!basico.valido) {
      setAvisoDibujo(basico.error ?? "El polígono dibujado no es válido.");
      return;
    }

    const dentro = validarSectorDentroDelContorno(poligono, contornoCroquis, "croquis");
    if (!dentro.valido) {
      setAvisoDibujo(dentro.error ?? "El sector sobresale del terreno.");
      return;
    }

    const sinChoque = validarSectoresSinSuperposicion(
      [...sectores.map((s) => s.geometria), poligono],
      "croquis",
    );
    if (!sinChoque.valido) {
      setAvisoDibujo("Ese sector se superpone con otro ya dibujado. Probá dibujarlo al lado.");
      return;
    }

    const areaHa = calcularAreaPlanaHa(poligono);
    if (areaHa <= 0) {
      setAvisoDibujo("El sector dibujado es demasiado chico. Arrastrá un área más grande.");
      return;
    }

    const nuevo: SectorLocalCroquis = {
      claveLocal: `croquis-nuevo-${siguienteId}`,
      tipo: paleta.tipo,
      cultivoId: paleta.tipo === "cultivo" ? paleta.cultivoId : null,
      cultivoOtro: paleta.tipo === "cultivo" && !paleta.cultivoId ? paleta.cultivoOtro.trim() : "",
      subtipoFlores: paleta.tipo === "sector_flores" ? paleta.subtipoFlores : null,
      nombrePersonalizado: "",
      geometria: poligono,
    };

    const nuevoIndice = sectores.length;
    setSiguienteId((n) => n + 1);
    setSectores((previos) => [...previos, nuevo]);
    setIndiceSeleccionado(nuevoIndice);
  }

  function manejarPointerDown(evento: React.PointerEvent<SVGSVGElement>) {
    const punto = eventoAMetros(evento);
    if (!punto) return;

    if (herramienta === "rectangulo") {
      evento.currentTarget.setPointerCapture(evento.pointerId);
      setInicioRect(punto);
      setFinRect(punto);
      setAvisoDibujo(null);
      return;
    }

    if (herramienta === "poligono") {
      if (verticesPoligono.length >= LIMITES_ESTABLECIMIENTO.maxVerticesPoligono) {
        setAvisoDibujo(`Máximo ${LIMITES_ESTABLECIMIENTO.maxVerticesPoligono} vértices por polígono.`);
        return;
      }
      setVerticesPoligono((previos) => [...previos, punto]);
      setAvisoDibujo(null);
    }
  }

  function manejarPointerMove(evento: React.PointerEvent<SVGSVGElement>) {
    if (herramienta !== "rectangulo" || !inicioRect) return;
    const punto = eventoAMetros(evento);
    if (punto) {
      setFinRect(punto);
    }
  }

  function manejarPointerUp(evento: React.PointerEvent<SVGSVGElement>) {
    if (herramienta !== "rectangulo" || !inicioRect || !finRect) return;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }

    const anchoM = Math.abs(finRect[0] - inicioRect[0]);
    const altoM = Math.abs(finRect[1] - inicioRect[1]);
    setInicioRect(null);
    setFinRect(null);

    // Ignorar toques accidentales muy pequeños (< 1 % del lado).
    if (anchoM < ladoM * 0.01 || altoM < ladoM * 0.01) {
      return;
    }

    agregarPoligonoDibujado(crearRectanguloEnMetros(inicioRect, finRect));
  }

  function cerrarPoligonoEnCurso() {
    if (verticesPoligono.length < 3) {
      setAvisoDibujo("Marcá al menos 3 puntos para cerrar el polígono.");
      return;
    }
    const poligono: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [[...verticesPoligono, verticesPoligono[0]]],
    };
    setVerticesPoligono([]);
    agregarPoligonoDibujado(poligono);
  }

  function actualizarSectorSeleccionado(cambios: Partial<SectorLocalCroquis>) {
    if (indiceSeleccionado === null) return;
    setSectores((previos) =>
      previos.map((s, idx) => (idx === indiceSeleccionado ? { ...s, ...cambios } : s)),
    );
  }

  function borrarSector(indice: number) {
    setSectores((previos) => previos.filter((_, idx) => idx !== indice));
    setIndiceSeleccionado((actual) => {
      if (actual === null) return null;
      if (actual === indice) return null;
      return actual > indice ? actual - 1 : actual;
    });
  }

  function manejarGuardado() {
    setErroresServidor([]);
    setAvisoDibujo(null);

    iniciarTransicion(async () => {
      try {
        const respuesta = await guardarSectoresCroquis(establecimientoId, {
          version: versionInicial,
          sectores: sectores.map((s) => ({
            tipo: s.tipo,
            cultivoId: s.tipo === "cultivo" ? s.cultivoId : null,
            cultivoOtro: s.tipo === "cultivo" && !s.cultivoId ? s.cultivoOtro : null,
            subtipoFlores: s.tipo === "sector_flores" ? s.subtipoFlores : null,
            nombrePersonalizado: s.nombrePersonalizado.trim() || null,
            geometria: s.geometria,
          })),
        });

        if (!respuesta.guardado) {
          setErroresServidor(respuesta.errores ?? ["No se pudieron guardar los sectores."]);
          return;
        }

        try {
          window.localStorage.removeItem(claveBorradorLocal(establecimientoId));
        } catch {
          // Modo privado.
        }

        router.push(`/fincas/${establecimientoId}?aviso=sectores-guardados`);
      } catch {
        setErroresServidor([
          "No se pudo guardar. Tus cambios siguen acá; probá de nuevo cuando tengas señal.",
        ]);
      }
    });
  }

  const sectorEditado = indiceSeleccionado !== null ? sectores[indiceSeleccionado] ?? null : null;
  const rectanguloPreview =
    inicioRect && finRect ? crearRectanguloEnMetros(inicioRect, finRect) : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a la ficha de {nombreEstablecimiento}
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Croquis a escala</h1>
        <p className="text-sm text-stone-600">
          Plano cuadrado de{" "}
          <strong>
            {ladoM.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m ×{" "}
            {ladoM.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m
          </strong>{" "}
          ({formatearSuperficieCompleta(superficieTotalHa)}).
        </p>
      </header>

      {/* Barra de superficie */}
      <aside aria-live="polite" className={`rounded-xl border p-3.5 shadow-xs ${claseBarra}`}>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div>
            <p className="opacity-80">Total</p>
            <p className="font-bold">{formatearHectareas(superficieTotalHa)}</p>
          </div>
          <div>
            <p className="opacity-80">Dibujado</p>
            <p className="font-bold">{formatearHectareas(superficieDistribuida)}</p>
          </div>
          <div>
            <p className="opacity-80">Libre</p>
            <p className="font-bold">{formatearHectareas(restanteHa)}</p>
          </div>
        </div>
      </aside>

      <PaletaSectores cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />

      {/* Barra de herramientas táctiles */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setHerramienta("rectangulo");
            setVerticesPoligono([]);
          }}
          className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
            herramienta === "rectangulo"
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          ▭ Rectángulo (arrastrar)
        </button>
        <button
          type="button"
          onClick={() => {
            setHerramienta("poligono");
            setInicioRect(null);
            setFinRect(null);
          }}
          className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
            herramienta === "poligono"
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          ⬠ Polígono (tocar vértices)
        </button>
        <button
          type="button"
          onClick={() => {
            setHerramienta("seleccionar");
            setVerticesPoligono([]);
          }}
          className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
            herramienta === "seleccionar"
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-stone-300 bg-white text-stone-700"
          }`}
        >
          👆 Seleccionar
        </button>
      </div>

      {/* Controles grandes para polígono en curso (RD-03, CA-02-22) */}
      {herramienta === "poligono" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
          <p className="w-full text-xs text-emerald-950 sm:w-auto sm:flex-1">
            Tocá el plano para marcar los vértices ({verticesPoligono.length} marcados; mínimo 3).
          </p>
          <button
            type="button"
            disabled={verticesPoligono.length < 3}
            onClick={cerrarPoligonoEnCurso}
            className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Terminar polígono
          </button>
          <button
            type="button"
            disabled={verticesPoligono.length === 0}
            onClick={() => setVerticesPoligono((prev) => prev.slice(0, -1))}
            className="min-h-11 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50"
          >
            Deshacer
          </button>
          <button
            type="button"
            disabled={verticesPoligono.length === 0}
            onClick={() => setVerticesPoligono([])}
            className="min-h-11 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
          >
            Borrar trazo
          </button>
        </div>
      ) : null}

      {avisoDibujo ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {avisoDibujo}
        </div>
      ) : null}

      {erroresServidor.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <ul className="list-disc pl-5">
            {erroresServidor.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Plano cuadrado SVG táctil a escala */}
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-1.5">
        <p className="text-xs font-medium text-stone-500">
          ← {ladoM.toLocaleString("es-AR", { maximumFractionDigits: 1 })} m →
        </p>
        <div className="w-full overflow-hidden rounded-xl border-2 border-stone-400 bg-stone-50 shadow-xs">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${TAMANO_SVG} ${TAMANO_SVG}`}
            onPointerDown={manejarPointerDown}
            onPointerMove={manejarPointerMove}
            onPointerUp={manejarPointerUp}
            className="block aspect-square w-full touch-none select-none"
            role="application"
            aria-label="Plano interactivo del croquis"
          >
            {/* Grilla de referencia 10×10 */}
            {Array.from({ length: DIVISIONES_GRILLA - 1 }, (_, i) => {
              const pos = ((i + 1) / DIVISIONES_GRILLA) * TAMANO_SVG;
              return (
                <g key={i} stroke="#d6d3d1" strokeWidth={0.8}>
                  <line x1={pos} y1={0} x2={pos} y2={TAMANO_SVG} />
                  <line x1={0} y1={pos} x2={TAMANO_SVG} y2={pos} />
                </g>
              );
            })}

            {/* Sectores ya dibujados */}
            {sectores.map((s, indice) => {
              const claveCultivo = s.cultivoId ? mapaCultivos.get(s.cultivoId)?.clave : undefined;
              const color = colorDeSector(s.tipo, claveCultivo);
              const seleccionado = indiceSeleccionado === indice;
              const [cx, cy] = metrosASvg(centroidePoligono(s.geometria));

              return (
                <g
                  key={s.claveLocal}
                  onPointerDown={(e) => {
                    if (herramienta === "seleccionar") {
                      e.stopPropagation();
                      setIndiceSeleccionado(indice);
                    }
                  }}
                  className={herramienta === "seleccionar" ? "cursor-pointer" : undefined}
                >
                  <polygon
                    points={poligonoAPointsSvg(s.geometria)}
                    fill={color.relleno}
                    stroke={seleccionado ? "#0f172a" : color.borde}
                    strokeWidth={seleccionado ? 3 : 1.8}
                  />
                  <text
                    x={cx}
                    y={cy - 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight="bold"
                    fill="#1c1917"
                    className="pointer-events-none"
                  >
                    {nombresCalculados[indice]}
                  </text>
                  <text
                    x={cx}
                    y={cy + 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill="#44403c"
                    className="pointer-events-none"
                  >
                    {formatearHectareas(superficiesSectores[indice])}
                  </text>
                </g>
              );
            })}

            {/* Vista previa de rectángulo en arrastre */}
            {rectanguloPreview ? (
              <polygon
                points={poligonoAPointsSvg(rectanguloPreview)}
                fill="rgba(5, 150, 105, 0.25)"
                stroke="#047857"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            ) : null}

            {/* Vista previa de polígono en curso */}
            {verticesPoligono.length > 0 ? (
              <g>
                <polyline
                  points={verticesPoligono
                    .map((p) => {
                      const [sx, sy] = metrosASvg(p);
                      return `${sx.toFixed(1)},${sy.toFixed(1)}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#047857"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
                {verticesPoligono.map((p, i) => {
                  const [sx, sy] = metrosASvg(p);
                  return (
                    <circle
                      key={i}
                      cx={sx}
                      cy={sy}
                      r={5}
                      fill={i === 0 ? "#047857" : "#ffffff"}
                      stroke="#047857"
                      strokeWidth={2}
                    />
                  );
                })}
              </g>
            ) : null}
          </svg>
        </div>
        <p className="text-xs text-stone-500">
          Cada celda de la grilla mide{" "}
          {(ladoM / DIVISIONES_GRILLA).toLocaleString("es-AR", { maximumFractionDigits: 1 })} m ×{" "}
          {(ladoM / DIVISIONES_GRILLA).toLocaleString("es-AR", { maximumFractionDigits: 1 })} m.
        </p>
      </div>

      {/* Panel de edición del sector seleccionado (Esp. 02, 5.3) */}
      {sectorEditado !== null && indiceSeleccionado !== null ? (
        <section className="flex flex-col gap-3 rounded-xl border border-emerald-300 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Editando: {nombresCalculados[indiceSeleccionado]}
              </h2>
              <p className="text-xs text-stone-600">
                Superficie calculada:{" "}
                <strong>{formatearSuperficieCompleta(superficiesSectores[indiceSeleccionado])}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => borrarSector(indiceSeleccionado)}
              className="min-h-10 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Borrar sector
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                actualizarSectorSeleccionado({
                  tipo: "cultivo",
                  subtipoFlores: null,
                  cultivoId: primerCultivo?.id ?? null,
                })
              }
              className={`min-h-10 rounded-lg border text-sm font-semibold ${
                sectorEditado.tipo === "cultivo"
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              🌱 Cultivo
            </button>
            <button
              type="button"
              onClick={() =>
                actualizarSectorSeleccionado({
                  tipo: "sector_flores",
                  cultivoId: null,
                  cultivoOtro: "",
                })
              }
              className={`min-h-10 rounded-lg border text-sm font-semibold ${
                sectorEditado.tipo === "sector_flores"
                  ? "border-purple-700 bg-purple-50 text-purple-900"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              🌼 Sector de flores
            </button>
          </div>

          {sectorEditado.tipo === "cultivo" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="editar-cultivo-croquis" className="text-xs font-semibold text-stone-700">
                Cultivo
              </label>
              <select
                id="editar-cultivo-croquis"
                value={sectorEditado.cultivoId ?? VALOR_OTRO_CULTIVO}
                onChange={(e) =>
                  actualizarSectorSeleccionado({
                    cultivoId: e.target.value === VALOR_OTRO_CULTIVO ? null : e.target.value,
                    cultivoOtro: e.target.value === VALOR_OTRO_CULTIVO ? sectorEditado.cultivoOtro : "",
                  })
                }
                className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
              >
                {cultivos.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.activo && sectorEditado.cultivoId !== c.id}>
                    {c.nombre}
                    {!c.activo ? " (inactivo)" : ""}
                  </option>
                ))}
                <option value={VALOR_OTRO_CULTIVO}>Otro cultivo…</option>
              </select>
              {sectorEditado.cultivoId === null ? (
                <input
                  type="text"
                  maxLength={80}
                  value={sectorEditado.cultivoOtro}
                  onChange={(e) => actualizarSectorSeleccionado({ cultivoOtro: e.target.value })}
                  placeholder="Nombre del cultivo"
                  className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900"
                />
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="editar-subtipo-croquis" className="text-xs font-semibold text-stone-700">
                Subtipo de flores (opcional)
              </label>
              <select
                id="editar-subtipo-croquis"
                value={sectorEditado.subtipoFlores ?? ""}
                onChange={(e) =>
                  actualizarSectorSeleccionado({
                    subtipoFlores: (e.target.value || null) as SubtipoFlores | null,
                  })
                }
                className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
              >
                <option value="">Sin especificar</option>
                {SUBTIPOS_FLORES.map((sub) => (
                  <option key={sub} value={sub}>
                    {ETIQUETAS_SUBTIPO_FLORES[sub]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="editar-nombre-croquis" className="text-xs font-semibold text-stone-700">
              Nombre personalizado (opcional)
            </label>
            <input
              id="editar-nombre-croquis"
              type="text"
              maxLength={60}
              value={sectorEditado.nombrePersonalizado}
              onChange={(e) => actualizarSectorSeleccionado({ nombrePersonalizado: e.target.value })}
              placeholder={`Automático: ${nombresCalculados[indiceSeleccionado]}`}
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900"
            />
          </div>
        </section>
      ) : null}

      {/* Lista resumida de sectores dibujados */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold text-stone-900">
          Sectores dibujados ({sectores.length})
        </h2>
        {sectores.length === 0 ? (
          <p className="text-sm text-stone-600">
            Arrastrá sobre el plano o marcá vértices para agregar sectores.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sectores.map((s, idx) => (
              <li
                key={s.claveLocal}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                  indiceSeleccionado === idx
                    ? "border-emerald-600 bg-emerald-50/50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIndiceSeleccionado(idx)}
                  className="flex flex-1 flex-col text-left"
                >
                  <span className="text-sm font-semibold text-stone-900">
                    {s.tipo === "sector_flores" ? "🌼" : "🌱"} {nombresCalculados[idx]}
                  </span>
                  <span className="text-xs text-stone-600">
                    {formatearSuperficieCompleta(superficiesSectores[idx])}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => borrarSector(idx)}
                  className="min-h-10 rounded-lg px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:justify-end">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          Cancelar
        </Link>
        <button
          type="button"
          onClick={manejarGuardado}
          disabled={guardando}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
