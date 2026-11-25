"use client";

// Editor interactivo de mapa con Leaflet + Esri World Imagery (Esp. 02, T5, CA-02-11, 12, 22, 23).
// - Dibuja el contorno del terreno (fija la superficie total recalculada con Turf en el servidor).
// - Dibuja sectores dentro del contorno usando la paleta compartida.
// - Atribución de Esri visible; si fallan las imágenes por mala señal, se puede seguir dibujando.
// - "Mi ubicación" centra el mapa sin guardar la posición del navegador (RS-05).
//
// Pantalla (solo el aspecto; la lógica del mapa no cambia): en la computadora el mapa va a la izquierda, grande,
// y a la derecha la superficie con el botón Guardar, la paleta y el sector elegido. En el celular va una cosa
// debajo de la otra, en el orden en que se usan. Los colores de las figuras sobre el mapa no se tocan: se ven
// bien sobre la foto satelital.
import type * as LeafletTipo from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import { IconoAlerta } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Aviso } from "@/componentes/ui/formulario";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { DEPARTAMENTOS_JUJUY, NOMBRES_DEPARTAMENTOS_JUJUY } from "@/datos/jujuy";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaGeograficaHa,
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

const CAMPO =
  "min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";

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
  actualizadoEnIso: string;
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
  actualizadoEnIso,
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

  const [imagenesFallaron, setImagenesFallaron] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<string[]>([]);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [guardando, iniciarTransicion] = useTransition();

  const datosBorradorMapa = useMemo(
    () => ({ contorno, sectores }),
    [contorno, sectores],
  );

  const onRecuperarBorrador = useCallback(
    (datos: { contorno: PoligonoGeoJson | null; sectores: SectorLocalMapa[] }) => {
      setContorno(datos.contorno);
      setSectores(datos.sectores);
      setSiguienteId((n) => n + datos.sectores.length + 1);
      setIndiceSeleccionado(null);
      if (datos.contorno) {
        setModo("dibujar_sector");
      }
    },
    [],
  );

  const {
    borradorPendiente,
    ultimoAutoguardado,
    recuperarBorrador,
    descartarBorrador,
    guardarBorradorAhora,
    limpiarBorrador,
  } = useBorradorFinca<{ contorno: PoligonoGeoJson | null; sectores: SectorLocalMapa[] }>({
    establecimientoId,
    metodo: "mapa",
    actualizadoEnIso,
    datosActuales: datosBorradorMapa,
    onRecuperar: onRecuperarBorrador,
  });

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

  const porcentajeUsado =
    superficieTotalHa !== null && superficieTotalHa > 0
      ? Math.min(100, (superficieDistribuida / superficieTotalHa) * 100)
      : 0;
  const cercaDeCero =
    superficieTotalHa !== null && restanteHa !== null && restanteHa <= superficieTotalHa * 0.1;
  const colorBarra = cercaDeCero ? "bg-naranja" : "bg-hoja";

  const botonGuardar = (
    <Boton onClick={manejarGuardado} disabled={guardando || !contorno} anchoCompleto>
      {guardando ? "Guardando…" : "Guardar mi terreno"}
    </Boton>
  );

  /** Cada herramienta es una píldora; la elegida va en oliva. */
  const claseHerramienta = (activa: boolean) =>
    `inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 text-[0.95rem] font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
        titulo="Marcá tu finca en el mapa"
      />

      {/* Computadora: el mapa grande a la izquierda; a la derecha la superficie con Guardar, la paleta y el
          sector elegido. Celular: una cosa debajo de la otra, en el orden en que se usan ("max-lg:order-N"). */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-x-6">
        {/* Izquierda: pasos, herramientas y mapa */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="max-lg:order-1 empty:hidden">
            <BannerBorrador
              fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
              ultimoAutoguardadoIso={ultimoAutoguardado}
              onRecuperar={recuperarBorrador}
              onDescartar={descartarBorrador}
            />
          </div>

          {/* Buscador por localidad y "Mi ubicación" */}
          <div className="flex flex-col gap-2 sm:flex-row max-lg:order-4">
            <label htmlFor="buscar-localidad-mapa" className="sr-only">
              Ir a una localidad de Jujuy
            </label>
            <select
              id="buscar-localidad-mapa"
              defaultValue=""
              onChange={(e) => volarALocalidad(e.target.value)}
              className={`${CAMPO} flex-1`}
            >
              <option value="">Ir a una localidad de Jujuy…</option>
              {todasLasLocalidades.map((loc) => (
                <option key={loc.clave} value={loc.clave}>
                  {loc.etiqueta}
                </option>
              ))}
            </select>
            <Boton variante="contorno" onClick={centrarEnMiUbicacion} disabled={buscandoUbicacion}>
              {buscandoUbicacion ? "Ubicando…" : "📍 Mi ubicación"}
            </Boton>
          </div>

          {/* Herramientas de dibujo */}
          <div className="flex flex-wrap gap-2 max-lg:order-5" role="group" aria-label="Herramientas del mapa">
            <button
              type="button"
              aria-pressed={modo === "dibujar_contorno"}
              onClick={() => {
                setModo("dibujar_contorno");
                setVerticesEnCurso([]);
                setIndiceSeleccionado(null);
              }}
              className={claseHerramienta(modo === "dibujar_contorno")}
            >
              ⬠ {contorno ? "Marcar de nuevo el borde" : "Marcar el borde"}
            </button>
            <button
              type="button"
              aria-pressed={modo === "dibujar_sector"}
              disabled={!contorno}
              onClick={() => {
                setModo("dibujar_sector");
                setVerticesEnCurso([]);
                setIndiceSeleccionado(null);
              }}
              className={claseHerramienta(modo === "dibujar_sector")}
            >
              ✏️ Dibujar sector
            </button>
            <button
              type="button"
              aria-pressed={modo === "navegar"}
              onClick={() => {
                setModo("navegar");
                setVerticesEnCurso([]);
              }}
              className={claseHerramienta(modo === "navegar")}
            >
              ✋ Mover y elegir sector
            </button>
          </div>

          {avisoMapa ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-3 text-[0.95rem] font-semibold text-[#7a4100] max-lg:order-5"
            >
              <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
              {avisoMapa}
            </div>
          ) : null}

          {/* Aviso si las imágenes satelitales no cargan (CA-02-23) */}
          {imagenesFallaron ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-3 text-[0.95rem] text-[#7a4100] max-lg:order-5"
            >
              <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
              Las fotos satelitales no pudieron cargarse por mala señal. Podés seguir dibujando sobre el fondo
              liso y guardar normalmente.
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

          {/* Mapa (RD-03, CA-02-22). Su alto se ajusta para que, en la computadora, entre en la pantalla. */}
          <div className="relative w-full overflow-hidden rounded-[28px] border-2 border-borde bg-papel max-lg:order-6">
            <div
              ref={contenedorMapaRef}
              className="h-[52vh] min-h-[320px] w-full lg:h-[calc(100dvh-21rem)] lg:min-h-[360px]"
              aria-label="Mapa satelital interactivo del establecimiento"
            />
          </div>

          {/* Botones grandes para terminar / deshacer / borrar el trazo activo (debajo del mapa, a mano mientras se dibuja) */}
          {modo !== "navegar" ? (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-menta px-4 py-3 max-lg:order-7">
              <p className="w-full text-[0.95rem] font-semibold text-bosque sm:w-auto sm:flex-1">
                {modo === "dibujar_contorno"
                  ? `Paso 1 de 2. Tocá el mapa para marcar las esquinas de tu finca (${verticesEnCurso.length} marcadas; hacen falta al menos 3).`
                  : `Paso 2 de 2. Tocá dentro del borde para marcar el sector «${paleta.etiqueta}» (${verticesEnCurso.length} marcadas; hacen falta al menos 3).`}
              </p>
              <Boton
                variante="contorno"
                disabled={verticesEnCurso.length < 3}
                onClick={finalizarTrazoActual}
                className="min-h-11 px-5"
              >
                {modo === "dibujar_contorno" ? "Terminar borde" : "Terminar sector"}
              </Boton>
              <Boton
                variante="texto"
                disabled={verticesEnCurso.length === 0}
                onClick={() => setVerticesEnCurso((prev) => prev.slice(0, -1))}
                className="min-h-11"
              >
                Deshacer
              </Boton>
              <Boton
                variante="texto"
                disabled={verticesEnCurso.length === 0}
                onClick={() => setVerticesEnCurso([])}
                className="min-h-11"
              >
                Borrar trazo
              </Boton>
            </div>
          ) : null}

          {/* Lista de lo dibujado */}
          <div className="max-lg:order-10">
            <Tarjeta
              titulo="Lo que dibujaste"
              extra={<span className="text-[0.95rem] font-semibold text-tinta-suave">{sectores.length}</span>}
            >
              {sectores.length === 0 ? (
                <p className="text-tinta-suave">
                  {contorno
                    ? "Todavía no dibujaste sectores dentro del borde."
                    : "Primero marcá el borde de tu finca sobre el mapa."}
                </p>
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

        {/* Derecha: superficie, paleta y sector elegido */}
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          {/* Cuánta superficie tiene la finca y cuánta llevás dibujada. En la computadora lleva el botón Guardar. */}
          <aside
            aria-live="polite"
            className="flex flex-col gap-3 rounded-[28px] border-2 border-menta-fuerte bg-menta p-5 max-lg:order-2"
          >
            <h2 className="text-xl font-bold text-bosque">Tu superficie</h2>
            {superficieTotalHa !== null ? (
              <>
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
                <p className="font-titulos text-lg font-bold text-bosque">
                  {restanteHa !== null && restanteHa > 0
                    ? `Te quedan ${formatearHectareas(restanteHa)} libres.`
                    : "Ya dibujaste toda la finca."}
                </p>
              </>
            ) : (
              <p className="text-tinta-suave">
                Cuando marques el borde de tu finca, acá vas a ver cuántas hectáreas tiene.
              </p>
            )}
            <div className="flex flex-col gap-1 max-lg:hidden">
              {botonGuardar}
              <BotonEnlace href={`/fincas/${establecimientoId}`} variante="texto">
                Cancelar
              </BotonEnlace>
            </div>
          </aside>

          {contorno ? (
            <div className="max-lg:order-3">
              <PaletaSectores cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />
            </div>
          ) : null}

          {/* Sector elegido: se puede cambiar el tipo, el cultivo y el nombre */}
          {sectorEditado !== null && indiceSeleccionado !== null ? (
            <div className="max-lg:order-9">
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
                  Mide{" "}
                  <strong className="text-tinta">
                    {formatearSuperficieCompleta(superficiesSectores[indiceSeleccionado])}
                  </strong>
                  .
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
                    <label htmlFor="editar-cultivo-mapa" className="text-[0.95rem] font-semibold text-tinta">
                      ¿Qué cultivo es?
                    </label>
                    <select
                      id="editar-cultivo-mapa"
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
                    <label htmlFor="editar-subtipo-mapa" className="text-[0.95rem] font-semibold text-tinta">
                      ¿Qué tipo de flores o vegetación?
                    </label>
                    <select
                      id="editar-subtipo-mapa"
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
                  <label htmlFor="editar-nombre-mapa" className="text-[0.95rem] font-semibold text-tinta">
                    Nombre del sector (si querés ponerle uno)
                  </label>
                  <input
                    id="editar-nombre-mapa"
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
