// Menú del encabezado: con sesión muestra Inicio, Mi perfil, Usuarios (solo administradores) y Cerrar
// sesión; sin sesión, Ingresar y Registrarse.
import Link from "next/link";
import { obtenerUsuario } from "@/lib/sesion";
import { BotonCerrarSesion } from "./boton-cerrar-sesion";

export async function MenuUsuario() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return (
      <nav className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2">
        <Link href="/ingresar" className="rounded-lg px-2 py-2 font-medium whitespace-nowrap text-campo-oscuro hover:bg-campo-claro sm:px-3">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="rounded-lg bg-campo px-3 py-2 font-medium text-white hover:bg-campo-oscuro">
          Registrarse
        </Link>
      </nav>
    );
  }
  return (
    <nav className="flex flex-wrap items-center justify-end gap-1 text-sm sm:gap-2">
      <Link href="/inicio" className="rounded-lg px-2 py-2 font-medium whitespace-nowrap text-campo-oscuro hover:bg-campo-claro sm:px-3">
        Inicio
      </Link>
      <Link href="/perfil" className="rounded-lg px-2 py-2 font-medium whitespace-nowrap text-campo-oscuro hover:bg-campo-claro sm:px-3">
        Mi perfil
      </Link>
      {usuario.rol === "administrador" && (
        <Link href="/admin/usuarios" className="rounded-lg px-2 py-2 font-medium whitespace-nowrap text-campo-oscuro hover:bg-campo-claro sm:px-3">
          Usuarios
        </Link>
      )}
      <BotonCerrarSesion />
    </nav>
  );
}
