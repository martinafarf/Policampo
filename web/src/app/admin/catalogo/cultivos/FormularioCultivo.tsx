"use client";

// Formulario de alta y edición de datos agronómicos de cultivos (Esp. 03, 5.2, CA-03-04).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeEstadoCatalogo } from "@/componentes/catalogo/BadgeEstadoCatalogo";
import { GrillaQuincenas } from "@/componentes/catalogo/GrillaQuincenas";
import { ECORREGIONES, obtenerNombreEcorregion, type ClaveEcorregion } from "@/datos/jujuy";
import {
  DEPENDENCIAS_POLINIZACION,
  ETIQUETAS_DEPENDENCIA_POLINIZACION,
  ETIQUETAS_FUENTE_TIPO,
  FUENTES_TIPO,
  type DependenciaPolinizacion,
  type EntradaPeriodoCultivo,
  type EstadoCatalogo,
  type FuenteTipo,
  type RangoSemanas,
} from "@/dominio/catalogo";
import {
  crearCultivoCatalogo,
  editarCultivoCatalogo,
  publicarCultivoCatalogo,
  retirarCultivoCatalogo,
} from "./acciones";

export interface CultivoInicialFormulario {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
  dependenciaPolinizacion: DependenciaPolinizacion | null;
  tipoPolinizacion: string | null;
  polinizadoresNecesarios: string | null;
  estado: EstadoCatalogo;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
  periodos: EntradaPeriodoCultivo[];
}

export function FormularioCultivo({ inicial }: { inicial?: CultivoInicialFormulario }) {
  const router = useRouter();
  const esEdicion = Boolean(inicial);

  const [clave, setClave] = useState(inicial?.clave ?? "");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [activo, setActivo] = useState(inicial?.activo ?? true);
  const [dependenciaPolinizacion, setDependenciaPolinizacion] = useState<
    DependenciaPolinizacion | ""
  >(inicial?.dependenciaPolinizacion ?? "");
  const [tipoPolinizacion, setTipoPolinizacion] = useState(inicial?.tipoPolinizacion ?? "");
  const [polinizadoresNecesarios, setPolinizadoresNecesarios] = useState(
    inicial?.polinizadoresNecesarios ?? "",
  );
  const [fuenteTipo, setFuenteTipo] = useState<FuenteTipo | "">(inicial?.fuenteTipo ?? "");
  const [fuenteDetalle, setFuenteDetalle] = useState(inicial?.fuenteDetalle ?? "");
  const [validadoPor, setValidadoPor] = useState(inicial?.validadoPor ?? "");
  const [periodos, setPeriodos] = useState<EntradaPeriodoCultivo[]>(inicial?.periodos ?? []);
  const [nuevaEcorregion, setNuevaEcorregion] = useState<ClaveEcorregion>("valles_templados");

  const [mostrarRetirar, setMostrarRetirar] = useState(false);
  const [motivoRetiro, setMotivoRetiro] = useState("");
  const [errores, setErrores] = useState<string[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [procesando, iniciarTransicion] = useTransition();

  function agregarEcorregion() {
    if (periodos.some((p) => p.ecorregion === nuevaEcorregion)) return;
    setPeriodos((prev) => [
      ...prev,
      { ecorregion: nuevaEcorregion, floracionSemanas: [], cosechaSemanas: [] },
    ]);
  }

  function actualizarPeriodo(idx: number, cambios: Partial<EntradaPeriodoCultivo>) {
    setPeriodos((prev) => prev.map((p, i) => (i === idx ? { ...p, ...cambios } : p)));
  }

  function manejarGuardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrores([]);
    setMensajeExito(null);

    iniciarTransicion(async () => {
      const payload = {
        clave,
        nombre,
        activo,
        dependenciaPolinizacion: dependenciaPolinizacion || null,
        tipoPolinizacion,
        polinizadoresNecesarios,
        fuenteTipo: fuenteTipo || null,
        fuenteDetalle,
        validadoPor,
        periodos,
      };

      const res = inicial
        ? await editarCultivoCatalogo(inicial.id, payload)
        : await crearCultivoCatalogo(payload);

      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo guardar el cultivo."]);
        return;
      }

      if (!inicial && res.cultivoId) {
        router.push(`/admin/catalogo/cultivos/${res.cultivoId}`);
        return;
      }

      setMensajeExito("Cultivo guardado y registrado en el historial.");
      router.refresh();
    });
  }

  function manejarPublicar() {
    if (!inicial) return;
    setErrores([]);
    setMensajeExito(null);
    iniciarTransicion(async () => {
      const res = await publicarCultivoCatalogo(inicial.id);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo publicar el cultivo."]);
        return;
      }
      setMensajeExito("Cultivo publicado.");
      router.refresh();
    });
  }

  function manejarRetirar() {
    if (!inicial) return;
    setErrores([]);
    setMensajeExito(null);
    iniciarTransicion(async () => {
      const res = await retirarCultivoCatalogo(inicial.id, motivoRetiro);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo retirar el cultivo."]);
        return;
      }
      setMostrarRetirar(false);
      setMotivoRetiro("");
      setMensajeExito("Cultivo retirado del catálogo.");
      router.refresh();
    });
  }

  const ecorregionesDisponibles = ECORREGIONES.filter(
    (eco) => !periodos.some((p) => p.ecorregion === eco.clave),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/catalogo/cultivos"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a Cultivos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-stone-900">
            {esEdicion ? inicial!.nombre : "Nuevo cultivo"}
          </h1>
          {inicial ? <BadgeEstadoCatalogo estado={inicial.estado} /> : null}
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
            {errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <form
        onSubmit={manejarGuardar}
        className="flex flex-col gap-5 rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="claveCultivo" className="text-sm font-semibold text-stone-800">
              Clave <span className="text-red-600">*</span>
            </label>
            <input
              id="claveCultivo"
              type="text"
              required
              disabled={esEdicion}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="ej.: vid"
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:bg-stone-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="nombreCultivo" className="text-sm font-semibold text-stone-800">
              Nombre <span className="text-red-600">*</span>
            </label>
            <input
              id="nombreCultivo"
              type="text"
              required
              maxLength={80}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej.: Vid"
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-stone-800">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Activo (se ofrece al cargar sectores de una finca en el módulo 02)
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="dependencia" className="text-sm font-semibold text-stone-800">
              Dependencia de la polinización (RN-09)
            </label>
            <select
              id="dependencia"
              value={dependenciaPolinizacion}
              onChange={(e) =>
                setDependenciaPolinizacion(e.target.value as DependenciaPolinizacion | "")
              }
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">Sin definir…</option>
              {DEPENDENCIAS_POLINIZACION.map((d) => (
                <option key={d} value={d}>
                  {ETIQUETAS_DEPENDENCIA_POLINIZACION[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="tipoPolinizacion" className="text-sm font-semibold text-stone-800">
              Tipo de polinización
            </label>
            <input
              id="tipoPolinizacion"
              type="text"
              maxLength={200}
              value={tipoPolinizacion}
              onChange={(e) => setTipoPolinizacion(e.target.value)}
              placeholder="Ej.: Por vibración (abejorros y abejas nativas)"
              className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="polinizadoresNecesarios" className="text-sm font-semibold text-stone-800">
            Polinizadores que necesita
          </label>
          <input
            id="polinizadoresNecesarios"
            type="text"
            maxLength={300}
            value={polinizadoresNecesarios}
            onChange={(e) => setPolinizadoresNecesarios(e.target.value)}
            className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
        </div>

        {/* Fuente y validación */}
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h2 className="text-sm font-bold text-stone-900">
            Fuente y validación (obligatorio para publicar · sin nombres reales, RS-09)
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
              placeholder="Descripción de la fuente"
              aria-label="Descripción de la fuente"
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            />
            <input
              type="text"
              maxLength={120}
              value={validadoPor}
              onChange={(e) => setValidadoPor(e.target.value)}
              placeholder="Ej.: Especialista 1"
              aria-label="Validado por"
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
            />
          </div>
        </section>

        {/* Períodos de floración y cosecha por ecorregión */}
        <section className="flex flex-col gap-4 border-t border-stone-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-stone-900">
              Floración y cosecha por ecorregión
            </h2>
            {ecorregionesDisponibles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Elegir ecorregión"
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
                  className="min-h-10 rounded-lg border border-emerald-700 bg-white px-3.5 py-1.5 text-sm font-semibold text-emerald-800"
                >
                  + Agregar ecorregión
                </button>
              </div>
            ) : null}
          </div>

          {periodos.map((p, idx) => (
            <div
              key={p.ecorregion}
              className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50/70 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900">
                  {obtenerNombreEcorregion(p.ecorregion as ClaveEcorregion)}
                </h3>
                <button
                  type="button"
                  onClick={() => setPeriodos((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-xs font-semibold text-red-700"
                >
                  Quitar
                </button>
              </div>
              <GrillaQuincenas
                etiqueta="Floración"
                tipo="floracion"
                rangos={p.floracionSemanas}
                onCambiar={(rangos: RangoSemanas[]) =>
                  actualizarPeriodo(idx, { floracionSemanas: rangos })
                }
              />
              <GrillaQuincenas
                etiqueta="Cosecha"
                tipo="cosecha"
                rangos={p.cosechaSemanas}
                onCambiar={(rangos: RangoSemanas[]) =>
                  actualizarPeriodo(idx, { cosechaSemanas: rangos })
                }
              />
            </div>
          ))}
        </section>

        <div className="flex justify-end border-t border-stone-200 pt-4">
          <button
            type="submit"
            disabled={procesando}
            className="min-h-11 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {procesando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>

      {inicial ? (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-bold text-stone-900">Estado editorial</h2>
          <div className="flex flex-wrap gap-2">
            {inicial.estado !== "publicado" ? (
              <button
                type="button"
                disabled={procesando}
                onClick={manejarPublicar}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Publicar cultivo
              </button>
            ) : null}
            {inicial.estado !== "retirado" ? (
              <button
                type="button"
                disabled={procesando}
                onClick={() => setMostrarRetirar((v) => !v)}
                className="min-h-11 rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950"
              >
                Retirar
              </button>
            ) : null}
          </div>

          {mostrarRetirar ? (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <input
                type="text"
                value={motivoRetiro}
                onChange={(e) => setMotivoRetiro(e.target.value)}
                placeholder="Motivo del retiro (obligatorio)"
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
