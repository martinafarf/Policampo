# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Productores de Jujuy** (pequeños y medianos, cultivos intensivos: frutilla, durazno, tomate, pimiento, palta).
  Usan el sistema desde el celular, muchas veces en el campo y al sol. Necesitan entender rápido qué ganan y
  registrarse sin fricción.
- **Ingenieros agrónomos** que asesoran fincas. Valoran el respaldo científico, diagnósticos ordenados e informes
  técnicos para compartir.

Ambos tienen el mismo rol ("Usuario") y los mismos permisos. Existe además el rol Administrador.

## Product Purpose

Sistema web de apoyo a la toma de decisiones agroecológicas. Permite registrar fincas y cultivos (formulario,
croquis o mapa), obtener un diagnóstico de biodiversidad, recibir una propuesta de rediseño con franjas/corredores
florales y plantas de servicio, planificar un calendario agroecológico y descargar informes técnicos.
Éxito: que el productor rediseñe su finca para llegar al menos al 20 % de superficie con hábitat natural.

## Positioning

Traduce la ciencia de paisajes agrícolas multifuncionales (Garibaldi et al.: al menos 20 % de hábitat natural)
en un plan concreto para una finca puntual de Jujuy: dónde poner las franjas florales, qué especies de servicio
son compatibles con el cultivo y cuándo sembrar, mantener y esperar la floración.

## Operating Context

- Uso móvil en el campo, con luz fuerte; también escritorio para ingenieros que preparan informes.
- Región: Jujuy / NOA (valles, quebrada, yungas).
- Proyecto grupal universitario (Facultad de Ingeniería, UNJu). Stack de la v2: Next.js + Tailwind en `web/`,
  desplegado en Vercel.
- Interfaz en español rioplatense (voseo).

## Capabilities and Constraints

- Alcance del rediseño visual actual (2026-11-22): **landing pública + pantallas de cuentas** (ingresar, registro,
  recuperar, verificar email). El resto de la app (fincas, diagnóstico, propuestas, informes, admin) se mantiene;
  el sistema de estilos debe poder extenderse a ella más adelante.
- Botones y campos de 44 px de alto como mínimo; una columna desde 360 px.
- Datos personales cuidados según Ley 25.326.
- El equipo no contrata servicios pagos: la infraestructura usa planes gratuitos (Neon, Vercel).
- La cuenta de PoliCampo **no es gratuita** (hay pagos/suscripción, módulo de otro integrante): nunca decir
  "gratis" ni "gratuito" en la interfaz ni en textos de venta.

## Brand Commitments

- Nombre: PoliCampo. No hay logotipo definido (hoy se usa un emoji 🌼).
- Estética pedida por el equipo: agroecológica, natural y fresca, que combine fotos reales con formas e
  ilustraciones animadas. Referencias en `docs/diseno/`.
- Preferencia confirmada (2026-11-22): el lenguaje estándar de las webs agro/ambientales (foto a sangre, bordes
  ondulados, formas orgánicas, ilustración de paisaje), ejecutado con la calidad de las referencias de
  `docs/diseno/`. Las direcciones conceptuales (feria, tejido, figuritas) se descartaron por «poco serias».

## Evidence on Hand

- Fotos actuales: `web/public/img/portada.jpg` (pradera con flores), `abeja.jpg`, `frutilla.jpg`, `huerta.jpg`.
  Se pueden sumar fotos de licencia libre (Unsplash/Pexels) de cultivos, flores y paisaje del NOA.
- Referencia científica: "Paisajes agrícolas multifuncionales: de la ciencia a la práctica" (Garibaldi, Zermoglio,
  Oddi, Andreoni).
- No hay testimonios, clientes, métricas de uso ni logos de instituciones aliadas: no inventarlos.

## Product Principles

1. Claridad antes que adorno: el productor tiene que entender el beneficio en segundos, desde el celular.
2. Ciencia aplicada, no abstracta: cada promesa se ancla en la finca concreta del usuario.
3. Lo vivo como protagonista: flores, polinizadores y biodiversidad son el contenido, no decoración.
4. Respeto por el trabajo de campo: lenguaje cercano (voseo), sin jerga innecesaria.

## Accessibility & Inclusion

- Legible a pleno sol: contraste alto, texto de cuerpo de 16 px o más.
- Objetivos táctiles de 44 px o más; navegación por teclado y lectores de pantalla en formularios.
- Respetar `prefers-reduced-motion` en todas las animaciones.
