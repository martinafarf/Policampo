"use client";
// Botón de arriba a la derecha en las pantallas de cuentas (que no tienen barra superior).
// Ofrece "el otro camino": en Iniciar sesión, Registrarse; en el resto (registro, recuperar contraseña,
// verificar email), Iniciar sesión. Así no repite la pantalla en la que ya estás.
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccesoAlternativo() {
  const ruta = usePathname();
  const enIngresar = ruta === "/ingresar";
  const destino = enIngresar ? { href: "/registro", texto: "Registrarse" } : { href: "/ingresar", texto: "Iniciar sesión" };
  return (
    <Link
      href={destino.href}
      className="inline-flex min-h-11 items-center rounded-full border-2 border-hoja px-5 font-bold text-hoja transition hover:-translate-y-0.5 hover:bg-hoja hover:text-white"
    >
      {destino.texto}
    </Link>
  );
}
