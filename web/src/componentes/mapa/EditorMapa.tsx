"use client";

// Editor interactivo de mapa con Leaflet + Esri World Imagery (Esp. 02, T5, CA-02-11, 12, 22, 23).
// - Dibuja el contorno del terreno (fija la superficie total recalculada con Turf en el servidor).
// - Dibuja sectores dentro del contorno usando la paleta compartida.
// - Atribución de Esri visible; si fallan las imágenes por mala señal, se puede seguir dibujando.
// - "Mi ubicación" centra el mapa sin guardar la posición del navegador (RS-05).
//
// Pantalla (solo el aspecto; la lógica del mapa no cambia; en la computadora entra en la pantalla sin bajar): en la computadora el mapa va a la izquierda, grande,
// y a la derecha la superficie con el botón Guardar, la paleta y el sector elegido. En el celular va una cosa
// debajo de la otra, en el orden en que se usan. Los colores de las figuras sobre el mapa no se tocan: se ven
// bien sobre la foto satelital.
import type * as LeafletTipo from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BannerBorrador } from "@/componentes/borrador/BannerBorrador";
import { useBorradorFinca } from "@/componentes/borrador/useBorradorFinca";
import { IconoAlerta, IconoLapiz, IconoMapa, IconoPapelera, IconoUbicar } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Aviso } from "@/componentes/ui/formulario";
import { MasInfo } from "@/componentes/ui/mas-info";
import { Pasos, type PasoDeProceso } from "@/componentes/ui/pasos";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import {
  ETIQUETAS_SUBTIPO_FLORES,
  LIMITES_ESTABLECIMIENTO,
  SUBTIPOS_FLORES,
  calcularAreaGeograficaHa,
  formatearHectareas,
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
  PaletaAgrupada,
  colorDeSector,
  iconoDeCultivo,
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
          // Esri no tiene fotos con más detalle que el nivel 17 en muchas zonas rurales de Jujuy: ahí mostraba
          // cuadros grises ("Map data not yet available"). Con esto, más allá del 17 se agrandan las del 17 (más
          // borrosas, pero se ve algo) en vez de quedar vacío.
          maxNativeZoom: 17,
        },
      );
      capaEsri.on("tileerror", () => {
        setImagenesFallaron(true);
      });
      capaEsri.addTo(mapa);
      // Barra de escala (en metros), abajo a la izquierda: sirve para tener idea de cuánto mide lo que se marca.
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(mapa);

      const capaFiguras = L.layerGroup().addTo(mapa);
      const capaTrazo = L.layerGroup().addTo(mapa);

      mapaRef.current = mapa;
      capaFigurasRef.current = capaFiguras;
      capaTrazoRef.current = capaTrazo;

      // Si ya existe contorno, encuadrar el mapa automáticamente sobre él.
      if (contornoInicial) {
        const bounds = L.polygon(geoJsonALatLngs(contornoInicial)).getBounds();
        if (bounds.isValid()) {
          mapa.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
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

  /** Pasar de un paso a otro con la barra de pasos de arriba. */
  function irAPaso(paso: 1 | 2 | 3 | 4) {
    setAvisoMapa(null);
    if (paso === 1) {
      setModo("dibujar_contorno");
      setVerticesEnCurso([]);
      setIndiceSeleccionado(null);
    } else if (paso === 2) {
      if (!contorno) return;
      setModo("dibujar_sector");
      setVerticesEnCurso([]);
      setIndiceSeleccionado(null);
    } else if (paso === 3) {
      setModo("navegar");
      setVerticesEnCurso([]);
    } else {
      // Guardar: se lleva la vista al botón (hay uno en la computadora y otro en el celular; solo uno se ve)
      const boton = [...document.querySelectorAll<HTMLElement>("[data-guardar-mapa]")].find((b) => b.offsetParent !== null);
      boton?.scrollIntoView({ block: "center", behavior: "smooth" });
      boton?.focus();
    }
  }

  /** «Cancelar»: se descarta lo que se estaba marcando y se pasa a revisar lo que ya hay. */
  function cancelarTrazo() {
    setVerticesEnCurso([]);
    setModo("navegar");
  }

  /** La mira de la lista: lleva el mapa hasta ese sector. */
  function enfocarSector(indice: number) {
    const L = leafletRef.current;
    const mapa = mapaRef.current;
    const sector = sectores[indice];
    if (!L || !mapa || !sector) return;
    setIndiceSeleccionado(indice);
    const limites = L.polygon(geoJsonALatLngs(sector.geometria)).getBounds();
    if (limites.isValid()) mapa.fitBounds(limites, { padding: [60, 60], maxZoom: 18 });
  }

  // Si cambia el tamaño de la caja del mapa (se agranda la ventana, aparece un aviso, se terminan de acomodar los
  // paneles), Leaflet tiene que volver a medirla. Y si ya había un terreno guardado y la persona todavía no tocó el
  // mapa, se vuelve a encuadrar sobre ese terreno con el tamaño real: antes quedaba encuadrado con el tamaño que la
  // caja tenía al cargar y el terreno podía verse cortado o fuera de la vista.
  const huboInteraccionRef = useRef(false);
  useEffect(() => {
    const caja = contenedorMapaRef.current;
    if (!mapaListo || !caja) return;
    const marcarInteraccion = () => {
      huboInteraccionRef.current = true;
    };
    caja.addEventListener("pointerdown", marcarInteraccion);
    caja.addEventListener("wheel", marcarInteraccion, { passive: true });
    const observador = new ResizeObserver(() => {
      const mapa = mapaRef.current;
      if (!mapa) return;
      mapa.invalidateSize();
      const L = leafletRef.current;
      if (!huboInteraccionRef.current && contornoInicial && L) {
        const limites = L.polygon(geoJsonALatLngs(contornoInicial)).getBounds();
        if (limites.isValid()) mapa.fitBounds(limites, { padding: [24, 24], maxZoom: 18, animate: false });
      }
    });
    observador.observe(caja);
    return () => {
      observador.disconnect();
      caja.removeEventListener("pointerdown", marcarInteraccion);
      caja.removeEventListener("wheel", marcarInteraccion);
    };
  }, [mapaListo, contornoInicial]);


  // ───────────── Datos para mostrar ─────────────
  const hayBorde = contorno !== null;
  const pasoActual = modo === "dibujar_contorno" ? 1 : modo === "dibujar_sector" ? 2 : 3;
  const pasos: PasoDeProceso[] = [
    {
      titulo: "Delimitar finca",
      estado: pasoActual === 1 ? "actual" : hayBorde ? "hecho" : "pendiente",
      onClick: () => irAPaso(1),
    },
    {
      titulo: "Distribuir cultivos",
      estado: pasoActual === 2 ? "actual" : sectores.length > 0 ? "hecho" : "pendiente",
      onClick: () => irAPaso(2),
      deshabilitado: !hayBorde,
    },
    {
      titulo: "Revisar distribución",
      estado: pasoActual === 3 ? "actual" : "pendiente",
      onClick: () => irAPaso(3),
      deshabilitado: !hayBorde,
    },
    { titulo: "Guardar finca", estado: "pendiente", onClick: () => irAPaso(4), deshabilitado: !hayBorde },
  ];

  const titulo =
    modo === "dibujar_contorno"
      ? "Delimitar tu finca"
      : modo === "dibujar_sector"
        ? "Distribución de cultivos"
        : "Revisar distribución";
  const bajada =
    modo === "dibujar_contorno"
      ? "Marcá en el mapa el borde de tu finca."
      : modo === "dibujar_sector"
        ? "Marcá en el mapa los sectores de cada cultivo dentro de tu finca."
        : "Elegí un sector para cambiarle el cultivo o el nombre.";

  const porcentajeUsado =
    superficieTotalHa !== null && superficieTotalHa > 0
      ? Math.min(100, (superficieDistribuida / superficieTotalHa) * 100)
      : 0;
  const colorBarra = porcentajeUsado >= 90 ? "bg-naranja" : "bg-hoja";

  // Qué se está dibujando y qué hacer ahora, según cuántas esquinas lleva marcadas
  const cantidadMarcadas = verticesEnCurso.length;
  const claveElegida = cultivos.find((c) => c.id === paleta.cultivoId)?.clave;
  const queDibujo =
    modo === "dibujar_contorno"
      ? "Dibujando el borde de tu finca."
      : `Dibujando: ${paleta.tipo === "sector_flores" ? "🌼" : iconoDeCultivo(claveElegida)} ${paleta.etiqueta}.`;
  const queHacer =
    cantidadMarcadas === 0
      ? modo === "dibujar_contorno"
        ? "Tocá cada esquina de tu finca."
        : "Tocá dentro del borde para marcar las esquinas."
      : cantidadMarcadas < 3
        ? `Seguí tocando: llevás ${cantidadMarcadas}, hacen falta 3 como mínimo.`
        : "Tocá otra esquina o «Finalizar» si ya marcaste todas.";

  // Leyenda del mapa: el borde y los cultivos que hay dibujados
  const referencias = (() => {
    const porNombre = new Map<string, { etiqueta: string; color: { borde: string; relleno: string } }>();
    sectores.forEach((s) => {
      const cultivo = s.cultivoId ? mapaCultivos.get(s.cultivoId) : undefined;
      const etiqueta =
        s.tipo === "sector_flores" ? "Flores y vegetación" : (cultivo?.nombre ?? (s.cultivoOtro.trim() || "Otro cultivo"));
      if (!porNombre.has(etiqueta)) porNombre.set(etiqueta, { etiqueta, color: colorDeSector(s.tipo, cultivo?.clave) });
    });
    return [...porNombre.values()].slice(0, 5);
  })();

  const botonGuardar = (
    <Boton onClick={manejarGuardado} disabled={guardando || !contorno} anchoCompleto className="min-h-12" data-guardar-mapa>
      {guardando ? "Guardando…" : "Guardar mi terreno"}
    </Boton>
  );

  /** Campos más bajos para el panel de la derecha. */
  const CAMPO_CHICO =
    "min-h-10 w-full rounded-xl border-[1.5px] border-borde bg-papel px-3 text-sm text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45";
  const BOTON_ICONO =
    "grid h-9 w-9 shrink-0 place-items-center rounded-full text-hoja transition hover:bg-menta disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-7.5rem)] lg:min-h-[32rem]">
      <EncabezadoPagina
        compacto
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: nombreEstablecimiento, href: `/fincas/${establecimientoId}` },
        ]}
        titulo={titulo}
        bajada={bajada}
        ayuda={
          <MasInfo ancho sobre="cómo marcar tu finca en el mapa">
            <span className="block font-bold text-bosque">Cómo marcar tu finca en el mapa</span>
            <span className="mt-1.5 block">
              <strong>1. Delimitar finca.</strong> El mapa abre en tu localidad (con «Mi ubicación» llegás más rápido).
              Tocá cada esquina de tu finca y después «Finalizar borde».
            </span>
            <span className="mt-1 block">
              <strong>2. Distribuir cultivos.</strong> Elegí un cultivo a la izquierda y marcá las esquinas de su sector
              dentro del borde. Al terminar, «Finalizar sector». Repetí con cada cultivo.
            </span>
            <span className="mt-1 block">
              <strong>3. Revisar distribución.</strong> Tocá un sector para cambiarle el cultivo o el nombre, o borrarlo.
            </span>
            <span className="mt-1 block">
              <strong>4. Guardar finca.</strong> Cuando esté todo, tocá «Guardar mi terreno».
            </span>
          </MasInfo>
        }
      />

      <Pasos pasos={pasos} etiqueta="Pasos para marcar tu finca" />

      <div className="empty:hidden">
        <BannerBorrador
          variante="aviso"
          fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
          ultimoAutoguardadoIso={ultimoAutoguardado}
          onRecuperar={recuperarBorrador}
          onDescartar={descartarBorrador}
        />
      </div>

      {/* Computadora: tres paneles que entran en la pantalla sin bajar. A la izquierda qué hacer en este paso, en el
          medio el mapa (lo más grande que entre) y a la derecha cuánto llevás y la lista de sectores.
          Celular: una cosa debajo de la otra, en el orden en que se usan (ver "max-lg:order-N"). */}
      <div className="flex flex-col gap-4 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[18rem_minmax(0,1fr)_20rem] lg:gap-4">
        {/* Izquierda: lo que corresponde al paso en el que estás */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:gap-2 lg:overflow-y-auto">
          <div className="max-lg:order-3">
            {modo === "dibujar_sector" && contorno ? (
              <PaletaAgrupada cultivos={cultivos} seleccion={paleta} onCambiar={setPaleta} />
            ) : modo === "dibujar_contorno" ? (
              <Tarjeta compacta titulo="Paso 1: Marcá el borde">
                <ol className="flex flex-col gap-2.5 text-sm text-tinta">
                  {[
                    "Tocá el mapa en cada esquina de tu finca, siguiendo su borde.",
                    "Cuando marcaste todas, tocá «Finalizar borde».",
                    "Si te equivocás, «Deshacer» saca la última esquina.",
                  ].map((texto, i) => (
                    <li key={texto} className="flex items-start gap-2.5">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-naranja text-xs font-extrabold text-bosque">
                        {i + 1}
                      </span>
                      {texto}
                    </li>
                  ))}
                </ol>
              </Tarjeta>
            ) : (
              <Tarjeta compacta titulo="Revisá tu distribución">
                <p className="text-sm text-tinta-suave">
                  Tocá un sector en el mapa o en la lista de la derecha para cambiarle el cultivo o el nombre. Con la mira
                  lo ves en el mapa, con el lápiz lo editás y con la papelera lo borrás.
                </p>
                <Boton variante="contorno" onClick={() => irAPaso(2)} className="min-h-10 text-sm">
                  ✏️ Dibujar otro sector
                </Boton>
              </Tarjeta>
            )}
          </div>
        </div>

        {/* Medio: el mapa, lo más grande que entre en la pantalla */}
        <div className="flex flex-col gap-2 max-lg:order-6 lg:min-h-0">
          {/* Mapa (RD-03, CA-02-22). En la computadora ocupa todo el alto que queda. "isolate" encierra los z-index
              altos de Leaflet (400 a 1000) para que no tapen burbujas ni menús de la página, como el ⓘ del título. */}
          <div className="relative isolate h-[52vh] min-h-[320px] overflow-hidden rounded-3xl border-2 border-borde bg-papel lg:h-auto lg:min-h-0 lg:flex-1">
            <div
              ref={contenedorMapaRef}
              className="absolute inset-0"
              aria-label="Mapa satelital interactivo del establecimiento"
            />

            <button
              type="button"
              onClick={centrarEnMiUbicacion}
              disabled={buscandoUbicacion}
              className="absolute top-3 right-3 z-[1100] inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-hoja bg-white px-4 text-sm font-bold text-hoja shadow-chica transition hover:bg-menta disabled:opacity-60"
            >
              {buscandoUbicacion ? "Ubicando…" : "📍 Mi ubicación"}
            </button>

            {/* Referencias: qué es cada color (se oculta en el celular, donde no hay lugar) */}
            {hayBorde ? (
              <div className="pointer-events-none absolute bottom-14 left-3 z-[1100] hidden rounded-xl border border-borde bg-white/95 px-3 py-2 text-xs shadow-chica sm:block">
                <p className="mb-1 font-bold text-bosque">Referencias</p>
                <ul className="flex flex-col gap-1 text-tinta">
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-5 rounded-sm border-2 border-[#f59e0b]" />
                    Límite de la finca
                  </li>
                  {referencias.map((r) => (
                    <li key={r.etiqueta} className="flex items-center gap-2">
                      <span
                        className="h-3 w-5 rounded-sm border-2"
                        style={{ borderColor: r.color.borde, backgroundColor: r.color.relleno }}
                      />
                      {r.etiqueta}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!mapaListo ? (
              <div className="absolute inset-0 z-[1100] grid place-items-center bg-papel/90">
                <p className="rounded-2xl bg-white px-4 py-2 text-[0.95rem] font-semibold text-tinta-suave shadow-suave">
                  Cargando el mapa de tu finca…
                </p>
              </div>
            ) : null}

            {/* Avisos que flotan abajo del mapa: no corren nada al aparecer y no tapan los toques */}
            {avisoMapa || imagenesFallaron ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-8 z-[1100] flex flex-col gap-2">
                {avisoMapa ? (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-2.5 text-[0.95rem] font-semibold text-[#7a4100] shadow-suave"
                  >
                    <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                    {avisoMapa}
                  </div>
                ) : null}
                {imagenesFallaron ? (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-2xl border-[1.5px] border-[#f0c987] bg-[#fff3df] px-4 py-2.5 text-[0.95rem] text-[#7a4100] shadow-suave"
                  >
                    <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
                    Las fotos satelitales no pudieron cargarse por mala señal. Podés seguir dibujando sobre el fondo
                    liso y guardar normalmente.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Qué hacer ahora y las herramientas del trazo, centradas debajo del mapa (no tapan la vista) */}
          {modo !== "navegar" ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-menta px-4 py-3 text-center">
              <p className="text-[0.95rem] text-bosque">
                <strong>{queDibujo}</strong> {queHacer}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Boton
                  variante="contorno"
                  disabled={cantidadMarcadas === 0}
                  onClick={() => setVerticesEnCurso((prev) => prev.slice(0, -1))}
                  className="min-h-10 bg-white px-3! text-sm!"
                >
                  ↶ Deshacer
                </Boton>
                <Boton
                  variante="contorno"
                  disabled={cantidadMarcadas === 0}
                  onClick={() => setVerticesEnCurso([])}
                  className="min-h-10 bg-white px-3! text-sm!"
                >
                  🗑 Borrar trazo
                </Boton>
                <span aria-hidden="true" className="hidden h-8 w-px bg-menta-fuerte sm:block" />
                <Boton disabled={cantidadMarcadas < 3} onClick={finalizarTrazoActual} className="min-h-10 px-4! text-sm!">
                  ✓ {modo === "dibujar_contorno" ? "Finalizar borde" : "Finalizar sector"}
                </Boton>
                <Boton variante="contorno" onClick={cancelarTrazo} className="min-h-10 bg-white px-3! text-sm!">
                  ✕ Cancelar
                </Boton>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-menta px-4 py-3 text-center text-[0.95rem] text-bosque">
              <strong>Revisando.</strong> Tocá un sector del mapa o de la lista para elegirlo.
            </div>
          )}

          <div className="empty:hidden">
            <BannerBorrador
              variante="nota"
              fechaBorradorIso={borradorPendiente?.guardadoEn ?? null}
              ultimoAutoguardadoIso={ultimoAutoguardado}
              onRecuperar={recuperarBorrador}
              onDescartar={descartarBorrador}
            />
          </div>
        </div>

        {/* Derecha: cuánto llevás, la lista de sectores y Guardar */}
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

          {/* Cuánta superficie tiene la finca y cuánta llevás dibujada */}
          <aside aria-live="polite" className="rounded-3xl border-2 border-borde bg-white p-4 max-lg:order-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-bosque">
              <IconoMapa className="h-5 w-5 text-hoja" />
              Superficie de tu finca
            </h2>
            {superficieTotalHa !== null ? (
              <>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <strong className="font-titulos text-3xl font-extrabold text-bosque">
                    {formatearHectareas(superficieDistribuida)}
                  </strong>
                  <span className="text-sm text-tinta-suave">de {formatearHectareas(superficieTotalHa)}</span>
                </p>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-menta" aria-hidden="true">
                  <div
                    className={`h-full rounded-full transition-all ${colorBarra}`}
                    style={{ width: `${porcentajeUsado}%` }}
                  />
                </div>
                <p className="mt-1.5 flex justify-between gap-2 text-sm font-semibold">
                  <span className="text-hoja-oscura">{formatearNumeroEsAr(porcentajeUsado, 2)} % ocupado</span>
                  <span className="text-tinta-suave">{formatearNumeroEsAr(100 - porcentajeUsado, 2)} % disponible</span>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-tinta-suave">
                Cuando marques el borde de tu finca, acá vas a ver cuántas hectáreas tiene.
              </p>
            )}
          </aside>

          {/* Lo que ya está dibujado; el sector elegido se abre ahí mismo para cambiarle el tipo, el cultivo o el
              nombre. Sin sectores, cómo seguir. */}
          <div className="flex flex-col gap-3 max-lg:order-10">
            <Tarjeta compacta titulo={`Sectores dibujados (${sectores.length})`}>
              {sectores.length === 0 ? (
                <p className="text-sm text-tinta-suave">
                  {contorno
                    ? "Todavía no dibujaste sectores. Elegí un cultivo a la izquierda y marcalo en el mapa."
                    : "Primero marcá el borde de tu finca sobre el mapa: tocá cada esquina y después «Finalizar borde»."}
                </p>
              ) : (
                <ul className="-my-1 flex flex-col divide-y-[1.5px] divide-borde">
                  {sectores.map((s, idx) => {
                    const elegido = indiceSeleccionado === idx;
                    const color = colorDeSector(s.tipo, s.cultivoId ? mapaCultivos.get(s.cultivoId)?.clave : undefined);
                    return (
                      <li key={s.claveLocal} className={elegido ? "-mx-2 rounded-xl bg-menta px-2 pb-2" : ""}>
                        <div className="flex items-center gap-1 py-0.5">
                          <button
                            type="button"
                            aria-expanded={elegido}
                            onClick={() => setIndiceSeleccionado(elegido ? null : idx)}
                            className="flex min-h-10 min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <span
                              aria-hidden="true"
                              className="h-3.5 w-3.5 shrink-0 rounded-sm border-2"
                              style={{ borderColor: color.borde, backgroundColor: color.relleno }}
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">
                              {nombresCalculados[idx]}
                            </span>
                            <span className="shrink-0 text-sm text-tinta-suave">
                              {formatearHectareas(superficiesSectores[idx])}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => enfocarSector(idx)}
                            aria-label={`Ver ${nombresCalculados[idx]} en el mapa`}
                            title="Ver en el mapa"
                            className={BOTON_ICONO}
                          >
                            <IconoUbicar />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIndiceSeleccionado(elegido ? null : idx)}
                            aria-label={`Editar ${nombresCalculados[idx]}`}
                            title="Editar"
                            className={BOTON_ICONO}
                          >
                            <IconoLapiz className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => borrarSector(idx)}
                            aria-label={`Quitar ${nombresCalculados[idx]}`}
                            title="Borrar"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-error transition hover:bg-error-claro"
                          >
                            <IconoPapelera />
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
                                <label htmlFor="editar-cultivo-mapa" className="text-sm font-semibold text-tinta">
                                  ¿Qué cultivo es?
                                </label>
                                <select
                                  id="editar-cultivo-mapa"
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
                                <label htmlFor="editar-subtipo-mapa" className="text-sm font-semibold text-tinta">
                                  ¿Qué tipo de flores o vegetación?
                                </label>
                                <select
                                  id="editar-subtipo-mapa"
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
                              <label htmlFor="editar-nombre-mapa" className="text-sm font-semibold text-tinta">
                                Nombre personalizado (opcional)
                              </label>
                              <input
                                id="editar-nombre-mapa"
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

            {restanteHa !== null ? (
              <p className="flex items-center justify-between gap-2 rounded-2xl bg-menta px-4 py-3 text-bosque">
                <span className="font-semibold">Superficie libre</span>
                <strong className="font-titulos text-xl font-extrabold">{formatearHectareas(restanteHa)}</strong>
              </p>
            ) : null}
          </div>

          {/* Guardar: en la computadora queda siempre a la vista, abajo de este panel; en el celular, al final */}
          <div className="sticky bottom-0 -mb-1 bg-papel pt-1 pb-1 max-lg:hidden">{botonGuardar}</div>
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
