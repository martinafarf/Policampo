// Tarjeta explicativa de una especie de la mezcla (Esp. 05 §5.5, CA-05-15, RN-07).
import {
  ETIQUETAS_CICLO_PLANTA,
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_RIESGO_MALEZA,
  describirRangosEnMeses,
} from "@/dominio/catalogo";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import type { EspecieEnMezcla } from "@/dominio/propuesta";

interface Props {
  especie: EspecieEnMezcla;
}

export function TarjetaEspecieMezcla({ especie }: Props) {
  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-stone-900">{especie.nombreComun}</h3>
          {especie.nombreCientifico ? (
            <p className="text-xs italic text-stone-500">{especie.nombreCientifico}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-bold text-pink-900">
          {formatearNumeroEsAr(especie.proporcionPct, 1, 1)} % de la mezcla
        </span>
      </div>

      {/* Etiquetas de funciones y disponibilidad local */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {especie.funciones.map((f) => (
          <span
            key={f}
            className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800"
          >
            {ETIQUETAS_FUNCION_PLANTA[f]}
          </span>
        ))}
        <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-stone-700">
          {ETIQUETAS_CICLO_PLANTA[especie.ciclo]}
        </span>
        {especie.esEspontanea ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
            Flora espontánea
          </span>
        ) : null}
        {especie.enMercadoLocal ? (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-900">
            Disponible en mercado local
          </span>
        ) : null}
      </div>

      {/* Por qué entra: compatibilidades por cultivo */}
      {especie.compatibilidades.length > 0 ? (
        <div className="rounded-lg bg-stone-50 p-2.5 text-xs">
          <p className="font-semibold text-stone-800">Por qué se recomienda:</p>
          <ul className="mt-1 space-y-1 text-stone-700">
            {especie.compatibilidades.map((c) => (
              <li key={c.cultivoId}>
                <strong>
                  {c.cultivoNombre} ({c.grado > 0 ? `+${c.grado}` : c.grado}):
                </strong>{" "}
                {c.justificacion}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Períodos en la ecorregión */}
      <dl className="grid grid-cols-1 gap-2 border-t border-stone-100 pt-2 text-xs sm:grid-cols-3">
        <div>
          <dt className="font-medium text-stone-500">Siembra</dt>
          <dd className="mt-0.5 font-semibold text-stone-800">
            {describirRangosEnMeses(especie.siembraSemanas)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Floración</dt>
          <dd className="mt-0.5 font-semibold text-stone-800">
            {describirRangosEnMeses(especie.floracionSemanas)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-stone-500">Corte / manejo</dt>
          <dd className="mt-0.5 font-semibold text-stone-800">
            {describirRangosEnMeses(especie.corteSemanas)}
          </dd>
        </div>
      </dl>

      {/* Agua y riesgo de maleza (solo informativos) + fuente */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-100 pt-2 text-xs text-stone-600">
        <span>
          Agua: <strong className="text-stone-800">{ETIQUETAS_NIVEL_AGUA[especie.necesidadAgua]}</strong>
        </span>
        <span>
          Riesgo de maleza:{" "}
          <strong className="text-stone-800">{ETIQUETAS_RIESGO_MALEZA[especie.riesgoMaleza]}</strong>
        </span>
        {especie.dosisSiembra ? (
          <span>
            Dosis: <strong className="text-stone-800">{especie.dosisSiembra}</strong>
          </span>
        ) : null}
      </div>

      {especie.fuenteDetalle ? (
        <p className="text-[11px] text-stone-500">Fuente: {especie.fuenteDetalle}</p>
      ) : null}
    </article>
  );
}
