# Especificación 07: Informe técnico descargable

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 |
| **Depende de** | [04](04-diagnostico.md) (diagnóstico), [05](05-propuesta-de-rediseno.md) (propuesta elegida), [06](06-calendario-agroecologico.md) (calendario, opcional) |
| **Reglas que aplica** | RN-07, RS-02, RS-05, RS-06, RS-07, RD-03, RD-04, RD-08 |
| **Casos de uso** | Generar informe ([casos de uso](../proyecto/semana-3-actividad-generar-informe.md), caso de uso 006) |

---

## 1. Objetivo y alcance

Emitir un **informe técnico en PDF** que consolide el diagnóstico, la propuesta elegida, la mezcla de plantas y el
calendario de una finca. Sirve para que el productor o su asesor **tomen decisiones y lo compartan** por su cuenta.

**Incluye:**
- emitir el informe, con su código y una foto de sus datos;
- verlo en pantalla y descargar el PDF;
- la lista "Mis informes".

**No incluye:**
- enlaces públicos para compartir;
- imagen satelital en el PDF;
- envío por email;
- firma digital.

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Formato | **PDF A4 generado en el servidor** con **@react-pdf/renderer** (dependencia nueva aprobada en esta ronda). También se ve en pantalla | El "Imprimir → Guardar como PDF" del prototipo es incómodo en el celular. La librería es JavaScript puro y funciona en Vercel sin un navegador oculto. |
| Requisitos | **Un diagnóstico y una propuesta elegida.** El calendario se incluye si existe | El informe tiene que traer la propuesta. |
| Persistencia | **Cada informe se emite con un código** y una **foto de todos sus datos**. El PDF se arma desde esa foto al descargar; no se guardan archivos | Siempre sale igual aunque la finca cambie, sin almacenamiento de archivos. |
| Compartir | **Solo descargar.** No hay enlaces públicos | Ningún dato de la finca queda accesible por URL. |
| Contenido | **Completo, 7 secciones** | Lo pide el documento del proyecto y lo tenía el prototipo de diagnóstico. |
| Nombre del usuario | **Opcional al generarlo**, desactivado por defecto | Datos mínimos (RS-05). |
| Terreno | **Dibujo vectorial sin imagen satelital**, con escala y norte | Evita las condiciones de uso de las imágenes, el peso del archivo y exponer la ubicación exacta. |
| Código | **`INF-{año}-{6 caracteres aleatorios}`**, por ejemplo `INF-2026-7K3QX9` | Único y fácil de dictar. No revela cuántos informes hay. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Emitir, ver, descargar y borrar informes de **sus** fincas. Lo ajeno responde 404 (RS-02). |
| **Administrador** | Lo mismo, solo con sus fincas. |

## 4. Contenido del informe

Encabezado de todas las páginas: "PoliCampo · Informe {código}". Pie: "Página N de M · Emitido el {fecha}".

| N.º | Sección | Contenido |
| --- | --- | --- |
| 1 | **Portada y resumen ejecutivo** | Título "Informe técnico de rediseño agroecológico", nombre de la finca, localidad, departamento y ecorregión, código y fecha de emisión, y "Preparado para: {nombre y apellido}" si se eligió incluirlo. **Resumen:** nivel de riesgo (con texto), % actual de flores y objetivo, hectáreas a compensar, disposición elegida, % logrado con la propuesta, especies de la mezcla y la próxima tarea del calendario. Si el diagnóstico o la propuesta estaban **desactualizados** al emitir, el aviso: "Basado en datos del {fecha}; la finca cambió después." |
| 2 | **Datos de la finca** | Método de carga, superficie total y tabla de sectores (tipo, cultivo o subtipo, superficie, % del total). |
| 3 | **Diagnóstico** | Fecha, medidor del % con flores con las marcas de 10 % y 20 %, números (superficies, déficit y hectáreas a compensar), nivel de riesgo, áreas aptas (con el ancho de franja si corresponde) y alertas con su explicación. |
| 4 | **Propuesta de rediseño** | Nombre y fecha, objetivo y % logrado, disposición y parámetros, **dibujo** del terreno (contorno, sectores y franjas) o el **esquema 3×3** del cuestionario, superficie de franjas, superficie libre usada, **pérdida por cultivo** y avisos. Si fue editada a mano, se indica. |
| 5 | **Mezcla de plantas de servicio** | Por especie: nombre común y científico, proporción, funciones, por qué se recomienda (grado y justificación por cultivo), semanas de siembra, floración y corte en la ecorregión (con barras de 12 meses), necesidad de agua, riesgo de maleza y fuente. Para la mezcla: anticipación y cobertura de la floración por cultivo, y las semanas descubiertas. |
| 6 | **Calendario** | Si existe: la temporada y una tabla mes a mes con siembra, fecha límite, corte y no pulverizar, con su estado al emitir (Hecha con fecha, Atrasada, Próxima). Si no existe: "Calendario no generado". |
| 7 | **Cómo se calculó, fuentes y aviso** | Fórmulas del diagnóstico con sus números, versión de las reglas, lista de fuentes (las de la mezcla y Garibaldi y otros) y el **aviso legal**: "Informe orientativo generado automáticamente a partir de los datos cargados por el usuario y de un catálogo validado por especialistas. No reemplaza el asesoramiento de un ingeniero agrónomo." |

**Dibujo del terreno:**
- se dibuja en SVG dentro del PDF, con colores distintos para cultivos, flores existentes y franjas propuestas;
- lleva leyenda, una **barra de escala** en metros y una flecha de **norte** (solo en el mapa: en el croquis el norte
  no está definido);
- no lleva coordenadas ni fondo satelital.

**Tipografía:** se incrustan fuentes con acentos y ñ, y el PDF se genera con el idioma `es-AR`.

## 5. Flujos

### 5.1 Emitir

1. En la ficha de la finca, en la propuesta elegida o en Inicio (la tarjeta **"Informes"** se activa), el botón
   **"Generar informe"** se comporta así:
   - **si faltan requisitos**, explica qué falta: "Primero pedí un diagnóstico" o "Primero elegí una propuesta";
   - **si están**, abre una confirmación con la casilla **"Incluir mi nombre en el informe"**. Está desactivada y, si
     el perfil no tiene nombre ni apellido, aparece deshabilitada con "Cargá tu nombre en Mi perfil".
2. Al confirmar, el servidor arma la **foto** (5.2), genera el código, la guarda y abre el informe en pantalla.

### 5.2 La foto del informe

Al emitir se copian en `contenido` **todos los datos** que el PDF muestra:
- la finca y sus sectores;
- el diagnóstico completo;
- la propuesta elegida, con sus franjas, mezcla y copia de las especies;
- el calendario activo, con sus tareas y estados al emitir;
- el nombre, si se eligió incluirlo;
- las marcas de desactualizado.

Después, el informe **no depende** de que esos datos sigan existiendo: si se borra la propuesta o cambia el catálogo,
el informe sale igual.

### 5.3 Ver y descargar

- **`/fincas/[id]/informes/[informeId]`:** la versión en pantalla, con las mismas 7 secciones adaptadas a celular, y
  el botón **"Descargar PDF"**.
- **`…/[informeId]/pdf`:** genera el PDF desde la foto y lo descarga como `PoliCampo-{código}.pdf`. **El nombre del
  archivo no lleva datos personales ni el nombre de la finca.**

### 5.4 Mis informes

- **`/informes`:** todos los informes del usuario, del más nuevo al más viejo, con el código, la finca, la fecha y el
  nivel de riesgo, y las acciones ver, descargar y borrar.
- **`/fincas/[id]/informes`:** los informes de una finca.
- **Borrar:** pide confirmación y es definitivo.

## 6. Frontend

| Ruta | Pantalla |
| --- | --- |
| `/informes` | Mis informes |
| `/fincas/[id]/informes` | Informes de la finca |
| `/fincas/[id]/informes/[informeId]` | Informe en pantalla |
| `/fincas/[id]/informes/[informeId]/pdf` | Descarga del PDF (route handler) |

- **Celular primero:** la vista en pantalla es una columna, con las tablas como tarjetas y el dibujo a todo el ancho.
- **Descarga:** el botón "Descargar PDF" muestra "Generando…" mientras tanto, y un error claro si falla, con la opción
  de reintentar.
- **Accesibilidad:** en pantalla, los gráficos tienen texto alternativo. En el PDF, los niveles y estados también
  llevan texto, no solo color.

## 7. Backend

| Qué | Dónde |
| --- | --- |
| Armado de la foto | `web/src/dominio/informe/foto.ts`. Reúne los datos de la finca, el diagnóstico, la propuesta y el calendario. |
| Código aleatorio | `web/src/dominio/informe/codigo.ts`. Alfabeto sin caracteres confusos (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`) y generador criptográfico. Si choca con uno existente, reintenta. |
| Documento PDF | `web/src/informe-pdf/`: componentes de @react-pdf/renderer por sección, que **solo leen la foto**. |
| Acciones: emitir y borrar | `web/src/app/fincas/[id]/informes/acciones.ts` |
| Descarga | `web/src/app/fincas/[id]/informes/[informeId]/pdf/route.ts` (runtime Node.js) |
| Esquema | `web/src/db/schema/informe.ts` |

**Reglas del servidor:**
- **Dueño:** se filtra por el usuario de la sesión. 404 para lo ajeno, también por `informeId`.
- **Requisitos:** se verifican al emitir (5.1).
- **La foto se arma en el servidor**, con los datos de la base. El navegador solo envía el id de la finca y la casilla
  del nombre.
- **El PDF siempre se genera desde la foto**, nunca desde los datos actuales.
- **Encabezados de la descarga:**
  - `Content-Type: application/pdf`;
  - `Content-Disposition: attachment; filename="PoliCampo-{código}.pdf"`;
  - `Cache-Control: private, no-store`: no queda guardado en cachés intermedias.
- **Límites:**
  - 20 informes emitidos por hora por usuario;
  - 60 descargas por hora;
  - un máximo de 50 informes guardados por finca (para emitir más, hay que borrar alguno).
- **Tope de tiempo** (auditoría B-01): generar el PDF tiene un máximo de **10 s**. Si se supera, responde "No se
  pudo generar el PDF, probá de nuevo" y lo registra en el log, sin datos personales.

## 8. Base de datos

**`informe`**

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `codigo` | texto | **Único**, por ejemplo `INF-2026-7K3QX9` |
| `establecimiento_id` | uuid | FK, **`ON DELETE CASCADE`**: se borra con la finca o la cuenta |
| `diagnostico_id`, `propuesta_id`, `calendario_id` | uuid | FK **`ON DELETE SET NULL`**: solo como referencia, porque el contenido está en la foto |
| `emitido_en` | timestamptz | |
| `incluye_nombre` | booleano | |
| `version_plantilla` | texto | Por ejemplo `"1"`. Si cambia el diseño del PDF, los informes viejos se siguen viendo bien. |
| `contenido` | jsonb | La foto de 5.2 |

## 9. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Descargar informes ajenos adivinando ids o códigos | Ids uuid y códigos aleatorios. Además, **siempre** se verifica el dueño: el código no sirve de llave. | RS-02 |
| Datos personales de más | El nombre solo si se elige. El archivo se llama solo con el código. Sin coordenadas ni imagen satelital. | RS-05 |
| PDF guardado en cachés | `Cache-Control: private, no-store`. Descarga solo con sesión. | RS-02 |
| Contenido manipulado | La foto se arma solo en el servidor. El PDF se genera desde ella. | RS-06 |
| Inyección en el PDF (nombres de fincas, notas) | @react-pdf trata los textos como texto, no como marcado. Largos máximos heredados de cada módulo. | RS-07 |
| Abuso de generación (CPU) | 20 emisiones y 60 descargas por hora, y un tope de 50 informes por finca. | RS-06 |
| Promesas sin sustento | El aviso legal en la sección 7 y en el pie de la portada. | RN-07 |

## 10. Criterios de aceptación

**Emisión**
- **CA-07-01** Sin diagnóstico, o sin propuesta elegida, "Generar informe" explica qué falta y no emite nada.
- **CA-07-02** Al emitir se crea un informe con un código `INF-{año}-XXXXXX` único, con el alfabeto sin caracteres
  confusos, y con la foto completa.
- **CA-07-03** La casilla del nombre está desactivada por defecto. Si el perfil no tiene nombre, no se puede activar.
  Con la casilla activa, la portada dice "Preparado para: {nombre}".
- **CA-07-04** Si el diagnóstico o la propuesta estaban desactualizados al emitir, la portada lo indica.

**Contenido**
- **CA-07-05** El PDF tiene las 7 secciones en orden, con encabezado y pie en todas las páginas. Sin calendario, la
  sección 6 dice "Calendario no generado".
- **CA-07-06** El dibujo del terreno (croquis o mapa) muestra el contorno, los sectores y las franjas con leyenda,
  escala y norte (en el mapa), y no incluye coordenadas ni imagen satelital. En el cuestionario se muestra el esquema
  3×3.
- **CA-07-07** La sección 5 muestra, por especie, la justificación por cultivo y la fuente. La sección 7 muestra las
  fórmulas con los números del diagnóstico y el aviso legal.
- **CA-07-08** Los acentos y la ñ se ven bien en el PDF.

**Foto**
- **CA-07-09** Después de emitir, cambiar la finca, borrar la propuesta o retirar una especie del catálogo **no
  cambia** el PDF descargado.

**Descarga y lista**
- **CA-07-10** La descarga responde `application/pdf` con el nombre `PoliCampo-{código}.pdf` y
  `Cache-Control: private, no-store`.
- **CA-07-11** Mis informes lista los informes de todas las fincas del usuario. Borrar pide confirmación y lo elimina.

**Permisos y límites**
- **CA-07-12** Ver o descargar un informe ajeno, por id o por código, responde 404.
- **CA-07-13** La emisión número 21 en una hora y la descarga número 61 responden "Demasiadas solicitudes". Con 50
  informes en una finca no se puede emitir otro.
- **CA-07-14** Al borrar la finca o la cuenta se borran sus informes. Al borrar la propuesta, el informe sigue
  descargándose igual.

**Frontend**
- **CA-07-15** La vista en pantalla funciona a 360 px, con los gráficos con texto alternativo.

## 11. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Foto y código:** armado de la foto, código aleatorio, esquema y migración | `web/src/dominio/informe/`, `web/src/db/schema/informe.ts` | CA-07-02, 04, 09 |
| T2 | **Emisión, lista y borrado,** con requisitos y límites (después de T1) | `web/src/app/fincas/[id]/informes/`, `web/src/app/informes/` | CA-07-01, 03, 11 a 14 |
| T3 | **PDF:** componentes por sección, dibujo SVG, fuentes y descarga (en paralelo con T2, después de T1) | `web/src/informe-pdf/`, `…/pdf/route.ts` | CA-07-05 a 08, 10 |
| T4 | **Vista en pantalla** (en paralelo con T3) | `web/src/app/fincas/[id]/informes/[informeId]/` | CA-07-15 |
| T5 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

## 12. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| Revisar el **texto del aviso legal** y del resumen ejecutivo | Grupo | Es lo que el productor puede mostrar a terceros. |
| Elegir las **fuentes tipográficas** a incrustar (libres, con acentos y ñ) | Quien implemente T3 | Licencias de las fuentes. |
| Confirmar que generar el PDF entra en el **tiempo máximo** de las funciones de Vercel del plan gratuito | Quien implemente T3 | Los informes con calendario completo pueden ser largos. |
| Ver si conviene un **logo de PoliCampo** en la portada | Grupo | Imagen del proyecto. |
