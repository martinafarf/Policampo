# Especificación 02: Establecimientos y sectores

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 |
| **Depende de** | [01: Usuarios y autenticación](01-usuarios-y-autenticacion.md) |
| **Reglas que aplica** | RN-02, RN-03, RN-04, RN-05, RN-06, RS-02, RS-05, RS-06, RS-07, RS-08, RD-03, RD-04, RD-07, RD-08 |
| **Casos de uso** | Registrar datos ([casos de uso](../proyecto/semana-3-alternativas-y-casos-de-uso.md)) |

---

## 1. Objetivo y alcance

Que el usuario pueda **registrar sus establecimientos y cómo está distribuido el terreno hoy**: qué superficie ocupan
los cultivos y qué superficie ya tiene flores o vegetación natural. Lo hace con uno de tres métodos: **cuestionario**,
**croquis** o **mapa**. Es la entrada de datos del diagnóstico (módulo 04).

**Incluye:**
- la lista "Mis fincas";
- crear, ver la ficha, editar los datos generales y borrar un establecimiento;
- cargar y editar los sectores con cada método;
- empezar de nuevo con otro método;
- los borradores en el navegador;
- los datos geográficos de Jujuy: departamentos, localidades y ecorregiones;
- la tabla inicial de cultivos.

**No incluye:**
- el diagnóstico (04) y el botón "Solicitar diagnóstico", que aparece desactivado;
- la propuesta de rediseño, ni el paso 2 del mapa de la v1 (05);
- la administración del catálogo de cultivos (03);
- condiciones ambientales como agua, suelo o pendiente: se deciden en el 04;
- el modo sin conexión.

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Cultivo de un sector | **Lista del catálogo + "Otro"** con texto libre. Con "Otro" se guarda, pero se avisa que no se podrán recomendar plantas para ese cultivo | El diagnóstico y las compatibilidades necesitan saber exactamente qué cultivo es. |
| Ecorregiones | **5:** Valles Templados, Quebrada de Humahuaca, Yungas, Puna y Chaco Seco. **Se sugiere** según el departamento y el usuario puede cambiarla | Unifica las dos listas distintas que tenía la v1. |
| Localidad | **Lista según el departamento + "Otra"** con texto libre | Evita variantes de escritura y sirve para centrar el mapa. |
| Tipos de sector | **Cultivo** o **Sector de flores**, iguales en los tres métodos. "Sector de flores" tiene un **subtipo opcional**: flora espontánea, borde o cerco silvestre, banda floral implantada, o cortina forestal / vegetación natural | Unifica la v1 (el mapa no tenía flores). La vegetación existente cuenta para el 20 %. |
| Superficie con dibujo | **La calculada** a partir del dibujo, recalculada en el servidor al guardar. **No se edita a mano** | En la v1 el mapa guardaba un valor escrito a mano que podía no coincidir con el dibujo. |
| Croquis | **Plano cuadrado a escala** armado desde la superficie total, donde se dibujan los sectores | Igual que la v1. Funciona sin mapa satelital. |
| Mapa | **Leaflet + imágenes satelitales de Esri World Imagery**, con atribución | Igual que la v1: se reutiliza la lógica de Agus. |
| Geometrías | **GeoJSON en columnas JSONB**. Las superficies se calculan con **Turf.js** en el servidor | Simple y suficiente. Sin PostGIS por ahora. |
| Condiciones ambientales | **No se piden en este módulo**. Si el diagnóstico las necesita, se agregan en el 04 con su justificación | Se respeta el esquema de datos del grupo (RN-04). |
| Cambiar de método | **"Cargar de nuevo con otro método"**: conserva los datos generales y borra sectores y dibujos, con confirmación | Nunca se mezclan dos métodos (RN-03). |
| Mala señal | **Borrador en el navegador**, uno por establecimiento, que se ofrece recuperar. Si falla al guardar, se avisa sin perder nada | El uso es en el campo. El modo sin conexión completo queda para más adelante. |
| Borrar establecimiento | **Definitivo**, escribiendo el nombre para confirmar. Borra todo lo que depende del establecimiento | Simple y claro. Respeta el derecho de supresión. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Crear establecimientos y, sobre **los suyos**: verlos, editarlos, cargar sectores y borrarlos. Los establecimientos de otros no existen para él: responden 404 (RS-02). |
| **Administrador** | Lo mismo que un usuario, **solo con sus propios** establecimientos. No ve los de otros: los datos de producción son privados. |

## 4. Conceptos y datos

### 4.1 Establecimiento

| Dato | Obligatorio | Regla |
| --- | --- | --- |
| Nombre | Sí | 2 a 150 caracteres. Único entre los establecimientos **del mismo usuario**, sin distinguir mayúsculas. |
| Dirección | Sí | 2 a 200 caracteres (ruta, km, paraje…). |
| Departamento | Sí | Uno de los 16 departamentos de Jujuy. |
| Localidad | Sí | De la lista del departamento, u "Otra" con texto de 2 a 120 caracteres. |
| Ecorregión | Sí | Una de las 5. Se sugiere según el departamento. |
| Superficie total (ha) | Según el método | **Cuestionario y croquis:** la escribe el usuario, entre 0,01 y 100.000 ha. **Mapa:** se calcula del contorno, nunca se escribe. |
| Método de caracterización | Sí | `cuestionario`, `croquis` o `mapa`. Se elige al crear y solo cambia con "Cargar de nuevo con otro método". |

### 4.2 Sector

| Dato | Obligatorio | Regla |
| --- | --- | --- |
| Tipo | Sí | `cultivo` o `sector_flores`. |
| Cultivo | Si es `cultivo` | Un cultivo activo del catálogo, u "Otro" con texto de 2 a 80 caracteres. Si es `sector_flores`, va vacío. |
| Subtipo de flores | No | Solo para `sector_flores`: `flora_espontanea`, `borde_silvestre`, `banda_implantada` o `vegetacion_natural`. |
| Nombre | Automático | **Cultivo:** el nombre del cultivo, y si se repite, "Tomate 2". **Flores:** "Sector de flores N". El usuario puede cambiarlo (1 a 60 caracteres). |
| Superficie (ha) | Sí | Mayor que 0. **Cuestionario:** la escribe el usuario. **Croquis y mapa:** se calcula del dibujo. |
| Ubicación relativa | Solo cuestionario | Una de 9 posiciones: arriba, centro o abajo, combinado con izquierda, centro o derecha. En croquis y mapa la da el dibujo. |
| Geometría | Croquis y mapa | Polígono dibujado (ver 4.3). |

**Reglas de superficie (RN-06):**
- La suma de las superficies de los sectores **no puede superar** la superficie total, con una tolerancia de 0,5 % por
  redondeo del dibujo.
- La ficha muestra la superficie **distribuida**, la **restante**, el **% con flores** (superficie de los sectores de
  flores sobre la total) y si llega al 20 %. Este número es informativo: el diagnóstico completo es el módulo 04.

### 4.3 Geometrías

| Método | Contorno del terreno | Sectores | Sistema de coordenadas | Cálculo de superficie |
| --- | --- | --- | --- | --- |
| Croquis | Cuadrado de lado √(superficie × 10.000) metros, generado por el sistema | Polígonos o rectángulos dentro del cuadrado | **Plano local en metros**, con origen en la esquina superior izquierda | Área plana (fórmula del polígono) |
| Mapa | Polígono dibujado sobre el mapa | Polígonos dentro del contorno | **Geográfico** (longitud y latitud, WGS 84, como GeoJSON) | `turf.area` |

**Validaciones de geometría (servidor):**
- un `Polygon` válido, de 3 a 500 vértices y sin cruzarse consigo mismo;
- los sectores van **dentro** del contorno, con una tolerancia de 1 % de su superficie;
- los sectores **no se superponen** entre sí, con la misma tolerancia;
- en el mapa, las coordenadas tienen que estar dentro de Jujuy, con margen: latitud entre −25,0 y −21,5 y longitud
  entre −67,5 y −63,8.

## 5. Flujos

### 5.1 Mis fincas

`/fincas` muestra las tarjetas de los establecimientos del usuario, ordenadas por la última modificación. Cada tarjeta
muestra:
- el nombre;
- la localidad y el departamento;
- la superficie total, o "Se calcula al dibujar el terreno" si es un mapa sin contorno;
- la cantidad de sectores;
- el método;
- un botón "Ver ficha".

Si no hay ninguno: "Todavía no cargaste fincas", con el botón "Cargar mi primera finca". En Inicio (módulo 01), la
tarjeta "Mis fincas" se activa.

### 5.2 Crear un establecimiento

1. "Nueva finca" pide primero **cómo cargarla**, con tres tarjetas y una explicación corta de cada una:
   - **Responder un cuestionario:** listar los sectores y sus superficies;
   - **Dibujar un croquis:** un plano esquemático a escala;
   - **Ubicar mi campo en el mapa:** dibujar sobre la imagen satelital.
2. Después pide los **datos generales** (4.1). En el método mapa no se pide la superficie.
3. Al guardar, lleva a la pantalla del método elegido para cargar los sectores.

### 5.3 Cargar sectores

**Cuestionario:**
- una lista de sectores con el botón "Agregar sector";
- cada sector pide tipo, cultivo o subtipo, superficie y ubicación relativa;
- se ve en todo momento la superficie restante;
- en el celular, cada sector es una tarjeta plegable.

**Croquis:**
- un plano cuadrado a escala, con el lado en metros y una grilla;
- la paleta tiene una ficha por cultivo y "🌼 Sector de flores";
- se dibuja tocando y arrastrando (rectángulo) o tocando vértices (polígono);
- cada sector dibujado muestra su superficie calculada;
- al tocar un sector se puede cambiar su tipo, cultivo, subtipo o nombre, o borrarlo.

**Mapa:**
1. Centra el mapa en la localidad elegida.
2. El usuario dibuja el **contorno** del terreno. Se muestra la superficie calculada y queda como superficie total.
3. Dibuja los **sectores** dentro del contorno, con la misma paleta que el croquis.
4. Con el contorno dibujado se puede buscar otra ubicación: hay búsqueda por localidad y un botón "mi ubicación", que
   pide el permiso del navegador y **no se guarda**.

**En los tres métodos:**
- un botón **"Guardar"**;
- mientras se trabaja, un **borrador automático** en el navegador (5.6);
- al guardar bien, se va a la **ficha**, que tiene al final el bloque **"Solicitar diagnóstico"**, desactivado con el
  texto "Disponible próximamente" hasta el módulo 04.

### 5.4 Ficha del establecimiento

`/fincas/[id]` muestra:
- los datos generales;
- las métricas: superficie total, distribuida, restante, % con flores y si llega al 20 %;
- la lista de sectores;
- en croquis y mapa, un dibujo de solo lectura.

Acciones:
- **"Editar datos generales";**
- **un único botón según el método:**
  - "📝 Editar en el cuestionario";
  - "📐 Editar el croquis";
  - "🗺️ Editar en el mapa";
- en el menú "Más":
  - **"Cargar de nuevo con otro método"** (5.5);
  - **"Borrar finca"** (5.7).

### 5.5 Cargar de nuevo con otro método

1. Advierte: "Se van a borrar los N sectores y el dibujo de esta finca. Los datos generales se conservan."
2. Al confirmar, elige el nuevo método, borra los sectores y la geometría, y borra el borrador local.
3. Si el nuevo método es mapa, la superficie total queda vacía hasta dibujar el contorno.
4. Si el nuevo método es cuestionario o croquis, viniendo de mapa, pide la superficie total.

### 5.6 Borradores en el navegador (RS-08)

- **Qué se guarda:** mientras se cargan sectores o se dibuja, cada 5 segundos si hubo cambios, en la clave
  `policampo_borrador_<id-del-establecimiento>`.
- **Al volver a entrar:** si hay un borrador **más nuevo** que lo guardado, pregunta: "Tenés cambios sin guardar del
  {fecha}. ¿Recuperarlos?", con las opciones Recuperar o Descartar.
- **Si falla al guardar** (sin conexión o error): "No se pudo guardar. Tus cambios siguen en este dispositivo; probá de
  nuevo cuando tengas señal." El borrador se conserva.
- **Cuándo se borra:**
  - al guardar con éxito;
  - al cargar de nuevo con otro método;
  - al borrar el establecimiento;
  - al cerrar sesión (módulo 01).

### 5.7 Borrar un establecimiento

1. Explica qué se borra: el establecimiento con sus sectores y dibujos, y más adelante sus diagnósticos, propuestas e
   informes. Aclara que no se puede deshacer.
2. Pide escribir el **nombre exacto** del establecimiento.
3. Al confirmar, borra todo, borra el borrador local y vuelve a Mis fincas con "Se borró la finca {nombre}".

## 6. Frontend

### 6.1 Pantallas y rutas

Todas requieren sesión (módulo 01). Si el establecimiento no es del usuario, la respuesta es **404**.

| Ruta | Pantalla |
| --- | --- |
| `/fincas` | Mis fincas |
| `/fincas/nueva` | Elegir método y completar los datos generales |
| `/fincas/[id]` | Ficha |
| `/fincas/[id]/datos` | Editar datos generales |
| `/fincas/[id]/cuestionario` | Sectores por cuestionario |
| `/fincas/[id]/croquis` | Croquis |
| `/fincas/[id]/mapa` | Mapa |

Si se abre la pantalla de un método distinto al del establecimiento, redirige a la ficha con el aviso "Esta finca se
carga con {método}" (RN-03).

### 6.2 Comportamiento

- **Celular primero (RD-03):**
  - los dibujos de croquis y mapa se hacen con el dedo, con botones grandes para terminar, deshacer y borrar;
  - el mapa ocupa todo el ancho y los datos van en un panel plegable debajo.
- **Departamento y ecorregión:** al elegir el departamento se cargan sus localidades y se sugiere la ecorregión. Si el
  usuario ya la cambió a mano, no se pisa.
- **Superficies:**
  - se muestran en **ha con hasta 4 decimales** y en **m²** entre paréntesis;
  - la superficie restante cambia de color al acercarse a 0, y se marca en rojo con mensaje si se pasa.
- **Mapa:**
  - lleva la atribución de Esri visible;
  - si las imágenes no cargan por mala señal, se puede seguir dibujando sobre un fondo liso y se avisa.
- **Accesibilidad:** el cuestionario es la alternativa accesible a los métodos con dibujo, y se ofrece en "Nueva
  finca" como la opción más simple.
- **Reutilizar la v1:** la lógica del croquis (`static/js/editor_croquis.js`), el mapa
  (`mapa/static/mapa/js/entrada_mapa.js` y `policampo_common.js`) y los datos de departamentos y localidades se pasan
  a componentes de React. Se adaptan, no se copian tal cual.

## 7. Backend

### 7.1 Organización

| Qué | Dónde |
| --- | --- |
| Esquema Drizzle | `web/src/db/schema/establecimientos.ts`, `web/src/db/schema/cultivos.ts` |
| Lógica de dominio: cálculo de superficies, validación de geometrías, nombres automáticos, reglas RN-06 | `web/src/dominio/establecimientos/`. Funciones puras, con tests unitarios y sin acceso a la base. |
| Acciones del servidor: crear, editar, guardar sectores, cambiar de método, borrar | `web/src/app/fincas/…/acciones.ts` |
| Datos de Jujuy (departamentos, localidades con coordenadas, ecorregión sugerida) | `web/src/datos/jujuy.ts`, migrado desde `policampo_common.js` de la v1 |

### 7.2 Reglas del servidor

- **Dueño:** toda acción carga el establecimiento **filtrando por `usuario_id` = usuario de la sesión**. Si no lo
  encuentra, responde 404 sin decir si existe (RS-02).
- **Método:** las acciones de sectores rechazan la operación si el método del establecimiento no coincide (RN-03).
- **Superficies:**
  - en croquis y mapa, **el servidor ignora las superficies que envía el navegador** y las recalcula desde las
    geometrías;
  - en mapa, la superficie total es la del contorno.
- **Sin pisar cambios ajenos** (RS-15): guardar sectores y datos generales envía la `version` del establecimiento
  que se editó. Si en la base es otra, por ejemplo porque se guardó desde otro dispositivo, responde "La finca
  cambió en otro dispositivo" y no guarda. El borrador local se conserva para no perder lo hecho. Cada guardado
  exitoso suma 1 a `version` (auditoría M-04).
- **Guardado atómico:** guardar sectores reemplaza **todos** los sectores del establecimiento en una sola transacción.
  Si algo falla, no queda nada a medias.
- **Fecha de modificación:** toda acción que cambia el establecimiento o sus sectores actualiza
  `establecimiento.actualizado_en`. El módulo 04 la usa para marcar los diagnósticos desactualizados.
- **Tamaño:** cada petición de guardado acepta hasta 1 MB y hasta 50 sectores por establecimiento.
- **Límite de establecimientos:** 100 por usuario. Es un valor por defecto, a revisar.

## 8. Base de datos

Migraciones con Drizzle (RD-08). Todas las tablas tienen `creado_en` y `actualizado_en`.

**`cultivo`**: catálogo. La crea este módulo y la extiende el módulo 03.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `clave` | texto | Única, en minúsculas, por ejemplo `tomate` |
| `nombre` | texto | Por ejemplo "Tomate" |
| `activo` | booleano | Los inactivos no se ofrecen al elegir, pero se siguen mostrando en sectores ya cargados |

Datos iniciales (por migración), los de la v1: frutilla, arándano, durazno, tomate, pimiento, palta, cítricos, zapallo
y cucurbitáceas, y hortícolas mixtas.

**`establecimiento`**

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK. Un uuid no permite adivinar ids de otros usuarios. |
| `usuario_id` | texto | FK a `user.id`, **`ON DELETE CASCADE`** (módulo 01). Índice. |
| `nombre` | texto | Único por usuario: índice único sobre (`usuario_id`, `lower(nombre)`) |
| `direccion`, `departamento`, `localidad`, `ecorregion` | texto | `departamento` y `ecorregion` con `CHECK` sobre los valores permitidos |
| `localidad_es_otra` | booleano | `true` si se escribió a mano |
| `superficie_total_ha` | numeric(12,4) | Nulo solo si el método es `mapa` y no hay contorno |
| `metodo_caracterizacion` | enum `cuestionario`, `croquis`, `mapa` | |
| `contorno` | jsonb | GeoJSON del contorno (mapa). Nulo en los otros métodos. |
| `version` | entero | Empieza en 1 y suma 1 con cada guardado (RS-15) |

**`sector`**

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `establecimiento_id` | uuid | FK, **`ON DELETE CASCADE`**. Índice. |
| `tipo` | enum `cultivo`, `sector_flores` | |
| `cultivo_id` | uuid | FK a `cultivo`. Nulo si es flores o "Otro". |
| `cultivo_otro` | texto | Solo si el cultivo es "Otro" |
| `subtipo_flores` | enum | Solo si es `sector_flores` |
| `nombre` | texto | |
| `superficie_ha` | numeric(12,4) | `CHECK > 0` |
| `ubicacion_relativa` | enum de 9 valores | Solo cuestionario |
| `geometria` | jsonb | Solo croquis y mapa |
| `orden` | entero | Para mostrar en el orden de carga |

Restricciones `CHECK` de coherencia:
- si `tipo = cultivo`, tiene que haber `cultivo_id` o `cultivo_otro`;
- si `tipo = sector_flores`, ninguno de los dos.

## 9. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Ver o modificar fincas ajenas cambiando el id en la URL | Filtrar siempre por el usuario de la sesión. 404 para lo ajeno. Ids uuid. | RS-02 |
| Superficies falsas enviadas desde el navegador | El servidor recalcula desde las geometrías e ignora las superficies enviadas en croquis y mapa. | RS-06 |
| Geometrías maliciosas o enormes (miles de vértices, coordenadas inválidas) | Tope de 1 MB por petición, de 500 vértices por polígono y de 50 sectores. Validación de GeoJSON y rango de Jujuy. | RS-06 |
| Inyección en nombres y textos | Largos máximos, React escapa al mostrar y Drizzle parametriza. | RS-07 |
| Ubicación exacta de la finca (dato sensible del productor) | Solo la ve su dueño. No se publica ni se envía a terceros. "Mi ubicación" del navegador no se guarda. | RS-05 |
| Las imágenes satelitales revelan la zona consultada a Esri | Esri recibe las coordenadas aproximadas de las imágenes pedidas, no datos del usuario. Se menciona en la política de privacidad (módulo 01). | Ley 25.326 |
| Borradores en una computadora compartida | Clave por establecimiento. Se borran al guardar, al borrar y al cerrar sesión. | RS-08 |
| Borrado accidental | Confirmación escribiendo el nombre. | — |

## 10. Criterios de aceptación

**Establecimientos**
- **CA-02-01** El usuario crea un establecimiento con cada método. En mapa no se pide la superficie total y queda nula
  hasta dibujar el contorno.
- **CA-02-02** No se puede crear un establecimiento con el mismo nombre que otro **del mismo usuario**, aunque cambien
  las mayúsculas. Otro usuario sí puede usar ese nombre.
- **CA-02-03** Al elegir un departamento se ofrecen sus localidades y se sugiere su ecorregión. "Otra" localidad
  acepta texto libre.
- **CA-02-04** Mis fincas muestra solo los establecimientos del usuario, ordenados por la última modificación, y el
  mensaje vacío si no hay ninguno.
- **CA-02-05** Ver, editar, guardar sectores o borrar un establecimiento de otro usuario responde 404, por URL y por
  acción del servidor. Un administrador tampoco puede.

**Sectores**
- **CA-02-06** Un sector de cultivo exige un cultivo del catálogo u "Otro" con texto. Un sector de flores no acepta
  cultivo y sí acepta subtipo.
- **CA-02-07** Los nombres automáticos son el nombre del cultivo (o "Tomate 2" si se repite) y "Sector de flores N".
- **CA-02-08** La suma de superficies que supera la total (más de 0,5 %) se rechaza con un mensaje que indica el
  exceso.
- **CA-02-09** En el cuestionario, cada sector exige superficie mayor que 0 y ubicación relativa.
- **CA-02-10** En croquis y mapa, si el navegador envía superficies falsas, el servidor guarda las calculadas desde la
  geometría.
- **CA-02-11** Se rechazan: polígonos que se cruzan consigo mismos, de más de 500 vértices, sectores fuera del
  contorno o superpuestos (más de 1 %), y coordenadas fuera de Jujuy en el mapa.
- **CA-02-12** En el mapa, la superficie total del establecimiento es la del contorno dibujado, recalculada en el
  servidor.
- **CA-02-13** El croquis arma un plano cuadrado de lado √(ha × 10.000) m, y la superficie de un rectángulo dibujado
  coincide con su ancho × alto.
- **CA-02-24** Si la finca se guardó desde otro dispositivo después de abrirla, guardar responde "La finca cambió
  en otro dispositivo", no modifica nada y conserva el borrador local.
- **CA-02-14** Guardar sectores reemplaza todos en una transacción. Si falla la validación de uno, no cambia ninguno.

**Métodos y borradores**
- **CA-02-15** Abrir la pantalla de otro método redirige a la ficha con el aviso. Las acciones de sectores de otro
  método se rechazan.
- **CA-02-16** "Cargar de nuevo con otro método" borra sectores, contorno y borrador, conserva los datos generales y
  cambia el método.
- **CA-02-17** El borrador se guarda en `policampo_borrador_<id>`, se ofrece recuperar si es más nuevo que lo guardado,
  y se borra al guardar con éxito.
- **CA-02-18** Si guardar falla por falta de conexión, se muestra el aviso y el borrador sigue disponible.

**Ficha y borrado**
- **CA-02-19** La ficha muestra la superficie total, distribuida y restante, el % con flores y si llega al 20 %, con
  los sectores. Hay un único botón de edición según el método y el bloque "Solicitar diagnóstico" desactivado.
- **CA-02-20** Borrar exige escribir el nombre exacto. Borra el establecimiento y sus sectores (cascada) y el borrador
  local.
- **CA-02-21** Al eliminar la cuenta (módulo 01) se borran todos sus establecimientos y sectores.

**Frontend**
- **CA-02-22** Las pantallas funcionan a 360 px de ancho y se puede dibujar con el dedo.
- **CA-02-23** El mapa muestra la atribución de Esri. Si las imágenes no cargan, se puede seguir dibujando.

## 11. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Base:**<br>– esquema y migraciones de `cultivo`, `establecimiento` y `sector`, con los datos iniciales de cultivos;<br>– `datos/jujuy.ts`;<br>– funciones de dominio (superficies, geometrías, nombres) con sus tests. | `web/src/db/schema/`, `web/src/dominio/establecimientos/`, `web/src/datos/` | CA-02-07, 08, 10 a 13 |
| T2 | **Establecimientos:** Mis fincas, nueva, datos generales, ficha y borrar (después de T1) | `web/src/app/fincas/…` | CA-02-01 a 05, 19 a 21 |
| T3 | **Cuestionario** (en paralelo con T4 y T5, después de T2) | `…/[id]/cuestionario/` | CA-02-06, 09, 14 |
| T4 | **Croquis** (en paralelo) | `…/[id]/croquis/`, `web/src/componentes/croquis/` | CA-02-13, 22 |
| T5 | **Mapa** (en paralelo) | `…/[id]/mapa/`, `web/src/componentes/mapa/` | CA-02-11, 12, 23 |
| T6 | **Cambiar de método y borradores** (después de T3 a T5) | `web/src/componentes/borrador/`, acciones | CA-02-15 a 18 |
| T7 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

Las tareas T3, T4 y T5 comparten la paleta de sectores y las funciones de dominio de T1. Ninguna de las tres modifica
las de las otras: lo común se cambia en T1 (RD-07).

## 12. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| Confirmar la **ecorregión sugerida** para cada departamento (la v1 tiene una asignación; Chaco Seco es nueva) | Analistas de dominio | Afecta las recomendaciones. |
| Revisar la **lista inicial de cultivos** | Analistas de dominio | Es la base de las compatibilidades del módulo 03. |
| Confirmar el **límite de 100 establecimientos** por usuario | Grupo | Es un valor por defecto. |
| Mencionar a **Esri** en la política de privacidad | Grupo (módulo 01) | Transparencia sobre servicios de terceros. |
| Ver si conviene que el **mapa muestre la imagen satelital en la ficha** | Grupo | Más datos móviles en el campo. Hoy la ficha muestra el dibujo sin fondo. |
