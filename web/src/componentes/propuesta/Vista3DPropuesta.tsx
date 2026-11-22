"use client";

// Vista 3D interactiva en Canvas (sin dependencias externas) de una propuesta de rediseño.
// Proyecta el contorno real, sectores de cultivos, flores existentes y franjas propuestas
// tanto para fincas por croquis (metros) como por mapa satelital (WGS 84).
import { useEffect, useMemo, useRef, useState } from "react";
import type { SectorDibujable } from "@/app/fincas/[id]/VistaPreviaDibujo";
import {
  crearContornoCroquis,
  type MetodoCaracterizacion,
  type PoligonoGeoJson,
  type Posicion2D,
} from "@/dominio/establecimientos";
import type { FranjaPropuesta, GeometriaFranja } from "@/dominio/propuesta";

interface Props {
  metodo: MetodoCaracterizacion;
  superficieTotalHa: number;
  contorno: PoligonoGeoJson | null;
  sectores: readonly SectorDibujable[];
  franjas: readonly FranjaPropuesta[];
}

type Punto2 = [number, number];
type Punto3 = [number, number, number];

interface PoligonoNormalizado {
  exterior: Punto2[];
  huecos: Punto2[][];
  centro: Punto2;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface FlorMuestra {
  x: number;
  z: number;
  especie: "calendula" | "lavanda" | "trebol";
  fase: number;
}

function extraerPoligonosGeo(geo: GeometriaFranja): Posicion2D[][][] {
  if (geo.type === "Polygon") {
    return [geo.coordinates as Posicion2D[][]];
  }
  return geo.coordinates as Posicion2D[][][];
}

function puntoEnAnillo(x: number, z: number, anillo: readonly Punto2[]): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, zi] = anillo[i];
    const [xj, zj] = anillo[j];
    const cruza = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

function puntoEnPoligono(x: number, z: number, poli: PoligonoNormalizado): boolean {
  if (x < poli.minX || x > poli.maxX || z < poli.minZ || z > poli.maxZ) return false;
  if (!puntoEnAnillo(x, z, poli.exterior)) return false;
  for (const h of poli.huecos) {
    if (puntoEnAnillo(x, z, h)) return false;
  }
  return true;
}

function normalizarAnillo(
  anillo: readonly Posicion2D[],
  minX: number,
  maxY: number,
  minY: number,
  centroX: number,
  centroY: number,
  escala: number,
  invertirY: boolean,
): Punto2[] {
  const pts: Punto2[] = [];
  for (let i = 0; i < anillo.length; i += 1) {
    const [x, y] = anillo[i];
    const nx = (x - centroX) * escala;
    const ny = invertirY ? (centroY - y) * escala : (y - centroY) * escala;
    pts.push([nx, ny]);
  }
  // Evitar vértice de cierre duplicado al final si existe
  if (pts.length > 1) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-4) {
      pts.pop();
    }
  }
  void minX;
  void maxY;
  void minY;
  return pts;
}

function construirPoligonoNormalizado(
  anillos: readonly Posicion2D[][],
  minX: number,
  maxY: number,
  minY: number,
  centroX: number,
  centroY: number,
  escala: number,
  invertirY: boolean,
): PoligonoNormalizado | null {
  if (!anillos.length || anillos[0].length < 3) return null;
  const exterior = normalizarAnillo(anillos[0], minX, maxY, minY, centroX, centroY, escala, invertirY);
  if (exterior.length < 3) return null;
  const huecos = anillos
    .slice(1)
    .map((h) => normalizarAnillo(h, minX, maxY, minY, centroX, centroY, escala, invertirY))
    .filter((h) => h.length >= 3);

  let pMinX = Infinity;
  let pMaxX = -Infinity;
  let pMinZ = Infinity;
  let pMaxZ = -Infinity;
  let sumX = 0;
  let sumZ = 0;
  for (const [x, z] of exterior) {
    if (x < pMinX) pMinX = x;
    if (x > pMaxX) pMaxX = x;
    if (z < pMinZ) pMinZ = z;
    if (z > pMaxZ) pMaxZ = z;
    sumX += x;
    sumZ += z;
  }

  return {
    exterior,
    huecos,
    centro: [sumX / exterior.length, sumZ / exterior.length],
    minX: pMinX,
    maxX: pMaxX,
    minZ: pMinZ,
    maxZ: pMaxZ,
  };
}

export function Vista3DPropuesta({
  metodo,
  superficieTotalHa,
  contorno,
  sectores,
  franjas,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoRotar, setAutoRotar] = useState(true);
  const [mostrarAbejas, setMostrarAbejas] = useState(true);

  const camaraRef = useRef({
    yaw: 0.58,
    pitch: 0.62,
    zoom: 1.05,
    arrastrando: false,
    ultimoX: 0,
    ultimoY: 0,
    tiempo: 0,
  });

  // Precomputar toda la geometría normalizada y las muestras de flores 3D una sola vez por cambio de propuesta.
  const escena = useMemo(() => {
    const poligonoContorno =
      contorno ??
      (metodo === "croquis" && superficieTotalHa > 0 ? crearContornoCroquis(superficieTotalHa) : null);
    if (!poligonoContorno) return null;

    const sectoresConGeo = sectores.filter(
      (s): s is SectorDibujable & { geometria: PoligonoGeoJson } => Boolean(s.geometria),
    );

    const todosPuntos: Posicion2D[] = [...(poligonoContorno.coordinates[0] ?? [])];
    for (const s of sectoresConGeo) {
      todosPuntos.push(...(s.geometria.coordinates[0] ?? []));
    }
    if (todosPuntos.length < 3) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of todosPuntos) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const centroX = (minX + maxX) / 2;
    const centroY = (minY + maxY) / 2;
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);
    // Corrección de aspecto longitudinal en Jujuy (~24° S) para mapa satelital
    const factorX = metodo === "mapa" ? Math.cos((centroY * Math.PI) / 180) : 1;
    const maxSpan = Math.max(spanX * factorX, spanY);
    const escala = 190 / maxSpan;
    const invertirY = metodo === "mapa";

    const norm = (anillos: readonly Posicion2D[][]) =>
      construirPoligonoNormalizado(
        anillos.map((a) =>
          a.map(([x, y]) => [centroX + (x - centroX) * factorX, y] as Posicion2D),
        ),
        minX,
        maxY,
        minY,
        centroX,
        centroY,
        escala,
        invertirY,
      );

    const contornoNorm = norm(poligonoContorno.coordinates);
    if (!contornoNorm) return null;

    const cultivosNorm: { nombre: string; poli: PoligonoNormalizado; tono: number }[] = [];
    const floresExistNorm: { nombre: string; poli: PoligonoNormalizado }[] = [];

    let idxCultivo = 0;
    for (const s of sectoresConGeo) {
      const p = norm(s.geometria.coordinates);
      if (!p) continue;
      if (s.tipo === "sector_flores") {
        floresExistNorm.push({ nombre: s.nombre ?? "Flores existentes", poli: p });
      } else {
        cultivosNorm.push({
          nombre: s.nombre ?? `Cultivo ${idxCultivo + 1}`,
          poli: p,
          tono: idxCultivo % 3,
        });
        idxCultivo += 1;
      }
    }

    const franjasNorm: { etiqueta: string; polis: PoligonoNormalizado[] }[] = [];
    const floresMuestra: FlorMuestra[] = [];

    for (const f of franjas) {
      const polisRaw = extraerPoligonosGeo(f.geometria);
      const polis: PoligonoNormalizado[] = [];
      for (const pRaw of polisRaw) {
        const pn = norm(pRaw);
        if (pn) polis.push(pn);
      }
      if (polis.length > 0) {
        franjasNorm.push({ etiqueta: f.etiqueta, polis });
      }
    }

    // Muestreo determinista de tallitos con flores sobre las franjas propuestas (máx ~220 para mantener 60 fps)
    const paso = 8.5;
    let contadorFlores = 0;
    for (let x = -96; x <= 96 && contadorFlores < 240; x += paso) {
      for (let z = -96; z <= 96 && contadorFlores < 240; z += paso) {
        const jitterX = Math.sin(x * 1.7 + z * 2.3) * 2.1;
        const jitterZ = Math.cos(x * 2.1 - z * 1.3) * 2.1;
        const fx = x + jitterX;
        const fz = z + jitterZ;

        const caeEnFranja = franjasNorm.some((f) =>
          f.polis.some((p) => puntoEnPoligono(fx, fz, p)),
        );
        if (!caeEnFranja) continue;

        const h = Math.abs(Math.sin(fx * 12.9898 + fz * 78.233) * 43758.5453) % 1;
        const especie: FlorMuestra["especie"] =
          h < 0.42 ? "calendula" : h < 0.74 ? "lavanda" : "trebol";
        floresMuestra.push({ x: fx, z: fz, especie, fase: h * Math.PI * 2 });
        contadorFlores += 1;
      }
    }

    // Muestreo de puntos de plantas verdes en cultivos para dar textura 3D de surcos
    const plantasCultivo: { x: number; z: number; tono: number }[] = [];
    for (let x = -95; x <= 95; x += 9) {
      for (let z = -95; z <= 95; z += 11) {
        const match = cultivosNorm.find((c) => puntoEnPoligono(x, z, c.poli));
        if (match) {
          plantasCultivo.push({ x, z, tono: match.tono });
        }
      }
    }

    return {
      contornoNorm,
      cultivosNorm,
      floresExistNorm,
      franjasNorm,
      floresMuestra,
      plantasCultivo,
    };
  }, [metodo, superficieTotalHa, contorno, sectores, franjas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !escena) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const abejas = Array.from({ length: 10 }, (_, i) => ({
      angulo: (i / 10) * Math.PI * 2,
      radio: 28 + (i % 4) * 16,
      velocidad: 0.45 + (i % 3) * 0.16,
      altura: 15 + (i % 3) * 3.5,
      cx: (i % 2 === 0 ? -1 : 1) * 26,
      cz: (i % 3 === 0 ? -1 : 1) * 22,
    }));

    function proyectar(x: number, y: number, z: number, w: number, h: number) {
      const cam = camaraRef.current;
      const cosY = Math.cos(cam.yaw);
      const sinY = Math.sin(cam.yaw);
      const cosP = Math.cos(cam.pitch);
      const sinP = Math.sin(cam.pitch);

      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      const dist = 420;
      const esc = (Math.min(w, h) * 1.15 * cam.zoom) / (dist + z2);
      return {
        sx: w * 0.5 + x1 * esc,
        sy: h * 0.54 - y2 * esc,
        depth: z2,
        escala: esc,
      };
    }

    function trazarPoligonoConHuecos(
      poli: PoligonoNormalizado,
      y: number,
      w: number,
      h: number,
      fill: string,
      stroke?: string,
      lineWidth = 1,
    ) {
      if (!ctx) return;
      ctx.beginPath();
      const trazarAnillo = (anillo: readonly Punto2[]) => {
        anillo.forEach(([x, z], idx) => {
          const p = proyectar(x, y, z, w, h);
          if (idx === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.closePath();
      };
      trazarAnillo(poli.exterior);
      for (const hueco of poli.huecos) trazarAnillo(hueco);
      ctx.fillStyle = fill;
      ctx.fill("evenodd");
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    }

    function dibujarLosaExtrusion(
      poli: PoligonoNormalizado,
      yBase: number,
      altura: number,
      colores: { top: string; lado: string; borde?: string },
      w: number,
      h: number,
    ) {
      if (!ctx) return;
      const ext = poli.exterior;
      const caras: { pts: Punto3[]; depth: number }[] = [];

      for (let i = 0; i < ext.length; i += 1) {
        const [x1, z1] = ext[i];
        const [x2, z2] = ext[(i + 1) % ext.length];
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const pm = proyectar(mx, yBase + altura / 2, mz, w, h);
        caras.push({
          depth: pm.depth,
          pts: [
            [x1, yBase, z1],
            [x2, yBase, z2],
            [x2, yBase + altura, z2],
            [x1, yBase + altura, z1],
          ],
        });
      }

      caras.sort((a, b) => b.depth - a.depth);
      for (const c of caras) {
        ctx.beginPath();
        c.pts.forEach(([x, y, z], idx) => {
          const p = proyectar(x, y, z, w, h);
          if (idx === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.closePath();
        ctx.fillStyle = colores.lado;
        ctx.fill();
      }

      trazarPoligonoConHuecos(poli, yBase + altura, w, h, colores.top, colores.borde, 1);
    }

    let animId = 0;
    let ultimo = performance.now();

    const paletaCultivos = [
      { top: "#429652", lado: "#2e6b3a", copa: "#2b6e39" },
      { top: "#58a846", lado: "#3c7a2e", copa: "#3d822f" },
      { top: "#38855a", lado: "#255e3e", copa: "#266642" },
    ];

    function render(ahora: number) {
      if (!canvas || !ctx || !escena) return;
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;

      const cam = camaraRef.current;
      cam.tiempo += dt;
      if (autoRotar && !cam.arrastrando) {
        cam.yaw += dt * 0.2;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fondo cielo suave
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#e6f3ec");
      grad.addColorStop(1, "#fafaf9");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // 1) Base del contorno real de la finca extruida en 3D
      dibujarLosaExtrusion(
        escena.contornoNorm,
        -9,
        9,
        { top: "#d8c3a5", lado: "#8c6d4f", borde: "#57534e" },
        w,
        h,
      );

      // Flecha Norte si es mapa satelital
      if (metodo === "mapa") {
        const nb = proyectar(-108, 1, -68, w, h);
        const np = proyectar(-108, 1, -90, w, h);
        ctx.strokeStyle = "#292524";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(nb.sx, nb.sy);
        ctx.lineTo(np.sx, np.sy);
        ctx.stroke();
        ctx.fillStyle = "#292524";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("N", np.sx - 4, np.sy - 5);
      }

      // 2) Cultivos (extrusion verde) y flores existentes (violeta) ordenados por profundidad
      const capas: { depth: number; dibujar: () => void }[] = [];

      for (const c of escena.cultivosNorm) {
        const p = proyectar(c.poli.centro[0], 2, c.poli.centro[1], w, h);
        const pal = paletaCultivos[c.tono];
        capas.push({
          depth: p.depth,
          dibujar: () =>
            dibujarLosaExtrusion(
              c.poli,
              0.3,
              4.2,
              { top: pal.top, lado: pal.lado, borde: "rgba(255,255,255,0.35)" },
              w,
              h,
            ),
        });
      }

      for (const fe of escena.floresExistNorm) {
        const p = proyectar(fe.poli.centro[0], 2, fe.poli.centro[1], w, h);
        capas.push({
          depth: p.depth,
          dibujar: () =>
            dibujarLosaExtrusion(
              fe.poli,
              0.3,
              3.2,
              { top: "#8b5cf6", lado: "#6d28d9", borde: "rgba(255,255,255,0.35)" },
              w,
              h,
            ),
        });
      }

      capas.sort((a, b) => b.depth - a.depth);
      capas.forEach((c) => c.dibujar());

      // Textura de plantas en los cultivos
      for (const pl of escena.plantasCultivo) {
        const p = proyectar(pl.x, 5.2, pl.z, w, h);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, Math.max(1.5, 2.5 * p.escala), 0, Math.PI * 2);
        ctx.fillStyle = paletaCultivos[pl.tono].copa;
        ctx.fill();
      }

      // 3) Franjas propuestas (con soporte para huecos / MultiPolygon)
      for (const f of escena.franjasNorm) {
        for (const poli of f.polis) {
          dibujarLosaExtrusion(
            poli,
            0.6,
            2.6,
            { top: "rgba(236, 72, 153, 0.88)", lado: "#be185d", borde: "#9d174d" },
            w,
            h,
          );
        }
      }

      // 4) Tallitos y flores 3D meciéndose suavemente sobre las franjas propuestas
      const floresOrdenadas = escena.floresMuestra
        .map((fl) => ({
          fl,
          depth: proyectar(fl.x, 5.5, fl.z, w, h).depth,
        }))
        .sort((a, b) => b.depth - a.depth);

      for (const { fl } of floresOrdenadas) {
        const brisa = Math.sin(cam.tiempo * 2.2 + fl.fase) * 1.0;
        const p0 = proyectar(fl.x, 3.2, fl.z, w, h);
        const p1 = proyectar(fl.x + brisa, 7.6, fl.z + brisa * 0.4, w, h);

        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = Math.max(1, 1.3 * p1.escala);
        ctx.beginPath();
        ctx.moveTo(p0.sx, p0.sy);
        ctx.lineTo(p1.sx, p1.sy);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p1.sx, p1.sy, Math.max(1.8, 2.8 * p1.escala), 0, Math.PI * 2);
        ctx.fillStyle =
          fl.especie === "calendula"
            ? "#f97316"
            : fl.especie === "lavanda"
              ? "#a855f7"
              : "#fef08a";
        ctx.fill();
      }

      // 5) Etiquetas legibles de cada cultivo
      ctx.font = "600 11px sans-serif";
      for (const c of escena.cultivosNorm) {
        const p = proyectar(c.poli.centro[0], 12, c.poli.centro[1], w, h);
        const tw = ctx.measureText(c.nombre).width;
        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.beginPath();
        ctx.roundRect(p.sx - tw / 2 - 5, p.sy - 8, tw + 10, 16, 5);
        ctx.fill();
        ctx.fillStyle = "#1c1917";
        ctx.fillText(c.nombre, p.sx - tw / 2, p.sy + 3.5);
      }

      // 6) Polinizadores animados
      if (mostrarAbejas) {
        for (const ab of abejas) {
          const ang = ab.angulo + cam.tiempo * ab.velocidad;
          const ax = ab.cx + Math.cos(ang) * ab.radio;
          const az = ab.cz + Math.sin(ang * 1.25) * (ab.radio * 0.7);
          const ay = ab.altura + Math.sin(cam.tiempo * 5 + ab.angulo) * 2;
          const p = proyectar(ax, ay, az, w, h);

          ctx.fillStyle = "#facc15";
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, Math.max(1.8, 2.3 * p.escala), 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1c1917";
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [escena, metodo, autoRotar, mostrarAbejas]);

  if (!escena) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
        <canvas
          ref={canvasRef}
          aria-label="Vista 3D interactiva de la propuesta de franjas florales sobre la finca"
          className="block h-72 w-full cursor-grab touch-none active:cursor-grabbing sm:h-80"
          onPointerDown={(e) => {
            const cam = camaraRef.current;
            cam.arrastrando = true;
            cam.ultimoX = e.clientX;
            cam.ultimoY = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const cam = camaraRef.current;
            if (!cam.arrastrando) return;
            const dx = e.clientX - cam.ultimoX;
            const dy = e.clientY - cam.ultimoY;
            cam.ultimoX = e.clientX;
            cam.ultimoY = e.clientY;
            cam.yaw += dx * 0.008;
            cam.pitch = Math.max(0.22, Math.min(1.48, cam.pitch + dy * 0.006));
          }}
          onPointerUp={() => {
            camaraRef.current.arrastrando = false;
          }}
          onWheel={(e) => {
            e.preventDefault();
            const cam = camaraRef.current;
            cam.zoom = Math.max(0.65, Math.min(1.85, cam.zoom - e.deltaY * 0.001));
          }}
        />
        <span className="pointer-events-none absolute left-2.5 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-stone-700 shadow-xs">
          Arrastrá para rotar 360° · Rueda para zoom
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              camaraRef.current.yaw = 0.58;
              camaraRef.current.pitch = 0.62;
              camaraRef.current.zoom = 1.05;
            }}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            Vista 3D
          </button>
          <button
            type="button"
            onClick={() => {
              camaraRef.current.pitch = 1.46;
              camaraRef.current.zoom = 1.0;
              setAutoRotar(false);
            }}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            Aérea
          </button>
          <button
            type="button"
            onClick={() => {
              camaraRef.current.pitch = 0.28;
              camaraRef.current.zoom = 1.25;
            }}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            A nivel lote
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRotar((v) => !v)}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            {autoRotar ? "Girar: ON" : "Girar: OFF"}
          </button>
          <button
            type="button"
            onClick={() => setMostrarAbejas((v) => !v)}
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-50"
          >
            {mostrarAbejas ? "🐝 Polinizadores: ON" : "🐝 Polinizadores: OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
