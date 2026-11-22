// Pantalla compartida para ver el último diagnóstico o uno del historial (Esp. 04, §5.2, §5.3, §6).
// Cumple CA-04-12 ("Cómo se calculó") y CA-04-17 (accesible sin depender solo del color + 360 px).
import Link from "next/link";
import { VistaPreviaDibujo } from "@/app/fincas/[id]/VistaPreviaDibujo";
import {
  BENEFICIOS_DIAGNOSTICO,
  ETIQUETAS_NIVEL_RIESGO,
  ICONOS_NIVEL_RIESGO,
  construirExplicacionCalculo,
  construirTextoAlerta,
  formatearNumeroEsAr,
  obtenerMensajeNivelRiesgo,
  type NivelRiesgo,
} from "@/dominio/diagnostico";
import type { DiagnosticoNormalizado } from "@/dominio/diagnostico/entrada";
import { hectareasAMetrosCuadrados } from "@/dominio/establecimientos";
import { BotonSolicitarDiagnostico } from "./BotonSolicitarDiagnostico";

interface Props {
  establecimientoId: string;
  nombreEstablecimiento: string;
  diagnostico: DiagnosticoNormalizado;
  desactualizado: boolean;
  esHistorico?: boolean;
}

const ESTILOS_SEMAFORO: Readonly<
  Record<NivelRiesgo, { contenedor: string; insignia: string; barra: string }>
> = {
  adecuado: {
    contenedor: "border-emerald-300 bg-emerald-50 text-emerald-950",
    insignia: "bg-emerald-700 text-white",
    barra: "bg-emerald-600",
  },
  moderado: {
    contenedor: "border-amber-300 bg-amber-50 text-amber-950",
    insignia: "bg-amber-600 text-white",
    barra: "bg-amber-500",
  },
  critico: {
    contenedor: "border-red-300 bg-red-50 text-red-950",
    insignia: "bg-red-700 text-white",
    barra: "bg-red-600",
  },
};

export function formatearFechaDiagnostico(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export function VistaDiagnostico({
  establecimientoId,
  nombreEstablecimiento,
  diagnostico,
  desactualizado,
  esHistorico = false,
}: Props) {
  const estilos = ESTILOS_SEMAFORO[diagnostico.nivelRiesgo];
  const etiquetaNivel = ETIQUETAS_NIVEL_RIESGO[diagnostico.nivelRiesgo];
  const iconoNivel = ICONOS_NIVEL_RIESGO[diagnostico.nivelRiesgo];
  const mensajeBase = obtenerMensajeNivelRiesgo(
    diagnostico.nivelRiesgo,
    diagnostico.hectareasACompensar,
  );
  const fechaTexto = formatearFechaDiagnostico(diagnostico.creadoEn);

  // Escala del medidor: siempre muestra claramente las marcas del 10 % y 20 % (máximo mínimo 30 %).
  const topeMedidor = Math.max(30, Math.ceil(diagnostico.porcentajeFlores / 10) * 10);
  const anchoBarraPct = Math.min(100, (diagnostico.porcentajeFlores / topeMedidor) * 100);
  const pos10Pct = (10 / topeMedidor) * 100;
  const pos20Pct = (20 / topeMedidor) * 100;

  const compensarM2 = Math.round(hectareasAMetrosCuadrados(diagnostico.hectareasACompensar));
  const pasosCalculo = construirExplicacionCalculo(diagnostico);

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/fincas/${establecimientoId}`}
          className="font-semibold text-emerald-800 hover:underline"
        >
          ← Volver a {nombreEstablecimiento}
        </Link>
        {esHistorico ? (
          <Link
            href={`/fincas/${establecimientoId}/diagnostico/historial`}
            className="font-medium text-stone-600 hover:underline"
          >
            · Historial
          </Link>
        ) : null}
      </nav>

      {/* Encabezado y etiqueta histórica */}
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-stone-900">Diagnóstico agroecológico</h1>
          {esHistorico ? (
            <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-semibold text-stone-800">
              Diagnóstico del {fechaTexto}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-stone-600">
          {nombreEstablecimiento} · Calculado el {fechaTexto}
        </p>
      </header>

      {/* Aviso de desactualizado (Esp. 04, §5.3, CA-04-10) */}
      {!esHistorico && desactualizado ? (
        <section
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm font-medium text-amber-950">
            ⚠️ Este diagnóstico es del <strong>{fechaTexto}</strong>. La finca cambió después:
            actualizalo para ver el estado actual.
          </p>
          <div className="shrink-0">
            <BotonSolicitarDiagnostico
              establecimientoId={establecimientoId}
              texto="Actualizar diagnóstico"
              variante="alerta"
            />
          </div>
        </section>
      ) : null}

      {/* 1. Semáforo accesible (color + texto + ícono, CA-04-17) */}
      <section className={`rounded-xl border p-4 sm:p-5 ${estilos.contenedor}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${estilos.insignia}`}
          >
            <span aria-hidden>{iconoNivel}</span>
            <span>Nivel {etiquetaNivel}</span>
          </span>
          <span className="text-lg font-bold">
            {formatearNumeroEsAr(diagnostico.porcentajeFlores, 1, 1)} % con flores
          </span>
        </div>
        <p className="mt-2.5 text-sm font-medium">{mensajeBase}</p>

        {/* 2. Medidor del % con flores con marcas del 10 % y 20 % */}
        <div className="mt-4">
          <div
            role="progressbar"
            aria-valuenow={diagnostico.porcentajeFlores}
            aria-valuemin={0}
            aria-valuemax={20}
            aria-label={`${formatearNumeroEsAr(diagnostico.porcentajeFlores, 1, 1)} % de 20 % recomendado`}
            className="relative h-4 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-stone-300"
          >
            <div
              className={`h-full rounded-full transition-all ${estilos.barra}`}
              style={{ width: `${anchoBarraPct}%` }}
            />
            <span
              aria-hidden
              title="10 % (umbral moderado)"
              className="absolute inset-y-0 w-0.5 bg-stone-700/70"
              style={{ left: `${pos10Pct}%` }}
            />
            <span
              aria-hidden
              title="20 % recomendado"
              className="absolute inset-y-0 w-0.5 bg-emerald-900"
              style={{ left: `${pos20Pct}%` }}
            />
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] font-semibold text-stone-700">
            <span className="absolute left-0">0 %</span>
            <span
              className="absolute -translate-x-1/2"
              style={{ left: `${pos10Pct}%` }}
            >
              10 %
            </span>
            <span
              className="absolute -translate-x-1/2 text-emerald-900"
              style={{ left: `${pos20Pct}%` }}
            >
              20 % rec.
            </span>
          </div>
        </div>
      </section>

      {/* 3. Números (tarjetas de 2 por fila desde 360 px, Esp. 04 §6) */}
      <section aria-labelledby="titulo-numeros-diag">
        <h2 id="titulo-numeros-diag" className="mb-3 text-lg font-bold text-stone-900">
          Resumen de superficies
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">Superficie total</dt>
            <dd className="mt-1 text-base font-bold text-stone-900">
              {formatearNumeroEsAr(diagnostico.superficieTotalHa, 4, 1)} ha
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">Cultivos</dt>
            <dd className="mt-1 text-base font-bold text-stone-900">
              {formatearNumeroEsAr(diagnostico.superficieCultivosHa, 4, 1)} ha
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">Flores y vegetación</dt>
            <dd className="mt-1 text-base font-bold text-purple-900">
              {formatearNumeroEsAr(diagnostico.superficieFloresHa, 4, 1)} ha
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">Sin asignar</dt>
            <dd className="mt-1 text-base font-bold text-stone-800">
              {formatearNumeroEsAr(diagnostico.superficieSinAsignarHa, 4, 1)} ha
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">Déficit</dt>
            <dd className="mt-1 text-base font-bold text-stone-900">
              {formatearNumeroEsAr(diagnostico.deficitPp, 1, 1)} pp
            </dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-3.5">
            <dt className="text-xs font-medium text-stone-500">A compensar</dt>
            <dd className="mt-1 text-base font-bold text-emerald-900">
              {formatearNumeroEsAr(diagnostico.hectareasACompensar, 4, 1)} ha
            </dd>
            <p className="text-xs text-stone-500">
              ({formatearNumeroEsAr(compensarM2, 0, 0)} m²)
            </p>
          </div>
        </dl>
      </section>

      {/* 4. Áreas aptas y dibujo con superficie libre rayada (Esp. 04 §4.4 y §6) */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">
          {diagnostico.areasAptas.esOpcional
            ? "Si querés sumar más biodiversidad…"
            : "Áreas aptas para intervenir"}
        </h2>

        <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700">
          {diagnostico.areasAptas.textos.map((texto) => (
            <li key={texto}>{texto}</li>
          ))}
        </ul>

        {diagnostico.perimetroM !== null ? (
          <p className="text-xs text-stone-500">
            Perímetro estimado del contorno: {formatearNumeroEsAr(diagnostico.perimetroM, 1, 1)} m.
          </p>
        ) : null}

        {diagnostico.entrada.metodo !== "cuestionario" ? (
          <VistaPreviaDibujo
            metodo={diagnostico.entrada.metodo}
            superficieTotalHa={diagnostico.superficieTotalHa}
            contorno={diagnostico.entrada.contorno ?? null}
            sectores={diagnostico.entrada.sectores}
            superficieLibre={diagnostico.superficieLibre}
          />
        ) : null}
      </section>

      {/* 5. Alertas (si hay, Esp. 04 §4.5) */}
      {diagnostico.alertas.length > 0 ? (
        <section aria-labelledby="titulo-alertas" className="flex flex-col gap-3">
          <h2 id="titulo-alertas" className="text-lg font-bold text-stone-900">
            Alertas ({diagnostico.alertas.length})
          </h2>
          <ul className="flex flex-col gap-2.5">
            {diagnostico.alertas.map((alerta, i) => {
              const { titulo, descripcion } = construirTextoAlerta(alerta);
              return (
                <li
                  key={`${alerta.tipo}-${i}`}
                  className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5"
                >
                  <p className="text-sm font-bold text-amber-950">⚠️ {titulo}</p>
                  <p className="mt-1 text-xs text-stone-700">{descripcion}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 6. Beneficios en palabras (Esp. 04 §4.6, RN-07) */}
      <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-stone-900">Beneficios de sumar flores y bordes</h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {BENEFICIOS_DIAGNOSTICO.items.map((item) => (
            <li key={item.titulo} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-sm font-bold text-emerald-900">{item.titulo}</p>
              <p className="mt-1 text-xs text-stone-700">{item.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-stone-500">{BENEFICIOS_DIAGNOSTICO.fuente}</p>
      </section>

      {/* 7. Cómo se calculó (plegable, CA-04-12, RN-07) */}
      <details className="rounded-xl border border-stone-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-stone-900">
          Cómo se calculó este diagnóstico
        </summary>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-stone-700">
          {pasosCalculo.map((paso) => (
            <li key={paso}>{paso}</li>
          ))}
        </ol>
      </details>

      {/* 8. Acciones finales (Esp. 04 §5.2, activado en Esp. 05 §6.1) */}
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/fincas/${establecimientoId}/propuestas/nueva`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            🌼 Ver propuesta de rediseño
          </Link>
          <Link
            href={`/fincas/${establecimientoId}/propuestas`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Guardadas
          </Link>
        </div>

        <Link
          href={`/fincas/${establecimientoId}/diagnostico/historial`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Historial de diagnósticos →
        </Link>
      </section>
    </div>
  );
}
