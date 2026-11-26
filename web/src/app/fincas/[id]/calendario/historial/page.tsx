// Ruta /fincas/[id]/calendario/historial: calendarios cerrados y sus tareas hechas (Esp. 06 §5.4).
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconoCalendario, IconoOk } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { formatearFechaCortaEsAr } from "@/dominio/calendario";
import { listarHistorialCalendariosDeFinca } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

interface Props {
  params: Promise<{ id: string }>;
}

async function ContenidoHistorialCalendario({ params }: Props) {
  const { id } = await params;
  const usuario = await requerirUsuario(`/fincas/${id}/calendario/historial`);
  const datos = await listarHistorialCalendariosDeFinca(id, usuario.id);

  if (!datos) {
    notFound();
  }

  const rutaFinca = `/fincas/${datos.establecimiento.id}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Temporadas anteriores"
        migas={[
          { texto: "Mis fincas", href: "/fincas" },
          { texto: datos.establecimiento.nombre, href: rutaFinca },
          { texto: "Calendario", href: `${rutaFinca}/calendario` },
        ]}
        bajada="Las temporadas que ya cerraste y las tareas que marcaste como hechas."
      />

      {datos.calendarios.length === 0 ? (
        <EstadoVacio
          Icono={IconoCalendario}
          titulo="Todavía no hay temporadas anteriores"
          texto="Cuando termine la temporada actual, la vas a encontrar acá."
          accion={<BotonEnlace href={`${rutaFinca}/calendario`}>Ir al calendario</BotonEnlace>}
        />
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {datos.calendarios.map((c) => (
            <li key={c.id}>
              <Tarjeta
                compacta
                titulo={`${formatearFechaCortaEsAr(c.temporadaInicio)} al ${formatearFechaCortaEsAr(c.temporadaFin)}`}
                extra={
                  <Etiqueta tono={c.tareasHechas.length === c.totalTareasAccionables ? "listo" : "espera"} conIcono={false}>
                    {c.tareasHechas.length} de {c.totalTareasAccionables} hechas
                  </Etiqueta>
                }
              >
                {c.tareasHechas.length === 0 ? (
                  <p className="text-tinta-suave">No quedaron tareas marcadas como hechas.</p>
                ) : (
                  <ul className="flex flex-col divide-y-[1.5px] divide-borde">
                    {c.tareasHechas.map((t) => (
                      <li key={t.id} className="flex items-start gap-2.5 py-2.5">
                        <IconoOk className="mt-0.5 h-5 w-5 shrink-0 text-hoja" />
                        <div>
                          <p className="font-semibold text-tinta">{t.titulo}</p>
                          <p className="text-sm text-tinta-suave">
                            Hecha el {t.hechaEn ? formatearFechaCortaEsAr(t.hechaEn) : ""}
                            {t.nota ? ` · ${t.nota}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaHistorialCalendario(props: Props) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando temporadas…</p>}>
        <ContenidoHistorialCalendario params={props.params} />
      </Suspense>
    </main>
  );
}
