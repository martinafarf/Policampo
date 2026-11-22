// ¿Hay que mostrar todo quieto? Sí cuando la persona pidió "reducir movimiento" en su sistema, y también
// en navegadores automatizados (capturas de pantalla, tests), para que vean la página ya terminada.
export function sinAnimaciones(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver;
}
