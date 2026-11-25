// Encabezado de las pantallas internas. Responde de un vistazo tres preguntas:
// - ¿Dónde estoy? → las "migas de pan" (Mis fincas › El Molle › Diagnóstico) y el título.
// - ¿Qué es esto? → una bajada de UNA frase (opcional) y datos cortos en chips ("4,2 ha").
// - ¿Qué hago acá? → las acciones a la derecha (en el celular, debajo): una principal como máximo.
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { IconoChevron } from "@/componentes/marca/Iconos";

export type Miga = { texto: string; href?: string };

type Props = {
  titulo: string;
  /** Camino hasta esta pantalla, sin incluirla (el título ya dice dónde estás). */
  migas?: readonly Miga[];
  /** Una sola frase que explique para qué sirve la pantalla. Si hace falta más, va en un Desplegable. */
  bajada?: string;
  /** Datos cortos que identifican lo que se está viendo: ubicación, superficie, cantidad de cultivos. */
  datos?: readonly string[];
  /** Botones (BotonEnlace / Boton). Como máximo uno con variante "principal". */
  acciones?: ReactNode;
  /**
   * Para editores a pantalla completa: título más chico, sin la ondita, y en la computadora el título y las migas
   * van en el mismo renglón (el título a la izquierda y el camino a la derecha). Ocupa unos 40 px en vez de 130.
   */
  compacto?: boolean;
};

export function EncabezadoPagina({ titulo, migas, bajada, datos, acciones, compacto = false }: Props) {
  return (
    <header className={compacto ? "flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between lg:gap-6" : "flex flex-col gap-4"}>
      {migas && migas.length > 0 && (
        <nav aria-label="Estás en" className={compacto ? "lg:order-2" : undefined}>
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.95rem] font-semibold text-tinta-suave">
            {migas.map((miga, i) => (
              <Fragment key={`${miga.texto}-${i}`}>
                <li>
                  {miga.href ? (
                    <Link href={miga.href} className="rounded-full text-hoja underline-offset-4 hover:underline">
                      {miga.texto}
                    </Link>
                  ) : (
                    miga.texto
                  )}
                </li>
                <li aria-hidden="true">
                  <IconoChevron className="h-4 w-4" />
                </li>
              </Fragment>
            ))}
            <li aria-current="page" className="text-tinta">
              {titulo}
            </li>
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 lg:order-1">
        <div className="flex min-w-0 flex-col gap-3">
          <h1
            className={
              compacto
                ? "text-2xl font-bold break-words text-bosque sm:text-3xl"
                : "titulo-onda text-3xl font-bold break-words text-bosque sm:text-4xl"
            }
          >
            {titulo}
          </h1>
          {bajada && <p className="max-w-[46ch] text-tinta-suave">{bajada}</p>}
          {datos && datos.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Datos">
              {datos.map((dato) => (
                <li
                  key={dato}
                  className="rounded-full border-[1.5px] border-borde bg-white px-3 py-1 text-sm font-semibold text-tinta-suave"
                >
                  {dato}
                </li>
              ))}
            </ul>
          )}
        </div>
        {acciones && <div className="flex flex-wrap gap-2.5">{acciones}</div>}
      </div>
    </header>
  );
}
