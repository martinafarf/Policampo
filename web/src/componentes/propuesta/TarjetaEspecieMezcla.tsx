// Tarjeta explicativa de una especie de la mezcla (Esp. 05 §5.5, CA-05-15, RN-07).
import {
  ETIQUETAS_CICLO_PLANTA,
  ETIQUETAS_FUNCION_PLANTA,
  ETIQUETAS_NIVEL_AGUA,
  ETIQUETAS_RIESGO_MALEZA,
  describirRangosEnMeses,
} from "@/dominio/catalogo";
import { IconoChevron } from "@/componentes/marca/Iconos";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import type { EspecieEnMezcla } from "@/dominio/propuesta";

interface Props {
  especie: EspecieEnMezcla;
}

export function TarjetaEspecieMezcla({ especie }: Props) {
  return (
    <article className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-borde bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-bosque">{especie.nombreComun}</h3>
          {especie.nombreCientifico ? (
            <p className="text-sm italic text-tinta-suave">{especie.nombreCientifico}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-pink-100 px-2.5 py-0.5 text-sm font-bold text-pink-900">
          {formatearNumeroEsAr(especie.proporcionPct, 1, 1)} % de la mezcla
        </span>
      </div>

      {/* Etiquetas de funciones y disponibilidad local */}
      <div className="flex flex-wrap gap-1.5 text-sm">
        {especie.funciones.map((f) => (
          <span
            key={f}
            className="rounded-full bg-menta px-2 py-0.5 font-medium text-bosque"
          >
            {ETIQUETAS_FUNCION_PLANTA[f]}
          </span>
        ))}
        <span className="rounded-full bg-papel px-2 py-0.5 font-medium text-tinta">
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

      {/* Por qué entra: compatibilidades por cultivo. Cerrado: a la vista solo para qué cultivos sirve; el texto
          largo se abre si la persona quiere leerlo (para no asustar con tanto texto). */}
      {especie.compatibilidades.length > 0 ? (
        <details className="group rounded-2xl bg-papel text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-3 py-2 hover:bg-menta [&::-webkit-details-marker]:hidden">
            <span className="flex-1">
              <span className="font-semibold text-hoja">¿Por qué se recomienda?</span>{" "}
              <span className="text-tinta-suave">
                Sirve para {especie.compatibilidades.map((c) => c.cultivoNombre).join(", ")}
              </span>
            </span>
            <IconoChevron className="h-5 w-5 shrink-0 text-hoja transition-transform group-open:rotate-90" />
          </summary>
          <ul className="space-y-1 px-3 pb-3 text-tinta">
            {especie.compatibilidades.map((c) => (
              <li key={c.cultivoId}>
                <strong>
                  {c.cultivoNombre} ({c.grado > 0 ? `+${c.grado}` : c.grado}):
                </strong>{" "}
                {c.justificacion}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Períodos en la ecorregión */}
      <dl className="grid grid-cols-1 gap-2 border-t border-borde pt-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-medium text-tinta-suave">Siembra</dt>
          <dd className="mt-0.5 font-semibold text-tinta">
            {describirRangosEnMeses(especie.siembraSemanas)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-tinta-suave">Floración</dt>
          <dd className="mt-0.5 font-semibold text-tinta">
            {describirRangosEnMeses(especie.floracionSemanas)}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-tinta-suave">Corte / manejo</dt>
          <dd className="mt-0.5 font-semibold text-tinta">
            {describirRangosEnMeses(especie.corteSemanas)}
          </dd>
        </div>
      </dl>

      {/* Agua y riesgo de maleza (solo informativos) + fuente */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-borde pt-2 text-sm text-tinta-suave">
        <span>
          Agua: <strong className="text-tinta">{ETIQUETAS_NIVEL_AGUA[especie.necesidadAgua]}</strong>
        </span>
        <span>
          Riesgo de maleza:{" "}
          <strong className="text-tinta">{ETIQUETAS_RIESGO_MALEZA[especie.riesgoMaleza]}</strong>
        </span>
        {especie.dosisSiembra ? (
          <span>
            Dosis: <strong className="text-tinta">{especie.dosisSiembra}</strong>
          </span>
        ) : null}
      </div>

      {especie.fuenteDetalle ? (
        <p className="text-sm text-tinta-suave">Fuente: {especie.fuenteDetalle}</p>
      ) : null}
    </article>
  );
}
