import type { NextConfig } from "next";

// Encabezados HTTP de seguridad (regla RS-14, auditoría M-06), en todas las respuestas.
// Se exportan para testearlos (tests/seguridad/encabezados.test.ts). Van acá porque next.config.ts
// no puede importar otros archivos TypeScript del proyecto.
//
// Content-Security-Policy: le dice al navegador de dónde puede cargar cada cosa. Solo del propio
// sitio, salvo las imágenes satelitales del mapa (Esri). Se usa 'unsafe-inline' en los scripts
// porque Next.js agrega pequeños scripts dentro de cada página; la alternativa (nonces) obliga a
// generar todas las páginas en cada visita (decisión de Integrante 3 en la T8). El riesgo de
// inyectar scripts ya lo cubre React, que escapa todo lo que escribe el usuario (RS-07).

/** Imágenes satelitales del editor de mapa (módulo 02). */
const ORIGEN_MAPA = "https://server.arcgisonline.com";
/** Barra de comentarios de Vercel: solo en las vistas previas, nunca en producción. */
const ORIGEN_VERCEL_LIVE = "https://vercel.live";

type Entorno = { desarrollo: boolean; vistaPrevia: boolean };

export function politicaDeContenido({ desarrollo, vistaPrevia }: Entorno): string {
  const extraVistaPrevia = vistaPrevia ? ` ${ORIGEN_VERCEL_LIVE}` : "";
  const directivas = [
    "default-src 'self'",
    // 'unsafe-eval' solo en desarrollo: React lo usa para mostrar mejor los errores.
    `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""}${extraVistaPrevia}`,
    // Leaflet (el mapa) posiciona sus piezas con estilos en línea.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${ORIGEN_MAPA}${extraVistaPrevia}`,
    "font-src 'self'",
    `connect-src 'self'${extraVistaPrevia}`,
    `frame-src ${vistaPrevia ? ORIGEN_VERCEL_LIVE : "'none'"}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // nadie puede meter PoliCampo dentro de otra página (clickjacking)
  ];
  // En local el sitio es http://localhost: forzar https rompería la carga.
  if (!desarrollo) directivas.push("upgrade-insecure-requests");
  return directivas.join("; ");
}

export function encabezadosDeSeguridad(entorno: Entorno): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: politicaDeContenido(entorno) },
    // El navegador usa siempre https durante 2 años (Vercel ya sirve todo por https).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Frame-Options", value: "DENY" }, // lo mismo que frame-ancestors, para navegadores viejos
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Ubicación solo para el propio sitio (el mapa puede centrar en "mi ubicación"); el resto, nada.
    { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  ];
}

const nextConfig: NextConfig = {
  // Encabezados de seguridad en todas las respuestas (regla RS-14).
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: encabezadosDeSeguridad({
          desarrollo: process.env.NODE_ENV === "development",
          vistaPrevia: process.env.VERCEL_ENV === "preview",
        }),
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@react-pdf/renderer"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
