// Tests de las plantillas de email (especificación 01, sección 6.1).
import { describe, expect, it } from "vitest";
import * as plantillas from "@/lib/email/plantillas";

const URL_EJEMPLO = "https://policampo.vercel.app/api/auth/verify-email?token=abc";

describe("plantillas de email", () => {
  it("las 6 plantillas tienen asunto, texto y HTML en español", () => {
    const todas = [
      plantillas.verificacion(URL_EJEMPLO),
      plantillas.recuperacion(URL_EJEMPLO),
      plantillas.avisoCambioContrasena(),
      plantillas.confirmarEmailNuevo(URL_EJEMPLO),
      plantillas.avisoEmailCambiado(),
      plantillas.cuentaEliminada(),
    ];
    for (const email of todas) {
      expect(email.asunto).toMatch(/^PoliCampo: /);
      expect(email.texto.length).toBeGreaterThan(20);
      expect(email.html).toContain('<html lang="es">');
    }
  });

  it("los emails con enlace lo incluyen en el texto y en el HTML, con su vencimiento", () => {
    const verificacion = plantillas.verificacion(URL_EJEMPLO);
    expect(verificacion.texto).toContain(URL_EJEMPLO);
    expect(verificacion.texto).toContain("24 horas");
    const recuperacion = plantillas.recuperacion(URL_EJEMPLO);
    expect(recuperacion.texto).toContain("1 hora");
    expect(recuperacion.html).toContain(plantillas.escaparHtml(URL_EJEMPLO));
  });

  it("escapa el HTML de los datos que entran en el email (RS-07)", () => {
    const malicioso = 'https://x.com/"><script>alert(1)</script>';
    const email = plantillas.verificacion(malicioso);
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(plantillas.escaparHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("no incluye contraseñas ni datos de las fincas (RS-05)", () => {
    const texto = JSON.stringify(plantillas.cuentaEliminada());
    expect(texto).not.toMatch(/contraseña:/i);
  });
});
