"use client";

// Pantalla cliente de importación y exportación CSV del catálogo (Esp. 03, sección 5.4).
// Flujo en 2 pasos: vista previa con errores por fila -> confirmación en Borrador (CA-03-12).
import { useState, useTransition } from "react";
import {
  COLUMNAS_COMPATIBILIDADES,
  COLUMNAS_PERIODOS,
  COLUMNAS_PLANTAS,
  LIMITES_CATALOGO,
  type TipoArchivoCsv,
} from "@/dominio/catalogo";
import {
  confirmarImportacionCsv,
  previsualizarImportacionCsv,
  type ResultadoConfirmarCsv,
  type ResumenVistaPreviaCsv,
} from "./acciones";

const ETIQUETAS_TIPO: Record<TipoArchivoCsv, { titulo: string; descripcion: string }> = {
  plantas: {
    titulo: "Plantas de servicio (plantas.csv)",
    descripcion: "Datos generales, funciones, manejo y fuente. Clave única: clave.",
  },
  periodos: {
    titulo: "Períodos por ecorregión (periodos.csv)",
    descripcion:
      "Semanas de siembra, floración y corte por planta y ecorregión. Las plantas deben existir antes.",
  },
  compatibilidades: {
    titulo: "Compatibilidades cultivo–planta (compatibilidades.csv)",
    descripcion:
      "Grado (−5 a +5), justificación y fuente. Cultivos y plantas deben existir antes.",
  },
};

const COLUMNAS_POR_TIPO: Record<TipoArchivoCsv, readonly string[]> = {
  plantas: COLUMNAS_PLANTAS,
  periodos: COLUMNAS_PERIODOS,
  compatibilidades: COLUMNAS_COMPATIBILIDADES,
};

export function FormularioImportarCsv() {
  const [estadoExport, setEstadoExport] = useState<string>("");
  const [tipoImport, setTipoImport] = useState<TipoArchivoCsv>("plantas");
  const [nombreArchivo, setNombreArchivo] = useState<string>("");
  const [contenidoCsv, setContenidoCsv] = useState<string>("");
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<ResumenVistaPreviaCsv | null>(null);
  const [resultado, setResultado] = useState<ResultadoConfirmarCsv | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  async function alElegirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    setErrorArchivo(null);
    setVistaPrevia(null);
    setResultado(null);

    const archivo = evento.target.files?.[0];
    if (!archivo) {
      setNombreArchivo("");
      setContenidoCsv("");
      return;
    }

    if (archivo.size > LIMITES_CATALOGO.csvMaxBytes) {
      setNombreArchivo("");
      setContenidoCsv("");
      setErrorArchivo("El archivo supera el máximo permitido de 2 MB.");
      return;
    }

    const texto = await archivo.text();
    setNombreArchivo(archivo.name);
    setContenidoCsv(texto);
  }

  function cambiarTipo(nuevoTipo: TipoArchivoCsv) {
    setTipoImport(nuevoTipo);
    setVistaPrevia(null);
    setResultado(null);
  }

  function verVistaPrevia() {
    if (!contenidoCsv) {
      setErrorArchivo("Elegí un archivo CSV antes de continuar.");
      return;
    }
    setErrorArchivo(null);
    setResultado(null);
    iniciarTransicion(async () => {
      const res = await previsualizarImportacionCsv(tipoImport, contenidoCsv);
      setVistaPrevia(res);
    });
  }

  function confirmar() {
    if (!contenidoCsv || !vistaPrevia || vistaPrevia.errores.length > 0) return;
    setErrorArchivo(null);
    iniciarTransicion(async () => {
      const res = await confirmarImportacionCsv(tipoImport, contenidoCsv);
      setResultado(res);
      if (res.ok) {
        setVistaPrevia(null);
      }
    });
  }

  const queryEstado = estadoExport ? `&estado=${encodeURIComponent(estadoExport)}` : "";
  const totalCambiosVistaPrevia =
    (vistaPrevia?.altas.length ?? 0) + (vistaPrevia?.modificaciones.length ?? 0);
  const puedeConfirmar =
    Boolean(vistaPrevia) &&
    vistaPrevia!.ok &&
    vistaPrevia!.errores.length === 0 &&
    totalCambiosVistaPrevia > 0 &&
    !pendiente;

  return (
    <div className="flex flex-col gap-6">
      {/* Sección 1: Exportar CSV */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">1. Exportar catálogo en CSV</h2>
            <p className="mt-1 text-xs text-stone-600">
              Archivos UTF-8 seguros para abrir en Excel (protección contra inyección de fórmulas).
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
            Filtrar por estado
            <select
              value={estadoExport}
              onChange={(e) => setEstadoExport(e.target.value)}
              className="min-h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              <option value="">Todos los estados</option>
              <option value="publicado">Solo Publicado</option>
              <option value="borrador">Solo Borrador</option>
              <option value="retirado">Solo Retirado</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(["plantas", "periodos", "compatibilidades"] as const).map((tipo) => (
            <div
              key={tipo}
              className="flex flex-col justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-stone-900">
                  {ETIQUETAS_TIPO[tipo].titulo}
                </p>
                <p className="mt-1 text-xs text-stone-600">{ETIQUETAS_TIPO[tipo].descripcion}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/admin/catalogo/exportar?tipo=${tipo}${queryEstado}`}
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  Descargar CSV
                </a>
                <a
                  href={`/admin/catalogo/exportar?tipo=${tipo}&ejemplo=1`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Ejemplo
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sección 2: Importar CSV en 2 pasos */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">2. Importar archivo CSV</h2>
        <p className="mt-1 text-xs text-stone-600">
          Límites: hasta <strong>2 MB</strong> y <strong>2.000 filas</strong>. Todo lo importado
          entra o vuelve a estado <strong>Borrador</strong> para revisión antes de publicarse
          (RN-13).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
            Tipo de archivo
            <select
              value={tipoImport}
              onChange={(e) => cambiarTipo(e.target.value as TipoArchivoCsv)}
              className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900"
            >
              <option value="plantas">Plantas de servicio (plantas.csv)</option>
              <option value="periodos">Períodos por ecorregión (periodos.csv)</option>
              <option value="compatibilidades">Compatibilidades (compatibilidades.csv)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
            Archivo CSV (UTF-8)
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={alElegirArchivo}
              className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-emerald-800 hover:file:bg-emerald-100"
            />
          </label>
        </div>

        {nombreArchivo && (
          <p className="mt-2 text-xs text-stone-600">
            Archivo seleccionado: <strong>{nombreArchivo}</strong>
          </p>
        )}

        {errorArchivo && (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {errorArchivo}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!contenidoCsv || pendiente}
            onClick={verVistaPrevia}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pendiente ? "Analizando…" : "Ver vista previa"}
          </button>

          {vistaPrevia && (
            <button
              type="button"
              disabled={!puedeConfirmar}
              onClick={confirmar}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendiente ? "Importando…" : "Confirmar importación (en Borrador)"}
            </button>
          )}
        </div>

        {/* Vista previa */}
        {vistaPrevia && (
          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h3 className="text-base font-bold text-stone-900">Vista previa de la importación</h3>

            {vistaPrevia.errorGeneral && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {vistaPrevia.errorGeneral}
              </p>
            )}

            <dl className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                <dt className="text-stone-500">Altas</dt>
                <dd className="mt-0.5 text-lg font-bold text-emerald-800">
                  {vistaPrevia.altas.length}
                </dd>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                <dt className="text-stone-500">Modificaciones</dt>
                <dd className="mt-0.5 text-lg font-bold text-amber-800">
                  {vistaPrevia.modificaciones.length}
                </dd>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-2.5">
                <dt className="text-stone-500">Errores</dt>
                <dd
                  className={`mt-0.5 text-lg font-bold ${
                    vistaPrevia.errores.length > 0 ? "text-red-700" : "text-stone-700"
                  }`}
                >
                  {vistaPrevia.errores.length}
                </dd>
              </div>
            </dl>

            {vistaPrevia.errores.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-semibold text-red-900">
                  Corregí estos errores antes de confirmar (no se guardó ningún registro):
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-800">
                  {vistaPrevia.errores.map((err, i) => (
                    <li key={`${err.fila}-${i}`}>
                      <strong>Fila {err.fila}:</strong> {err.mensaje}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {vistaPrevia.altas.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                  Registros nuevos ({vistaPrevia.altas.length})
                </p>
                <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-stone-700">
                  {vistaPrevia.altas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {vistaPrevia.modificaciones.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Registros existentes que pasarán a Borrador ({vistaPrevia.modificaciones.length})
                </p>
                <ul className="mt-1 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-stone-700">
                  {vistaPrevia.modificaciones.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Resultado final */}
        {resultado && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              resultado.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {resultado.ok ? (
              <p>
                Importación aplicada en estado <strong>Borrador</strong>:{" "}
                <strong>{resultado.altasAplicadas ?? 0}</strong> altas y{" "}
                <strong>{resultado.modificacionesAplicadas ?? 0}</strong> modificaciones. Revisá y
                publicá los registros desde el catálogo cuando estén validados.
              </p>
            ) : (
              <p>{resultado.errorGeneral ?? "No se pudo completar la importación."}</p>
            )}
          </div>
        )}
      </section>

      {/* Sección 3: Formato esperado */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="text-base font-bold text-stone-900">
          Formato esperado para {ETIQUETAS_TIPO[tipoImport].titulo}
        </h2>
        <p className="mt-1 text-xs text-stone-600">
          Separador: coma (<code>,</code>), codificación UTF-8. Valores múltiples en{" "}
          <code>funciones</code> y rangos de semanas van separados por punto y coma (<code>;</code>
          ), por ejemplo <code>40-52;1-4</code> para períodos que cruzan fin de año.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3">
          <code className="break-words text-xs text-stone-800">
            {COLUMNAS_POR_TIPO[tipoImport].join(", ")}
          </code>
        </div>
      </section>
    </div>
  );
}
