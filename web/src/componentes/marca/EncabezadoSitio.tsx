"use client";
// Encabezado del sitio. Marca en data-pagina en qué tipo de página está, y las reglas de globals.css
// deciden según eso:
// - "landing": flota sobre la foto de portada, queda fijo y muestra la navegación por secciones.
// - "cuentas" (ingresar, registro, recuperar, verificar email): no lleva esta barra.
// - "app": el resto; mismo estilo, siempre verde (no hay foto debajo) y fija arriba.
// Cuando la persona baja un poco se marca data-desplazado y la barra de la landing se pone verde.
//
// ¿Por qué con la ruta y no mirando si la página "tiene" una portada? Next.js 16 deja montadas (ocultas)
// las páginas que visitaste para volver rápido a ellas, así que la portada de la landing puede seguir en
// el documento aunque estés en /ingresar. La ruta, en cambio, siempre dice dónde estás.
//
// Es un componente de cliente porque usa la ruta actual y escucha el scroll; el contenido (logo y menú)
// llega como children desde el servidor.
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

const RUTAS_CUENTAS = ["/ingresar", "/registro", "/recuperar", "/verificar-email"];

function tipoDePagina(ruta: string): "landing" | "cuentas" | "app" {
  if (ruta === "/") return "landing";
  if (RUTAS_CUENTAS.some((r) => ruta === r || ruta.startsWith(`${r}/`))) return "cuentas";
  return "app";
}

export function EncabezadoSitio({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const ruta = usePathname();
  const tipo = tipoDePagina(ruta);

  useEffect(() => {
    const encabezado = ref.current;
    if (!encabezado) return;
    const actualizar = () => {
      // En la app no hay foto de portada debajo: la barra va siempre verde.
      encabezado.toggleAttribute("data-desplazado", tipo === "app" || window.scrollY > 24);
    };
    actualizar(); // al cambiar de página o si se abre ya desplazada (por ejemplo, con un enlace a una sección)
    window.addEventListener("scroll", actualizar, { passive: true });
    return () => window.removeEventListener("scroll", actualizar);
  }, [tipo]);

  // Las pantallas de cuentas no llevan esta barra: tienen el logo sobre la foto y su propio botón
  // (ver app/(cuentas)/layout.tsx). Repetir "Iniciar sesión" estando en Iniciar sesión era redundante.
  if (tipo === "cuentas") return null;

  return (
    <header ref={ref} className="encabezado-sitio" data-pagina={tipo}>
      {children}
    </header>
  );
}
