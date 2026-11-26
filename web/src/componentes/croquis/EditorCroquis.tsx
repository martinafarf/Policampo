"use client";

// Editor interactivo de croquis a escala (Esp. 02, T4, CA-02-13, CA-02-22, RD-03).
// Plano cuadrado de lado √(ha × 10.000) metros con grilla, dibujo táctil por rectángulo o polígono,
// paleta compartida y recálculo de superficies en el servidor al guardar.
//
// Cómo se usa (sin cambiar de herramienta): arrastrar en un lugar vacío dibuja; tocar un sector lo elige;
// arrastrarlo lo mueve; los cuadraditos blancos de las esquinas cambian su tamaño; Supr o clic derecho lo borra
// (con "Deshacer"). Todo lo que se mueve se valida igual que al dibujar: dentro del plano y sin pisar a otro.
//
// Pantalla: en la computadora el plano va a la izquierda,
// grande, y a la derecha la superficie con el botón Guardar, la paleta y lo dibujado. En el celular va una
// cosa debajo de la otra, en el orden en que se usan.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import { IconoAlerta } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Aviso } from "@/componentes/ui/formulario";
import { MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaPlanaHa,
  calcularLadoCroquisMetros,
  crearContornoCroquis,
  formatearHectareas,
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

type HerramientaCroquis = "rectangulo" | "poligono";

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

/** Mueve un polígono sumando dx, dy (en metros). Redondea a 2 decimales, como el resto del plano. */
function trasladarPoligono(poligono: PoligonoGeoJson, dx: number, dy: number): PoligonoGeoJson {
  return {
    type: "Polygon",
    coordinates: poligono.coordinates.map((anillo) =>
      anillo.map(([x, y]) => [Math.round((x + dx) * 100) / 100, Math.round((y + dy) * 100) / 100] as Posicion2D),
    ),
  };
}

/** Rectángulo mínimo que contiene al polígono (para que al arrastrarlo no se salga del plano). */
function limitesDelPoligono(poligono: PoligonoGeoJson): { minX: number; maxX: number; minY: number; maxY: number } {
  const puntos = poligono.coordinates[0] ?? [];
  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** Qué se está haciendo con un sector que ya estaba dibujado. */
type TipoManipulacion = "mover" | "redimensionar" | "vertice";

interface Manipulacion {
  tipo: TipoManipulacion;
  indice: number;
  /** Dónde se tocó el plano al empezar (en metros). */
  inicio: Posicion2D;
  /** Cómo estaba el sector antes de tocarlo. */
  original: PoligonoGeoJson;
  /** Cómo quedaría ahora (se ve en pantalla mientras se arrastra). */
  geometria: PoligonoGeoJson;
  /** Mensaje si así no puede quedar (se pisa con otro, se sale, es muy chico); null si está bien. */
  problema: string | null;
  /** Cuadradito elegido para cambiar el tamaño: -1 izquierda/arriba, 1 derecha/abajo, 0 sin cambio en ese eje. */
  hx?: -1 | 0 | 1;
  hy?: -1 | 0 | 1;
  /** Esquina elegida (en una forma libre). */
  vertice?: number;
}

/** Cuadradito blanco para agarrar: en una esquina o en el medio de un lado de un rectángulo, o en un vértice. */
interface Asa {
  clave: string;
  x: number;
  y: number;
  hx?: -1 | 0 | 1;
  hy?: -1 | 0 | 1;
  vertice?: number;
}

/** true si es un rectángulo con los lados derechos (los que se dibujan arrastrando). */
function esRectangulo(poligono: PoligonoGeoJson): boolean {
  const a = poligono.coordinates[0] ?? [];
  if (a.length !== 5) return false;
  const horizontalPrimero = a[0][1] === a[1][1] && a[1][0] === a[2][0] && a[2][1] === a[3][1] && a[3][0] === a[0][0];
  const verticalPrimero = a[0][0] === a[1][0] && a[1][1] === a[2][1] && a[2][0] === a[3][0] && a[3][1] === a[0][1];
  return horizontalPrimero || verticalPrimero;
}

/** Dónde van los cuadraditos para agarrar. En un rectángulo chico solo las 4 esquinas, para que no se amontonen. */
function asasDe(poligono: PoligonoGeoJson): Asa[] {
  if (esRectangulo(poligono)) {
    const { minX, maxX, minY, maxY } = limitesDelPoligono(poligono);
    const chico = maxX - minX < 24 || maxY - minY < 24;
    const columnas: (-1 | 0 | 1)[] = [-1, 0, 1];
    const asas: Asa[] = [];
    for (const hy of columnas) {
      for (const hx of columnas) {
        if (hx === 0 && hy === 0) continue;
        if (chico && (hx === 0 || hy === 0)) continue;
        asas.push({
          clave: `r${hx}${hy}`,
          x: hx === -1 ? minX : hx === 1 ? maxX : (minX + maxX) / 2,
          y: hy === -1 ? minY : hy === 1 ? maxY : (minY + maxY) / 2,
          hx,
          hy,
        });
      }
    }
    return asas;
  }
  const anillo = poligono.coordinates[0] ?? [];
  return anillo.slice(0, -1).map((p, i) => ({ clave: `v${i}`, x: p[0], y: p[1], vertice: i }));
}

/** Cuánto se movió, como máximo, cualquier punto entre dos formas (en metros). */
function diferenciaMaxima(a: PoligonoGeoJson, b: PoligonoGeoJson): number {
  const pa = a.coordinates[0] ?? [];
  const pb = b.coordinates[0] ?? [];
  if (pa.length !== pb.length) return Infinity;
  return pa.reduce((max, p, i) => Math.max(max, Math.abs(p[0] - pb[i][0]), Math.abs(p[1] - pb[i][1])), 0);
}

/** Cursor del mouse sobre cada cuadradito: flechas hacia donde se puede estirar. */
function cursorDeAsa(asa: Asa): string {
  if (asa.vertice !== undefined) return "cursor-move";
  const { hx = 0, hy = 0 } = asa;
  if (hx === 0) return "cursor-ns-resize";
  if (hy === 0) return "cursor-ew-resize";
  return hx * hy > 0 ? "cursor-nwse-resize" : "cursor-nesw-resize";
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
  // Sector que se está moviendo o cambiando de tamaño con el dedo o el mouse.
  const [manipulacion, setManipulacion] = useState<Manipulacion | null>(null);
  // Último sector borrado, para poder deshacerlo.
  const [ultimoBorrado, setUltimoBorrado] = useState<{ sector: SectorLocalCroquis; indice: number; nombre: string } | null>(null);
  // Menú que sale con el clic derecho sobre un sector (posición dentro del plano, en píxeles).
  const [menuContextual, setMenuContextual] = useState<{ indice: number; x: number; y: number } | null>(null);
  const contenedorPlanoRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [guardando, iniciarTransicion] = useTransition();

  const onRecuperarBorrador = useCallback((datos: SectorLocalCroquis[]) => {
    // Los sectores del borrador traen claves de la visita anterior (ej. «croquis-nuevo-8») que pueden
    // coincidir con las que se generen ahora. Se les da claves propias para que React no las repita.
    setSectores(datos.map((s, i) => ({ ...s, claveLocal: `croquis-borrador-${i}` })));
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

  function eventoAMetros(evento: React.PointerEvent<Element>): Posicion2D | null {
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

  /** Por qué un sector con esta forma no puede quedar así; null si está bien. Las mismas reglas que al dibujar. */
  function problemaDe(indice: number, geometria: PoligonoGeoJson): string | null {
    const basico = validarPoligonoBasico(geometria, "croquis");
    if (!basico.valido) return basico.error ?? "Esa forma no es válida.";
    const dentro = validarSectorDentroDelContorno(geometria, contornoCroquis, "croquis");
    if (!dentro.valido) return dentro.error ?? "El sector sobresale del terreno.";
    const sinChoque = validarSectoresSinSuperposicion(
      [...sectores.filter((_, i) => i !== indice).map((sec) => sec.geometria), geometria],
      "croquis",
    );
    if (!sinChoque.valido) return "Ahí se pisa con otro sector. Dejalo en un lugar libre.";
    return null;
  }

  /** Cómo quedaría el sector si el dedo o el mouse están en "punto". */
  function calcularCandidato(m: Manipulacion, punto: Posicion2D): { geometria: PoligonoGeoJson; problema: string | null } {
    let geometria = m.original;
    if (m.tipo === "mover") {
      // El plano es el borde: el sector no se puede arrastrar más allá.
      const lim = limitesDelPoligono(m.original);
      const dx = Math.max(-lim.minX, Math.min(ladoM - lim.maxX, punto[0] - m.inicio[0]));
      const dy = Math.max(-lim.minY, Math.min(ladoM - lim.maxY, punto[1] - m.inicio[1]));
      geometria = trasladarPoligono(m.original, dx, dy);
    } else if (m.tipo === "redimensionar") {
      const lim = limitesDelPoligono(m.original);
      const x0 = m.hx === -1 ? punto[0] : lim.minX;
      const x1 = m.hx === 1 ? punto[0] : lim.maxX;
      const y0 = m.hy === -1 ? punto[1] : lim.minY;
      const y1 = m.hy === 1 ? punto[1] : lim.maxY;
      geometria = crearRectanguloEnMetros([x0, y0], [x1, y1]);
      const nuevo = limitesDelPoligono(geometria);
      if (nuevo.maxX - nuevo.minX < ladoM * 0.01 || nuevo.maxY - nuevo.minY < ladoM * 0.01) {
        return { geometria, problema: "Así queda demasiado chico. Estirá un poco más." };
      }
    } else {
      const anillo = (m.original.coordinates[0] ?? []).map((q) => [q[0], q[1]] as Posicion2D);
      const v = m.vertice ?? 0;
      anillo[v] = punto;
      if (v === 0) anillo[anillo.length - 1] = punto; // el último punto repite al primero
      geometria = { type: "Polygon", coordinates: [anillo] };
    }
    return { geometria, problema: problemaDe(m.indice, geometria) };
  }

  /** Empieza a mover un sector (tipo "mover"), a estirarlo desde un cuadradito o a mover una esquina. */
  function empezarManipulacion(evento: React.PointerEvent<Element>, indice: number, tipo: TipoManipulacion, asa?: Asa) {
    // Con el mouse solo cuenta el botón izquierdo (el derecho abre el menú).
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    const punto = eventoAMetros(evento);
    if (!punto) return;
    evento.stopPropagation();
    setIndiceSeleccionado(indice);
    setAvisoDibujo(null);
    setMenuContextual(null);
    // El plano sigue recibiendo el movimiento aunque el dedo o el mouse salgan del sector.
    svgRef.current?.setPointerCapture(evento.pointerId);
    const original = sectores[indice].geometria;
    setManipulacion({
      tipo,
      indice,
      inicio: punto,
      original,
      geometria: original,
      problema: null,
      hx: asa?.hx,
      hy: asa?.hy,
      vertice: asa?.vertice,
    });
  }

  function seguirManipulacion(evento: React.PointerEvent<SVGSVGElement>) {
    if (!manipulacion) return;
    const punto = eventoAMetros(evento);
    if (!punto) return;
    const { geometria, problema } = calcularCandidato(manipulacion, punto);
    setManipulacion({ ...manipulacion, geometria, problema });
  }

  function soltarManipulacion(evento: React.PointerEvent<SVGSVGElement>) {
    if (!manipulacion) return;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }
    const { indice, original, geometria, problema } = manipulacion;
    setManipulacion(null);

    // Un toque sin mover solo elige el sector.
    if (diferenciaMaxima(original, geometria) < ladoM * 0.005) return;

    if (problema) {
      // No puede quedar así: vuelve a como estaba y se explica por qué.
      setAvisoDibujo(problema);
      return;
    }
    setSectores((previos) => previos.map((sec, i) => (i === indice ? { ...sec, geometria } : sec)));
  }

  /** Abre el menú del clic derecho sobre un sector. */
  function abrirMenuContextual(evento: React.MouseEvent<Element>, indice: number) {
    evento.preventDefault();
    evento.stopPropagation();
    const caja = contenedorPlanoRef.current?.getBoundingClientRect();
    if (!caja) return;
    // 224 px de ancho y 88 de alto: se corre si no entra.
    const x = Math.max(4, Math.min(caja.width - 228, evento.clientX - caja.left));
    const y = Math.max(4, Math.min(caja.height - 92, evento.clientY - caja.top));
    setIndiceSeleccionado(indice);
    setAvisoDibujo(null);
    setMenuContextual({ indice, x, y });
  }

  function manejarPointerDown(evento: React.PointerEvent<SVGSVGElement>) {
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    setMenuContextual(null);
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
    if (manipulacion) {
      seguirManipulacion(evento);
      return;
    }
    if (herramienta !== "rectangulo" || !inicioRect) return;
    const punto = eventoAMetros(evento);
    if (punto) {
      setFinRect(punto);
    }
  }

  function manejarPointerUp(evento: React.PointerEvent<SVGSVGElement>) {
    if (manipulacion) {
      soltarManipulacion(evento);
      return;
    }
    if (herramienta !== "rectangulo" || !inicioRect || !finRect) return;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    }

    const anchoM = Math.abs(finRect[0] - inicioRect[0]);
    const altoM = Math.abs(finRect[1] - inicioRect[1]);
    setInicioRect(null);
    setFinRect(null);

    // Un toque en un lugar vacío (sin arrastrar) deja de elegir el sector que estaba elegido.
    if (anchoM < ladoM * 0.01 || altoM < ladoM * 0.01) {
      setIndiceSeleccionado(null);
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
    const borrado = sectores[indice];
    if (!borrado) return;
    setUltimoBorrado({ sector: borrado, indice, nombre: nombresCalculados[indice] });
    setAvisoDibujo(null);
    setSectores((previos) => previos.filter((_, idx) => idx !== indice));
    setIndiceSeleccionado((actual) => {
      if (actual === null) return null;
      if (actual === indice) return null;
      return actual > indice ? actual - 1 : actual;
    });
    setMenuContextual(null);
  }

  // El teclado usa siempre la versión más nueva de borrarSector (ve los sectores de ese momento).
  const borrarSectorRef = useRef(borrarSector);
  useEffect(() => {
    borrarSectorRef.current = borrarSector;
  });

  function deshacerBorrado() {
    if (!ultimoBorrado) return;
    const { sector, indice } = ultimoBorrado;
    // Si mientras tanto se dibujó algo en ese lugar, ya no se puede devolver sin pisarlo.
    const sinChoque = validarSectoresSinSuperposicion([...sectores.map((s) => s.geometria), sector.geometria], "croquis");
    if (!sinChoque.valido) {
      setAvisoDibujo("No se puede devolver: ahora hay otro sector en ese lugar.");
      setUltimoBorrado(null);
      return;
    }
    const posicion = Math.min(indice, sectores.length);
    setSectores((previos) => {
      const copia = [...previos];
      copia.splice(Math.min(posicion, copia.length), 0, sector);
      return copia;
    });
    setIndiceSeleccionado(posicion);
    setUltimoBorrado(null);
  }

  // Teclado: Supr (o Borrar) borra el sector elegido; Escape cierra el menú, cancela el trazo o deja de elegir.
  useEffect(() => {
    function alApretar(e: KeyboardEvent) {
      const destino = e.target as HTMLElement | null;
      const escribiendo =
        !!destino &&
        (destino.tagName === "INPUT" ||
          destino.tagName === "TEXTAREA" ||
          destino.tagName === "SELECT" ||
          destino.isContentEditable);
      if (e.key === "Escape") {
        setMenuContextual(null);
        if (verticesPoligono.length > 0) setVerticesPoligono([]);
        else if (!escribiendo) setIndiceSeleccionado(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !escribiendo) {
        if (verticesPoligono.length > 0) {
          // En medio de una forma libre, borrar saca el último punto marcado.
          e.preventDefault();
          setVerticesPoligono((prev) => prev.slice(0, -1));
        } else if (indiceSeleccionado !== null) {
          e.preventDefault();
          borrarSectorRef.current(indiceSeleccionado);
        }
      }
    }
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, [indiceSeleccionado, verticesPoligono.length]);

  // El aviso de dibujo ("Ahí se pisa con otro sector…") se va solo a los 8 segundos.
  useEffect(() => {
    if (!avisoDibujo) return;
    const t = window.setTimeout(() => setAvisoDibujo(null), 8_000);
    return () => window.clearTimeout(t);
  }, [avisoDibujo]);

  // El aviso "Borraste…" se va solo a los 10 segundos.
  useEffect(() => {
    if (!ultimoBorrado) return;
    const t = window.setTimeout(() => setUltimoBorrado(null), 10_000);
    return () => window.clearTimeout(t);
  }, [ultimoBorrado]);

  // El menú del clic derecho se cierra al tocar en cualquier otro lado.
  useEffect(() => {
    if (!menuContextual) return;
    const alTocarAfuera = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuContextual(null);
    };
    document.addEventListener("pointerdown", alTocarAfuera);
    return () => document.removeEventListener("pointerdown", alTocarAfuera);
  }, [menuContextual]);

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
  // Forma del sector elegido (la que se ve mientras se arrastra) y los cuadraditos para agarrarlo.
  const geometriaElegida =
    indiceSeleccionado !== null && sectores[indiceSeleccionado]
      ? manipulacion?.indice === indiceSeleccionado
        ? manipulacion.geometria
        : sectores[indiceSeleccionado].geometria
      : null;
  const asasElegido = geometriaElegida && verticesPoligono.length === 0 ? asasDe(geometriaElegida) : [];
  // Una pista corta, siempre a la vista, de lo que se puede hacer con los sectores.
  const pista =
    verticesPoligono.length > 0
      ? null
      : indiceSeleccionado !== null && sectorEditado
        ? `«${nombresCalculados[indiceSeleccionado]}»: arrastralo para moverlo · tirá de los cuadraditos para cambiar el tamaño · Supr o clic derecho para borrarlo`
        : sectores.length > 0
          ? "Tocá un sector del plano para elegirlo, moverlo o cambiarle el tamaño."
          : null;
  const rectanguloPreview =
    inicioRect && finRect ? crearRectanguloEnMetros(inicioRect, finRect) : null;

  const porcentajeUsado = superficieTotalHa > 0 ? Math.min(100, (superficieDistribuida / superficieTotalHa) * 100) : 0;
  const colorBarra = excedida ? "bg-error" : cercaDeCero ? "bg-naranja" : "bg-hoja";
  const lado = ladoM.toLocaleString("es-AR", { maximumFractionDigits: 1 });
  const celda = (ladoM / DIVISIONES_GRILLA).toLocaleString("es-AR", { maximumFractionDigits: 1 });

  const botonGuardar = (
    <Boton onClick={manejarGuardado} disabled={guardando} anchoCompleto className="min-h-11">
      {guardando ? "Guardando…" : "Guardar mi terreno"}
    </Boton>
  );

  /** Cada herramienta es una píldora; la elegida va en oliva. */
  const claseHerramienta = (activa: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold transition ${
      activa
        ? "border-transparent bg-hoja text-white"
        : "border-borde bg-white text-tinta-suave hover:border-hoja hover:text-tinta"
    }`;

  /** Campos más bajos para el panel de la derecha. */
  const CAMPO_CHICO =
    "min-h-10 w-full rounded-xl border-[1.5px] border-borde bg-papel px-3 text-sm text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-7.5rem)] lg:min-h-[32rem]">
      <EncabezadoPagina
        compacto
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: nombreEstablecimiento, href: `/fincas/${establecimientoId}` },
        ]}
        titulo="Dibujá tu finca"
        ayuda={
          <MasInfo ancho sobre="cómo dibujar tu finca">
            <span className="block font-bold text-bosque">Cómo dibujar tu finca</span>
            <span className="mt-1.5 block">
              <strong>1.</strong> A la izquierda, elegí qué vas a dibujar: un cultivo o flores.
            </span>
            <span className="mt-1 block">
              <strong>2.</strong> Marcalo en el plano: arrastrá en un lugar vacío para hacer un rectángulo, o elegí
              «Forma libre» y tocá las esquinas.
            </span>
            <span className="mt-1 block">
              <strong>3.</strong> Para cambiar uno que ya dibujaste, tocalo: arrastralo para moverlo, tirá de los
              cuadraditos blancos para cambiarle el tamaño, o apretá Supr (o clic derecho) para borrarlo.
            </span>
            <span className="mt-1 block">
              <strong>4.</strong> Cuando termines, tocá «Guardar mi terreno».
            </span>
          </MasInfo>
        }
      />

      <div className="empty:hidden">
        <BannerBorrador
          variante="aviso"
          fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
          ultimoAutoguardadoIso={ultimoAutoguardado}
          onRecuperar={recuperarBorrador}
          onDescartar={descartarBorrador}
        />
      </div>

      {/* Computadora: tres paneles que entran en la pantalla sin bajar. A la izquierda qué se va a dibujar, en el
          medio el plano (lo más grande que entre) y a la derecha cuánto llevás, el sector elegido y la lista.
          Celular: una cosa debajo de la otra, en el orden en que se usan (ver "max-lg:order-N"). */}
      <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[17.5rem_minmax(0,1fr)_19.5rem] lg:gap-4">
        {/* Izquierda: la forma y qué dibujar */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-2 lg:overflow-y-auto">
          <div className="flex flex-col gap-1.5 max-lg:order-5">
            <p className="text-sm font-semibold text-tinta-suave">Forma del sector</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Herramientas de dibujo">
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
            </div>
          </div>

          {/* Controles para la forma libre en curso (RD-03, CA-02-22) */}
          {herramienta === "poligono" ? (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-menta px-3 py-2.5 max-lg:order-5">
              <p className="text-sm font-semibold text-bosque">
                Tocá el plano para marcar las esquinas ({verticesPoligono.length} marcadas; hacen falta al menos 3).
              </p>
              <Boton
                variante="contorno"
                disabled={verticesPoligono.length < 3}
                onClick={cerrarPoligonoEnCurso}
                anchoCompleto
                className="min-h-9 text-sm"
              >
                Terminar forma
              </Boton>
              <div className="grid grid-cols-2 gap-1">
                <Boton
                  variante="texto"
                  disabled={verticesPoligono.length === 0}
                  onClick={() => setVerticesPoligono((prev) => prev.slice(0, -1))}
                  className="min-h-9 px-2 text-sm"
                >
                  Deshacer
                </Boton>
                <Boton
                  variante="texto"
                  disabled={verticesPoligono.length === 0}
                  onClick={() => setVerticesPoligono([])}
                  className="min-h-9 px-2 text-sm"
                >
                  Borrar trazo
                </Boton>
              </div>
            </div>
          ) : null}

          <div className="max-lg:order-3">
            <PaletaSectores compacta cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />
          </div>
        </div>

        {/* Medio: el plano, lo más grande que entre en la pantalla */}
        <div className="flex flex-col gap-1.5 max-lg:order-6 lg:min-h-0">
          <p className="text-center text-[0.95rem] font-semibold text-tinta-suave">
            Tu finca es un cuadrado de {lado} m por {lado} m ({formatearHectareas(superficieTotalHa)})
          </p>
          {sectores.length > 0 ? (
            <p className="flex min-h-[2.6rem] items-center justify-center text-center text-sm font-semibold text-hoja-oscura">
              {pista}
            </p>
          ) : null}

          {/* En la computadora el plano mide lo menor entre el ancho y el alto que le queda (cqmin) */}
          <div className="flex items-center justify-center lg:min-h-0 lg:flex-1 lg:[container-type:size]">
            <div ref={contenedorPlanoRef} className="relative w-full lg:h-[100cqmin] lg:w-[100cqmin]">
              <div className="w-full overflow-hidden rounded-2xl border-2 border-borde bg-papel">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${TAMANO_SVG} ${TAMANO_SVG}`}
                    onPointerDown={manejarPointerDown}
                    onPointerMove={manejarPointerMove}
                    onPointerUp={manejarPointerUp}
                    onPointerCancel={() => setManipulacion(null)}
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
                      // Mientras se arrastra, se dibuja como quedaría (si así no puede quedar, en rojo y punteado).
                      const moviendo = manipulacion?.indice === indice ? manipulacion : null;
                      const geometriaMostrada = moviendo ? moviendo.geometria : s.geometria;
                      const [cx, cy] = metrosASvg(centroidePoligono(geometriaMostrada));
    
                      return (
                        <g
                          key={s.claveLocal}
                          onPointerDown={(e) => {
                            // En medio de una forma libre, tocar suma una esquina; si no, tocar un sector lo elige y lo mueve.
                            if (verticesPoligono.length === 0) empezarManipulacion(e, indice, "mover");
                          }}
                          onContextMenu={(e) => abrirMenuContextual(e, indice)}
                          className={verticesPoligono.length === 0 ? (moviendo ? "cursor-grabbing" : "cursor-grab") : undefined}
                        >
                          <polygon
                            points={poligonoAPointsSvg(geometriaMostrada)}
                            fill={moviendo?.problema ? "rgba(179, 38, 30, 0.25)" : color.relleno}
                            stroke={moviendo?.problema ? "#b42318" : seleccionado ? "#003300" : color.borde}
                            strokeWidth={seleccionado ? 3 : 1.8}
                            strokeDasharray={moviendo?.problema ? "6 3" : undefined}
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
    
                    {/* Cuadraditos del sector elegido: tirar de ellos cambia el tamaño (o mueve la esquina) */}
                    {asasElegido.map((asa) => {
                      const [sx, sy] = metrosASvg([asa.x, asa.y]);
                      const hayProblema = !!manipulacion?.problema;
                      return (
                        <g
                          key={asa.clave}
                          className={cursorDeAsa(asa)}
                          onPointerDown={(e) =>
                            indiceSeleccionado !== null &&
                            empezarManipulacion(e, indiceSeleccionado, asa.vertice !== undefined ? "vertice" : "redimensionar", asa)
                          }
                        >
                          {/* Zona más grande y transparente, para agarrarlo bien con el dedo */}
                          <rect x={sx - 16} y={sy - 16} width={32} height={32} fill="transparent" />
                          <rect
                            x={sx - 5.5}
                            y={sy - 5.5}
                            width={11}
                            height={11}
                            rx={2}
                            fill="#ffffff"
                            stroke={hayProblema ? "#b42318" : "#003300"}
                            strokeWidth={2}
                            className="pointer-events-none"
                          />
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

              {/* Avisos que flotan abajo del plano: no corren el dibujo al aparecer y no tapan los toques */}
              {avisoDibujo || ultimoBorrado ? (
                <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex flex-col gap-2">
                  {avisoDibujo ? (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-2.5 text-[0.95rem] font-semibold text-[#7a4100] shadow-suave"
                    >
                      <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                      {avisoDibujo}
                    </div>
                  ) : null}
                  {ultimoBorrado ? (
                    <div
                      role="status"
                      className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-[1.5px] border-menta-fuerte bg-menta px-4 py-1 text-[0.95rem] font-semibold text-bosque shadow-suave"
                    >
                      <span>Borraste «{ultimoBorrado.nombre}».</span>
                      <Boton variante="texto" onClick={deshacerBorrado} className="pointer-events-auto min-h-10">
                        Deshacer
                      </Boton>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {menuContextual && sectores[menuContextual.indice] ? (
                <div
                  ref={menuRef}
                  role="menu"
                  aria-label="Opciones del sector"
                  className="absolute z-20 w-56 rounded-2xl border-[1.5px] border-borde bg-white p-1.5 shadow-suave"
                  style={{ left: menuContextual.x, top: menuContextual.y }}
                >
                  <p className="truncate px-3 py-1 text-sm font-semibold text-tinta-suave">
                    {nombresCalculados[menuContextual.indice]}
                  </p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => borrarSector(menuContextual.indice)}
                    className="flex min-h-11 w-full items-center rounded-xl px-3 text-left font-bold text-error transition hover:bg-error-claro"
                  >
                    Borrar este sector
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-3 text-sm text-tinta-suave">
            <span>
              Cada cuadradito de la grilla mide {celda} m por {celda} m.
            </span>
            <BannerBorrador
              variante="nota"
              fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
              ultimoAutoguardadoIso={ultimoAutoguardado}
              onRecuperar={recuperarBorrador}
              onDescartar={descartarBorrador}
            />
          </div>
        </div>

        {/* Derecha: cuánto llevás, el sector elegido y la lista */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-3 lg:overflow-y-auto">
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

          {/* Cuánta superficie llevás dibujada. En la computadora lleva el botón Guardar. */}
          <aside
            aria-live="polite"
            className="flex flex-col gap-2 rounded-3xl border-2 border-menta-fuerte bg-menta p-4 max-lg:order-2"
          >
            <h2 className="text-sm font-semibold text-tinta-suave">Tu superficie</h2>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-titulos text-2xl font-extrabold text-bosque">
                {formatearHectareas(superficieDistribuida)}
              </strong>
              <span className="text-sm text-tinta-suave">de {formatearHectareas(superficieTotalHa)}</span>
            </p>
            <div className="h-3 overflow-hidden rounded-full bg-white" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-all ${colorBarra}`}
                style={{ width: `${porcentajeUsado}%` }}
              />
            </div>
            {excedida ? (
              <p className="flex items-start gap-2 text-sm font-semibold text-error">
                <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
                Dibujaste de más: los sectores suman más que tu finca.
              </p>
            ) : (
              <p className="font-titulos text-base font-bold text-bosque">
                {restanteHa > 0 ? `Te quedan ${formatearHectareas(restanteHa)} libres.` : "Ya dibujaste toda la finca."}
              </p>
            )}
            <div className="flex flex-col gap-0.5 max-lg:hidden">
              {botonGuardar}
            </div>
          </aside>

          {/* Lo que ya está dibujado; el sector elegido se abre ahí mismo para cambiarle el tipo, el cultivo o el nombre
              (Esp. 02, 5.3). Con el plano vacío, cómo empezar en 3 pasos. */}
          <div className="max-lg:order-10">
            <Tarjeta
              compacta
              titulo="Lo que dibujaste"
              extra={<span className="text-sm font-semibold text-tinta-suave">{sectores.length}</span>}
            >
              {sectores.length === 0 ? (
                <ol className="flex flex-col gap-2">
                  {[
                    "Elegí qué vas a dibujar.",
                    herramienta === "poligono"
                      ? "Tocá las esquinas del sector en el plano."
                      : "Arrastrá el dedo o el mouse sobre el plano.",
                    "Cuando termines, tocá «Guardar mi terreno».",
                  ].map((texto, i) => (
                    <li key={texto} className="flex items-center gap-2.5 text-sm font-semibold text-bosque">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-naranja text-xs font-extrabold">
                        {i + 1}
                      </span>
                      {texto}
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="-my-1 flex flex-col divide-y-[1.5px] divide-borde">
                  {sectores.map((s, idx) => {
                    const elegido = indiceSeleccionado === idx;
                    return (
                      <li key={s.claveLocal} className={elegido ? "-mx-2 rounded-xl bg-menta px-2 pb-2" : ""}>
                        <div className="flex items-center justify-between gap-1 py-0.5">
                          <button
                            type="button"
                            aria-expanded={elegido}
                            onClick={() => setIndiceSeleccionado(elegido ? null : idx)}
                            className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 text-left"
                          >
                            <span className="truncate text-sm font-semibold text-tinta">
                              {s.tipo === "sector_flores" ? "🌼" : "🌱"} {nombresCalculados[idx]}
                            </span>
                            <span className="shrink-0 text-sm text-tinta-suave">
                              {formatearHectareas(superficiesSectores[idx])}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => borrarSector(idx)}
                            aria-label={`Quitar ${nombresCalculados[idx]}`}
                            className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2.5 text-sm font-bold text-error transition hover:bg-error-claro"
                          >
                            Quitar
                          </button>
                        </div>

                        {elegido ? (
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                aria-pressed={s.tipo === "cultivo"}
                                onClick={() =>
                                  actualizarSectorSeleccionado({
                                    tipo: "cultivo",
                                    subtipoFlores: null,
                                    cultivoId: primerCultivo?.id ?? null,
                                  })
                                }
                                className={`min-h-9 rounded-xl border-2 px-2 text-sm font-bold transition ${
                                  s.tipo === "cultivo"
                                    ? "border-hoja bg-white text-bosque"
                                    : "border-borde bg-white/60 text-tinta-suave hover:border-hoja"
                                }`}
                              >
                                🌱 Cultivo
                              </button>
                              <button
                                type="button"
                                aria-pressed={s.tipo === "sector_flores"}
                                onClick={() =>
                                  actualizarSectorSeleccionado({
                                    tipo: "sector_flores",
                                    cultivoId: null,
                                    cultivoOtro: "",
                                  })
                                }
                                className={`min-h-9 rounded-xl border-2 px-2 text-sm font-bold transition ${
                                  s.tipo === "sector_flores"
                                    ? "border-purple-700 bg-white text-bosque"
                                    : "border-borde bg-white/60 text-tinta-suave hover:border-hoja"
                                }`}
                              >
                                🌼 Flores
                              </button>
                            </div>

                            {s.tipo === "cultivo" ? (
                              <div className="flex flex-col gap-1">
                                <label htmlFor="editar-cultivo-croquis" className="text-sm font-semibold text-tinta">
                                  ¿Qué cultivo es?
                                </label>
                                <select
                                  id="editar-cultivo-croquis"
                                  value={s.cultivoId ?? VALOR_OTRO_CULTIVO}
                                  onChange={(e) =>
                                    actualizarSectorSeleccionado({
                                      cultivoId: e.target.value === VALOR_OTRO_CULTIVO ? null : e.target.value,
                                      cultivoOtro: e.target.value === VALOR_OTRO_CULTIVO ? s.cultivoOtro : "",
                                    })
                                  }
                                  className={CAMPO_CHICO}
                                >
                                  {cultivos.map((c) => (
                                    <option key={c.id} value={c.id} disabled={!c.activo && s.cultivoId !== c.id}>
                                      {c.nombre}
                                      {!c.activo ? " (inactivo)" : ""}
                                    </option>
                                  ))}
                                  <option value={VALOR_OTRO_CULTIVO}>Otro cultivo…</option>
                                </select>
                                {s.cultivoId === null ? (
                                  <input
                                    type="text"
                                    maxLength={80}
                                    value={s.cultivoOtro}
                                    onChange={(e) => actualizarSectorSeleccionado({ cultivoOtro: e.target.value })}
                                    placeholder="Nombre del cultivo"
                                    aria-label="Nombre del cultivo"
                                    className={CAMPO_CHICO}
                                  />
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <label htmlFor="editar-subtipo-croquis" className="text-sm font-semibold text-tinta">
                                  ¿Qué tipo de flores o vegetación?
                                </label>
                                <select
                                  id="editar-subtipo-croquis"
                                  value={s.subtipoFlores ?? ""}
                                  onChange={(e) =>
                                    actualizarSectorSeleccionado({
                                      subtipoFlores: (e.target.value || null) as SubtipoFlores | null,
                                    })
                                  }
                                  className={CAMPO_CHICO}
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

                            <div className="flex flex-col gap-1">
                              <label htmlFor="editar-nombre-croquis" className="text-sm font-semibold text-tinta">
                                Nombre personalizado (opcional)
                              </label>
                              <input
                                id="editar-nombre-croquis"
                                type="text"
                                maxLength={60}
                                value={s.nombrePersonalizado}
                                onChange={(e) => actualizarSectorSeleccionado({ nombrePersonalizado: e.target.value })}
                                placeholder={nombresCalculados[idx]}
                                className={CAMPO_CHICO}
                              />
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Tarjeta>
          </div>

          {/* En el celular, Guardar va al final */}
          <div className="flex flex-col gap-1 lg:hidden max-lg:order-11">
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
