// Documento PDF A4 en @react-pdf/renderer (Esp. 07 §4, §7, CA-07-05 a CA-07-08).
// Lee EXCLUSIVAMENTE la FotoInforme inmutable guardada en la base (CA-07-09).
// Usa Helvetica (soporte nativo de acentos y ñ en Latin-1 sin descargas externas).
import {
  Document,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  ETIQUETAS_ESTADO_TAREA,
  ETIQUETAS_TIPO_TAREA,
  formatearFechaCortaEsAr,
} from "@/dominio/calendario";
import {
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_RIESGO_MALEZA,
  describirRangosEnMeses,
} from "@/dominio/catalogo";
import {
  ETIQUETAS_NIVEL_RIESGO,
  ETIQUETAS_UBICACION_RELATIVA,
  construirTextoAlerta,
  formatearNumeroEsAr,
  obtenerMensajeNivelRiesgo,
} from "@/dominio/diagnostico";
import {
  ETIQUETAS_METODO,
  UBICACIONES_RELATIVAS,
  hectareasAMetrosCuadrados,
  type Posicion2D,
} from "@/dominio/establecimientos";
import {
  AVISO_LEGAL_INFORME,
  LIMITES_INFORME,
  type FotoInforme,
} from "@/dominio/informe/tipos";
import { ETIQUETAS_DISPOSICION, type GeometriaFranja } from "@/dominio/propuesta";

const estilos = StyleSheet.create({
  pagina: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#1c1917",
    paddingTop: 52,
    paddingBottom: 48,
    paddingHorizontal: 38,
    lineHeight: 1.4,
  },
  encabezadoFijo: {
    position: "absolute",
    top: 18,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#d6d3d1",
    paddingBottom: 6,
    fontSize: 8,
    color: "#57534e",
  },
  pieFijo: {
    position: "absolute",
    bottom: 18,
    left: 38,
    right: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#d6d3d1",
    paddingTop: 6,
    fontSize: 8,
    color: "#57534e",
  },
  tituloPortada: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#064e3b",
    marginBottom: 6,
  },
  subtituloPortada: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    marginBottom: 4,
  },
  h2: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#a7f3d0",
    paddingBottom: 3,
  },
  h3: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    marginTop: 8,
    marginBottom: 4,
  },
  caja: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#fafaf9",
  },
  cajaAviso: {
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#fffbeb",
  },
  filaKpi: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  kpi: {
    width: "31%",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 4,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  kpiLabel: {
    fontSize: 7.5,
    color: "#57534e",
  },
  kpiValor: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1c1917",
    marginTop: 2,
  },
  tablaFilaEncabezado: {
    flexDirection: "row",
    backgroundColor: "#f5f5f4",
    borderBottomWidth: 1,
    borderBottomColor: "#d6d3d1",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  tablaFila: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e5e4",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8.5,
  },
  grilla3x3: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginVertical: 6,
  },
  celda3x3: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 3,
    padding: 5,
    minHeight: 38,
  },
  celda3x3Prop: {
    borderColor: "#be185d",
    backgroundColor: "#fdf2f8",
  },
  leyenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
    fontSize: 8,
    color: "#57534e",
  },
  textoPequeno: {
    fontSize: 8,
    color: "#57534e",
  },
  negrita: {
    fontFamily: "Helvetica-Bold",
  },
});

function formatearFechaHoraIso(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Jujuy",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function anillosDeGeo(geo: GeometriaFranja): Posicion2D[][] {
  if (geo.type === "Polygon") return geo.coordinates as Posicion2D[][];
  const res: Posicion2D[][] = [];
  for (const p of geo.coordinates) {
    for (const a of p) res.push(a as Posicion2D[]);
  }
  return res;
}

function elegirEscalaRedonda(anchoMetros: number): number {
  const objetivo = anchoMetros * 0.25;
  const opciones = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  for (const op of opciones) {
    if (op >= objetivo) return op;
  }
  return 2000;
}

function DibujoTerrenoPdf({ foto }: { foto: FotoInforme }) {
  const { contorno, sectores, metodo } = foto.finca;
  const franjas = foto.propuesta.franjas ?? [];
  if (!contorno || metodo === "cuestionario") return null;

  const puntos: Posicion2D[] = [...(contorno.coordinates[0] ?? [])];
  for (const s of sectores) {
    if (s.geometria) puntos.push(...(s.geometria.coordinates[0] ?? []));
  }
  if (puntos.length === 0) return null;

  const xs = puntos.map((p) => p[0]);
  const ys = puntos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const ancho = Math.max(maxX - minX, 0.0001);
  const alto = Math.max(maxY - minY, 0.0001);
  const wSvg = 460;
  const hSvg = 210;
  const pad = 18;
  const escala = Math.min((wSvg - pad * 2) / ancho, (hSvg - pad * 2) / alto);
  const offX = (wSvg - ancho * escala) / 2;
  const offY = (hSvg - alto * escala) / 2;
  const invertirY = metodo === "mapa";

  const proy = ([x, y]: Posicion2D): [number, number] => [
    offX + (x - minX) * escala,
    invertirY ? offY + (maxY - y) * escala : offY + (y - minY) * escala,
  ];

  const pathDe = (geo: GeometriaFranja) =>
    anillosDeGeo(geo)
      .filter((a) => a.length >= 3)
      .map((anillo) => {
        const cmds = anillo.map((p, i) => {
          const [px, py] = proy(p);
          return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
        });
        return `${cmds.join(" ")} Z`;
      })
      .join(" ");

  // Barra de escala en metros (CA-07-06) sin coordenadas ni fondo satelital.
  const latMedia = (minY + maxY) / 2;
  const anchoRealM =
    metodo === "mapa"
      ? ancho * 111_319.49 * Math.cos((latMedia * Math.PI) / 180)
      : ancho;
  const escalaM = elegirEscalaRedonda(Math.max(10, anchoRealM));
  const barraPx = Math.min(120, Math.max(25, (escalaM / Math.max(1, anchoRealM)) * (ancho * escala)));

  return (
    <View style={estilos.caja} wrap={false}>
      <Svg viewBox={`0 0 ${wSvg} ${hSvg}`} width={460} height={210}>
        <Rect x="0" y="0" width={wSvg} height={hSvg} fill="#fafaf9" />
        <Path d={pathDe(contorno)} fill="#f5f5f4" stroke="#57534e" strokeWidth={1.5} />
        {sectores.map((s, idx) =>
          s.geometria ? (
            <Path
              key={`sec-${idx}`}
              d={pathDe(s.geometria)}
              fill={s.tipo === "sector_flores" ? "#e9d5ff" : "#dcfce7"}
              stroke={s.tipo === "sector_flores" ? "#7e22ce" : "#15803d"}
              strokeWidth={1}
            />
          ) : null,
        )}
        {franjas.map((f, idx) => (
          <Path
            key={`fr-${idx}`}
            d={pathDe(f.geometria)}
            fill="#fbcfe8"
            stroke="#be185d"
            strokeWidth={1.3}
          />
        ))}

        {/* Barra de escala en metros */}
        <Line x1={14} y1={hSvg - 12} x2={14 + barraPx} y2={hSvg - 12} stroke="#1c1917" strokeWidth={2} />
        <Line x1={14} y1={hSvg - 16} x2={14} y2={hSvg - 8} stroke="#1c1917" strokeWidth={1.2} />
        <Line x1={14 + barraPx} y1={hSvg - 16} x2={14 + barraPx} y2={hSvg - 8} stroke="#1c1917" strokeWidth={1.2} />

        {/* Flecha de Norte SOLO en mapa (Esp. 07 §4, CA-07-06) */}
        {metodo === "mapa" ? (
          <>
            <Line x1={wSvg - 24} y1={42} x2={wSvg - 24} y2={16} stroke="#1c1917" strokeWidth={1.6} />
            <Path d={`M${wSvg - 28} 23 L${wSvg - 24} 14 L${wSvg - 20} 23 Z`} fill="#1c1917" />
          </>
        ) : null}
      </Svg>

      <View style={estilos.leyenda}>
        <Text>Escala aprox.: barra = {escalaM} m</Text>
        {metodo === "mapa" ? <Text>· Flecha superior derecha: Norte (N)</Text> : null}
        <Text>· Verde: Cultivos · Violeta: Flores existentes · Rosa: Franjas propuestas</Text>
      </View>
    </View>
  );
}

export function DocumentoInformePdf({ foto }: { foto: FotoInforme }) {
  const fechaEmision = formatearFechaHoraIso(foto.emitidoEnIso);
  const compM2 = Math.round(hectareasAMetrosCuadrados(foto.diagnostico.hectareasACompensar));
  const nivelTexto = ETIQUETAS_NIVEL_RIESGO[foto.diagnostico.nivelRiesgo];
  const mensajeNivel = obtenerMensajeNivelRiesgo(
    foto.diagnostico.nivelRiesgo,
    foto.diagnostico.hectareasACompensar,
  );

  // Medidor visual en SVG (10 % y 20 % sobre escala de 30 % mínimo)
  const topeMedidor = Math.max(30, Math.ceil(foto.diagnostico.porcentajeFlores / 10) * 10);
  const anchoBarra = Math.min(360, (foto.diagnostico.porcentajeFlores / topeMedidor) * 360);
  const x10 = (10 / topeMedidor) * 360;
  const x20 = (20 / topeMedidor) * 360;

  return (
    <Document
      title={`PoliCampo - Informe ${foto.codigo}`}
      author="PoliCampo"
      language="es-AR"
    >
      <Page size="A4" style={estilos.pagina}>
        {/* Encabezado y pie fijos en TODAS las páginas (CA-07-05) */}
        <View style={estilos.encabezadoFijo} fixed>
          <Text>PoliCampo · Informe {foto.codigo}</Text>
          <Text>{foto.finca.nombre}</Text>
        </View>
        <View style={estilos.pieFijo} fixed>
          <Text>Emitido el {fechaEmision}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>

        {/* SECCIÓN 1: Portada y resumen ejecutivo */}
        <Text style={estilos.tituloPortada}>Informe técnico de rediseño agroecológico</Text>
        <Text style={estilos.subtituloPortada}>{foto.finca.nombre}</Text>
        <Text style={estilos.textoPequeno}>
          {foto.finca.localidad}, {foto.finca.departamento} · Ecorregión: {foto.finca.ecorregionNombre}
        </Text>
        <Text style={estilos.textoPequeno}>
          Código: {foto.codigo} · Fecha de emisión: {fechaEmision}
        </Text>
        {foto.preparadoPara ? (
          <Text style={[estilos.negrita, { marginTop: 4 }]}>
            Preparado para: {foto.preparadoPara}
          </Text>
        ) : null}

        {foto.desactualizado.hayAviso ? (
          <View style={[estilos.cajaAviso, { marginTop: 8 }]}>
            <Text style={estilos.negrita}>
              [!] Aviso: Basado en datos del {formatearFechaHoraIso(foto.desactualizado.fechaReferenciaIso)}; la finca cambió después.
            </Text>
            {foto.desactualizado.motivos.map((m, i) => (
              <Text key={i} style={estilos.textoPequeno}>- {m}</Text>
            ))}
          </View>
        ) : null}

        <Text style={estilos.h2}>1. Resumen ejecutivo</Text>
        <View style={estilos.filaKpi}>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>Nivel de riesgo</Text>
            <Text style={estilos.kpiValor}>{nivelTexto.toUpperCase()}</Text>
          </View>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>Flores actuales / Objetivo</Text>
            <Text style={estilos.kpiValor}>
              {formatearNumeroEsAr(foto.diagnostico.porcentajeFlores, 1, 1)} % /{" "}
              {formatearNumeroEsAr(foto.propuesta.objetivoPct, 1, 0)} %
            </Text>
          </View>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>A compensar</Text>
            <Text style={estilos.kpiValor}>
              {formatearNumeroEsAr(foto.diagnostico.hectareasACompensar, 4, 1)} ha
            </Text>
          </View>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>Disposición elegida</Text>
            <Text style={estilos.kpiValor}>
              {ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]}
            </Text>
          </View>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>% logrado con propuesta</Text>
            <Text style={estilos.kpiValor}>
              {formatearNumeroEsAr(foto.propuesta.porcentajeLogrado, 1, 1)} %
            </Text>
          </View>
          <View style={estilos.kpi}>
            <Text style={estilos.kpiLabel}>Próxima tarea</Text>
            <Text style={estilos.kpiValor}>
              {foto.calendario?.proximaTarea
                ? `${foto.calendario.proximaTarea.titulo} (${formatearFechaCortaEsAr(foto.calendario.proximaTarea.fechaInicio)})`
                : "Sin tareas pendientes"}
            </Text>
          </View>
        </View>
        <Text style={estilos.textoPequeno}>
          Mezcla propuesta:{" "}
          {foto.propuesta.especies.length > 0
            ? foto.propuesta.especies.map((e) => e.nombreComun).join(", ")
            : "Sin especies compatibles en el catálogo"}
          .
        </Text>
        <Text style={[estilos.textoPequeno, { marginTop: 6 }]}>{AVISO_LEGAL_INFORME}</Text>

        {/* SECCIÓN 2: Datos de la finca */}
        <Text style={estilos.h2}>2. Datos de la finca</Text>
        <Text style={{ marginBottom: 6 }}>
          Método de carga: {ETIQUETAS_METODO[foto.finca.metodo]} · Superficie total:{" "}
          {formatearNumeroEsAr(foto.finca.superficieTotalHa, 4, 1)} ha.
        </Text>
        <View style={estilos.tablaFilaEncabezado}>
          <Text style={{ width: "28%" }}>Sector</Text>
          <Text style={{ width: "20%" }}>Tipo</Text>
          <Text style={{ width: "26%" }}>Cultivo / subtipo</Text>
          <Text style={{ width: "14%", textAlign: "right" }}>Superficie</Text>
          <Text style={{ width: "12%", textAlign: "right" }}>% total</Text>
        </View>
        {foto.finca.sectores.map((s, idx) => (
          <View key={idx} style={estilos.tablaFila} wrap={false}>
            <Text style={{ width: "28%" }}>{s.nombre}</Text>
            <Text style={{ width: "20%" }}>
              {s.tipo === "sector_flores" ? "Flores" : "Cultivo"}
            </Text>
            <Text style={{ width: "26%" }}>{s.detalleTipo}</Text>
            <Text style={{ width: "14%", textAlign: "right" }}>
              {formatearNumeroEsAr(s.superficieHa, 4, 2)} ha
            </Text>
            <Text style={{ width: "12%", textAlign: "right" }}>
              {formatearNumeroEsAr(s.porcentajeTotal, 1, 1)} %
            </Text>
          </View>
        ))}

        {/* SECCIÓN 3: Diagnóstico */}
        <Text style={estilos.h2}>3. Diagnóstico</Text>
        <Text style={{ marginBottom: 4 }}>
          Fecha: {formatearFechaHoraIso(foto.diagnostico.creadoEnIso)} · Nivel: {nivelTexto} —{" "}
          {mensajeNivel}
        </Text>
        <View style={estilos.caja} wrap={false}>
          <Text style={estilos.textoPequeno}>
            Medidor de flores ({formatearNumeroEsAr(foto.diagnostico.porcentajeFlores, 1, 1)} % frente a marcas del 10 % y 20 % recomendado):
          </Text>
          <Svg viewBox="0 0 360 18" width={360} height={18} style={{ marginTop: 4 }}>
            <Rect x="0" y="3" width="360" height="12" rx="4" fill="#e7e5e4" />
            <Rect
              x="0"
              y="3"
              width={Math.max(2, anchoBarra)}
              height="12"
              rx="4"
              fill={
                foto.diagnostico.nivelRiesgo === "adecuado"
                  ? "#059669"
                  : foto.diagnostico.nivelRiesgo === "moderado"
                    ? "#d97706"
                    : "#dc2626"
              }
            />
            <Line x1={x10} y1="0" x2={x10} y2="18" stroke="#44403c" strokeWidth={1.2} />
            <Line x1={x20} y1="0" x2={x20} y2="18" stroke="#065f46" strokeWidth={1.5} />
          </Svg>
          <Text style={[estilos.textoPequeno, { marginTop: 4 }]}>
            Cultivos: {formatearNumeroEsAr(foto.diagnostico.superficieCultivosHa, 4, 1)} ha · Flores:{" "}
            {formatearNumeroEsAr(foto.diagnostico.superficieFloresHa, 4, 1)} ha · Sin asignar:{" "}
            {formatearNumeroEsAr(foto.diagnostico.superficieSinAsignarHa, 4, 1)} ha · Déficit:{" "}
            {formatearNumeroEsAr(foto.diagnostico.deficitPp, 1, 1)} pp · A compensar:{" "}
            {formatearNumeroEsAr(foto.diagnostico.hectareasACompensar, 4, 1)} ha (
            {formatearNumeroEsAr(compM2, 0, 0)} m²).
          </Text>
        </View>
        {foto.diagnostico.areasAptas.textos.map((txt, idx) => (
          <Text key={idx}>• {txt}</Text>
        ))}
        {foto.diagnostico.alertas.length > 0 ? (
          <View style={[estilos.cajaAviso, { marginTop: 6 }]}>
            <Text style={estilos.negrita}>Alertas detectadas:</Text>
            {foto.diagnostico.alertas.map((al, idx) => {
              const t = construirTextoAlerta(al);
              return (
                <Text key={idx} style={estilos.textoPequeno}>
                  • {t.titulo}: {t.descripcion}
                </Text>
              );
            })}
          </View>
        ) : null}

        {/* SECCIÓN 4: Propuesta de rediseño */}
        <Text style={estilos.h2}>4. Propuesta de rediseño</Text>
        <Text style={{ marginBottom: 4 }}>
          {foto.propuesta.nombre ?? ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]} (
          {formatearFechaHoraIso(foto.propuesta.creadoEnIso)})
          {foto.propuesta.editadaAMano ? " · Editada a mano" : ""}
        </Text>
        <Text style={{ marginBottom: 6 }}>
          Disposición: {ETIQUETAS_DISPOSICION[foto.propuesta.disposicion]} · Objetivo:{" "}
          {formatearNumeroEsAr(foto.propuesta.objetivoPct, 1, 1)} % · Logrado:{" "}
          {formatearNumeroEsAr(foto.propuesta.porcentajeLogrado, 1, 1)} % · Franjas:{" "}
          {formatearNumeroEsAr(foto.propuesta.superficieFranjasHa, 4, 2)} ha · Superficie libre usada:{" "}
          {formatearNumeroEsAr(foto.propuesta.superficieLibreUsadaHa, 4, 2)} ha.
        </Text>

        {foto.finca.metodo === "cuestionario" ? (
          <View style={estilos.grilla3x3} wrap={false}>
            {UBICACIONES_RELATIVAS.map((ubic) => {
              const rep = (foto.propuesta.reparto ?? []).find((r) => r.ubicacion === ubic);
              return (
                <View
                  key={ubic}
                  style={[estilos.celda3x3, rep && rep.ha > 0 ? estilos.celda3x3Prop : {}]}
                >
                  <Text style={estilos.textoPequeno}>{ETIQUETAS_UBICACION_RELATIVA[ubic]}</Text>
                  <Text style={estilos.negrita}>
                    {rep && rep.ha > 0
                      ? `+${formatearNumeroEsAr(rep.ha, 4, 2)} ha`
                      : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <DibujoTerrenoPdf foto={foto} />
        )}

        <Text style={estilos.h3}>Pérdida de superficie por cultivo</Text>
        {foto.propuesta.perdidaPorCultivo.length === 0 ? (
          <Text style={estilos.textoPequeno}>Sin pérdida de superficie cultivada.</Text>
        ) : (
          foto.propuesta.perdidaPorCultivo.map((p, idx) => (
            <Text key={idx} style={estilos.textoPequeno}>
              • {p.sector} ({p.cultivo}): {formatearNumeroEsAr(p.ha, 4, 2)} ha (
              {formatearNumeroEsAr(p.pct, 1, 1)} % del sector)
            </Text>
          ))
        )}

        {/* SECCIÓN 5: Mezcla de plantas de servicio */}
        <Text style={estilos.h2}>5. Mezcla de plantas de servicio</Text>
        {foto.propuesta.especies.length === 0 ? (
          <Text>No se encontraron plantas compatibles en el catálogo al emitir la propuesta.</Text>
        ) : (
          foto.propuesta.especies.map((esp) => (
            <View key={esp.plantaId} style={estilos.caja} wrap={false}>
              <Text style={estilos.negrita}>
                {esp.nombreComun}
                {esp.nombreCientifico ? ` (${esp.nombreCientifico})` : ""} —{" "}
                {formatearNumeroEsAr(esp.proporcionPct, 1, 1)} %
              </Text>
              <Text style={estilos.textoPequeno}>
                Funciones: {esp.funciones.map((f) => ETIQUETAS_FUNCION_PLANTA[f]).join(", ")} · Agua:{" "}
                {ETIQUETAS_NIVEL_AGUA[esp.necesidadAgua]} · Riesgo de maleza:{" "}
                {ETIQUETAS_RIESGO_MALEZA[esp.riesgoMaleza]}
              </Text>
              <Text style={estilos.textoPequeno}>
                Siembra: {describirRangosEnMeses(esp.siembraSemanas)} · Floración:{" "}
                {describirRangosEnMeses(esp.floracionSemanas)} · Corte:{" "}
                {describirRangosEnMeses(esp.corteSemanas)}
              </Text>
              {esp.compatibilidades.map((c) => (
                <Text key={c.cultivoId} style={estilos.textoPequeno}>
                  • {c.cultivoNombre} ({c.grado > 0 ? `+${c.grado}` : c.grado}): {c.justificacion}
                </Text>
              ))}
              {esp.fuenteDetalle ? (
                <Text style={estilos.textoPequeno}>Fuente: {esp.fuenteDetalle}</Text>
              ) : null}
            </View>
          ))
        )}

        {foto.propuesta.floracion.porCultivo.length > 0 ? (
          <View style={estilos.caja} wrap={false}>
            <Text style={estilos.negrita}>Cobertura de floración de la mezcla</Text>
            {foto.propuesta.floracion.porCultivo.map((ev) => (
              <Text key={ev.cultivoId} style={estilos.textoPequeno}>
                • {ev.cultivoNombre}: {formatearNumeroEsAr(ev.coberturaPct, 1, 1)} % cubierta ·{" "}
                {ev.cumpleAnticipacion ? "Cumple anticipación de 1 semana" : "Falta anticipación"}
                {ev.semanasDescubiertas.length > 0
                  ? ` · Semanas descubiertas: ${ev.semanasDescubiertas.join(", ")}`
                  : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {/* SECCIÓN 6: Calendario */}
        <Text style={estilos.h2}>6. Calendario agroecológico</Text>
        {!foto.calendario ? (
          <Text>Calendario no generado.</Text>
        ) : (
          <>
            <Text style={{ marginBottom: 6 }}>
              Temporada: {formatearFechaCortaEsAr(foto.calendario.temporadaInicio)} al{" "}
              {formatearFechaCortaEsAr(foto.calendario.temporadaFin)}.
            </Text>
            <View style={estilos.tablaFilaEncabezado}>
              <Text style={{ width: "20%" }}>Tipo</Text>
              <Text style={{ width: "36%" }}>Tarea</Text>
              <Text style={{ width: "26%" }}>Fechas</Text>
              <Text style={{ width: "18%" }}>Estado</Text>
            </View>
            {foto.calendario.tareas.map((t, idx) => (
              <View key={idx} style={estilos.tablaFila} wrap={false}>
                <Text style={{ width: "20%" }}>{ETIQUETAS_TIPO_TAREA[t.tipo]}</Text>
                <Text style={{ width: "36%" }}>{t.titulo}</Text>
                <Text style={{ width: "26%" }}>
                  {t.fechaInicio === t.fechaFin
                    ? formatearFechaCortaEsAr(t.fechaInicio)
                    : `${formatearFechaCortaEsAr(t.fechaInicio)} – ${formatearFechaCortaEsAr(t.fechaFin)}`}
                </Text>
                <Text style={{ width: "18%" }}>
                  {ETIQUETAS_ESTADO_TAREA[t.estadoAlEmitir]}
                  {t.hechaEn ? ` (${formatearFechaCortaEsAr(t.hechaEn)})` : ""}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* SECCIÓN 7: Cómo se calculó, fuentes y aviso legal */}
        <Text style={estilos.h2}>7. Cómo se calculó, fuentes y aviso legal</Text>
        <View style={estilos.caja}>
          <Text style={estilos.negrita}>Fórmulas aplicadas (reglas v{foto.diagnostico.versionReglas}):</Text>
          {foto.diagnostico.pasosCalculo.map((paso, idx) => (
            <Text key={idx} style={estilos.textoPequeno}>
              {idx + 1}. {paso}
            </Text>
          ))}
        </View>
        <View style={estilos.caja}>
          <Text style={estilos.negrita}>Fuentes citadas:</Text>
          {foto.fuentes.map((f, idx) => (
            <Text key={idx} style={estilos.textoPequeno}>
              • {f}
            </Text>
          ))}
        </View>
        <View style={estilos.cajaAviso}>
          <Text style={estilos.negrita}>Aviso legal</Text>
          <Text style={estilos.textoPequeno}>{AVISO_LEGAL_INFORME}</Text>
        </View>
      </Page>
    </Document>
  );
}

// Renderiza el PDF con tope de tiempo de 10 s (auditoría B-01, Esp. 07 §7).
export async function renderizarInformePdfBuffer(foto: FotoInforme): Promise<Buffer> {
  const promesaPdf = renderToBuffer(<DocumentoInformePdf foto={foto} />);
  const promesaTimeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error("No se pudo generar el PDF, probá de nuevo.")),
      LIMITES_INFORME.maxTiempoPdfMs,
    );
  });

  return Promise.race([promesaPdf, promesaTimeout]);
}
