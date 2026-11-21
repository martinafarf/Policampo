// Sesión del usuario en páginas y acciones del servidor (especificación 01, regla RS-02).
//
// - obtenerUsuario(): el usuario con sesión, o null.
// - requerirUsuario(volver): el usuario con sesión; si no hay, redirige a /ingresar?volver=...
// - requerirAdministrador(): como requerirUsuario, pero si no es administrador responde 404.
//
// Con Cache Components (Next.js 16), todo componente que llame a estas funciones tiene que estar
// dentro de un <Suspense>: leen las cookies del pedido. En las acciones del servidor no hace falta.
import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type UsuarioActual = {
  id: string;
  /** Nombre real si lo cargó en el perfil; si no, el nombre de usuario. */
  nombreParaMostrar: string;
  usuario: string;
  rol: "usuario" | "administrador";
};

export async function obtenerUsuario(): Promise<UsuarioActual | null> {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion) return null;
  const u = sesion.user as typeof sesion.user & {
    nombre?: string | null;
    apellido?: string | null;
    displayUsername?: string | null;
    username?: string | null;
    role?: string | null;
  };
  const usuario = u.displayUsername || u.username || u.name;
  const nombreReal = [u.nombre, u.apellido].filter(Boolean).join(" ");
  return {
    id: u.id,
    nombreParaMostrar: nombreReal || usuario,
    usuario,
    rol: u.role === "administrador" ? "administrador" : "usuario",
  };
}

export async function requerirUsuario(volver: string): Promise<UsuarioActual> {
  const actual = await obtenerUsuario();
  if (!actual) redirect(`/ingresar?volver=${encodeURIComponent(volver)}`);
  return actual;
}

export async function requerirAdministrador(): Promise<UsuarioActual> {
  const actual = await obtenerUsuario();
  // Sin sesión o sin rol: para un no administrador, las rutas de administración no existen (CA-01-19).
  if (!actual || actual.rol !== "administrador") notFound();
  return actual;
}

/** Para las páginas "solo sin sesión" (ingresar, registro): con sesión, van a /inicio (CA-01-18). */
export async function redirigirSiHaySesion(): Promise<void> {
  if (await obtenerUsuario()) redirect("/inicio");
}

/** IP del pedido, para los límites de intentos. En Vercel, x-forwarded-for la pone la plataforma. */
export async function ipDelPedido(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
}
