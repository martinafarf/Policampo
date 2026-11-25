"use client";

// Editor interactivo de croquis a escala (Esp. 02, T4, CA-02-13, CA-02-22, RD-03).
// Plano cuadrado de lado √(ha × 10.000) metros con grilla, dibujo táctil por rectángulo o polígono,
// paleta compartida y recálculo de superficies en el servidor al guardar.
//
// Pantalla (solo el aspecto; la lógica de dibujo no cambia): en la computadora el plano va a la izquierda,
// grande, y a la derecha la superficie con el botón Guardar, la paleta y lo dibujado. En el celular va una
// cosa debajo de la otra, en el orden en que se usan.
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import { IconoAlerta } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Aviso } from "@/componentes/ui/formulario";
import { Desplegable } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaPlanaHa,
  calcularLadoCroquisMetros,
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

const CAMPO =
  "min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";
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
  actualizadoEnIso: string;
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
  actualizadoEnIso,
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

  const onRecuperarBorrador = useCallback((datos: SectorLocalCroquis[]) => {
    setSectores(datos);
    setSiguienteId((n) => n + datos.length + 1);
    setIndiceSeleccionado(null);
  }, []);

  const {
    borradorPendiente,
    ultimoAutoguardado,
    recuperarBorrador,
    descartarBorrador,
    guardarBorradorAhora,
    limpiarBorrador,
  } = useBorradorFinca<SectorLocalCroquis[]>({
    establecimientoId,
    metodo: "croquis",
    actualizadoEnIso,
    datosActuales: sectores,
    onRecuperar: onRecuperarBorrador,
  });

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

        limpiarBorrador();

        router.push(`/fincas/${establecimientoId}?aviso=sectores-guardados`);
      } catch {
        guardarBorradorAhora();
        setErroresServidor([
          "No se pudo guardar. Tus cambios siguen en este dispositivo; probá de nuevo cuando tengas señal.",
        ]);
      }
    });
  }

  const sectorEditado = indiceSeleccionado !== null ? sectores[indiceSeleccionado] ?? null : null;
  const rectanguloPreview =
    inicioRect && finRect ? crearRectanguloEnMetros(inicioRect, finRect) : null;

  const porcentajeUsado = superficieTotalHa > 0 ? Math.min(100, (superficieDistribuida / superficieTotalHa) * 100) : 0;
  const colorBarra = excedida ? "bg-error" : cercaDeCero ? "bg-naranja" : "bg-hoja";
  const lado = ladoM.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  const celda = (ladoM / DIVISIONES_GRILLA).toLocaleString("es-AR", { maximumFractionDigits: 1 });

  const botonGuardar = (
    <Boton onClick={manejarGuardado} disabled={guardando} anchoCompleto>
      {guardando ? "Guardando…" : "Guardar mi terreno"}
    </Boton>
  );

  /** Cada herramienta es una píldora; la elegida va en oliva. */
  const claseHerramienta = (activa: boolean) =>
    `inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-[0.95rem] font-bold transition ${
      activa
        ? "border-transparent bg-hoja text-white"
        : "border-borde bg-white text-tinta-suave hover:border-hoja hover:text-tinta"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: nombreEstablecimiento, href: `/fincas/${establecimientoId}` },
        ]}
        titulo="Dibujá tu finca"
      />

      {/* Computadora: el plano a la izquierda; a la derecha la superficie, la paleta y lo dibujado.
          Celular: una cosa debajo de la otra, en el orden en que se usan (ver "max-lg:order-N"). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-6">
        {/* Izquierda: herramientas y plano */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="max-lg:order-1 empty:hidden">
            <BannerBorrador
              fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
              ultimoAutoguardadoIso={ultimoAutoguardado}
              onRecuperar={recuperarBorrador}
              onDescartar={descartarBorrador}
            />
          </div>

          {/* Ayuda: con el plano vacío son 3 pasos a la vista */}
          <div className="max-lg:order-4 empty:hidden">
            {sectores.length === 0 ? (
              <ol className="grid gap-2 rounded-[28px] border-2 border-menta-fuerte bg-menta p-4 sm:grid-cols-3">
                {[
                  "Elegí qué vas a dibujar.",
                  herramienta === "poligono"
                    ? "Tocá las esquinas del sector en el plano."
                    : "Arrastrá el dedo o el mouse sobre el plano.",
                  "Cuando termines, tocá «Guardar mi terreno».",
                ].map((texto, i) => (
                  <li key={texto} className="flex items-center gap-3 text-[0.95rem] font-semibold text-bosque">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-naranja text-sm font-extrabold text-bosque">
                      {i + 1}
                    </span>
                    {texto}
                  </li>
                ))}
              </ol>
            ) : null}
          </div>

          {/* Herramientas de dibujo */}
          <div className="flex flex-wrap items-center gap-2 max-lg:order-5" role="group" aria-label="Herramientas de dibujo">
            <button
              type="button"
              aria-pressed={herramienta === "rectangulo"}
              onClick={() => {
                setHerramienta("rectangulo");
                setVerticesPoligono([]);
              }}
              className={claseHerramienta(herramienta === "rectangulo")}
            >
              ▭ Rectángulo
            </button>
            <button
              type="button"
              aria-pressed={herramienta === "poligono"}
              onClick={() => {
                setHerramienta("poligono");
                setInicioRect(null);
                setFinRect(null);
              }}
              className={claseHerramienta(herramienta === "poligono")}
            >
              ⬠ Forma libre
            </button>
            <button
              type="button"
              aria-pressed={herramienta === "seleccionar"}
              onClick={() => {
                setHerramienta("seleccionar");
                setVerticesPoligono([]);
              }}
              className={claseHerramienta(herramienta === "seleccionar")}
            >
              👆 Elegir sector
            </button>
          </div>

          {/* Controles grandes para la forma libre en curso (RD-03, CA-02-22) */}
          {herramienta === "poligono" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-menta px-4 py-3 max-lg:order-5">
              <p className="w-full text-[0.95rem] font-semibold text-bosque sm:w-auto sm:flex-1">
                Tocá el plano para marcar las esquinas ({verticesPoligono.length} marcadas; hacen falta al
                menos 3).
              </p>
              <Boton
                variante="contorno"
                disabled={verticesPoligono.length < 3}
                onClick={cerrarPoligonoEnCurso}
                className="min-h-11 px-5"
              >
                Terminar forma
              </Boton>
              <Boton
                variante="texto"
                disabled={verticesPoligono.length === 0}
                onClick={() => setVerticesPoligono((prev) => prev.slice(0, -1))}
                className="min-h-11"
              >
                Deshacer
              </Boton>
              <Boton
                variante="texto"
                disabled={verticesPoligono.length === 0}
                onClick={() => setVerticesPoligono([])}
                className="min-h-11"
              >
                Borrar trazo
              </Boton>
            </div>
          ) : null}

          {avisoDibujo ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-3 text-[0.95rem] font-semibold text-[#7a4100] max-lg:order-5"
            >
              <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
              {avisoDibujo}
            </div>
          ) : null}

          {erroresServidor.length > 0 ? (
            <div className="max-lg:order-5">
              <Aviso tipo="error">
                <ul className="list-disc pl-5">
                  {erroresServidor.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Aviso>
            </div>
          ) : null}

          {/* Plano cuadrado SVG táctil a escala. Su ancho se limita para que, en la computadora, entre entero en la pantalla. */}
          <div className="mx-auto flex w-full max-w-[min(100%,max(20rem,calc(100dvh-19rem)))] flex-col items-center gap-1.5 max-lg:order-6">
            <p className="text-center text-[0.95rem] font-semibold text-tinta-suave">
              Tu finca es un cuadrado de {lado} m por {lado} m ({formatearHectareas(superficieTotalHa)})
            </p>
            <div className="w-full overflow-hidden rounded-2xl border-2 border-borde bg-papel">
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
                    <g key={i} stroke="#d3e0cc" strokeWidth={0.8}>
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
                        stroke={seleccionado ? "#003300" : color.borde}
                        strokeWidth={seleccionado ? 3 : 1.8}
                      />
                      <text
                        x={cx}
                        y={cy - 4}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight="bold"
                        fill="#0f220f"
                        className="pointer-events-none"
                      >
                        {nombresCalculados[indice]}
                      </text>
                      <text
                        x={cx}
                        y={cy + 10}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#45573a"
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
                    fill="rgba(89, 121, 49, 0.25)"
                    stroke="#597931"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                ) : null}

                {/* Vista previa de la forma libre en curso */}
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
                      stroke="#597931"
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
                          fill={i === 0 ? "#597931" : "#ffffff"}
                          stroke="#597931"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </g>
                ) : null}
              </svg>
            </div>
            <p className="text-sm text-tinta-suave">
              Cada cuadradito de la grilla mide {celda} m por {celda} m.
            </p>
          </div>

          {/* Cuando ya hay sectores, la ayuda queda a mano pero cerrada, debajo del plano */}
          {sectores.length > 0 ? (
            <div className="max-lg:order-6">
                <Desplegable pregunta="¿Cómo se dibuja?">
                  Elegí qué vas a dibujar y marcá el sector en el plano: arrastrando (rectángulo) o tocando las
                  esquinas (forma libre). Para cambiar uno que ya dibujaste, usá «Elegir sector» y tocalo.
                </Desplegable>
              </div>
          ) : null}

          {/* Lista de lo dibujado */}
          <div className="max-lg:order-8">
            <Tarjeta titulo="Lo que dibujaste" extra={<span className="text-[0.95rem] font-semibold text-tinta-suave">{sectores.length}</span>}>
              {sectores.length === 0 ? (
                <p className="text-tinta-suave">Todavía no dibujaste nada. Elegí qué dibujar y marcalo en el plano.</p>
              ) : (
                <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                  {sectores.map((s, idx) => (
                    <li
                      key={s.claveLocal}
                      className={`flex items-center justify-between gap-2 py-1.5 ${
                        indiceSeleccionado === idx ? "-mx-3 rounded-2xl bg-menta px-3" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setIndiceSeleccionado(idx)}
                        className="flex min-h-12 flex-1 flex-col justify-center text-left"
                      >
                        <span className="font-semibold text-tinta">
                          {s.tipo === "sector_flores" ? "🌼" : "🌱"} {nombresCalculados[idx]}
                        </span>
                        <span className="text-sm text-tinta-suave">
                          {formatearSuperficieCompleta(superficiesSectores[idx])}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => borrarSector(idx)}
                        aria-label={`Quitar ${nombresCalculados[idx]}`}
                        className="inline-flex min-h-10 items-center rounded-full px-3 text-[0.95rem] font-bold text-error transition hover:bg-error-claro"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Tarjeta>
          </div>
        </div>

        {/* Derecha: superficie, paleta y el sector elegido */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          {/* Cuánta superficie llevás dibujada. En la computadora lleva el botón Guardar. */}
          <aside
            aria-live="polite"
            className="flex flex-col gap-3 rounded-[28px] border-2 border-menta-fuerte bg-menta p-5 max-lg:order-2"
          >
            <h2 className="text-xl font-bold text-bosque">Tu superficie</h2>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-titulos text-3xl font-extrabold text-bosque">
                {formatearHectareas(superficieDistribuida)}
              </strong>
              <span className="text-tinta-suave">de {formatearHectareas(superficieTotalHa)}</span>
            </p>
            <div className="h-4 overflow-hidden rounded-full bg-white" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all ${colorBarra}`}
                style={{ width: `${porcentajeUsado}%` }}
              />
            </div>
            {excedida ? (
              <p className="flex items-start gap-2 font-semibold text-error">
                <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                Dibujaste de más: los sectores suman más que tu finca.
              </p>
            ) : (
              <p className="font-titulos text-lg font-bold text-bosque">
                {restanteHa > 0 ? `Te quedan ${formatearHectareas(restanteHa)} libres.` : "Ya dibujaste toda la finca."}
              </p>
            )}
            <div className="flex flex-col gap-1 max-lg:hidden">
              {botonGuardar}
              <BotonEnlace href={`/fincas/${establecimientoId}`} variante="texto">
                Cancelar
              </BotonEnlace>
            </div>
          </aside>

          <div className="max-lg:order-3">
            <PaletaSectores cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />
          </div>

          {/* Panel de edición del sector seleccionado (Esp. 02, 5.3) */}
          {sectorEditado !== null && indiceSeleccionado !== null ? (
            <div className="max-lg:order-7">
              <Tarjeta
                titulo={`Editando: ${nombresCalculados[indiceSeleccionado]}`}
                extra={
                  <Boton
                    variante="peligro"
                    onClick={() => borrarSector(indiceSeleccionado)}
                    className="min-h-10 px-4 text-sm"
                  >
                    Borrar sector
                  </Boton>
                }
              >
                <p className="text-tinta-suave">
                  Mide <strong className="text-tinta">{formatearSuperficieCompleta(superficiesSectores[indiceSeleccionado])}</strong>.
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={sectorEditado.tipo === "cultivo"}
                    onClick={() =>
                      actualizarSectorSeleccionado({
                        tipo: "cultivo",
                        subtipoFlores: null,
                        cultivoId: primerCultivo?.id ?? null,
                      })
                    }
                    className={`min-h-12 rounded-2xl border-2 px-3 text-[0.95rem] font-bold transition ${
                      sectorEditado.tipo === "cultivo"
                        ? "border-hoja bg-menta text-bosque"
                        : "border-borde bg-white text-tinta-suave hover:border-hoja"
                    }`}
                  >
                    🌱 Cultivo
                  </button>
                  <button
                    type="button"
                    aria-pressed={sectorEditado.tipo === "sector_flores"}
                    onClick={() =>
                      actualizarSectorSeleccionado({
                        tipo: "sector_flores",
                        cultivoId: null,
                        cultivoOtro: "",
                      })
                    }
                    className={`min-h-12 rounded-2xl border-2 px-3 text-[0.95rem] font-bold transition ${
                      sectorEditado.tipo === "sector_flores"
                        ? "border-purple-700 bg-purple-50 text-bosque"
                        : "border-borde bg-white text-tinta-suave hover:border-hoja"
                    }`}
                  >
                    🌼 Flores
                  </button>
                </div>

                {sectorEditado.tipo === "cultivo" ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="editar-cultivo-croquis" className="text-[0.95rem] font-semibold text-tinta">
                      ¿Qué cultivo es?
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
                      className={CAMPO}
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
                        aria-label="Nombre del cultivo"
                        className={CAMPO}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="editar-subtipo-croquis" className="text-[0.95rem] font-semibold text-tinta">
                      ¿Qué tipo de flores o vegetación?
                    </label>
                    <select
                      id="editar-subtipo-croquis"
                      value={sectorEditado.subtipoFlores ?? ""}
                      onChange={(e) =>
                        actualizarSectorSeleccionado({
                          subtipoFlores: (e.target.value || null) as SubtipoFlores | null,
                        })
                      }
                      className={CAMPO}
                    >
                      <option value="">No sé / sin especificar</option>
                      {SUBTIPOS_FLORES.map((sub) => (
                        <option key={sub} value={sub}>
                          {ETIQUETAS_SUBTIPO_FLORES[sub]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editar-nombre-croquis" className="text-[0.95rem] font-semibold text-tinta">
                    Nombre del sector (si querés ponerle uno)
                  </label>
                  <input
                    id="editar-nombre-croquis"
                    type="text"
                    maxLength={60}
                    value={sectorEditado.nombrePersonalizado}
                    onChange={(e) => actualizarSectorSeleccionado({ nombrePersonalizado: e.target.value })}
                    placeholder={nombresCalculados[indiceSeleccionado]}
                    className={CAMPO}
                  />
                </div>
              </Tarjeta>
            </div>
          ) : null}

          {/* En el celular, Guardar va al final */}
          <div className="flex flex-col gap-1 lg:hidden max-lg:order-9">
            {botonGuardar}
            <BotonEnlace href={`/fincas/${establecimientoId}`} variante="texto">
              Cancelar
            </BotonEnlace>
          </div>
        </div>
      </div>
    </div>
  );
}
