// Ruta /tareas: vista global "Mis tareas" de todas las fincas del usuario (Esp. 06 §5.2, CA-06-12).
import { Suspense } from "react";
import { ListadoMisTareas } from "@/componentes/calendario/ListadoMisTareas";
import { IconoCalendario } from "@/componentes/marca/Iconos";
import { BotonEnlace, clasesBoton } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { obtenerHoyJujuyIso } from "@/dominio/calendario";
import { listarMisTareas } from "@/dominio/calendario/servicio";
import { requerirUsuario } from "@/lib/sesion";

export const metadata = { title: "Mis tareas · PoliCampo" };

async function ContenidoMisTareas() {
  const usuario = await requerirUsuario("/tareas");
  const hoyIso = obtenerHoyJujuyIso();
  const tareas = await listarMisTareas(usuario.id, hoyIso);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Mis tareas"
        migas={[{ texto: "Herramientas", href: "/inicio" }]}
        bajada="Lo que hay que hacer en todas tus fincas, ordenado por fecha."
        acciones={
          tareas.length > 0 ? (
            // Descarga un archivo .ics: es un enlace común (no de Next) para que el navegador lo baje
            <a href="/tareas/ics" className={clasesBoton("contorno")}>
              <IconoCalendario className="h-5 w-5" />
              Pasar a mi celular
            </a>
          ) : undefined
        }
      />

      {tareas.length === 0 ? (
        <EstadoVacio
          Icono={IconoCalendario}
          titulo="Todavía no tenés tareas"
          texto="Aparecen cuando armás el calendario de una finca, a partir de la propuesta que elegiste."
          accion={<BotonEnlace href="/fincas">Ir a Mis fincas</BotonEnlace>}
        />
      ) : (
        <ListadoMisTareas tareas={tareas} hoyIso={hoyIso} />
      )}
    </div>
  );
}

export default function PaginaMisTareas() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <Suspense fallback={<p className="text-tinta-suave">Cargando tus tareas…</p>}>
        <ContenidoMisTareas />
      </Suspense>
    </main>
  );
}
