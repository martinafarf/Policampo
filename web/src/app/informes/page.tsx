// Ruta /informes: listado global "Mis informes" del usuario (Esp. 07 §5.4, CA-07-11).
import { Suspense } from "react";
import { BadgeNivelDiagnostico } from "@/componentes/diagnostico/BadgeNivelDiagnostico";
import { formatearFechaDiagnostico } from "@/componentes/diagnostico/VistaDiagnostico";
import { AccionesInforme } from "@/componentes/informe/AccionesInforme";
import { IconoDocumento, IconoFinca } from "@/componentes/marca/Iconos";
import { BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Aviso } from "@/componentes/ui/formulario";
import { Tarjeta } from "@/componentes/ui/tarjeta";
import { listarMisInformes } from "@/dominio/informe/foto";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Mis informes · PoliCampo" };

async function ContenidoMisInformes({ searchParams }: { searchParams: Promise<{ borrado?: string }> }) {
  const usuario = await requerirUsuario("/informes");
  const [{ borrado }, informes] = await Promise.all([searchParams, listarMisInformes(usuario.id)]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mis informes"
        migas={[{ texto: "Herramientas", href: "/inicio" }]}
        bajada="Los PDF de todas tus fincas, del más nuevo al más viejo."
        acciones={
          informes.length > 0 ? (
            <BotonEnlace href="/fincas" variante="contorno">
              Generar otro
            </BotonEnlace>
          ) : undefined
        }
      />

      {borrado === "1" ? <Aviso tipo="exito">Se borró el informe.</Aviso> : null}

      {informes.length === 0 ? (
        <EstadoVacio
          Icono={IconoDocumento}
          titulo="Todavía no generaste informes"
          texto="Entrá a una finca que ya tenga diagnóstico y una propuesta elegida, y tocá «Generar informe»."
          accion={<BotonEnlace href="/fincas">Ir a Mis fincas</BotonEnlace>}
        />
      ) : (
        <ul className="grid gap-5 lg:grid-cols-2">
          {informes.map((inf) => (
            <li key={inf.id}>
              <Tarjeta
                compacta
                titulo={`Informe ${inf.codigo}`}
                extra={<BadgeNivelDiagnostico nivel={inf.contenido.diagnostico.nivelRiesgo} />}
              >
                <p className="-mt-2 flex flex-wrap items-center gap-x-2 text-tinta-suave">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-tinta">
                    <IconoFinca className="h-4 w-4" />
                    {inf.establecimientoNombre}
                  </span>
                  · Generado el {formatearFechaDiagnostico(inf.emitidoEn)}
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <BotonEnlace
                    href={`/fincas/${inf.establecimientoId}/informes/${inf.id}`}
                    className="min-h-10 px-5"
                  >
                    Ver
                  </BotonEnlace>
                  <AccionesInforme
                    establecimientoId={inf.establecimientoId}
                    informeId={inf.id}
                    codigo={inf.codigo}
                    volverA="global"
                    compacto
                  />
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PaginaMisInformes({ searchParams }: { searchParams: Promise<{ borrado?: string }> }) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando tus informes…</p>}>
        <ContenidoMisInformes searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
