"use client";

// Formulario de alta y edición de plantas de servicio (Esp. 03, 5.1, CA-03-01, 05, 07, 08, 19).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeEstadoCatalogo } from "@/componentes/catalogo/BadgeEstadoCatalogo";
import { GrillaQuincenas } from "@/componentes/catalogo/GrillaQuincenas";
import { ECORREGIONES, obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import {
  CICLOS_PLANTA,
  ETIQUETAS_CICLO_PLANTA,
  ETIQUETAS_FUENTE_TIPO,
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_ORIGEN_PLANTA,
  ETIQUETAS_RIESGO_MALEZA,
  FUENTES_TIPO,
  FUNCIONES_PLANTA,
  NIVELES_AGUA,
  ORIGENES_PLANTA,
  RIESGOS_MALEZA,
  type CicloPlanta,
  type EntradaPeriodoPlanta,
  type EstadoCatalogo,
  type FuenteTipo,
  type FuncionPlanta,
  type NivelAgua,
  type OrigenPlanta,
  type RangoSemanas,
  type RiesgoMaleza,
} from "@/dominio/catalogo";
import {
  borrarPlantaServicio,
  crearPlantaServicio,
  editarPlantaServicio,
  publicarPlantaServicio,
  retirarPlantaServicio,
} from "./acciones";

export interface PlantaInicialFormulario {
  id: string;
  clave: string;
  nombreComun: string;
  nombreCientifico: string | null;
  funciones: FuncionPlanta[];
  ciclo: CicloPlanta;
  origen: OrigenPlanta;
  esEspontanea: boolean;
  enMercadoLocal: boolean;
  polinizadoresQueAtrae: string | null;
  beneficios: string | null;
  necesidadAgua: NivelAgua;
  manejoCorte: string | null;
  riesgoMaleza: RiesgoMaleza;
  dosisSiembra: string | null;
  costoReferenciaArsHa: string | null;
  costoReferenciaFecha: string | null;
  estado: EstadoCatalogo;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  periodos: EntradaPeriodoPlanta[];
}

interface Props {
  inicial?: PlantaInicialFormulario;
}

export function FormularioPlanta({ inicial }: Props) {
  const router = useRouter();
  const esEdicion = Boolean(inicial);

  const [clave, setClave] = useState(inicial?.clave ?? "");
  const [nombreComun, setNombreComun] = useState(inicial?.nombreComun ?? "");
  const [nombreCientifico, setNombreCientifico] = useState(inicial?.nombreCientifico ?? "");
  const [funciones, setFunciones] = useState<FuncionPlanta[]>(
    inicial?.funciones ?? ["atrae_polinizadores"],
  );
  const [ciclo, setCiclo] = useState<CicloPlanta>(inicial?.ciclo ?? "anual");
  const [origen, setOrigen] = useState<OrigenPlanta>(inicial?.origen ?? "desconocido");
  const [esEspontanea, setEsEspontanea] = useState(inicial?.esEspontanea ?? false);
  const [enMercadoLocal, setEnMercadoLocal] = useState(inicial?.enMercadoLocal ?? true);
  const [polinizadoresQueAtrae, setPolinizadoresQueAtrae] = useState(
    inicial?.polinizadoresQueAtrae ?? "",
  );
  const [beneficios, setBeneficios] = useState(inicial?.beneficios ?? "");
  const [necesidadAgua, setNecesidadAgua] = useState<NivelAgua>(inicial?.necesidadAgua ?? "media");
  const [manejoCorte, setManejoCorte] = useState(inicial?.manejoCorte ?? "");
  const [riesgoMaleza, setRiesgoMaleza] = useState<RiesgoMaleza>(inicial?.riesgoMaleza ?? "bajo");
  const [dosisSiembra, setDosisSiembra] = useState(inicial?.dosisSiembra ?? "");
  const [costoReferenciaArsHa, setCostoReferenciaArsHa] = useState(
    inicial?.costoReferenciaArsHa ?? "",
  );
  const [costoReferenciaFecha, setCostoReferenciaFecha] = useState(
    inicial?.costoReferenciaFecha ?? "",
  );
  const [fuenteTipo, setFuenteTipo] = useState<FuenteTipo | "">(inicial?.fuenteTipo ?? "");
  const [fuenteDetalle, setFuenteDetalle] = useState(inicial?.fuenteDetalle ?? "");
  const [validadoPor, setValidadoPor] = useState(inicial?.validadoPor ?? "");
  const [periodos, setPeriodos] = useState<EntradaPeriodoPlanta[]>(inicial?.periodos ?? []);
  const [nuevaEcorregion, setNuevaEcorregion] = useState<ClaveEcorregion>("valles_templados");

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [motivoRetiro, setMotivoRetiro] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [procesando, iniciarTransicion] = useTransition();

  function alternarFuncion(funcion: FuncionPlanta) {
    setFunciones((previas) =>
      previas.includes(funcion) ? previas.filter((f) => f !== funcion) : [...previas, funcion],
    );
  }

  function agregarEcorregion() {
    if (periodos.some((p) => p.ecorregion === nuevaEcorregion)) return;
    setPeriodos((previos) => [
      ...previos,
      {
        ecorregion: nuevaEcorregion,
        siembraSemanas: [],
        floracionSemanas: [],
        corteSemanas: [],
        semanasHastaFloracionMin: null,
        semanasHastaFloracionMax: null,
      },
    ]);
  }

  function actualizarPeriodo(idx: number, cambios: Partial<EntradaPeriodoPlanta>) {
    setPeriodos((previos) => previos.map((p, i) => (i === idx ? { ...p, ...cambios } : p)));
  }

  function quitarPeriodo(idx: number) {
    setPeriodos((previos) => previos.filter((_, i) => i !== idx));
  }

  function manejarGuardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrores([]);
    setMensajeExito(null);

    iniciarTransicion(async () => {
      const payload = {
        clave,
        nombreComun,
        nombreCientifico,
        funciones,
        ciclo,
        origen,
        esEspontanea,
        enMercadoLocal,
        polinizadoresQueAtrae,
        beneficios,
        necesidadAgua,
        manejoCorte,
        riesgoMaleza,
        dosisSiembra,
        costoReferenciaArsHa,
        costoReferenciaFecha,
        fuenteTipo: fuenteTipo || null,
        fuenteDetalle,
        validadoPor,
        periodos,
      };

      const res = inicial
        ? await editarPlantaServicio(inicial.id, payload)
        : await crearPlantaServicio(payload);

      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo guardar la planta."]);
        return;
      }

      if (!inicial && res.plantaId) {
        router.push(`/admin/catalogo/plantas/${res.plantaId}`);
        return;
      }

      setMensajeExito("Cambios guardados y registrados en el historial.");
      router.refresh();
    });
  }

  function manejarPublicar() {
    if (!inicial) return;
    setErrores([]);
    setMensajeExito(null);
    iniciarTransicion(async () => {
      const res = await publicarPlantaServicio(inicial.id);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo publicar la planta."]);
        return;
      }
      setMensajeExito("Planta publicada. Ya se usa en las recomendaciones y aparece en la Guía.");
      router.refresh();
    });
  }

  function manejarRetirar() {
    if (!inicial) return;
    setErrores([]);
    setMensajeExito(null);
    iniciarTransicion(async () => {
      const res = await retirarPlantaServicio(inicial.id, motivoRetiro);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo retirar la planta."]);
        return;
      }
      setMostrarRetirar(false);
      setMotivoRetiro("");
      setMensajeExito("Planta retirada del catálogo.");
      router.refresh();
    });
  }

  function manejarBorrar() {
    if (!inicial) return;
    setErrores([]);
    setMensajeExito(null);
    iniciarTransicion(async () => {
      const res = await borrarPlantaServicio(inicial.id);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo borrar la planta."]);
        return;
      }
      router.push("/admin/catalogo/plantas");
    });
  }

  const ecorregionesDisponibles = ECORREGIONES.filter(
    (eco) => !periodos.some((p) => p.ecorregion === eco.clave),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/catalogo/plantas"
            className="text-sm font-semibold text-emerald-800 hover:underline"
          >
            ← Volver a Plantas de servicio
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-900">
              {esEdicion ? inicial!.nombreComun : "Nueva planta de servicio"}
            </h1>
            {inicial ? <BadgeEstadoCatalogo estado={inicial.estado} /> : null}
          </div>
        </div>
      </div>

      {mensajeExito ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          {mensajeExito}
        </div>
      ) : null}

      {errores.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <ul className="list-disc pl-5">
            {errores.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={manejarGuardar}
        className="flex flex-col gap-6 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="clave" className="text-sm font-semibold text-stone-800">
              Clave técnica <span className="text-red-600">*</span>
            </label>
            <input
              id="clave"
              type="text"
              required
              disabled={esEdicion}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="ej.: trigo_sarraceno"
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900 disabled:bg-stone-100 disabled:text-stone-500"
            />
            <p className="text-xs text-stone-500">
              {esEdicion ? "La clave no cambia después de creada." : "Minúsculas y guiones bajos."}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="nombreComun" className="text-sm font-semibold text-stone-800">
              Nombre común <span className="text-red-600">*</span>
            </label>
            <input
              id="nombreComun"
              type="text"
              required
              maxLength={80}
              value={nombreComun}
              onChange={(e) => setNombreComun(e.target.value)}
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-900"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="nombreCientifico" className="text-sm font-semibold text-stone-800">
              Nombre científico <span className="text-xs text-stone-500">(obligatorio para publicar)</span>
            </label>
            <input
              id="nombreCientifico"
              type="text"
              maxLength={120}
              value={nombreCientifico}
              onChange={(e) => setNombreCientifico(e.target.value)}
              placeholder="Ej.: Calendula officinalis"
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm italic text-stone-900"
            />
          </div>
        </div>

        {/* Funciones agroecológicas */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-stone-800">
            Funciones agroecológicas <span className="text-red-600">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {FUNCIONES_PLANTA.map((f) => {
              const marcada = funciones.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => alternarFuncion(f)}
                  className={`min-h-10 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    marcada
                      ? "border-emerald-700 bg-emerald-100 text-emerald-950"
                      : "border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {ETIQUETAS_FUNCION_PLANTA[f]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Ciclo, origen, agua, riesgo de maleza */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="ciclo" className="text-sm font-semibold text-stone-800">
              Ciclo
            </label>
            <select
              id="ciclo"
              value={ciclo}
              onChange={(e) => setCiclo(e.target.value as CicloPlanta)}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {CICLOS_PLANTA.map((c) => (
                <option key={c} value={c}>
                  {ETIQUETAS_CICLO_PLANTA[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="origen" className="text-sm font-semibold text-stone-800">
              Origen
            </label>
            <select
              id="origen"
              value={origen}
              onChange={(e) => setOrigen(e.target.value as OrigenPlanta)}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {ORIGENES_PLANTA.map((o) => (
                <option key={o} value={o}>
                  {ETIQUETAS_ORIGEN_PLANTA[o]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="necesidadAgua" className="text-sm font-semibold text-stone-800">
              Necesidad de agua
            </label>
            <select
              id="necesidadAgua"
              value={necesidadAgua}
              onChange={(e) => setNecesidadAgua(e.target.value as NivelAgua)}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {NIVELES_AGUA.map((n) => (
                <option key={n} value={n}>
                  {ETIQUETAS_NIVEL_AGUA[n]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="riesgoMaleza" className="text-sm font-semibold text-stone-800">
              Riesgo de maleza
            </label>
            <select
              id="riesgoMaleza"
              value={riesgoMaleza}
              onChange={(e) => setRiesgoMaleza(e.target.value as RiesgoMaleza)}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              {RIESGOS_MALEZA.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETAS_RIESGO_MALEZA[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Disponibilidad local (RN-12) */}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-stone-800">
            Disponibilidad en Jujuy (RN-12, al menos una) <span className="text-red-600">*</span>
          </legend>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex min-h-10 items-center gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                checked={esEspontanea}
                onChange={(e) => setEsEspontanea(e.target.checked)}
              />
              Flora espontánea (crece sola y se puede conservar)
            </label>
            <label className="inline-flex min-h-10 items-center gap-2 text-sm text-stone-800">
              <input
                type="checkbox"
                checked={enMercadoLocal}
                onChange={(e) => setEnMercadoLocal(e.target.checked)}
              />
              Se consigue en el mercado local
            </label>
          </div>
        </fieldset>

        {/* Textos técnicos */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="polinizadoresQueAtrae" className="text-sm font-semibold text-stone-800">
              Polinizadores o insectos benéficos que atrae
            </label>
            <input
              id="polinizadoresQueAtrae"
              type="text"
              maxLength={300}
              value={polinizadoresQueAtrae}
              onChange={(e) => setPolinizadoresQueAtrae(e.target.value)}
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="beneficios" className="text-sm font-semibold text-stone-800">
              Beneficios <span className="text-xs text-stone-500">(obligatorio para publicar)</span>
            </label>
            <textarea
              id="beneficios"
              rows={3}
              maxLength={1000}
              value={beneficios}
              onChange={(e) => setBeneficios(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="manejoCorte" className="text-sm font-semibold text-stone-800">
              Manejo y corte (RN-11){" "}
              <span className="text-xs text-stone-500">(obligatorio para publicar)</span>
            </label>
            <textarea
              id="manejoCorte"
              rows={2}
              maxLength={500}
              value={manejoCorte}
              onChange={(e) => setManejoCorte(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="dosisSiembra" className="text-sm font-semibold text-stone-800">
                Dosis de siembra
              </label>
              <input
                id="dosisSiembra"
                type="text"
                maxLength={120}
                value={dosisSiembra}
                onChange={(e) => setDosisSiembra(e.target.value)}
                placeholder="Ej.: 20–30 kg/ha"
                className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="costoReferenciaArsHa" className="text-sm font-semibold text-stone-800">
                Costo referencia (ARS/ha)
              </label>
              <input
                id="costoReferenciaArsHa"
                type="text"
                inputMode="decimal"
                value={costoReferenciaArsHa}
                onChange={(e) => setCostoReferenciaArsHa(e.target.value)}
                className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="costoReferenciaFecha" className="text-sm font-semibold text-stone-800">
                Fecha del costo
              </label>
              <input
                id="costoReferenciaFecha"
                type="date"
                value={costoReferenciaFecha}
                onChange={(e) => setCostoReferenciaFecha(e.target.value)}
                className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Fuente y validación (RN-13, RS-09) */}
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-sm font-bold text-stone-900">
            Fuente y validación (obligatorio para publicar · sin nombres de personas reales, RS-09)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              aria-label="Tipo de fuente"
              value={fuenteTipo}
              onChange={(e) => setFuenteTipo(e.target.value as FuenteTipo | "")}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">Tipo de fuente…</option>
              {FUENTES_TIPO.map((f) => (
                <option key={f} value={f}>
                  {ETIQUETAS_FUENTE_TIPO[f]}
                </option>
              ))}
            </select>
            <input
              type="text"
              maxLength={300}
              value={fuenteDetalle}
              onChange={(e) => setFuenteDetalle(e.target.value)}
              placeholder="Ej.: Entrevista Especialista 1"
              aria-label="Descripción de la fuente"
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              maxLength={120}
              value={validadoPor}
              onChange={(e) => setValidadoPor(e.target.value)}
              placeholder="Ej.: Analista de dominio (Integrante 2)"
              aria-label="Validado por"
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            />
          </div>
        </section>

        {/* Períodos por ecorregión con grilla de 24 quincenas */}
        <section className="flex flex-col gap-4 border-t border-stone-200 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-stone-900">Períodos por ecorregión</h2>
              <p className="text-xs text-stone-600">
                Tocá las quincenas de siembra, floración y corte. Para publicar se exige floración
                en al menos una ecorregión.
              </p>
            </div>
            {ecorregionesDisponibles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Elegir ecorregión para agregar"
                  value={nuevaEcorregion}
                  onChange={(e) => setNuevaEcorregion(e.target.value as ClaveEcorregion)}
                  className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
                >
                  {ecorregionesDisponibles.map((eco) => (
                    <option key={eco.clave} value={eco.clave}>
                      {eco.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={agregarEcorregion}
                  className="min-h-10 rounded-lg border border-emerald-700 bg-white px-3.5 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                >
                  + Agregar ecorregión
                </button>
              </div>
            ) : null}
          </div>

          {periodos.length === 0 ? (
            <p className="text-sm text-stone-500">
              Todavía no hay períodos cargados para ninguna ecorregión.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {periodos.map((p, idx) => (
                <div
                  key={p.ecorregion}
                  className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-stone-900">
                      {obtenerNombreEcorregion(p.ecorregion as ClaveEcorregion)}
                    </h3>
                    <button
                      type="button"
                      onClick={() => quitarPeriodo(idx)}
                      className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                    >
                      Quitar
                    </button>
                  </div>

                  <GrillaQuincenas
                    etiqueta="Siembra"
                    tipo="siembra"
                    rangos={p.siembraSemanas}
                    onCambiar={(rangos: RangoSemanas[]) =>
                      actualizarPeriodo(idx, { siembraSemanas: rangos })
                    }
                  />
                  <GrillaQuincenas
                    etiqueta="Floración"
                    tipo="floracion"
                    rangos={p.floracionSemanas}
                    onCambiar={(rangos: RangoSemanas[]) =>
                      actualizarPeriodo(idx, { floracionSemanas: rangos })
                    }
                  />
                  <GrillaQuincenas
                    etiqueta="Corte"
                    tipo="corte"
                    rangos={p.corteSemanas}
                    onCambiar={(rangos: RangoSemanas[]) =>
                      actualizarPeriodo(idx, { corteSemanas: rangos })
                    }
                  />

                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-stone-700">
                        Semanas hasta floración (mín.)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={p.semanasHastaFloracionMin ?? ""}
                        onChange={(e) =>
                          actualizarPeriodo(idx, {
                            semanasHastaFloracionMin: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-stone-700">
                        Semanas hasta floración (máx.)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={52}
                        value={p.semanasHastaFloracionMax ?? ""}
                        onChange={(e) =>
                          actualizarPeriodo(idx, {
                            semanasHastaFloracionMax: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pt-4">
          <button
            type="submit"
            disabled={procesando}
            className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {procesando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      {/* Acciones de estado (Publicar / Retirar / Borrar borrador sin uso) */}
      {inicial ? (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900">Estado editorial</h2>
          <div className="flex flex-wrap gap-2">
            {inicial.estado !== "publicado" ? (
              <button
                type="button"
                disabled={procesando}
                onClick={manejarPublicar}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                Publicar planta
              </button>
            ) : null}

            {inicial.estado !== "retirado" ? (
              <button
                type="button"
                disabled={procesando}
                onClick={() => setMostrarRetirar((v) => !v)}
                className="min-h-11 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100"
              >
                Retirar
              </button>
            ) : null}

            {inicial.estado === "borrador" ? (
              <button
                type="button"
                disabled={procesando}
                onClick={manejarBorrar}
                className="min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Borrar borrador
              </button>
            ) : null}
          </div>

          {mostrarRetirar ? (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <label htmlFor="motivoRetiro" className="text-xs font-semibold text-amber-950">
                Motivo del retiro (obligatorio, CA-03-07)
              </label>
              <input
                id="motivoRetiro"
                type="text"
                value={motivoRetiro}
                onChange={(e) => setMotivoRetiro(e.target.value)}
                placeholder="Ej.: Especie invasora en Yungas según nueva evidencia"
                className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={procesando}
                  onClick={manejarRetirar}
                  className="min-h-10 rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Confirmar retiro
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarRetirar(false)}
                  className="min-h-10 rounded-lg border border-stone-300 bg-white px-4 py-1.5 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
