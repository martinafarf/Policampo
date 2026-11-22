import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { Suspense } from "react";
import { MenuUsuario } from "@/componentes/cuentas/menu-usuario";
import { EncabezadoSitio } from "@/componentes/marca/EncabezadoSitio";
import { LogoPoliCampo } from "@/componentes/marca/Logo";
import { NavegacionLanding } from "@/componentes/marca/NavegacionLanding";
import "./globals.css";

// Tipografías del sistema de estilos (ver globals.css):
// - Figtree: texto general, clara y amable.
// - Bricolage Grotesque: títulos, con personalidad pero seria.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PoliCampo",
  description: "Sistema de apoyo a la toma de decisiones agroecológicas para fincas de Jujuy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} ${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* En la landing flota sobre la foto y queda fijo al bajar; en las pantallas de cuentas no se muestra.
            Va dentro de Suspense porque lee la ruta (usePathname): en las páginas con partes dinámicas
            (por ejemplo /fincas/[id]) Next lo exige para poder generar la página. Mientras tanto se ve un
            encabezado mínimo con el logo. */}
        <Suspense fallback={<EncabezadoMinimo />}>
          <EncabezadoConMenu />
        </Suspense>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}

/** Encabezado provisorio, solo con el logo, mientras se resuelve la ruta. */
function EncabezadoMinimo() {
  return (
    <header className="encabezado-sitio">
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:py-4">
        <LogoPoliCampo />
      </div>
    </header>
  );
}

/** Encabezado completo: logo, navegación por secciones (solo landing) y menú de cuenta. */
function EncabezadoConMenu() {
  return (
    <EncabezadoSitio>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-3 sm:gap-x-4 sm:py-4">
        <LogoPoliCampo />
        {/* Secciones de la landing: enlaces con subrayado en pantallas anchas y menú desplegable en el
            celular. Solo se muestran en la landing (globals.css). */}
        <NavegacionLanding
          cuenta={
            <Suspense fallback={null}>
              <MenuUsuario variante="lista" />
            </Suspense>
          }
        />
        {/* El menú de cuenta depende de la sesión: se lee en el pedido, por eso va dentro de Suspense.
            En la landing en el celular se oculta, porque esas opciones ya están en el desplegable. */}
        <div className="cuenta-encabezado">
          <Suspense fallback={<span className="text-sm text-tinta-suave">…</span>}>
            <MenuUsuario />
          </Suspense>
        </div>
      </div>
    </EncabezadoSitio>
  );
}
