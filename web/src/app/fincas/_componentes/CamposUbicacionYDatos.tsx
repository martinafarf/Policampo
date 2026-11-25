"use client";

// Campos reutilizables de datos generales del establecimiento (Esp. 02, 4.1 y 6.2).
// Al elegir departamento carga sus localidades y sugiere la ecorregión sin pisar cambios manuales.
import { useState } from "react";
import { IconoAlerta } from "@/componentes/marca/Iconos";
import { Aviso } from "@/componentes/ui/formulario";
import { MasInfo } from "@/componentes/ui/mas-info";
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
          className="rounded-2xl border-[1.5px] border-[#f5c2bd] bg-error-claro px-4 py-3 text-[0.95rem] font-semibold text-error"
        >
          {errores.general}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-[0.95rem] font-semibold text-tinta">
          Nombre de la finca
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
          className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
        />
        {errores.nombre ? <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.nombre}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="direccion" className="text-[0.95rem] font-semibold text-tinta">
          Dirección o paraje
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
          className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
        />
        {errores.direccion ? <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.direccion}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="departamento" className="text-[0.95rem] font-semibold text-tinta">
            Departamento
          </label>
          <select
            id="departamento"
            name="departamento"
            required
            value={departamento}
            onChange={(e) => manejarCambioDepartamento(e.target.value)}
            className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
          >
            <option value="">Elegí un departamento…</option>
            {NOMBRES_DEPARTAMENTOS_JUJUY.map((depto) => (
              <option key={depto} value={depto}>
                {depto}
              </option>
            ))}
          </select>
          {errores.departamento ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.departamento}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="localidad" className="text-[0.95rem] font-semibold text-tinta">
            Localidad
          </label>
          <select
            id="localidad"
            name="localidad"
            required
            disabled={!departamento}
            value={localidadSelect}
            onChange={(e) => setLocalidadSelect(e.target.value)}
            className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45 disabled:cursor-not-allowed disabled:opacity-60"
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
            <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.localidad}</p>
          ) : null}
        </div>
      </div>

      {esOtraLocalidad ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="localidadOtra" className="text-[0.95rem] font-semibold text-tinta">
            Nombre de la localidad
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
            className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
          />
          {errores.localidad ? <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.localidad}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ecorregion" className="text-[0.95rem] font-semibold text-tinta">
          Ecorregión
          <MasInfo sobre="la ecorregión">
            La zona natural de Jujuy donde está tu finca, por ejemplo Valles templados. Sirve para elegir plantas
            que se den bien en tu zona.
          </MasInfo>
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
          className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
        >
          <option value="">Elegí una ecorregión…</option>
          {ECORREGIONES.map((eco) => (
            <option key={eco.clave} value={eco.clave}>
              {eco.nombre}
            </option>
          ))}
        </select>
        <p className="text-sm text-tinta-suave">
          La elegimos según el departamento. Cambiala si tu finca está entre dos zonas.
        </p>
        {errores.ecorregion ? <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.ecorregion}</p> : null}
      </div>

      {metodo === "mapa" ? (
        <Aviso>La superficie se calcula sola cuando marques el borde de tu finca en el mapa.</Aviso>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="superficieTotalHa" className="text-[0.95rem] font-semibold text-tinta">
            Superficie total de la finca (hectáreas)
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
            className="min-h-12 w-full rounded-2xl border-[1.5px] border-borde bg-papel px-4 text-base text-tinta outline-none transition hover:border-[#b9cbae] focus:border-hoja focus:bg-white focus:ring-4 focus:ring-naranja/45"
          />
          <p className="text-sm text-tinta-suave">
            En hectáreas, por ejemplo 4,5.
            {superficieNumerica !== null && superficieNumerica > 0
              ? ` Son ${formatearMetrosCuadrados(superficieNumerica)}.`
              : ""}
          </p>
          {errores.superficieTotalHa ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-error"><IconoAlerta className="h-4 w-4 shrink-0" />{errores.superficieTotalHa}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
