// Pantalla compartida para ver el último diagnóstico o uno del historial (Esp. 04, §5.2, §5.3, §6).
// Cumple CA-04-12 ("Cómo se calculó") y CA-04-17 (accesible sin depender solo del color + 360 px).
//
// Pensada para que se entienda de un vistazo (DESIGN.md, el dato primero):
// 1. Arriba a la izquierda, el resultado grande ("6,4 % con flores"), el nivel con palabras y qué falta, con UNA
//    acción principal: ver cómo sumar flores (la propuesta de rediseño).
// 2. Al lado, el dibujo con el lugar libre donde se pueden poner flores.
// 3. Debajo, solo 3 números a la vista; los demás, escondidos en «Ver más números».
// 4. Lo que conviene revisar (alertas) en un desplegable debajo de los números.
// 5. Los beneficios y «¿Cómo se calculó?» al final, para quien quiera leer más.
import {
  BENEFICIOS_DIAGNOSTICO,
  construirExplicacionCalculo,
  construirTextoAlerta,
  formatearNumeroEsAr,
} from "@/dominio/diagnostico";
import type { DiagnosticoNormalizado } from "@/dominio/diagnostico/entrada";
import { hectareasAMetrosCuadrados } from "@/dominio/establecimientos";
import { VistaPreviaDibujo } from "@/app/fincas/[id]/VistaPreviaDibujo";
import { IconoAlerta, IconoChevron, IconoFlor, IconoLupa, IconoOk } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { Desplegable, MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { BadgeNivelDiagnostico } from "./BadgeNivelDiagnostico";
import { BotonSolicitarDiagnostico } from "./BotonSolicitarDiagnostico";

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
  diagnostico: DiagnosticoNormalizado;
  desactualizado: boolean;
  esHistorico?: boolean;
}

/** La meta de flores que usa el diagnóstico (Garibaldi y otros). */
const META_FLORES = 20;

// Un ícono para cada beneficio, en el mismo orden que BENEFICIOS_DIAGNOSTICO (polinizadores, control, suelo).
const ICONOS_BENEFICIOS = [IconoFlor, IconoLupa, IconoOk];

export function formatearFechaDiagnostico(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

/** Hectáreas con hasta 2 decimales ("0,61 ha"): en pantalla no hace falta más precisión. */
function ha(valor: number): string {
  return `${formatearNumeroEsAr(valor, 2, 0)} ha`;
}

export function VistaDiagnostico({
  establecimientoId,
  nombreEstablecimiento,
  diagnostico,
  desactualizado,
  esHistorico = false,
}: Props) {
  const fechaTexto = formatearFechaDiagnostico(diagnostico.creadoEn);
  const llegaALaMeta = diagnostico.hectareasACompensar <= 0;

  // La barra llega hasta un poco más que la meta, así la marca del 20 % se ve siempre (y si pasa, se nota).
  const topeBarra = Math.max(30, Math.ceil(diagnostico.porcentajeFlores / 10) * 10);
  const posMeta = (META_FLORES / topeBarra) * 100;
  const anchoBarra = Math.min(100, (diagnostico.porcentajeFlores / topeBarra) * 100);

  const compensarM2 = Math.round(hectareasAMetrosCuadrados(diagnostico.hectareasACompensar));
  const pasosCalculo = construirExplicacionCalculo(diagnostico);
  const rutaFinca = `/fincas/${establecimientoId}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={esHistorico ? "Diagnóstico guardado" : "Diagnóstico"}
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: nombreEstablecimiento, href: rutaFinca },
          ...(esHistorico ? [{ texto: "Historial", href: `${rutaFinca}/diagnostico/historial` }] : []),
        ]}
        datos={[`Calculado el ${fechaTexto}`]}
        acciones={
          esHistorico ? undefined : (
            <BotonEnlace href={`${rutaFinca}/diagnostico/historial`} variante="contorno">
              Ver diagnósticos anteriores
            </BotonEnlace>
          )
        }
      />

      {/* Aviso de desactualizado (Esp. 04, §5.3, CA-04-10) */}
      {!esHistorico && desactualizado ? (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-[28px] border-2 border-[#f3d3a3] bg-[#fff3df] p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2.5 text-[#7a4100]">
            <IconoAlerta className="mt-0.5 h-5 w-5 shrink-0" />
            <span>
              Cambiaste tu finca después de este diagnóstico. <strong>Actualizalo</strong> para ver cómo está ahora.
            </span>
          </p>
          <div className="shrink-0">
            <BotonSolicitarDiagnostico establecimientoId={establecimientoId} texto="Actualizar diagnóstico" />
          </div>
        </section>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Columna izquierda: el resultado y los números */}
        <div className="flex flex-col gap-5">
          {/* 1. El resultado (color + palabras + ícono, CA-04-17) */}
          <Tarjeta
            compacta
            titulo="Flores en tu finca"
            extra={
              <span className="flex items-center gap-1.5">
                <BadgeNivelDiagnostico nivel={diagnostico.nivelRiesgo} />
                <MasInfo sobre={`por qué el ${META_FLORES} %`}>
                  Con al menos un {META_FLORES} % de la finca con flores y vegetación natural llegan más abejas y
                  bichos que se comen las plagas, y mejoran las cosechas (Garibaldi y otros).
                </MasInfo>
              </span>
            }
          >
            <p className="flex items-baseline gap-2">
              <strong className="font-titulos text-4xl font-extrabold text-bosque">
                {formatearNumeroEsAr(diagnostico.porcentajeFlores, 1, 1)} %
              </strong>
              <span className="text-tinta-suave">con flores</span>
            </p>

            {/* Barra: cuánto hay (naranja) y dónde está la meta del 20 % (marca bosque) */}
            <div className="relative pt-6">
              <span
                aria-hidden="true"
                className="absolute top-0 -translate-x-1/2 text-xs font-bold whitespace-nowrap text-bosque"
                style={{ left: `${posMeta}%` }}
              >
                Meta {META_FLORES} %
              </span>
              <div
                role="progressbar"
                aria-valuenow={diagnostico.porcentajeFlores}
                aria-valuemin={0}
                aria-valuemax={META_FLORES}
                aria-label={`${formatearNumeroEsAr(diagnostico.porcentajeFlores, 1, 1)} % con flores, de ${META_FLORES} % recomendado`}
                className="h-4 overflow-hidden rounded-full bg-menta"
              >
                <div className="h-full rounded-full bg-naranja" style={{ width: `${anchoBarra}%` }} />
              </div>
              <span
                aria-hidden="true"
                className="absolute top-5 bottom-[-4px] w-[3px] -translate-x-1/2 rounded-full bg-bosque"
                style={{ left: `${posMeta}%` }}
              />
            </div>

            <p className="font-titulos text-lg font-bold text-bosque">
              {llegaALaMeta
                ? "Tu finca ya tiene las flores recomendadas."
                : `Te faltan ${ha(diagnostico.hectareasACompensar)} de flores para llegar a la meta.`}
            </p>

            {!esHistorico ? (
              <div className="flex flex-wrap items-center gap-2">
                <BotonEnlace href={`${rutaFinca}/propuestas/nueva`} className="min-h-11 px-5">
                  {llegaALaMeta ? "Ver ideas para sumar más flores" : "Ver cómo sumar flores"}
                </BotonEnlace>
                <BotonEnlace href={`${rutaFinca}/propuestas`} variante="texto" className="min-h-11">
                  Propuestas guardadas
                </BotonEnlace>
              </div>
            ) : null}
          </Tarjeta>

          {/* 2. Solo 3 números a la vista (Esp. 04 §6); el resto, en «Ver más números» */}
          <Tarjeta compacta titulo="Tu superficie">
            <dl className="grid grid-cols-3 gap-3">
              {[
                { titulo: "Total", valor: ha(diagnostico.superficieTotalHa) },
                { titulo: "Cultivos", valor: ha(diagnostico.superficieCultivosHa) },
                { titulo: "Flores", valor: ha(diagnostico.superficieFloresHa) },
              ].map((dato) => (
                <div key={dato.titulo} className="flex flex-col gap-0.5 rounded-2xl bg-papel px-3 py-3">
                  <dt className="text-sm font-semibold text-tinta-suave">{dato.titulo}</dt>
                  <dd className="font-titulos text-xl font-bold text-bosque">{dato.valor}</dd>
                </div>
              ))}
            </dl>
            <Desplegable pregunta="Ver más números">
              <dl className="flex flex-col divide-y-[1.5px] divide-borde">
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt>Sin cargar (ni cultivo ni flores)</dt>
                  <dd className="font-semibold text-tinta">{ha(diagnostico.superficieSinAsignarHa)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt>Flores que faltan para el {META_FLORES} %</dt>
                  <dd className="text-right font-semibold text-tinta">
                    {ha(diagnostico.hectareasACompensar)}
                    <span className="block text-sm font-normal text-tinta-suave">
                      {formatearNumeroEsAr(compensarM2, 0, 0)} m²
                    </span>
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt>Diferencia con la meta</dt>
                  <dd className="font-semibold text-tinta">
                    {formatearNumeroEsAr(diagnostico.deficitPp, 1, 1)} puntos
                  </dd>
                </div>
                {diagnostico.perimetroM !== null ? (
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt>Borde de la finca (aproximado)</dt>
                    <dd className="font-semibold text-tinta">
                      {formatearNumeroEsAr(diagnostico.perimetroM, 0, 0)} m
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Desplegable>
          </Tarjeta>

          {/* 3. Lo que conviene revisar (Esp. 04 §4.5): cerrado, con la cantidad a la vista. Mismo formato que
              un Desplegable, pero en el tono de "atención" (naranja suave) para que se note que hay algo para ver. */}
          {diagnostico.alertas.length > 0 ? (
            <details className="group rounded-2xl border-[1.5px] border-[#f3d3a3] bg-[#fff3df]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 font-semibold text-[#7a4100] hover:bg-[#ffe9c7] [&::-webkit-details-marker]:hidden">
                <IconoAlerta className="h-5 w-5 shrink-0" />
                <span className="flex-1">Para revisar ({diagnostico.alertas.length})</span>
                <IconoChevron className="h-5 w-5 shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <ul className="flex flex-col gap-3 px-4 pt-1 pb-4">
                {diagnostico.alertas.map((alerta, i) => {
                  const { titulo, descripcion } = construirTextoAlerta(alerta);
                  return (
                    <li key={`${alerta.tipo}-${i}`} className="flex flex-col gap-1 rounded-2xl bg-white p-3.5">
                      <p className="font-bold text-[#7a4100]">{titulo}</p>
                      <p className="text-[0.95rem] text-tinta">{descripcion}</p>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>

        {/* Columna derecha: dónde poner las flores (Esp. 04 §4.4 y §6) */}
        <Tarjeta
          titulo={diagnostico.areasAptas.esOpcional ? "Si querés sumar más flores" : "Dónde podés sumar flores"}
        >
          <ul className="flex flex-col gap-2.5 text-tinta">
            {diagnostico.areasAptas.textos.map((texto) => (
              <li key={texto} className="flex items-start gap-2.5">
                <IconoFlor className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
                {texto}
              </li>
            ))}
          </ul>
          {diagnostico.entrada.metodo !== "cuestionario" ? (
            <VistaPreviaDibujo
              metodo={diagnostico.entrada.metodo}
              superficieTotalHa={diagnostico.superficieTotalHa}
              contorno={diagnostico.entrada.contorno ?? null}
              sectores={diagnostico.entrada.sectores}
              superficieLibre={diagnostico.superficieLibre}
              claseAlto="h-64 sm:h-80"
              cuadrada
            />
          ) : null}
        </Tarjeta>
      </div>

      {/* 4. Beneficios en palabras (Esp. 04 §4.6, RN-07) */}
      <Tarjeta titulo="Qué ganás sumando flores" tono="menta">
        <ul className="grid gap-3 sm:grid-cols-3">
          {BENEFICIOS_DIAGNOSTICO.items.map((item, i) => {
            const Icono = ICONOS_BENEFICIOS[i] ?? IconoFlor;
            return (
              <li key={item.titulo} className="flex flex-col gap-2 rounded-2xl bg-white p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-menta text-hoja">
                  <Icono className="h-5 w-5" />
                </span>
                <p className="font-bold text-bosque">{item.titulo}</p>
                <p className="text-[0.95rem] text-tinta-suave">{item.texto}</p>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-tinta-suave">{BENEFICIOS_DIAGNOSTICO.fuente}</p>
      </Tarjeta>

      {/* 5. Cómo se calculó (plegable, CA-04-12, RN-07) */}
      <Desplegable pregunta="¿Cómo se calculó este diagnóstico?">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          {pasosCalculo.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </Desplegable>
    </div>
  );
}
