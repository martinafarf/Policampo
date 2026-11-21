// Verificación de sesión en el servidor para el módulo de fincas (RS-02, CA-01-18).
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export interface UsuarioSesion {
  id: string;
  nombreMostrado: string;
  rol: string;
}

export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion?.user) {
    return null;
  }
  return {
    id: sesion.user.id,
    nombreMostrado: sesion.user.name,
    rol: sesion.user.role ?? "usuario",
  };
}

export async function exigirUsuarioActual(rutaVolver: string): Promise<UsuarioSesion> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) {
    // Solo rutas internas que empiezan con "/" (RS-07, CA-01-11).
    const destinoSeguro =
      rutaVolver.startsWith("/") && !rutaVolver.startsWith("//") ? rutaVolver : "/fincas";
    redirect(`/ingresar?volver=${encodeURIComponent(destinoSeguro)}`);
  }
  return usuario;
}
