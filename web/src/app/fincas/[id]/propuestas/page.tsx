// Ruta /fincas/[id]/propuestas: listado de propuestas guardadas de la finca (Esp. 05 §6.2).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { IconoFlor, IconoMas } from "@/componentes/marca/Iconos";
import { MenuMasPropuesta } from "@/componentes/propuesta/AccionesPropuesta";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Aviso } from "@/componentes/ui/formulario";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearNumeroEsAr } from "@/dominio/diagnostico";
import { ETIQUETAS_DISPOSICION } from "@/dominio/propuesta";
import { listarPropuestasDeFinca } from "@/dominio/propuesta/servicio";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ borrada?: string }>;
}

async function ContenidoListadoPropuestas({ params, searchParams }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/propuestas`);
  const [{ borrada }, datos] = await Promise.all([
    searchParams,
    listarPropuestasDeFinca(id, usuario.id),
  ]);

  if (!datos) {
    notFound();
  }

  const rutaFinca = `/fincas/${datos.establecimiento.id}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Propuestas"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: datos.establecimiento.nombre, href: rutaFinca },
        ]}
        bajada="Formas de sumar flores a tu finca. Elegí una para armar tu calendario y tu informe."
        acciones={
          datos.propuestas.length > 0 ? (
            <BotonEnlace href={`${rutaFinca}/propuestas/nueva`}>
              <IconoMas className="h-5 w-5" />
              Nueva propuesta
            </BotonEnlace>
          ) : undefined
        }
      />

      {borrada === "1" ? <Aviso tipo="exito">Se borró la propuesta.</Aviso> : null}

      {datos.propuestas.length === 0 ? (
        <EstadoVacio
          Icono={IconoFlor}
          titulo="Todavía no tenés propuestas"
          texto="Te mostramos dónde poner franjas de flores y qué plantas sembrar según tus cultivos."
          accion={<BotonEnlace href={`${rutaFinca}/propuestas/nueva`}>Armar mi primera propuesta</BotonEnlace>}
        />
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {datos.propuestas.map((p) => (
            <li key={p.id}>
              <Tarjeta
                compacta
                className={p.elegida ? "border-naranja" : ""}
                titulo={p.nombre ?? ETIQUETAS_DISPOSICION[p.disposicion]}
                extra={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {p.elegida ? <Etiqueta tono="ahora">Elegida</Etiqueta> : null}
                    {p.desactualizada ? <Etiqueta tono="atencion">Desactualizada</Etiqueta> : null}
                  </span>
                }
              >
                <p className="-mt-2 text-sm text-tinta-suave">
                  {p.nombre ? `${ETIQUETAS_DISPOSICION[p.disposicion]} · ` : ""}Guardada el{" "}
                  {formatearFechaDiagnostico(p.creadoEn)}
                </p>

                {/* Los datos que sirven para comparar propuestas, grandes */}
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { titulo: "Llega a", valor: `${formatearNumeroEsAr(p.porcentajeLogrado, 1, 1)} %` },
                    { titulo: "Flores nuevas", valor: `${formatearNumeroEsAr(p.superficieFranjasHa, 2, 0)} ha` },
                    {
                      titulo: "Le quita a cultivos",
                      valor: `${formatearNumeroEsAr(p.perdidaTotalCultivoHa, 2, 0)} ha`,
                    },
                  ].map((dato) => (
                    <div key={dato.titulo} className="flex flex-col gap-0.5 rounded-2xl bg-papel px-3 py-2.5">
                      <dt className="text-sm font-semibold text-tinta-suave">{dato.titulo}</dt>
                      <dd className="font-titulos text-lg font-bold text-bosque">{dato.valor}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-tinta-suave">
                    {p.especies.length === 0
                      ? "Sin plantas recomendadas"
                      : `${p.especies.length} ${p.especies.length === 1 ? "planta recomendada" : "plantas recomendadas"}`}
                  </p>
                  <div className="flex items-center gap-2">
                    <BotonEnlace href={`${rutaFinca}/propuestas/${p.id}`} className="min-h-10 px-5">
                      Ver
                    </BotonEnlace>
                    <MenuMasPropuesta
                      establecimientoId={datos.establecimiento.id}
                      propuestaId={p.id}
                      elegida={p.elegida}
                      chico
                    />
                  </div>
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaPropuestasFinca(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando propuestas…</p>}>
        <ContenidoListadoPropuestas params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
