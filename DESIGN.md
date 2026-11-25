---
name: PoliCampo
description: Apoyo a decisiones agroecológicas para fincas de Jujuy, con el lenguaje visual del rubro jugado derecho.
colors:
  bosque: "#003300"
  hoja: "#597931"
  hoja-oscura: "#465f26"
  naranja: "#ff9900"
  naranja-claro: "#ffad33"
  naranja-oscuro: "#b35f00"
  turquesa: "#00cc99"
  menta: "#e3f6ef"
  menta-fuerte: "#c2ebdc"
  papel: "#f5f9f2"
  fondo: "#f5f9f2"
  tinta: "#0f220f"
  tinta-suave: "#45573a"
  borde: "#d3e0cc"
  error: "#b42318"
  error-claro: "#fdecea"
  campo: "#597931"
  campo-oscuro: "#465f26"
  campo-claro: "#e3f6ef"
  flor: "#b35f00"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 6vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3.5vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  campo: "16px"
  panel: "24px"
  tarjeta: "28px"
  arco: "999px 999px 28px 28px"
  pildora: "999px"
spacing:
  gutter: "16px"
  gap: "24px"
  bloque: "48px"
  seccion: "96px"
  seccion-amplia: "112px"
  contenedor: "72rem"
components:
  button-primary:
    backgroundColor: "{colors.hoja}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.hoja-oscura}"
  button-naranja:
    backgroundColor: "{colors.naranja}"
    textColor: "{colors.bosque}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "48px"
  button-naranja-hover:
    backgroundColor: "{colors.naranja-claro}"
  button-contorno:
    backgroundColor: "transparent"
    textColor: "{colors.hoja}"
    rounded: "{rounded.pildora}"
    padding: "0 24px"
    height: "48px"
  input:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.campo}"
    padding: "0 16px"
    height: "48px"
  input-error:
    backgroundColor: "{colors.error-claro}"
    textColor: "{colors.tinta}"
  chip-cultivo:
    backgroundColor: "{colors.menta}"
    textColor: "{colors.bosque}"
    rounded: "{rounded.pildora}"
    padding: "8px 16px"
  card-borde:
    backgroundColor: "#ffffff"
    rounded: "{rounded.tarjeta}"
    padding: "24px"
  card-menta:
    backgroundColor: "{colors.menta}"
    rounded: "{rounded.tarjeta}"
    padding: "40px"
  card-superpuesta:
    backgroundColor: "#ffffff"
    rounded: "{rounded.panel}"
    padding: "40px"
  nav-encabezado:
    backgroundColor: "transparent"
    textColor: "{colors.bosque}"
    rounded: "{rounded.pildora}"
    padding: "0 12px"
    height: "40px"
  insignia-habitat:
    backgroundColor: "{colors.turquesa}"
    textColor: "{colors.bosque}"
    rounded: "{rounded.pildora}"
    size: "160px"
---

# Design System: PoliCampo

## Overview

**Creative North Star: "La finca que florece"**

PoliCampo habla el idioma visual estándar de la web agroecológica, sin ironía ni atajos: foto real de campo a sangre que ocupa toda la primera pantalla, secciones que se unen con bordes ondulados, fotos dentro de marcos en arco y un paisaje ilustrado al cierre. El sistema es claro y luminoso (blanco y menta sobre todo), con el verde bosque casi negro como peso tipográfico, el oliva como color de acción sobre fondo claro y dos acentos de la paleta elegida por la usuaria: naranja cálido (acción sobre la foto, resaltados, foco) y turquesa fresco (insignia del 20 %, brotes, selección).

La densidad es generosa y pensada para el celular al aire libre: texto base de 17 px, controles de 48 px de alto, una columna en pantallas chicas. Lo propio del mundo es mostrar el mecanismo con una foto real: un corredor floral en el borde de un cultivo, con una tarjeta blanca superpuesta que explica la meta del 20 % de hábitat natural. Los íconos y el logo son dibujos SVG propios de trazo único; no hay emojis.

El movimiento es lento y orgánico (olas que se desplazan, una insignia que gira, hojas que flotan, nubes que cruzan, brotes que se mecen, apariciones suaves al hacer scroll, un subrayado que sigue a la sección actual) y desaparece por completo con "reducir movimiento".

**Key Characteristics:**
- Foto real a sangre de pantalla completa con velo verde muy oscuro y titular blanco, con la última frase en naranja.
- Encabezado sin fondo que flota sobre la foto en blanco y, al bajar, toma fondo verde bosque con el texto en blanco.
- Bordes ondulados entre secciones y entre foto y formulario.
- Fotos en marcos de arco (medio punto arriba, esquinas de 28 px abajo).
- Todo lo accionable es píldora; todo lo contenedor tiene esquinas de 24 a 28 px.
- Íconos SVG propios de trazo 2 px con puntas redondeadas, en `currentColor`.
- Subrayado ondulado naranja bajo los títulos de sección en lugar de etiquetas sobre el título.

## Colors

Cuatro colores de marca (verde muy oscuro, oliva, naranja y turquesa) sobre fondos casi blancos y bandas menta, con tonos derivados para hover, texto y fondos suaves.

### Primary
- **Oliva Hoja** (hoja): el color de acción sobre fondos claros: botón principal, "Registrarse" del menú (fuera de la foto), borde y texto del botón contorno, borde de foco de campos, marcas numeradas y camino punteado de los pasos, subrayado de sección con el encabezado blanco, "Estás acá". Texto blanco encima con contraste 5,0:1.
- **Oliva Oscuro** (hoja-oscura): estado hover de toda acción en oliva.
- **Verde Bosque** (bosque): títulos h1–h3 fuera de la foto, logo y menú sobre fondo claro, texto de chips, pie de página como fondo sólido, y todo texto que va sobre naranja o turquesa. Sus tonos oscuros tiñen los velos (`rgb(0 34 0)` en portada y cuentas, `rgb(0 51 0)` en las tarjetas en arco) y las sombras.

### Secondary
- **Naranja** (naranja): acento cálido. Botón principal sobre la foto ("Crear cuenta" / "Ir a Inicio") y "Registrarse" del encabezado mientras flota sobre la foto, siempre con texto bosque (6,7:1); última frase del titular ("mejores cosechas") y "más flores" en cuentas; subrayado ondulado de títulos; anillo de foco (`:focus-visible`) y halo de foco de campos al 45 %; subrayado de sección sobre la foto; el logo (abeja y palabra); hoja flotante de portada; línea florida del paisaje.
- **Naranja Claro** (naranja-claro): hover del botón naranja.
- **Naranja Oscuro** (naranja-oscuro): el naranja para texto sobre fondo claro (4,6:1). Reservado; hoy solo lo usa el alias `flor`.

### Tertiary
- **Turquesa** (turquesa): acento fresco. Insignia circular del 20 % (con texto bosque, 6,9:1), brotes del paisaje y `::selection` (con texto bosque).

### Neutral
- **Menta** (menta): turquesa muy aclarado. Bandas suaves con borde ondulado, banda detrás de la foto del corredor floral, chips, aviso de éxito, hover de enlaces y fila de la sección actual en el menú desplegable.
- **Menta Fuerte** (menta-fuerte): bloque de respaldo científico (al 60 %), borde del aviso de éxito.
- **Papel** (papel) / **Fondo** (fondo): fondo de la app y relleno de campos en reposo. La landing usa blanco puro como lienzo.
- **Tinta** (tinta): texto general, casi negro con un toque de bosque.
- **Tinta Suave** (tinta-suave): bajadas, textos de apoyo, ayudas de campo.
- **Borde** (borde): contornos de tarjetas, campos y botones secundarios.
- **Error** (error) / **Error Claro** (error-claro): texto y fondo de errores de formulario y avisos de error.

### Alias heredados
`campo`, `campo-oscuro`, `campo-claro`, `fondo`, `tinta`, `tinta-suave`, `borde`, `flor`, `error` y `error-claro` vienen de la versión anterior y los siguen usando las pantallas de otros módulos; solo cambiaron sus valores. `campo` = hoja, `campo-oscuro` = hoja-oscura, `campo-claro` = menta, `fondo` = papel, `flor` = naranja-oscuro (antes era rosa). Las pantallas nuevas usan los nombres de marca.

### Named Rules
**The Una Acción Rule.** Sobre fondo claro la acción es oliva con texto blanco; sobre foto oscura es naranja con texto bosque. Ningún otro color pinta un botón principal.

**The Texto Bosque Rule.** Naranja y turquesa, cuando son fondo, llevan siempre texto bosque. Nunca van como texto chico sobre fondo claro: para eso existe naranja oscuro.

## Typography

**Display Font:** Bricolage Grotesque (con system-ui)
**Body Font:** Figtree (con system-ui)

**Character:** Bricolage aporta un grotesco con carácter, apretado (-0,02 a -0,03 em) y en peso alto; Figtree es redonda y amable, legible al sol.

### Hierarchy
- **Display** (800, 2,6 rem a 4,5 rem, 1,02): titular de portada, blanco sobre foto, cada frase en su línea.
- **Headline** (700, 1,875 rem a 2,6 rem, 1,08): títulos de sección en bosque, con `text-wrap: balance` y subrayado ondulado.
- **Title** (700, 1,25 rem): títulos de tarjeta y de paso.
- **Body** (400, 1,0625 rem, 1,6): texto general; bajadas acotadas a 42–46 ch.
- **Body Small** (400, 0,95 rem): textos de tarjetas, avisos, pie.
- **Label** (600, 0,95 rem): etiquetas de campo, chips, enlaces del menú y de sección.

### Named Rules
**The Onda en Vez de Etiqueta Rule.** Los títulos de sección se marcan con el subrayado ondulado naranja de 64 × 10 px debajo, nunca con una etiqueta chica en mayúsculas encima.

## Layout

Contenedor centrado de 72 rem con margen lateral de 16 px. La portada ocupa toda la pantalla (`min-h-svh`, que descuenta la barra del navegador del celular). Las secciones respiran con 96–112 px verticales; los grupos internos se separan con 48 px y las grillas con 24 px. Qué es: foto del corredor floral en las columnas 1–8 y tarjeta blanca en las 7–12 de la misma fila, superpuestas. Beneficios: 1 → 2 → 4 columnas, con las columnas pares bajadas 64 px en pantallas anchas para un ritmo escalonado. Pasos: lista vertical unida por una línea punteada en el celular, fila de cuatro con línea punteada horizontal desde 768 px. Las pantallas de cuentas no tienen barra superior: son una grilla de dos mitades que ocupa toda la pantalla (foto de alto completo, fija al bajar, con el logo en blanco arriba y el borde ondulado vertical de arriba abajo | formulario de hasta 420 px con un único botón contorno arriba a la derecha: "Registrarse" en Iniciar sesión, "Iniciar sesión" en las demás); en el celular la foto queda como franja superior con borde ondulado horizontal.

El encabezado (logo y menú sin fondo) es fijo en la landing, donde flota sobre la foto de portada con un degradado oscuro de 160 px arriba para que se lea, y no aparece en las pantallas de cuentas; al bajar más de 24 px toma fondo verde bosque al 97 % con sombra (no blanco: una barra blanca se confundía con las secciones blancas). En el resto de la app queda arriba sin seguir al scroll, porque esas pantallas tienen mapas y barras fijas propias. En la landing, desde 1024 px hay enlaces a las secciones con un subrayado que se desliza a la sección actual; debajo de 1024 px, un menú desplegable que muestra la sección actual y reúne también las opciones de cuenta. Breakpoints: los de Tailwind (640, 768, 1024 px).

## Elevation & Depth

Sistema mayormente plano, con sombras verde bosque difusas que levantan solo lo flotante: los círculos de los pasos, las fotos y tarjetas superpuestas, el panel del menú desplegable y el encabezado al bajar. La profundidad grande la dan las fotos con velo y las capas de ola, no las sombras.

### Shadow Vocabulary
- **Sombra chica** (`0 4px 14px -6px rgb(0 51 0 / 0.25)`): círculos de paso y respuesta de hover de botones.
- **Sombra suave** (`0 14px 34px -16px rgb(0 51 0 / 0.35)`): tarjetas de foto en arco, la foto del corredor floral, su tarjeta superpuesta y el panel del menú desplegable.
- **Sombra de encabezado** (`0 8px 24px -12px rgb(0 51 0 / 0.6)`): solo el encabezado verde al bajar.

### Named Rules
**The Sombra Verde Rule.** Las sombras de caja se tiñen de bosque y se abren hacia abajo con extensión negativa; nunca grises ni duras.

**The Levantar al Pasar Rule.** Botones y tarjetas de foto responden al hover subiendo (2 px los botones, 8 px las tarjetas) y ganando sombra.

## Shapes

Pocas formas: la píldora (999 px) para todo lo accionable y las etiquetas; la tarjeta de 28 px para contenedores (24 px en la tarjeta superpuesta y el panel del menú); el arco (medio punto arriba, 28 px abajo) para fotos, con arcos más bajos en el celular. Los campos y las filas del menú desplegable usan 16 px. Los círculos de los pasos son manchas orgánicas asimétricas. Los límites entre secciones son olas SVG, no líneas rectas. Los bordes de contenedor son de 2 px en `borde`; los de campo, de 1,5 px.

## Components

### Buttons
Píldoras firmes y amables, de 48 px de alto, texto en negrita.
- **Shape:** píldora (999 px), borde de 2 px.
- **Primary:** oliva con texto blanco, 24 px de relleno lateral; hover a oliva oscuro, sube 2 px y gana sombra chica.
- **Naranja (sobre foto):** naranja con texto bosque; hover a naranja claro.
- **Claro (sobre foto):** borde blanco al 85 %, fondo blanco al 10 %, texto blanco.
- **Contorno:** borde y texto oliva sobre transparente; hover a fondo blanco.
- **Envío de formulario:** ancho completo, deshabilitado al 55 % de opacidad con texto "Enviando…". Variante secundaria blanca con borde `borde`.
- **Focus:** anillo naranja de 3 px separado 3 px.

### Chips
- **Style:** menta con texto bosque, 600, píldora con 8 × 16 px de relleno. Solo informativos (cultivos).

### Cards / Containers
- **Tarjeta con borde:** blanco, 28 px, borde de 2 px `borde`, 20–24 px de relleno, sin sombra.
- **Tarjeta menta:** menta (o menta fuerte al 60 %), 28 px, 40–64 px de relleno, sin borde ni sombra.
- **Tarjeta de foto en arco:** foto a sangre en arco con velo inferior bosque al 90 % y texto blanco; sombra suave; al pasar, sube 8 px y la foto se acerca al 105 %.

### Inputs / Fields
- **Style:** 48 px de alto, 16 px de radio, borde de 1,5 px `borde`, fondo papel, etiqueta 600 arriba.
- **Focus:** borde oliva, fondo blanco y halo naranja al 45 % de 4 px.
- **Error:** borde error, fondo error claro, mensaje 600 en error con ícono de alerta.
- **Contraseña:** botón "Ver/Ocultar" al lado, misma altura y radio, texto oliva.

### Avisos
Caja de 16 px de radio con borde de 1,5 px e ícono de trazo a la izquierda: info (blanco, borde), éxito (menta, texto bosque), error (error claro, texto error).

### Navigation
- **Encabezado:** sin fondo ni píldoras. Sobre la foto de la landing (antes de bajar) logo, enlaces y menú van en blanco con una sombra de texto suave; al bajar, la barra se pone verde bosque y todo sigue en blanco ("Registrarse" en naranja con texto bosque). En las demás pantallas de la app van en bosque sobre fondo claro; las de cuentas no tienen encabezado (el logo va en blanco sobre su foto). El tipo de página se decide por la ruta (`data-pagina`), no por el contenido, porque Next deja montadas ocultas las páginas visitadas.
- **Logo:** una abeja de trazo y "Policampo" en letra cursiva (Tropika Script), todo en naranja y en un solo SVG (la palabra viene convertida en trazos: no se carga la fuente). Sobre foto lleva una sombra suave (`drop-shadow`). La abeja sola (`SimboloPoliCampo`) es el ícono de la pestaña (favicon).
- **Menú de cuenta:** enlaces de 40 px de alto en bosque con hover menta (sobre la foto: blancos con hover blanco al 15 %); "Registrarse" en píldora oliva llena, que pasa a naranja con texto bosque mientras flota sobre la foto; "Cerrar sesión" con borde `borde` (blanco al 70 % sobre la foto). En el celular, "Ingresar" en lugar de "Iniciar sesión".
- **Enlaces de sección (landing, desde 1024 px):** texto 600, blanco sobre la foto y sobre la barra verde, con un subrayado de 3 px que se desliza (posición y ancho, 0,5 s) hasta la sección actual: naranja en los dos casos.
- **Menú desplegable (landing, debajo de 1024 px):** reemplaza al menú de cuenta. El botón muestra el nombre de la sección actual (o "Menú"), que entra con un subrayado que se dibuja de izquierda a derecha, junto a un círculo menta con el ícono de tres líneas (blanco al 18 % sobre la foto). El panel es blanco, de 24 px de radio y sombra suave: filas de 48 px con la sección actual en menta, subrayada en oliva y marcada "Estás acá"; abajo, separadas por una línea, las opciones de cuenta como botones píldora a lo ancho. Se cierra con Escape o tocando afuera.

### Onda (borde ondulado)
Ola SVG de 70 px de alto, dibujada al doble de ancho y desplazada en bucle (18 s; la segunda ola, opcional, a 28 s y 50 % de opacidad). Toma el color de la sección vecina.

### Foto con tarjeta superpuesta (corredor floral)
Foto real a lo ancho de 8 columnas con esquinas de 28 px y sombra suave; una tarjeta blanca de 24 px de radio ocupa las columnas 7 a 12 de la misma fila y se superpone a la foto. Detrás, una banda menta con borde ondulado arriba y abajo. En el celular la foto va a lo ancho y la tarjeta sube 40 px sobre su borde inferior. El crédito de la foto va en el pie de página.

### Insignia del 20 %
Círculo turquesa con el texto en círculo girando (26 s) y "20 %" en Bricolage 800 bosque al centro.

### Paisaje ilustrado
Cierre de la landing: lomas en tres capas de oliva, una línea punteada naranja como franja florida, nubes blancas que cruzan (40 y 60 s) y brotes turquesa que se mecen (3,5 s). Solo decoración.

## Pantallas internas de la app

Las pantallas con sesión (Herramientas, fincas, diagnóstico, propuestas, calendario, informes, perfil, administración) usan el mismo lenguaje que la landing pero más tranquilo: sin fotos grandes de fondo, fondo papel con tarjetas blancas. El objetivo es que se entiendan sin conocer la plataforma, pensando en un productor que entra por primera vez desde el celular. Las piezas comunes están en `web/src/componentes/ui/` y se pueden ver juntas en `/muestrario` (solo en desarrollo).

- **EncabezadoPagina:** migas de pan ("Mis fincas › El Molle"), título con subrayado ondulado, una bajada de una frase como máximo, datos cortos en chips ("4,2 ha") y las acciones a la derecha (debajo en el celular).
- **Boton / BotonEnlace:** píldoras de 48 px. `principal` (oliva), `contorno`, `texto` (enlace sin borde) y `peligro` (rojo, solo para borrar). `Boton` hace algo en la página; `BotonEnlace` lleva a otra.
- **Tarjeta:** blanca o menta, 28 px de radio, borde de 2 px, título h2 opcional con un extra a la derecha ("Ver todas").
- **Etiqueta:** estados `listo`, `ahora` ("Te toca"), `espera` (con candado: falta un paso anterior), `atencion` y `error`. Siempre con texto y, salvo `ahora`, con ícono.
- **EstadoVacio:** ícono en círculo menta, una frase de qué falta y un botón que lo resuelve.
- **Desplegable / MasInfo:** esconden la explicación hasta que alguien la busca. `Desplegable` es una pregunta que se abre debajo ("¿Por qué 20 %?"); `MasInfo` es un ⓘ al lado de una palabra técnica que abre una burbuja de una o dos frases.
- **Aviso:** el de `componentes/ui/formulario.tsx` (info, éxito, error).

### Named Rules
**The Una Acción Principal Rule.** Cada pantalla tiene como máximo un botón `principal`. Lo demás va en `contorno` o `texto`.

**The Sin Tarjeta en Tarjeta Rule.** Dentro de una tarjeta no van otras tarjetas: las filas se separan con líneas finas y los grupos, con espacio.

**The Dónde Estoy Rule.** Toda pantalla interna dice dónde está la persona (migas o título) y cómo volver.

## Reglas de escritura

Mucho texto intimida a los productores. Antes de escribir un texto, preguntarse si se puede mostrar en vez de explicar.

- **El dato primero.** "7 % de flores · Bajo · Te falta sumar 0,5 ha" antes que un párrafo. La explicación va en un `Desplegable` o `MasInfo`.
- **Tutear y frases cortas.** Una idea por oración, unas 15 palabras como máximo. "Cargá tu finca", no "Registre su establecimiento".
- **Botones con verbo y resultado.** "Pedir mi diagnóstico", "Ver cómo mejorarlo"; no "Continuar" ni "Aceptar" solos.
- **Palabras del campo.** "Flores", "borde del cultivo", "bichos que comen plagas". Los términos técnicos ("plantas de servicio", "hábitat natural") llevan un `MasInfo` la primera vez que aparecen en la pantalla.
- **Estados que dicen qué hacer.** "Te toca", "Después del paso 2", "Sin flores cerca"; no solo "Pendiente".
- **Pantallas vacías con salida.** Una frase y un botón: "Todavía no tenés fincas" → "Cargar mi primera finca".
- **Lo obligatorio no se borra, se ordena.** Los textos legales (Ley 25.326), las confirmaciones antes de borrar y lo que pide cada especificación se mantienen, con títulos y partes desplegables.

## Do's and Don'ts

### Do:
- **Do** usar oliva con texto blanco para la acción sobre fondo claro y naranja con texto bosque sobre foto.
- **Do** poner texto bosque sobre cualquier fondo naranja o turquesa.
- **Do** unir secciones de distinto fondo con la Onda, y separar foto de formulario con borde ondulado.
- **Do** poner las fotos en marco de arco y los contenedores con esquinas de 28 px.
- **Do** mantener controles de 48 px de alto y texto base de 17 px.
- **Do** dibujar íconos nuevos en SVG de 24 × 24 con trazo de 2 px, puntas redondeadas y `currentColor`.
- **Do** marcar los títulos de sección con el subrayado ondulado naranja.
- **Do** anular toda animación con `prefers-reduced-motion` y dejar el contenido visible sin JavaScript.

### Don't:
- **Don't** usar emojis como íconos ni en el logo.
- **Don't** poner etiquetas chicas en mayúsculas encima de los títulos.
- **Don't** usar naranja puro o turquesa como color de texto chico sobre fondo claro; para texto naranja, naranja oscuro.
- **Don't** usar sombras de caja grises, duras o desplazadas en diagonal sin desenfoque; solo las sombras verde bosque del sistema.
- **Don't** resolver portadas con "hero + fila de tarjetas con íconos".
- **Don't** volver a poner fondos de píldora blanca detrás del logo o del menú del encabezado.
- **Don't** usar los alias heredados (`campo`, `flor`, etc.) en pantallas nuevas.
