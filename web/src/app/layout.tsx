import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { MenuUsuario } from "@/componentes/cuentas/menu-usuario";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PoliCampo",
  description: "Sistema de apoyo a la toma de decisiones agroecológicas para fincas de Jujuy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-borde bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="text-xl font-bold text-campo-oscuro">
              🌼 PoliCampo
            </Link>
            {/* El menú depende de la sesión: se lee en el pedido, por eso va dentro de Suspense. */}
            <Suspense fallback={<span className="text-sm text-tinta-suave">…</span>}>
              <MenuUsuario />
            </Suspense>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
