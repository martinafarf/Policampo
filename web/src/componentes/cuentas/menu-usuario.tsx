// Menú del encabezado: con sesión muestra "Inicio" (la landing), "Herramientas" (el panel con fincas, guía,
// diagnóstico, etc.), "Tareas" (con un número si hay atrasadas o en curso) y un círculo de perfil (MenuPerfil) que abre una
// tarjeta con el nombre, Mi perfil, Usuarios (solo administradores) y Cerrar sesión; sin sesión,
// Ingresar y Registrarse.
//
// Dos variantes:
// - "pildora" (por defecto): en la barra de arriba, sin fondo; sobre la foto de la landing los enlaces
//   pasan a blanco (clases texto-encabezado y hover-encabezado, reglas en globals.css).
// - "lista": botones a lo ancho, para el menú desplegable de la landing en el celular.
import Link from "next/link";
import { contarTareasParaHacerAhora } from "@/dominio/calendario/servicio";
import { obtenerUsuario } from "@/lib/sesion";
import { BotonCerrarSesion } from "./boton-cerrar-sesion";
import { ContadorTareas, EnlacesPrincipales } from "./enlaces-principales";
import { MenuPerfil } from "./menu-perfil";

const PILDORA = "flex flex-wrap items-center justify-end gap-1 text-[0.95rem] sm:gap-2";
const LINK =
  "texto-encabezado hover-encabezado inline-flex min-h-10 items-center rounded-full px-2.5 font-semibold whitespace-nowrap text-bosque hover:bg-menta sm:px-3";

const LISTA = "flex flex-col gap-2";
const LINK_LISTA = "flex min-h-12 items-center rounded-2xl px-4 font-semibold text-tinta hover:bg-papel";
const BOTON_LISTA =
  "flex min-h-12 items-center justify-center rounded-full border-2 px-5 font-bold transition hover:-translate-y-0.5";

export async function MenuUsuario({ variante = "pildora" }: { variante?: "pildora" | "lista" }) {
  const usuario = await obtenerUsuario();
  // Tareas atrasadas o en curso: se marcan con un número junto a "Tareas".
  const tareasAhora = usuario ? await contarTareasParaHacerAhora(usuario.id) : 0;

  if (variante === "lista") {
    if (!usuario) {
      return (
        <div className={LISTA}>
          <Link href="/ingresar" className={`${BOTON_LISTA} border-hoja text-hoja`}>
            Iniciar sesión
          </Link>
          <Link href="/registro" className={`${BOTON_LISTA} border-transparent bg-hoja text-white hover:bg-hoja-oscura`}>
            Registrarse
          </Link>
        </div>
      );
    }
    return (
      <nav className={LISTA} aria-label="Cuenta">
        <Link href="/" className={LINK_LISTA}>
          Inicio
        </Link>
        <Link href="/inicio" className={LINK_LISTA}>
          Herramientas
        </Link>
        <Link href="/tareas" className={`${LINK_LISTA} justify-between`}>
          Tareas
          <ContadorTareas cantidad={tareasAhora} />
        </Link>
        <Link href="/perfil" className={LINK_LISTA}>
          Mi perfil
        </Link>
        {usuario.rol === "administrador" && (
          <Link href="/admin/usuarios" className={LINK_LISTA}>
            Usuarios
          </Link>
        )}
        <BotonCerrarSesion />
      </nav>
    );
  }

  if (!usuario) {
    return (
      <nav className={PILDORA} aria-label="Cuenta">
        {/* En el celular dice "Ingresar" (más corto) para que el menú entre en la misma línea que el logo. */}
        <Link href="/ingresar" className={LINK}>
          <span className="sm:hidden">Ingresar</span>
          <span className="max-sm:hidden">Iniciar sesión</span>
        </Link>
        <Link
          href="/registro"
          className="boton-registro-encabezado inline-flex min-h-10 items-center rounded-full bg-hoja px-3 font-semibold sm:px-4 whitespace-nowrap text-white hover:bg-hoja-oscura"
        >
          Registrarse
        </Link>
      </nav>
    );
  }
  return (
    <nav className={PILDORA} aria-label="Principal">
      <EnlacesPrincipales tareasAhora={tareasAhora} />
      <MenuPerfil
        nombre={usuario.nombreParaMostrar}
        usuario={usuario.usuario}
        esAdministrador={usuario.rol === "administrador"}
      />
    </nav>
  );
}
