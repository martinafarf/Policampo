// Ruta /muestrario: catálogo de las piezas comunes de las pantallas internas (componentes/ui), para
// verlas todas juntas mientras se restilizan las pantallas y para que el grupo sepa qué hay disponible.
// Solo existe en desarrollo: en producción responde "no encontrado".
import { notFound } from "next/navigation";
import { IconoFinca, IconoFlecha, IconoMas } from "@/componentes/marca/Iconos";
import { Boton, BotonEnlace } from "@/componentes/ui/boton";
import { EncabezadoPagina } from "@/componentes/ui/encabezado-pagina";
import { EstadoVacio } from "@/componentes/ui/estado-vacio";
import { Etiqueta } from "@/componentes/ui/etiqueta";
import { Aviso } from "@/componentes/ui/formulario";
import { Desplegable, MasInfo } from "@/componentes/ui/mas-info";
import { Tarjeta } from "@/componentes/ui/tarjeta";

export const metadata = { title: "Muestrario · PoliCampo", robots: { index: false } };

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t-2 border-borde pt-8">
      <h2 className="text-sm font-bold tracking-wide text-tinta-suave">{titulo}</h2>
      {children}
    </section>
  );
}

export default function PaginaMuestrario() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-6 sm:py-10">
      <EncabezadoPagina
        migas={[{ texto: "Mis fincas", href: "/fincas" }]}
        titulo="Finca El Molle"
        datos={["Perico, El Carmen", "4,2 ha", "3 cultivos"]}
        acciones={
          <>
            <BotonEnlace href="/fincas" variante="contorno">
              Editar terreno
            </BotonEnlace>
            <BotonEnlace href="/fincas">
              Pedir mi diagnóstico
              <IconoFlecha className="h-5 w-5" />
            </BotonEnlace>
          </>
        }
      />

      <Bloque titulo="Botones (una sola acción principal por pantalla)">
        <div className="flex flex-wrap gap-3">
          <Boton>Principal</Boton>
          <Boton variante="contorno">Contorno</Boton>
          <Boton variante="texto">
            Texto <IconoFlecha className="h-5 w-5" />
          </Boton>
          <Boton variante="peligro">Borrar finca</Boton>
          <Boton disabled>Deshabilitado</Boton>
        </div>
        <div className="max-w-sm">
          <Boton anchoCompleto>
            <IconoMas /> Ancho completo
          </Boton>
        </div>
      </Bloque>

      <Bloque titulo="Etiquetas de estado (siempre con texto, no solo color)">
        <div className="flex flex-wrap gap-2">
          <Etiqueta tono="listo">Listo</Etiqueta>
          <Etiqueta tono="ahora">Te toca</Etiqueta>
          <Etiqueta tono="espera">Después del paso 2</Etiqueta>
          <Etiqueta tono="atencion">Sin flores cerca</Etiqueta>
          <Etiqueta tono="error">Atrasada</Etiqueta>
        </div>
      </Bloque>

      <Bloque titulo="Tarjetas (sin tarjetas adentro de tarjetas)">
        <div className="grid gap-5 md:grid-cols-2">
          <Tarjeta
            titulo="Tareas de esta semana"
            extra={
              <BotonEnlace href="/tareas" variante="texto">
                Ver todas
              </BotonEnlace>
            }
          >
            <ul className="flex flex-col divide-y-[1.5px] divide-borde">
              <li className="flex items-center justify-between gap-2 py-3">
                Sembrar borraja <Etiqueta tono="listo">Hecha</Etiqueta>
              </li>
              <li className="flex items-center justify-between gap-2 py-3">
                Cortar flores secas <Etiqueta tono="error">Atrasada</Etiqueta>
              </li>
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Lo que sigue" tono="menta" extra={<Etiqueta tono="ahora">Te toca</Etiqueta>}>
            <p className="text-tinta-suave">Pedí el diagnóstico: te dice cuántas flores le faltan a tu finca.</p>
            <BotonEnlace href="/fincas">Pedir diagnóstico</BotonEnlace>
          </Tarjeta>
        </div>
      </Bloque>

      <Bloque titulo="Explicaciones escondidas (para no llenar la pantalla de texto)">
        <p>
          Sumá plantas de servicio
          <MasInfo sobre="plantas de servicio">
            Plantas que no se cosechan: atraen abejas y bichos que comen plagas.
          </MasInfo>
          en el borde de tus cultivos.
        </p>
        <div className="max-w-md">
          <Desplegable pregunta="¿Por qué 20 %?">
            Los estudios muestran que con al menos un 20 % de la finca con flores y vegetación natural hay
            más polinizadores y menos plagas (Garibaldi y otros).
          </Desplegable>
        </div>
      </Bloque>

      <Bloque titulo="Avisos">
        <div className="flex max-w-xl flex-col gap-3">
          <Aviso tipo="exito">Se guardó tu finca.</Aviso>
          <Aviso>El diagnóstico tarda menos de un minuto.</Aviso>
          <Aviso tipo="error">No se pudo guardar. Probá de nuevo.</Aviso>
        </div>
      </Bloque>

      <Bloque titulo="Estado vacío">
        <EstadoVacio
          Icono={IconoFinca}
          titulo="Todavía no tenés fincas"
          texto="Cargá tu finca para ver cuántas flores tiene y qué le conviene sembrar."
          accion={<BotonEnlace href="/fincas/nueva">Cargar mi primera finca</BotonEnlace>}
        />
      </Bloque>
    </main>
  );
}
