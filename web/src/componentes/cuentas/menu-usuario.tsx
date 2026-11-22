// Menú del encabezado: con sesión muestra Inicio, Mi perfil y Cerrar sesión; sin sesión, Ingresar y Registrarse.
import Link from "next/link";
import { obtenerUsuario } from "@/lib/sesion";
import { BotonCerrarSesion } from "./boton-cerrar-sesion";

export async function MenuUsuario() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/ingresar" className="rounded-lg px-3 py-2 font-medium text-campo-oscuro hover:bg-campo-claro">
          Iniciar sesión
        </Link>
        <Link href="/registro" className="rounded-lg bg-campo px-3 py-2 font-medium text-white hover:bg-campo-oscuro">
          Registrarse
        </Link>
      </nav>
    );
  }
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link href="/inicio" className="rounded-lg px-3 py-2 font-medium text-campo-oscuro hover:bg-campo-claro">
        Inicio
      </Link>
      <Link href="/perfil" className="rounded-lg px-3 py-2 font-medium text-campo-oscuro hover:bg-campo-claro">
        Mi perfil
      </Link>
      <BotonCerrarSesion />
    </nav>
  );
}
