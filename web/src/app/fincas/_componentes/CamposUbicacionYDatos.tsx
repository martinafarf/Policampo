"use client";

// Campos reutilizables de datos generales del establecimiento (Esp. 02, 4.1 y 6.2).
// Al elegir departamento carga sus localidades y sugiere la ecorregión sin pisar cambios manuales.
import { useState } from "react";
import {
  ECORREGIONES,
  NOMBRES_DEPARTAMENTOS_JUJUY,
  obtenerEcorregionSugerida,
  obtenerLocalidades,
  type ClaveEcorregion,
  type NombreDepartamentoJujuy,
} from "@/datos/jujuy";
import {
  formatearMetrosCuadrados,
  parsearNumeroDecimal,
  type ErroresDatosEstablecimiento,
  type MetodoCaracterizacion,
} from "@/dominio/establecimientos";

const VALOR_OTRA_LOCALIDAD = "__OTRA__";

export interface ValoresInicialesEstablecimiento {
  nombre?: string;
  direccion?: string;
  departamento?: NombreDepartamentoJujuy | "";
  localidad?: string;
  localidadEsOtra?: boolean;
  ecorregion?: ClaveEcorregion | "";
  superficieTotalHa?: number | null;
}

interface Props {
  metodo: MetodoCaracterizacion;
  errores: ErroresDatosEstablecimiento;
  inicial?: ValoresInicialesEstablecimiento;
}

export function CamposUbicacionYDatos({ metodo, errores, inicial }: Props) {
  const [departamento, setDepartamento] = useState<NombreDepartamentoJujuy | "">(
    inicial?.departamento ?? "",
  );
  const [localidadSelect, setLocalidadSelect] = useState<string>(
    inicial?.localidadEsOtra ? VALOR_OTRA_LOCALIDAD : (inicial?.localidad ?? ""),
  );
  const [localidadOtra, setLocalidadOtra] = useState<string>(
    inicial?.localidadEsOtra ? (inicial?.localidad ?? "") : "",
  );
  const [ecorregion, setEcorregion] = useState<ClaveEcorregion | "">(inicial?.ecorregion ?? "");
  // Si el usuario elige la ecorregión a mano, no se vuelve a pisar al cambiar el departamento (Esp. 02, 6.2).
  const [ecorregionModificadaManualmente, setEcorregionModificadaManualmente] = useState<boolean>(
    Boolean(inicial?.ecorregion),
  );
  const [superficieTexto, setSuperficieTexto] = useState<string>(
    inicial?.superficieTotalHa !== null && inicial?.superficieTotalHa !== undefined
      ? String(inicial.superficieTotalHa)
      : "",
  );

  const localidades = departamento ? obtenerLocalidades(departamento) : [];
  const esOtraLocalidad = localidadSelect === VALOR_OTRA_LOCALIDAD;
  const superficieNumerica = parsearNumeroDecimal(superficieTexto);

  function manejarCambioDepartamento(nuevoDepto: string) {
    const depto = nuevoDepto as NombreDepartamentoJujuy | "";
    setDepartamento(depto);
    setLocalidadSelect("");
    setLocalidadOtra("");
    if (depto && !ecorregionModificadaManualmente) {
      setEcorregion(obtenerEcorregionSugerida(depto));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {errores.general ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errores.general}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-semibold text-stone-800">
          Nombre de la finca <span className="text-red-600">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          minLength={2}
          maxLength={150}
          defaultValue={inicial?.nombre ?? ""}
          placeholder="Ej.: Finca Los Lapachos"
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
        {errores.nombre ? <p className="text-sm text-red-700">{errores.nombre}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="direccion" className="text-sm font-semibold text-stone-800">
          Dirección o paraje <span className="text-red-600">*</span>
        </label>
        <input
          id="direccion"
          name="direccion"
          type="text"
          required
          minLength={2}
          maxLength={200}
          defaultValue={inicial?.direccion ?? ""}
          placeholder="Ej.: Ruta Provincial 47 km 4,5"
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        />
        {errores.direccion ? <p className="text-sm text-red-700">{errores.direccion}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="departamento" className="text-sm font-semibold text-stone-800">
            Departamento <span className="text-red-600">*</span>
          </label>
          <select
            id="departamento"
            name="departamento"
            required
            value={departamento}
            onChange={(e) => manejarCambioDepartamento(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          >
            <option value="">Elegí un departamento…</option>
            {NOMBRES_DEPARTAMENTOS_JUJUY.map((depto) => (
              <option key={depto} value={depto}>
                {depto}
              </option>
            ))}
          </select>
          {errores.departamento ? (
            <p className="text-sm text-red-700">{errores.departamento}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="localidad" className="text-sm font-semibold text-stone-800">
            Localidad <span className="text-red-600">*</span>
          </label>
          <select
            id="localidad"
            name="localidad"
            required
            disabled={!departamento}
            value={localidadSelect}
            onChange={(e) => setLocalidadSelect(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 disabled:bg-stone-100 disabled:text-stone-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          >
            <option value="">
              {departamento ? "Elegí una localidad…" : "Primero elegí un departamento"}
            </option>
            {localidades.map((loc) => (
              <option key={loc.nombre} value={loc.nombre}>
                {loc.nombre}
              </option>
            ))}
            {departamento ? <option value={VALOR_OTRA_LOCALIDAD}>Otra localidad…</option> : null}
          </select>
          <input type="hidden" name="localidadEsOtra" value={esOtraLocalidad ? "true" : "false"} />
          {!esOtraLocalidad && errores.localidad ? (
            <p className="text-sm text-red-700">{errores.localidad}</p>
          ) : null}
        </div>
      </div>

      {esOtraLocalidad ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="localidadOtra" className="text-sm font-semibold text-stone-800">
            Nombre de la localidad <span className="text-red-600">*</span>
          </label>
          <input
            id="localidadOtra"
            name="localidadOtra"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={localidadOtra}
            onChange={(e) => setLocalidadOtra(e.target.value)}
            placeholder="Escribí el nombre de la localidad o paraje"
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
          {errores.localidad ? <p className="text-sm text-red-700">{errores.localidad}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ecorregion" className="text-sm font-semibold text-stone-800">
          Ecorregión <span className="text-red-600">*</span>
        </label>
        <select
          id="ecorregion"
          name="ecorregion"
          required
          value={ecorregion}
          onChange={(e) => {
            setEcorregion(e.target.value as ClaveEcorregion | "");
            setEcorregionModificadaManualmente(true);
          }}
          className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
        >
          <option value="">Elegí una ecorregión…</option>
          {ECORREGIONES.map((eco) => (
            <option key={eco.clave} value={eco.clave}>
              {eco.nombre}
            </option>
          ))}
        </select>
        <p className="text-xs text-stone-500">
          Se sugiere automáticamente según el departamento, pero podés cambiarla si tu finca está en
          una zona de transición.
        </p>
        {errores.ecorregion ? <p className="text-sm text-red-700">{errores.ecorregion}</p> : null}
      </div>

      {metodo === "mapa" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <strong>Superficie total:</strong> se calcula automáticamente al dibujar el contorno de
          tu terreno en el mapa (no hace falta escribirla a mano).
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="superficieTotalHa" className="text-sm font-semibold text-stone-800">
            Superficie total (hectáreas) <span className="text-red-600">*</span>
          </label>
          <input
            id="superficieTotalHa"
            name="superficieTotalHa"
            type="text"
            inputMode="decimal"
            required
            value={superficieTexto}
            onChange={(e) => setSuperficieTexto(e.target.value)}
            placeholder="Ej.: 4,5"
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-base text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
          />
          <p className="text-xs text-stone-600">
            Entre 0,01 y 100.000 ha (hasta 4 decimales).
            {superficieNumerica !== null && superficieNumerica > 0
              ? ` Equivale a ${formatearMetrosCuadrados(superficieNumerica)}.`
              : ""}
          </p>
          {errores.superficieTotalHa ? (
            <p className="text-sm text-red-700">{errores.superficieTotalHa}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
