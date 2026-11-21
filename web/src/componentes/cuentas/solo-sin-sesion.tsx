// Para las páginas "solo sin sesión" (registro, ingresar): si ya hay sesión, va a /inicio (CA-01-18).
// No muestra nada; se pone dentro de un <Suspense> porque lee la sesión del pedido.
import { redirigirSiHaySesion } from "@/lib/sesion";

export async function SoloSinSesion() {
  await redirigirSiHaySesion();
  return null;
}
