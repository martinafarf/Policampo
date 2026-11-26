"use client";

// Listado interactivo de Mis fincas con buscador y filtro por estado de diagnóstico (RD-03, CA-04-18).
//
// Cada finca es UNA tarjeta que se toca entera (más fácil con el dedo que dos botoncitos): muestra su
// croquis en miniatura, dónde está, cuánto mide y en qué estado está ("Falta diagnóstico", "Crítico"...).
// El buscador y los filtros aparecen solo si hay más de 3 fincas: con pocas, solo agregan ruido.
import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { IconoFinca, IconoFlecha, IconoLupa } from "@/componentes/marca/Iconos";
import { Boton } from "@/componentes/ui/boton";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { formatearNumeroEsAr, type NivelRiesgo } from "@/dominio/diagnostico";
import type { MetodoCaracterizacion } from "@/dominio/establecimientos";
import { VistaPreviaDibujo } from "./[id]/VistaPreviaDibujo";
import type { DibujoFinca } from "./_lib/consultas";

export interface FincaEnListado {
  id: string;
  nombre: string;
  departamento: string;
  localidad: string;
  superficieTotalHa: number | null;
  metodoCaracterizacion: MetodoCaracterizacion;
  cantidadSectores: number;
  diagnostico: {
    nivelRiesgo: NivelRiesgo;
    porcentajeFlores: number;
    desactualizado: boolean;
  } | null;
  /** Para la miniatura del croquis o del mapa (null en el cuestionario, que no tiene dibujo). */
  dibujo: DibujoFinca | null;
}

type FiltroEstadoDiagnostico =
  | "todos"
  | "sin_diagnostico"
  | "adecuado"
  | "moderado"
  | "critico"
  | "desactualizado";

const FILTROS: readonly { valor: FiltroEstadoDiagnostico; texto: string }[] = [
  { valor: "todos", texto: "Todas" },
  { valor: "sin_diagnostico", texto: "Sin diagnóstico" },
  { valor: "adecuado", texto: "Adecuado" },
  { valor: "moderado", texto: "Moderado" },
  { valor: "critico", texto: "Crítico" },
  { valor: "desactualizado", texto: "Desactualizado" },
];

/** Con más fincas que esto se muestran el buscador y los filtros. */
const FINCAS_PARA_MOSTRAR_FILTROS = 3;

interface Props {
  fincas: readonly FincaEnListado[];
  /**
   * Desde Herramientas: a dónde lleva cada finca. "diagnostico" → su diagnóstico; "rediseno" → sus propuestas.
   * Sin enfoque, a la ficha de la finca.
   */
  enfoque?: EnfoqueListado | null;
}

export type EnfoqueListado = "diagnostico" | "rediseno";

const DESTINO_ENFOQUE: Readonly<Record<EnfoqueListado, { ruta: string; texto: string }>> = {
  diagnostico: { ruta: "diagnostico", texto: "Ver diagnóstico" },
  rediseno: { ruta: "propuestas", texto: "Ver propuestas de rediseño" },
};

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** El estado de la finca en una etiqueta: lo próximo que le falta, o cómo le fue en el diagnóstico. */
function EstadoFinca({ finca }: { finca: FincaEnListado }) {
  if (finca.cantidadSectores === 0) return <Etiqueta tono="ahora">Falta cargar el terreno</Etiqueta>;
  if (!finca.diagnostico) return <Etiqueta tono="ahora">Falta diagnóstico</Etiqueta>;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <BadgeNivelDiagnostico nivel={finca.diagnostico.nivelRiesgo} desactualizado={finca.diagnostico.desactualizado} />
      {!finca.diagnostico.desactualizado && (
        <span className="text-sm font-semibold text-tinta-suave">
          {formatearNumeroEsAr(finca.diagnostico.porcentajeFlores, 1)} % con flores
        </span>
      )}
    </span>
  );
}

export function ListadoFincasConFiltro({ fincas, enfoque = null }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [estadoDiag, setEstadoDiag] = useState<FiltroEstadoDiagnostico>("todos");
  const mostrarFiltros = fincas.length > FINCAS_PARA_MOSTRAR_FILTROS;

  const fincasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda);

    return fincas.filter((finca) => {
      if (termino) {
        const campos = normalizarTexto(`${finca.nombre} ${finca.localidad} ${finca.departamento}`);
        if (!campos.includes(termino)) return false;
      }

      if (estadoDiag === "sin_diagnostico") {
        return finca.diagnostico === null;
      }
      if (estadoDiag === "desactualizado") {
        return Boolean(finca.diagnostico?.desactualizado);
      }
      if (estadoDiag === "adecuado" || estadoDiag === "moderado" || estadoDiag === "critico") {
        return (
          finca.diagnostico !== null &&
          !finca.diagnostico.desactualizado &&
          finca.diagnostico.nivelRiesgo === estadoDiag
        );
      }
      return true;
    });
  }, [fincas, busqueda, estadoDiag]);

  function limpiarFiltros() {
    setBusqueda("");
    setEstadoDiag("todos");
  }

  return (
    <div className="flex flex-col gap-5">
      {mostrarFiltros && (
        <section aria-label="Buscar y filtrar fincas" className="flex flex-col gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar finca</span>
            <IconoLupa className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-tinta-suave" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o lugar"
              className="min-h-12 w-full rounded-full border-[1.5px] border-borde bg-white pr-4 pl-12 text-base outline-none placeholder:text-tinta-suave focus:border-hoja focus:ring-4 focus:ring-naranja/45"
            />
          </label>
          <div role="group" aria-label="Filtrar por diagnóstico" className="flex flex-wrap gap-2">
            {FILTROS.map((f) => {
              const activo = estadoDiag === f.valor;
              return (
                <button
                  key={f.valor}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setEstadoDiag(f.valor)}
                  className={`min-h-10 rounded-full border-[1.5px] px-4 text-[0.95rem] font-semibold transition ${
                    activo ? "border-hoja bg-hoja text-white" : "border-borde bg-white text-tinta hover:bg-menta"
                  }`}
                >
                  {f.texto}
                </button>
              );
            })}
          </div>
          {(busqueda.trim() || estadoDiag !== "todos") && (
            <p className="text-sm text-tinta-suave" aria-live="polite">
              Mostrando <strong className="text-tinta">{fincasFiltradas.length}</strong> de {fincas.length}{" "}
              fincas.
            </p>
          )}
        </section>
      )}

      {fincasFiltradas.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[28px] border-2 border-borde bg-white px-6 py-10 text-center">
          <p className="text-lg font-bold text-bosque">No hay fincas con ese filtro</p>
          <Boton variante="contorno" onClick={limpiarFiltros}>
            Ver todas mis fincas
          </Boton>
        </section>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fincasFiltradas.map((finca) => {
            const href = enfoque ? `/fincas/${finca.id}/${DESTINO_ENFOQUE[enfoque].ruta}` : `/fincas/${finca.id}`;
            const datos = [
              `${finca.localidad}, ${finca.departamento}`,
              ...(finca.superficieTotalHa !== null ? [`${formatearNumeroEsAr(finca.superficieTotalHa, 2)} ha`] : []),
            ].join(" · ");
            return (
              <li key={finca.id}>
                <Link
                  href={href}
                  className="group flex h-full items-center gap-4 rounded-[28px] border-2 border-borde bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-hoja hover:shadow-suave"
                >
                  <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-papel text-hoja sm:h-24 sm:w-24">
                    {finca.dibujo && (finca.dibujo.contorno || finca.dibujo.sectores.length > 0) ? (
                      <VistaPreviaDibujo
                        compacta
                        metodo={finca.metodoCaracterizacion}
                        superficieTotalHa={finca.superficieTotalHa}
                        contorno={finca.dibujo.contorno}
                        sectores={finca.dibujo.sectores}
                      />
                    ) : (
                      <IconoFinca className="h-9 w-9" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="font-titulos text-xl font-bold break-words text-bosque">{finca.nombre}</span>
                    <span className="text-[0.95rem] text-tinta-suave">{datos}</span>
                    <EstadoFinca finca={finca} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-hoja text-white transition group-hover:bg-hoja-oscura"
                  >
                    <IconoFlecha className="h-5 w-5" />
                  </span>
                  <span className="sr-only">{enfoque ? DESTINO_ENFOQUE[enfoque].texto : "Abrir la finca"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
