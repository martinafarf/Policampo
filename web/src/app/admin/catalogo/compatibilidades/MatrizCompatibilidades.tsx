"use client";

// Matriz interactiva cultivo × planta de servicio (Esp. 03, 5.3, CA-03-06, CA-03-09, RD-03).
// En escritorio muestra tabla matriz; en celular (360 px) muestra lista filtrada por cultivo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BadgeEstadoCatalogo } from "@/componentes/catalogo/BadgeEstadoCatalogo";
import {
  ETIQUETAS_FUENTE_TIPO,
  FUENTES_TIPO,
  type EstadoCatalogo,
  type FuenteTipo,
} from "@/dominio/catalogo";
import {
  guardarCompatibilidad,
  publicarCompatibilidad,
  retirarCompatibilidad,
} from "./acciones";

export interface ItemResumen {
  id: string;
  nombre: string;
  estado: EstadoCatalogo;
}

export interface RegistroCompatibilidad {
  id: string;
  cultivoId: string;
  plantaId: string;
  grado: number;
  justificacion: string;
  estado: EstadoCatalogo;
  fuenteTipo: FuenteTipo | null;
  fuenteDetalle: string | null;
  validadoPor: string | null;
}

interface Props {
  cultivos: readonly ItemResumen[];
  plantas: readonly ItemResumen[];
  compatibilidades: readonly RegistroCompatibilidad[];
}

function claseCeldaGrado(grado: number | null): string {
  if (grado === null) return "border-stone-200 bg-stone-50 text-stone-400 hover:bg-stone-100";
  if (grado > 0) return "border-emerald-300 bg-emerald-100 text-emerald-950 hover:bg-emerald-200";
  if (grado < 0) return "border-red-300 bg-red-100 text-red-950 hover:bg-red-200";
  return "border-stone-300 bg-stone-200 text-stone-800 hover:bg-stone-300";
}

function formatearGrado(grado: number): string {
  return grado > 0 ? `+${grado}` : String(grado);
}

export function MatrizCompatibilidades({ cultivos, plantas, compatibilidades }: Props) {
  const router = useRouter();
  const [cultivoFiltroMobile, setCultivoFiltroMobile] = useState<string>(cultivos[0]?.id ?? "");

  const [celdaActiva, setCeldaActiva] = useState<{
    cultivo: ItemResumen;
    planta: ItemResumen;
    existente: RegistroCompatibilidad | null;
  } | null>(null);

  const [grado, setGrado] = useState<number>(3);
  const [justificacion, setJustificacion] = useState("");
  const [fuenteTipo, setFuenteTipo] = useState<FuenteTipo | "">("");
  const [fuenteDetalle, setFuenteDetalle] = useState("");
  const [validadoPor, setValidadoPor] = useState("");
  const [motivoRetiro, setMotivoRetiro] = useState("");
  const [mostrarRetiro, setMostrarRetiro] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [procesando, iniciarTransicion] = useTransition();

  const mapaCompat = useMemo(() => {
    const mapa = new Map<string, RegistroCompatibilidad>();
    for (const c of compatibilidades) {
      mapa.set(`${c.cultivoId}::${c.plantaId}`, c);
    }
    return mapa;
  }, [compatibilidades]);

  function abrirEditor(c: ItemResumen, p: ItemResumen) {
    const existente = mapaCompat.get(`${c.id}::${p.id}`) ?? null;
    setCeldaActiva({ cultivo: c, planta: p, existente });
    setGrado(existente?.grado ?? 3);
    setJustificacion(existente?.justificacion ?? "");
    setFuenteTipo(existente?.fuenteTipo ?? "");
    setFuenteDetalle(existente?.fuenteDetalle ?? "");
    setValidadoPor(existente?.validadoPor ?? "");
    setMotivoRetiro("");
    setMostrarRetiro(false);
    setErrores([]);
  }

  function manejarGuardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!celdaActiva) return;
    setErrores([]);

    iniciarTransicion(async () => {
      const res = await guardarCompatibilidad(celdaActiva.cultivo.id, celdaActiva.planta.id, {
        grado,
        justificacion,
        fuenteTipo: fuenteTipo || null,
        fuenteDetalle,
        validadoPor,
      });
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo guardar la compatibilidad."]);
        return;
      }
      setCeldaActiva(null);
      router.refresh();
    });
  }

  function manejarPublicar() {
    if (!celdaActiva?.existente) return;
    setErrores([]);
    iniciarTransicion(async () => {
      const res = await publicarCompatibilidad(celdaActiva.existente!.id);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo publicar la compatibilidad."]);
        return;
      }
      setCeldaActiva(null);
      router.refresh();
    });
  }

  function manejarRetirar() {
    if (!celdaActiva?.existente) return;
    setErrores([]);
    iniciarTransicion(async () => {
      const res = await retirarCompatibilidad(celdaActiva.existente!.id, motivoRetiro);
      if (!res.ok) {
        setErrores(res.errores ?? ["No se pudo retirar la compatibilidad."]);
        return;
      }
      setCeldaActiva(null);
      router.refresh();
    });
  }

  const cultivoMobile = cultivos.find((c) => c.id === cultivoFiltroMobile) ?? cultivos[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/admin/catalogo"
          className="text-sm font-semibold text-emerald-800 hover:underline"
        >
          ← Volver al resumen del catálogo
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-stone-900">Matriz de compatibilidades</h1>
        <p className="text-sm text-stone-600">
          Grado de −5 (antagonismo) a +5 (máxima sinergia). Tocá una celda para cargar, editar o
          publicar la compatibilidad.
        </p>
      </div>

      {/* Vista celular (360 px): lista filtrada por cultivo (Esp. 03, 5.3) */}
      <div className="flex flex-col gap-3 md:hidden">
        <label htmlFor="filtro-cultivo-mobile" className="text-sm font-semibold text-stone-800">
          Elegí un cultivo
        </label>
        <select
          id="filtro-cultivo-mobile"
          value={cultivoFiltroMobile}
          onChange={(e) => setCultivoFiltroMobile(e.target.value)}
          className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
        >
          {cultivos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.estado})
            </option>
          ))}
        </select>

        {cultivoMobile ? (
          <ul className="flex flex-col gap-2">
            {plantas.map((p) => {
              const reg = mapaCompat.get(`${cultivoMobile.id}::${p.id}`) ?? null;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => abrirEditor(cultivoMobile, p)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900">{p.nombre}</p>
                      <p className="text-xs text-stone-500">
                        {reg ? `Estado: ${reg.estado}` : "Sin dato cargado"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex min-w-12 items-center justify-center rounded-lg border px-2.5 py-1 text-sm font-bold ${claseCeldaGrado(
                        reg ? reg.grado : null,
                      )}`}
                    >
                      {reg ? formatearGrado(reg.grado) : "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {/* Vista escritorio: tabla matriz completa */}
      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-xs md:block">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="sticky left-0 z-10 bg-stone-50 px-3 py-2.5 font-bold text-stone-800">
                Cultivo \ Planta
              </th>
              {plantas.map((p) => (
                <th key={p.id} className="min-w-24 px-2 py-2.5 text-center font-semibold text-stone-700">
                  <div>{p.nombre}</div>
                  <div className="mt-0.5 text-[10px] font-normal text-stone-500">{p.estado}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cultivos.map((c) => (
              <tr key={c.id} className="border-b border-stone-100">
                <th className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold text-stone-900">
                  <div>{c.nombre}</div>
                  <div className="text-[10px] font-normal text-stone-500">{c.estado}</div>
                </th>
                {plantas.map((p) => {
                  const reg = mapaCompat.get(`${c.id}::${p.id}`) ?? null;
                  return (
                    <td key={p.id} className="p-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => abrirEditor(c, p)}
                        title={reg?.justificacion ?? "Cargar compatibilidad"}
                        className={`inline-flex h-10 w-16 flex-col items-center justify-center rounded-lg border text-xs font-bold ${claseCeldaGrado(
                          reg ? reg.grado : null,
                        )}`}
                      >
                        <span>{reg ? formatearGrado(reg.grado) : "—"}</span>
                        {reg ? (
                          <span className="text-[9px] font-normal opacity-80">{reg.estado}</span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de edición de celda */}
      {celdaActiva ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-compat"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 id="titulo-modal-compat" className="text-lg font-bold text-stone-900">
                  {celdaActiva.cultivo.nombre} × {celdaActiva.planta.nombre}
                </h2>
                <p className="mt-0.5 text-xs text-stone-600">
                  Cultivo: {celdaActiva.cultivo.estado} · Planta: {celdaActiva.planta.estado}
                </p>
              </div>
              {celdaActiva.existente ? (
                <BadgeEstadoCatalogo estado={celdaActiva.existente.estado} />
              ) : null}
            </div>

            {errores.length > 0 ? (
              <div
                role="alert"
                className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
              >
                <ul className="list-disc pl-4">
                  {errores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <form onSubmit={manejarGuardar} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="gradoCompat" className="text-sm font-semibold text-stone-800">
                  Grado (−5 a +5): <strong>{formatearGrado(grado)}</strong>
                </label>
                <input
                  id="gradoCompat"
                  type="range"
                  min={-5}
                  max={5}
                  step={1}
                  value={grado}
                  onChange={(e) => setGrado(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>−5 Antagonismo</span>
                  <span>0 Neutra</span>
                  <span>+5 Máxima sinergia</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="justificacionCompat" className="text-sm font-semibold text-stone-800">
                  Justificación agronómica (10 a 500 caracteres) <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="justificacionCompat"
                  rows={3}
                  required
                  minLength={10}
                  maxLength={500}
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Explicá por qué se recomienda o por qué no conviene combinar estas especies…"
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                  maxLength={120}
                  value={validadoPor}
                  onChange={(e) => setValidadoPor(e.target.value)}
                  placeholder="Validado por (ej.: Especialista 1)"
                  className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                />
              </div>

              <input
                type="text"
                maxLength={300}
                value={fuenteDetalle}
                onChange={(e) => setFuenteDetalle(e.target.value)}
                placeholder="Descripción de la fuente (sin nombres reales, RS-09)"
                className="min-h-10 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              />

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 pt-3">
                <button
                  type="button"
                  onClick={() => setCeldaActiva(null)}
                  className="min-h-10 rounded-lg border border-stone-300 px-3.5 py-1.5 text-sm font-semibold text-stone-700"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={procesando}
                  className="min-h-10 rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {procesando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>

            {celdaActiva.existente ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-stone-200 pt-3">
                <div className="flex flex-wrap gap-2">
                  {celdaActiva.existente.estado !== "publicado" ? (
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={manejarPublicar}
                      className="min-h-10 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white"
                    >
                      Publicar compatibilidad
                    </button>
                  ) : null}
                  {celdaActiva.existente.estado !== "retirado" ? (
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={() => setMostrarRetiro((v) => !v)}
                      className="min-h-10 rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-950"
                    >
                      Retirar
                    </button>
                  ) : null}
                </div>

                {mostrarRetiro ? (
                  <div className="flex flex-col gap-2 rounded-lg bg-amber-50 p-2.5">
                    <input
                      type="text"
                      value={motivoRetiro}
                      onChange={(e) => setMotivoRetiro(e.target.value)}
                      placeholder="Motivo del retiro (obligatorio)"
                      className="min-h-9 rounded-lg border border-amber-300 bg-white px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      disabled={procesando}
                      onClick={manejarRetirar}
                      className="self-start rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Confirmar retiro
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
