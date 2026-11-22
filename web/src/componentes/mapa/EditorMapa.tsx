"use client";

// Editor interactivo de mapa con Leaflet + Esri World Imagery (Esp. 02, T5, CA-02-11, 12, 22, 23).
// - Dibuja el contorno del terreno (fija la superficie total recalculada con Turf en el servidor).
// - Dibuja sectores dentro del contorno usando la paleta compartida.
// - Atribución de Esri visible; si fallan las imágenes por mala señal, se puede seguir dibujando.
// - "Mi ubicación" centra el mapa sin guardar la posición del navegador (RS-05).
import type * as LeafletTipo from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DEPARTAMENTOS_JUJUY, NOMBRES_DEPARTAMENTOS_JUJUY } from "@/datos/jujuy";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaGeograficaHa,
  claveBorradorLocal,
  formatearHectareas,
  formatearSuperficieCompleta,
  generarNombresSectores,
  redondearHectareas,
  validarCoordenadasEnJujuy,
  validarPoligonoBasico,
  validarSectorDentroDelContorno,
  validarSectoresSinSuperposicion,
  type CultivoCatalogoItem,
  type PoligonoGeoJson,
  type Posicion2D,
  type SubtipoFlores,
  type TipoSector,
} from "@/dominio/establecimientos";
import { guardarTerrenoMapa } from "@/app/fincas/[id]/mapa/acciones";
import {
  PaletaSectores,
  colorDeSector,
  type SeleccionPaleta,
} from "@/componentes/sectores/PaletaSectores";

const VALOR_OTRO_CULTIVO = "__OTRO__";

type ModoMapa = "dibujar_contorno" | "dibujar_sector" | "navegar";

export interface SectorInicialMapa {
  tipo: TipoSector;
  cultivoId: string | null;
  cultivoOtro: string | null;
  subtipoFlores: SubtipoFlores | null;
  nombre: string;
  geometria: PoligonoGeoJson;
}

interface SectorLocalMapa {
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
  versionInicial: number;
  centroInicial: { lat: number; lng: number; zoom: number };
  contornoInicial: PoligonoGeoJson | null;
  cultivos: readonly CultivoCatalogoItem[];
  sectoresIniciales: readonly SectorInicialMapa[];
}

function geoJsonALatLngs(poligono: PoligonoGeoJson): [number, number][] {
  const anillo = poligono.coordinates[0] ?? [];
  return anillo.slice(0, -1).map(([lng, lat]) => [lat, lng]);
}

export function EditorMapa({
  establecimientoId,
  nombreEstablecimiento,
  versionInicial,
  centroInicial,
  contornoInicial,
  cultivos,
  sectoresIniciales,
}: Props) {
  const router = useRouter();
  const contenedorMapaRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<typeof LeafletTipo | null>(null);
  const mapaRef = useRef<LeafletTipo.Map | null>(null);
  const capaFigurasRef = useRef<LeafletTipo.LayerGroup | null>(null);
  const capaTrazoRef = useRef<LeafletTipo.LayerGroup | null>(null);

  const primerCultivo = cultivos.find((c) => c.activo) ?? null;

  const [contorno, setContorno] = useState<PoligonoGeoJson | null>(contornoInicial);
  const [sectores, setSectores] = useState<SectorLocalMapa[]>(() =>
    sectoresIniciales.map((s, idx) => ({
      claveLocal: `mapa-inicial-${idx}`,
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

  const [modo, setModo] = useState<ModoMapa>(
    contornoInicial ? "dibujar_sector" : "dibujar_contorno",
  );
  const modoRef = useRef<ModoMapa>(modo);
  useEffect(() => {
    modoRef.current = modo;
  }, [modo]);

  const [verticesEnCurso, setVerticesEnCurso] = useState<Posicion2D[]>([]);
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

  const [panelAbierto, setPanelAbierto] = useState(true);
  const [imagenesFallaron, setImagenesFallaron] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [guardando, iniciarTransicion] = useTransition();

  const mapaCultivos = useMemo(() => new Map(cultivos.map((c) => [c.id, c])), [cultivos]);

  const todasLasLocalidades = useMemo(
    () =>
      NOMBRES_DEPARTAMENTOS_JUJUY.flatMap((depto) =>
        DEPARTAMENTOS_JUJUY[depto].localidades.map((loc) => ({
          clave: `${depto}::${loc.nombre}`,
          etiqueta: `${loc.nombre} (${depto})`,
          lat: loc.lat,
          lng: loc.lng,
          zoom: loc.zoom,
        })),
      ),
    [],
  );

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

  const superficieTotalHa = contorno ? calcularAreaGeograficaHa(contorno) : null;
  const superficiesSectores = sectores.map((s) => calcularAreaGeograficaHa(s.geometria));
  const superficieDistribuida = redondearHectareas(
    superficiesSectores.reduce((acum, sup) => acum + sup, 0),
  );
  const restanteHa =
    superficieTotalHa !== null
      ? redondearHectareas(Math.max(0, superficieTotalHa - superficieDistribuida))
      : null;

  // Inicialización única de Leaflet en el cliente (CA-02-23: Esri World Imagery + atribución + tolerancia a mala señal).
  useEffect(() => {
    let cancelado = false;

    async function iniciarMapa() {
      const contenedor = contenedorMapaRef.current;
      if (!contenedor) return;

      const L = (await import("leaflet")).default;
      if (cancelado) return;

      leafletRef.current = L;

      const mapa = L.map(contenedor, {
        center: [centroInicial.lat, centroInicial.lng],
        zoom: centroInicial.zoom,
        zoomControl: true,
      });

      const capaEsri = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Imágenes &copy; Esri — World Imagery",
          maxZoom: 19,
        },
      );
      capaEsri.on("tileerror", () => {
        setImagenesFallaron(true);
      });
      capaEsri.addTo(mapa);

      const capaFiguras = L.layerGroup().addTo(mapa);
      const capaTrazo = L.layerGroup().addTo(mapa);

      mapaRef.current = mapa;
      capaFigurasRef.current = capaFiguras;
      capaTrazoRef.current = capaTrazo;

      // Si ya existe contorno, encuadrar el mapa automáticamente sobre él.
      if (contornoInicial) {
        const bounds = L.polygon(geoJsonALatLngs(contornoInicial)).getBounds();
        if (bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [24, 24] });
        }
      }

      mapa.on("click", (evento: LeafletTipo.LeafletMouseEvent) => {
        if (modoRef.current === "navegar") return;
        const lng = Math.round(evento.latlng.lng * 1_000_000) / 1_000_000;
        const lat = Math.round(evento.latlng.lat * 1_000_000) / 1_000_000;
        setVerticesEnCurso((previos) => {
          if (previos.length >= LIMITES_ESTABLECIMIENTO.maxVerticesPoligono) {
            setAvisoMapa(`Máximo ${LIMITES_ESTABLECIMIENTO.maxVerticesPoligono} vértices por polígono.`);
            return previos;
          }
          setAvisoMapa(null);
          return [...previos, [lng, lat]];
        });
      });

      setMapaListo(true);
    }

    void iniciarMapa();

    return () => {
      cancelado = true;
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
      capaFigurasRef.current = null;
      capaTrazoRef.current = null;
    };
  }, [centroInicial.lat, centroInicial.lng, centroInicial.zoom, contornoInicial]);

  // Sincronizar contorno y sectores renderizados sobre el mapa.
  useEffect(() => {
    const L = leafletRef.current;
    const capaFiguras = capaFigurasRef.current;
    if (!mapaListo || !L || !capaFiguras) return;

    capaFiguras.clearLayers();

    if (contorno) {
      L.polygon(geoJsonALatLngs(contorno), {
        color: "#f59e0b",
        weight: 3,
        fillColor: "#fef3c7",
        fillOpacity: 0.14,
      }).addTo(capaFiguras);
    }

    sectores.forEach((s, idx) => {
      const claveCultivo = s.cultivoId ? mapaCultivos.get(s.cultivoId)?.clave : undefined;
      const color = colorDeSector(s.tipo, claveCultivo);
      const seleccionado = indiceSeleccionado === idx;

      const pol = L.polygon(geoJsonALatLngs(s.geometria), {
        color: seleccionado ? "#0f172a" : color.borde,
        weight: seleccionado ? 3.5 : 2,
        fillColor: color.borde,
        fillOpacity: 0.35,
      });

      pol.bindTooltip(
        `${nombresCalculados[idx]} (${formatearHectareas(superficiesSectores[idx])})`,
        { sticky: true },
      );

      pol.on("click", (e) => {
        if (modoRef.current === "navegar") {
          L.DomEvent.stopPropagation(e);
          setIndiceSeleccionado(idx);
          setPanelAbierto(true);
        }
      });

      pol.addTo(capaFiguras);
    });
  }, [
    mapaListo,
    contorno,
    sectores,
    indiceSeleccionado,
    mapaCultivos,
    nombresCalculados,
    superficiesSectores,
  ]);

  // Sincronizar el polígono en curso mientras el usuario toca vértices.
  useEffect(() => {
    const L = leafletRef.current;
    const capaTrazo = capaTrazoRef.current;
    if (!mapaListo || !L || !capaTrazo) return;

    capaTrazo.clearLayers();
    if (verticesEnCurso.length === 0) return;

    const latLngs: [number, number][] = verticesEnCurso.map(([lng, lat]) => [lat, lng]);
    const colorTrazo = modo === "dibujar_contorno" ? "#f59e0b" : "#10b981";

    if (latLngs.length >= 2) {
      L.polyline(latLngs, { color: colorTrazo, weight: 2.5, dashArray: "6 4" }).addTo(capaTrazo);
    }
    latLngs.forEach((coord, idx) => {
      L.circleMarker(coord, {
        radius: idx === 0 ? 7 : 5,
        color: colorTrazo,
        fillColor: idx === 0 ? colorTrazo : "#ffffff",
        fillOpacity: 1,
        weight: 2,
      }).addTo(capaTrazo);
    });
  }, [mapaListo, verticesEnCurso, modo]);

  function finalizarTrazoActual() {
    setAvisoMapa(null);
    setErroresServidor([]);

    if (verticesEnCurso.length < 3) {
      setAvisoMapa("Marcá al menos 3 puntos sobre el mapa para cerrar el polígono.");
      return;
    }

    const poligono: PoligonoGeoJson = {
      type: "Polygon",
      coordinates: [[...verticesEnCurso, verticesEnCurso[0]]],
    };

    const basico = validarPoligonoBasico(poligono, "mapa");
    if (!basico.valido) {
      setAvisoMapa(basico.error ?? "El polígono dibujado no es válido.");
      return;
    }

    const enJujuy = validarCoordenadasEnJujuy(poligono);
    if (!enJujuy.valido) {
      setAvisoMapa(enJujuy.error ?? "El polígono debe estar dentro de la provincia de Jujuy.");
      return;
    }

    if (modo === "dibujar_contorno") {
      setContorno(poligono);
      setVerticesEnCurso([]);
      setModo("dibujar_sector");
      return;
    }

    if (!contorno) {
      setAvisoMapa("Primero dibujá el contorno del terreno.");
      return;
    }

    if (sectores.length >= LIMITES_ESTABLECIMIENTO.maxSectores) {
      setAvisoMapa(`Alcanzaste el tope de ${LIMITES_ESTABLECIMIENTO.maxSectores} sectores.`);
      return;
    }

    if (paleta.tipo === "cultivo" && !paleta.cultivoId && paleta.cultivoOtro.trim().length < 2) {
      setAvisoMapa("Escribí el nombre del cultivo («Otro») en la paleta antes de terminar el sector.");
      return;
    }

    const dentro = validarSectorDentroDelContorno(poligono, contorno, "mapa");
    if (!dentro.valido) {
      setAvisoMapa("El sector sobresale del contorno del terreno. Probá dibujarlo dentro del límite.");
      return;
    }

    const sinChoque = validarSectoresSinSuperposicion(
      [...sectores.map((s) => s.geometria), poligono],
      "mapa",
    );
    if (!sinChoque.valido) {
      setAvisoMapa("Este sector se superpone con otro ya dibujado.");
      return;
    }

    const nuevo: SectorLocalMapa = {
      claveLocal: `mapa-nuevo-${siguienteId}`,
      tipo: paleta.tipo,
      cultivoId: paleta.tipo === "cultivo" ? paleta.cultivoId : null,
      cultivoOtro: paleta.tipo === "cultivo" && !paleta.cultivoId ? paleta.cultivoOtro.trim() : "",
      subtipoFlores: paleta.tipo === "sector_flores" ? paleta.subtipoFlores : null,
      nombrePersonalizado: "",
      geometria: poligono,
    };

    const nuevoIdx = sectores.length;
    setSiguienteId((n) => n + 1);
    setSectores((previos) => [...previos, nuevo]);
    setVerticesEnCurso([]);
    setIndiceSeleccionado(nuevoIdx);
  }

  function volarALocalidad(clave: string) {
    const loc = todasLasLocalidades.find((l) => l.clave === clave);
    if (loc && mapaRef.current) {
      mapaRef.current.setView([loc.lat, loc.lng], loc.zoom);
    }
  }

  // "Mi ubicación": pide permiso al navegador, centra el mapa y NO guarda las coordenadas (RS-05).
  function centrarEnMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setAvisoMapa("Tu navegador no permite obtener la ubicación actual.");
      return;
    }
    setBuscandoUbicacion(true);
    setAvisoMapa(null);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoUbicacion(false);
        mapaRef.current?.setView([posicion.coords.latitude, posicion.coords.longitude], 16);
      },
      () => {
        setBuscandoUbicacion(false);
        setAvisoMapa("No se pudo obtener tu ubicación. Podés buscar una localidad o mover el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function actualizarSectorSeleccionado(cambios: Partial<SectorLocalMapa>) {
    if (indiceSeleccionado === null) return;
    setSectores((previos) =>
      previos.map((s, idx) => (idx === indiceSeleccionado ? { ...s, ...cambios } : s)),
    );
  }

  function borrarSector(idx: number) {
    setSectores((previos) => previos.filter((_, i) => i !== idx));
    setIndiceSeleccionado((actual) => {
      if (actual === null) return null;
      if (actual === idx) return null;
      return actual > idx ? actual - 1 : actual;
    });
  }

  function manejarGuardado() {
    setErroresServidor([]);
    setAvisoMapa(null);

    if (!contorno) {
      setErroresServidor(["Primero dibujá el contorno de tu establecimiento en el mapa."]);
      return;
    }

    iniciarTransicion(async () => {
      try {
        const respuesta = await guardarTerrenoMapa(establecimientoId, {
          version: versionInicial,
          contorno,
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
          setErroresServidor(respuesta.errores ?? ["No se pudo guardar el terreno."]);
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

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera */}
      <header className="flex flex-col gap-2 px-4 sm:px-0">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a la ficha de {nombreEstablecimiento}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-stone-900 sm:text-2xl">
            Ubicar finca y sectores en el mapa
          </h1>
          {superficieTotalHa !== null ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
              Contorno: {formatearSuperficieCompleta(superficieTotalHa)}
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              Paso 1: dibujá el contorno del terreno
            </span>
          )}
        </div>

        {/* Buscador por localidad y "Mi ubicación" */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="buscar-localidad-mapa" className="sr-only">
            Ir a una localidad de Jujuy
          </label>
          <select
            id="buscar-localidad-mapa"
            defaultValue=""
            onChange={(e) => volarALocalidad(e.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
          >
            <option value="">Ir a una localidad de Jujuy…</option>
            {todasLasLocalidades.map((loc) => (
              <option key={loc.clave} value={loc.clave}>
                {loc.etiqueta}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={centrarEnMiUbicacion}
            disabled={buscandoUbicacion}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-60"
          >
            {buscandoUbicacion ? "Ubicando…" : "📍 Mi ubicación"}
          </button>
        </div>
      </header>

      {/* Aviso si las imágenes satelitales no cargan (CA-02-23) */}
      {imagenesFallaron ? (
        <div
          role="status"
          className="mx-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 sm:mx-0"
        >
          Las imágenes satelitales de Esri no pudieron cargarse por mala señal. Podés seguir
          dibujando sobre el fondo liso y guardar normalmente.
        </div>
      ) : null}

      {/* Mapa a todo lo ancho (RD-03, CA-02-22) */}
      <div className="relative w-full border-y border-stone-300 bg-stone-200 sm:overflow-hidden sm:rounded-xl sm:border">
        <div
          ref={contenedorMapaRef}
          className="h-[52vh] min-h-[320px] w-full"
          aria-label="Mapa satelital interactivo del establecimiento"
        />
      </div>

      {/* Controles táctiles de dibujo */}
      <div className="flex flex-col gap-3 px-4 sm:px-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setModo("dibujar_contorno");
              setVerticesEnCurso([]);
              setIndiceSeleccionado(null);
            }}
            className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              modo === "dibujar_contorno"
                ? "border-amber-600 bg-amber-600 text-white"
                : "border-stone-300 bg-white text-stone-800"
            }`}
          >
            ⬠ {contorno ? "Redibujar contorno" : "Dibujar contorno"}
          </button>

          <button
            type="button"
            disabled={!contorno}
            onClick={() => {
              setModo("dibujar_sector");
              setVerticesEnCurso([]);
              setIndiceSeleccionado(null);
            }}
            className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-45 ${
              modo === "dibujar_sector"
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-stone-300 bg-white text-stone-800"
            }`}
          >
            ✏️ Dibujar sector
          </button>

          <button
            type="button"
            onClick={() => {
              setModo("navegar");
              setVerticesEnCurso([]);
            }}
            className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm font-semibold ${
              modo === "navegar"
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-300 bg-white text-stone-800"
            }`}
          >
            ✋ Mover / Seleccionar
          </button>
        </div>

        {/* Botones grandes para terminar / deshacer / borrar el trazo activo */}
        {modo !== "navegar" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <p className="w-full text-xs text-emerald-950 sm:w-auto sm:flex-1">
              {modo === "dibujar_contorno"
                ? `Tocá el mapa para marcar los bordes de tu finca (${verticesEnCurso.length} puntos; mínimo 3).`
                : `Tocá dentro del contorno para marcar el sector «${paleta.etiqueta}» (${verticesEnCurso.length} puntos; mínimo 3).`}
            </p>
            <button
              type="button"
              disabled={verticesEnCurso.length < 3}
              onClick={finalizarTrazoActual}
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {modo === "dibujar_contorno" ? "Terminar contorno" : "Terminar sector"}
            </button>
            <button
              type="button"
              disabled={verticesEnCurso.length === 0}
              onClick={() => setVerticesEnCurso((prev) => prev.slice(0, -1))}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50"
            >
              Deshacer
            </button>
            <button
              type="button"
              disabled={verticesEnCurso.length === 0}
              onClick={() => setVerticesEnCurso([])}
              className="min-h-11 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              Borrar trazo
            </button>
          </div>
        ) : null}

        {avisoMapa ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            {avisoMapa}
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

        {/* Panel plegable debajo del mapa (Esp. 02, 6.2) */}
        <section className="rounded-xl border border-stone-200 bg-white shadow-xs">
          <button
            type="button"
            aria-expanded={panelAbierto}
            onClick={() => setPanelAbierto((v) => !v)}
            className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-bold text-stone-900">
                Datos, paleta y sectores ({sectores.length})
              </p>
              <p className="text-xs text-stone-600">
                {superficieTotalHa !== null
                  ? `Total: ${formatearHectareas(superficieTotalHa)} · Dibujado: ${formatearHectareas(superficieDistribuida)} · Libre: ${formatearHectareas(restanteHa ?? 0)}`
                  : "Dibujá el contorno para calcular la superficie total"}
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800">
              {panelAbierto ? "Ocultar ▲" : "Mostrar ▼"}
            </span>
          </button>

          {panelAbierto ? (
            <div className="flex flex-col gap-4 border-t border-stone-100 p-4">
              {contorno ? (
                <PaletaSectores cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />
              ) : null}

              {sectorEditado !== null && indiceSeleccionado !== null ? (
                <div className="flex flex-col gap-3 rounded-xl border border-emerald-300 bg-emerald-50/30 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-900">
                        Editando: {nombresCalculados[indiceSeleccionado]}
                      </p>
                      <p className="text-xs text-stone-600">
                        Superficie:{" "}
                        {formatearSuperficieCompleta(superficiesSectores[indiceSeleccionado])}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => borrarSector(indiceSeleccionado)}
                      className="min-h-10 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700"
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
                      <select
                        value={sectorEditado.cultivoId ?? VALOR_OTRO_CULTIVO}
                        onChange={(e) =>
                          actualizarSectorSeleccionado({
                            cultivoId: e.target.value === VALOR_OTRO_CULTIVO ? null : e.target.value,
                            cultivoOtro:
                              e.target.value === VALOR_OTRO_CULTIVO ? sectorEditado.cultivoOtro : "",
                          })
                        }
                        className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
                      >
                        {cultivos.map((c) => (
                          <option
                            key={c.id}
                            value={c.id}
                            disabled={!c.activo && sectorEditado.cultivoId !== c.id}
                          >
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
                          onChange={(e) =>
                            actualizarSectorSeleccionado({ cultivoOtro: e.target.value })
                          }
                          placeholder="Nombre del cultivo"
                          className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
                        />
                      ) : null}
                    </div>
                  ) : (
                    <select
                      value={sectorEditado.subtipoFlores ?? ""}
                      onChange={(e) =>
                        actualizarSectorSeleccionado({
                          subtipoFlores: (e.target.value || null) as SubtipoFlores | null,
                        })
                      }
                      className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
                    >
                      <option value="">Subtipo sin especificar</option>
                      {SUBTIPOS_FLORES.map((sub) => (
                        <option key={sub} value={sub}>
                          {ETIQUETAS_SUBTIPO_FLORES[sub]}
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    maxLength={60}
                    value={sectorEditado.nombrePersonalizado}
                    onChange={(e) =>
                      actualizarSectorSeleccionado({ nombrePersonalizado: e.target.value })
                    }
                    placeholder={`Nombre automático: ${nombresCalculados[indiceSeleccionado]}`}
                    className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900"
                  />
                </div>
              ) : null}

              {sectores.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {sectores.map((s, idx) => (
                    <li
                      key={s.claveLocal}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 ${
                        indiceSeleccionado === idx
                          ? "border-emerald-600 bg-emerald-50/40"
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
              ) : (
                <p className="text-sm text-stone-600">
                  {contorno
                    ? "Todavía no dibujaste sectores dentro del contorno."
                    : "Primero marcá el contorno del terreno sobre el mapa."}
                </p>
              )}
            </div>
          ) : null}
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
            disabled={guardando || !contorno}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
