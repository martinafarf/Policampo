# Especificación 04: Diagnóstico

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 (redacción); Integrantes 2 y 4, analistas de dominio (validación de umbrales) |
| **Depende de** | [02](02-establecimientos-y-sectores.md) (establecimientos y sectores), [03](03-catalogo-de-especies.md) (catálogo, solo para la alerta de cultivos sin datos) |
| **Reglas que aplica** | RN-01, RN-06, RN-07, RS-02, RS-05, RS-06, RD-04, RD-08 |
| **Casos de uso** | Solicitar diagnóstico ([casos de uso](../proyecto/semana-3-alternativas-y-casos-de-uso.md), caso de prueba 02) |

---

## 1. Objetivo y alcance

Evaluar **cuánta superficie de la finca tiene flores o vegetación natural** frente al **20 % recomendado** (RN-01), y
decir con claridad:
- el **déficit**;
- las **hectáreas a compensar**;
- el **nivel de riesgo**;
- **dónde** conviene intervenir;
- qué **alertas** hay.

Cada diagnóstico se **guarda** con sus datos de entrada, para poder verlo después, comparar la evolución y usarlo en el
informe (módulo 07).

**Incluye:**
- el botón "Solicitar diagnóstico";
- el cálculo y la pantalla del diagnóstico;
- las áreas aptas según el método;
- las alertas simples;
- los beneficios en palabras, sin números;
- el historial de diagnósticos;
- la marca de "desactualizado".

**No incluye:**
- el análisis por cultivo;
- estimaciones económicas para la finca;
- condiciones ambientales (agua, suelo, pendiente);
- la propuesta de rediseño y la elección de plantas (05);
- el informe descargable (07).

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Qué cuenta para el 20 % | **Toda la superficie de los sectores de flores**, cualquiera sea su subtipo, al 100 % | Simple y explicable. Los pesos por subtipo necesitarían validación experta. |
| Nivel de riesgo | **Los umbrales del prototipo de diagnóstico**: adecuado con 20 % o más; moderado de 10 % a menos de 20 %; crítico con menos de 10 %. **Están a validar** con el especialista | Ya estaban relevados. Se marcan para validar (RN-07). |
| Alcance del análisis | **Un resultado para toda la finca**, sin sección por cultivo | Decisión del grupo. La dependencia de la polinización de cada cultivo (RN-09) se usa en el módulo 05 para elegir plantas. |
| Condiciones ambientales | **No se piden.** Se reconsideran en el 05 si hacen falta para elegir plantas | Con superficies, sectores y ecorregión alcanza para este diagnóstico. |
| Áreas aptas | **Según el método.** En cuestionario, texto según las ubicaciones libres. En croquis y mapa, además, el **ancho de una franja perimetral** que cubre el déficit y la **superficie libre** marcada en el dibujo | Aprovecha lo que tiene cada método sin adelantar el diseño del 05. |
| Persistencia | **Se guarda cada diagnóstico**, con los datos usados, y queda un **historial** | Para ver la evolución. El informe usa un diagnóstico concreto y no uno recalculado. |
| Cambios en la finca | El diagnóstico queda **"Desactualizado"**, con un botón para actualizarlo. Los anteriores se conservan | El usuario decide cuándo recalcular. |
| Datos económicos | **Solo en palabras**, citando la bibliografía. Sin porcentajes ni montos para la finca | No hay datos locales validados para calcularlos. |
| Requisitos para pedirlo | **Superficie total y al menos un sector de cultivo.** Si falta algo, se dice qué | Sin cultivo no tiene sentido el diagnóstico. |
| Superficie sin asignar | **No cuenta** para el 20 %. Se avisa y se menciona como posible área apta | Puede ser camino, construcción o vegetación no cargada. |
| Alertas | **Monocultivo**, **sin flores**, **superficie sin asignar** y **cultivo sin datos en el catálogo**, cada una con su explicación | Reglas claras sobre datos que existen. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Pedir diagnósticos de **sus** fincas y ver su historial. Lo ajeno responde 404 (RS-02). |
| **Administrador** | Lo mismo, solo con sus propias fincas. |

## 4. Cálculo

Todas las fórmulas viven en una sola función de dominio, `diagnosticar(entrada)`. Es una **función pura**: no lee la
base ni la hora, y tiene tests.

### 4.1 Entrada

Es una foto de la finca en el momento del pedido. Se guarda tal cual en el diagnóstico:
- el método y la ecorregión;
- la superficie total (ha);
- los sectores, con su tipo, cultivo (clave, o "otro" y su texto), subtipo de flores, superficie, ubicación relativa
  (cuestionario) y geometría (croquis y mapa);
- el contorno: el del mapa, o el cuadrado del croquis;
- de cada cultivo, si tiene datos **publicados** en el catálogo (para la alerta 4.5).

### 4.2 Superficies y porcentaje

| Resultado | Fórmula | Redondeo |
| --- | --- | --- |
| Superficie de flores `F` | Suma de las superficies de los sectores `sector_flores` | 4 decimales |
| Superficie de cultivos `C` | Suma de las superficies de los sectores `cultivo` | 4 decimales |
| Superficie sin asignar `L` | max(0, `T` − `F` − `C`), donde `T` es la superficie total | 4 decimales |
| **% con flores** | `F` / `T` × 100 | 1 decimal |
| **Déficit** (puntos porcentuales) | max(0, 20 − % con flores) | 1 decimal |
| **Hectáreas a compensar** | max(0, 0,20 × `T` − `F`) | 4 decimales (también se muestra en m²) |

Los cálculos se hacen con números decimales exactos, no con coma flotante, y se redondea solo al final.

### 4.3 Nivel de riesgo (a validar)

| Nivel | Condición | Color | Mensaje base |
| --- | --- | --- | --- |
| **Adecuado** | % con flores ≥ 20 | Verde | "Tu finca alcanza el 20 % recomendado de flores y vegetación natural." |
| **Moderado** | 10 ≤ % con flores < 20 | Amarillo | "Tu finca tiene flores, pero le faltan {ha} ha para llegar al 20 %." |
| **Crítico** | % con flores < 10 | Rojo | "Tu finca tiene muy poca superficie con flores: le faltan {ha} ha para llegar al 20 %." |

Los umbrales (20 y 10) son **constantes con nombre** en el dominio. Cambiarlos es una decisión del grupo, que se
registra en las reglas (RDOC-02).

### 4.4 Áreas aptas

**Cuestionario:**
- se listan las **ubicaciones relativas sin ningún sector**, de las 9 posibles;
- primero van las de **borde**, que son las 8 que no son "centro", con el texto: "Bordes libres según lo que cargaste:
  arriba a la izquierda, abajo al centro…";
- si todas están ocupadas: "Considerá los bordes del predio y las cabeceras de los lotes de cultivo.";
- si hay superficie sin asignar, se suma: "También podés usar parte de las {L} ha sin asignar."

**Croquis y mapa:** lo mismo, más:
- **perímetro `P`** del contorno, en metros. En el croquis es 4 × el lado; en el mapa, la longitud del contorno
  calculada con Turf.js;
- **ancho de franja perimetral** = hectáreas a compensar × 10.000 / `P`, en metros con 1 decimal. Texto: "Una franja
  de flores de **{ancho} m** de ancho por todo el borde cubriría lo que falta." Es una aproximación que no descuenta
  las esquinas, y se aclara así;
- **superficie libre:** el contorno menos la unión de los sectores, calculada con las mismas funciones geométricas del
  módulo 02. Se muestra **resaltada en el dibujo** de solo lectura y no se guarda como sector.

Si el nivel es Adecuado, las áreas aptas se muestran como "Si querés sumar más biodiversidad…", sin urgencia.

### 4.5 Alertas

| Alerta | Condición | Explicación que se muestra |
| --- | --- | --- |
| **Monocultivo** | Un mismo cultivo (misma clave o mismo texto "otro", sin distinguir mayúsculas) ocupa **más del 80 %** de la superficie total | "Un solo cultivo ocupa la mayor parte de la finca. Los monocultivos tienen menos polinizadores e insectos benéficos." |
| **Sin flores** | `F` = 0 | "No cargaste sectores con flores o vegetación natural. Si ya existen, cargalos como 'Sector de flores'." |
| **Superficie sin asignar** | `L` > 1 % de `T` | "Tenés {L} ha sin asignar. Si tienen flores o vegetación natural, cargalas como Sector de flores." |
| **Cultivo sin datos** | Un sector usa "Otro" o un cultivo sin datos **publicados** en el catálogo | "No tenemos información validada sobre {cultivo}: el diagnóstico es general y no vamos a poder recomendarte plantas específicas para ese cultivo." |

### 4.6 Beneficios (en palabras)

Bloque fijo, **sin cifras para la finca**:
- **Más polinizadores:** mejor cuaje, y frutos más grandes y parejos en los cultivos que dependen de la polinización;
- **Control biológico:** los insectos benéficos ayudan a controlar las plagas y se reduce el uso de insecticidas;
- **Suelo y agua:** menos agroquímicos protegen el suelo y las fuentes de agua.

Al pie: "Fuente: Garibaldi y otros, *Paisajes agrícolas multifuncionales*; entrevistas a especialistas. Los resultados
dependen de cada finca."

### 4.7 Versión de las reglas

Cada diagnóstico guarda `version_reglas`, por ejemplo `"1"`, una constante del dominio. Si cambian umbrales o fórmulas,
se sube la versión. Así un diagnóstico viejo se interpreta con las reglas de su momento (RN-07).

## 5. Flujos

### 5.1 Solicitar diagnóstico

1. En la ficha de la finca, el bloque **"Solicitar diagnóstico"** (desactivado desde el módulo 02) **se activa**:
   - si **faltan requisitos**, se ve el botón con el texto de lo que falta: "Cargá la superficie total" o "Cargá al
     menos un sector de cultivo", con un enlace a la pantalla del método;
   - si **está todo**, "🔍 Solicitar diagnóstico" calcula, guarda y lleva al resultado.
2. Si ya existe un diagnóstico **vigente** (la finca no cambió desde entonces), el botón dice "Ver diagnóstico" y no
   crea uno nuevo.

### 5.2 Ver el diagnóstico

`/fincas/[id]/diagnostico` muestra el **último** diagnóstico:
1. **Semáforo** con el nivel de riesgo y el mensaje base.
2. **Medidor** del % con flores, con la marca del 20 % y del 10 %.
3. **Números:** superficie total, de cultivos, de flores y sin asignar; el déficit y las hectáreas a compensar (en ha
   y en m²).
4. **Áreas aptas** (4.4). En croquis y mapa, con el dibujo y la superficie libre resaltada.
5. **Alertas** (4.5), si hay.
6. **Beneficios** (4.6).
7. **Cómo se calculó:** sección plegable con las fórmulas aplicadas a sus números. Por ejemplo: "1,0 ha de flores ÷
   10,0 ha totales = 10,0 %" (RN-07).
8. **Acciones:**
   - "Ver propuesta de rediseño": desactivado con "Disponible próximamente" hasta el módulo 05;
   - "Historial de diagnósticos".

### 5.3 Desactualizado

- **Cuándo:** si la finca o sus sectores cambiaron **después** de la fecha del diagnóstico. Se compara con
  `establecimiento.actualizado_en`, ver 7.2.
- **Qué se ve:** arriba, "⚠️ Este diagnóstico es del {fecha}. La finca cambió después: actualizalo para ver el estado
  actual.", con el botón **"Actualizar diagnóstico"**.
- **Qué hace el botón:** crea uno nuevo. El anterior queda en el historial.

### 5.4 Historial

`/fincas/[id]/diagnostico/historial`:
- lista de diagnósticos, del más nuevo al más viejo, con la fecha, el nivel, el % con flores y las hectáreas a
  compensar;
- cada uno se abre en `/fincas/[id]/diagnostico/[diagnosticoId]`, con la misma pantalla que 5.2 pero con sus datos
  guardados y la etiqueta "Diagnóstico del {fecha}";
- debajo, un pequeño gráfico de la evolución del % con flores a lo largo del tiempo.

### 5.5 Inicio y Mis fincas

- **Inicio** (módulo 01): la tarjeta **"Diagnóstico"** se activa y lleva a Mis fincas.
- **Mis fincas** (módulo 02): cada tarjeta muestra el **nivel** del último diagnóstico como etiqueta de color, o "Sin
  diagnóstico", o "Desactualizado".

## 6. Frontend

| Ruta | Pantalla |
| --- | --- |
| `/fincas/[id]/diagnostico` | Último diagnóstico (o, si no hay, la invitación a pedirlo) |
| `/fincas/[id]/diagnostico/[diagnosticoId]` | Un diagnóstico del historial |
| `/fincas/[id]/diagnostico/historial` | Historial y evolución |

- **Accesibilidad:** el semáforo no depende solo del color. Lleva el texto del nivel y un ícono, y el medidor tiene
  texto alternativo, por ejemplo "10 % de 20 % recomendado".
- **Celular primero:** el resultado se lee de arriba hacia abajo en una columna. Los números van en tarjetas de dos
  por fila desde 360 px.
- **Dibujo de solo lectura:** se reutiliza el componente de la ficha (módulo 02), con una capa de superficie libre
  rayada.

## 7. Backend

### 7.1 Organización

| Qué | Dónde |
| --- | --- |
| Cálculo | `web/src/dominio/diagnostico/diagnosticar.ts`: función pura, con constantes de umbrales y versión |
| Armado de la entrada desde la base | `web/src/dominio/diagnostico/entrada.ts` |
| Acción "Solicitar diagnóstico" | `web/src/app/fincas/[id]/diagnostico/acciones.ts` |
| Esquema | `web/src/db/schema/diagnostico.ts` |

### 7.2 Reglas del servidor

- **Dueño y requisitos:** se carga la finca filtrando por el usuario de la sesión (404 si no es suya) y se verifican
  los requisitos (5.1).
- **Cálculo:** **siempre en el servidor**, con los datos de la base. El navegador no envía resultados ni superficies.
- **Guardado:** entrada y resultados se guardan en una transacción. Un diagnóstico guardado **no se modifica nunca**.
- **Requisito para el módulo 02:** toda acción que cambia la finca o sus sectores **actualiza
  `establecimiento.actualizado_en`**. Es lo que permite saber si un diagnóstico está desactualizado.
- **Límite:** 20 diagnósticos por hora por usuario. Además, si hay uno vigente, no se crea otro (5.1).

## 8. Base de datos

**`diagnostico`** (migración con Drizzle, RD-08):

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `establecimiento_id` | uuid | FK, **`ON DELETE CASCADE`**. Índice (`establecimiento_id`, `creado_en` desc). |
| `creado_en` | timestamptz | Momento del cálculo |
| `version_reglas` | texto | Por ejemplo `"1"` |
| `entrada` | jsonb | La foto de 4.1 |
| `superficie_total_ha`, `superficie_flores_ha`, `superficie_cultivos_ha`, `superficie_sin_asignar_ha`, `hectareas_a_compensar` | numeric(12,4) | |
| `porcentaje_flores`, `deficit_pp` | numeric(5,1) | |
| `nivel_riesgo` | enum `adecuado`, `moderado`, `critico` | |
| `perimetro_m`, `ancho_franja_m` | numeric(10,1) | Nulos en cuestionario |
| `areas_aptas` | jsonb | Ubicaciones libres y textos |
| `superficie_libre` | jsonb | GeoJSON. Nulo en cuestionario. |
| `alertas` | jsonb | Lista de `{ tipo, datos }`. El texto se arma al mostrar. |

Los campos numéricos se guardan además de la `entrada`, para poder listar y graficar el historial sin recalcular.

## 9. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Ver diagnósticos ajenos | Filtrar por el dueño de la finca. 404 para lo ajeno, también por `diagnosticoId`. | RS-02 |
| Resultados manipulados desde el navegador | El cálculo se hace solo en el servidor, con los datos de la base. | RS-06 |
| Abuso (muchos cálculos) | Límite de 20 por hora y no duplicar si hay uno vigente. | RS-06 |
| Recomendaciones no trazables | Se guardan la entrada, la versión de reglas y "Cómo se calculó". | RN-07 |
| Promesas económicas sin sustento | Beneficios solo en palabras, con fuente y aviso. | RN-07 |

## 10. Criterios de aceptación

Ejemplos de referencia para los tests (finca de 10 ha):

| Flores | % | Déficit | A compensar | Nivel |
| --- | --- | --- | --- | --- |
| 2,5 ha | 25,0 % | 0,0 | 0 ha | Adecuado |
| 2,0 ha | 20,0 % | 0,0 | 0 ha | Adecuado |
| 1,0 ha | 10,0 % | 10,0 | 1,0 ha | Moderado |
| 0,5 ha | 5,0 % | 15,0 | 1,5 ha | Crítico |
| 0 ha | 0,0 % | 20,0 | 2,0 ha | Crítico (+ alerta "Sin flores") |

**Cálculo**
- **CA-04-01** `diagnosticar` da los resultados de la tabla de ejemplos, con los redondeos de 4.2 y sin errores de
  coma flotante.
- **CA-04-02** Todos los subtipos de flores suman por igual. La superficie sin asignar no suma.
- **CA-04-03** Croquis de 4 ha con 1,5 ha de flores: el lado es 200 m, el perímetro 800 m, faltan 0,5 ha y el ancho
  de franja es 6,3 m (5.000 m² ÷ 800 m = 6,25 → 6,3).
- **CA-04-04** En el mapa, el perímetro y la superficie libre se calculan desde el contorno guardado. La superficie
  libre es igual al contorno menos los sectores, con una tolerancia del 1 %.
- **CA-04-05** En el cuestionario, las áreas aptas listan las ubicaciones sin sectores, con los bordes primero, y el
  texto alternativo si están todas ocupadas.
- **CA-04-06** Cada alerta aparece solo cuando se cumple su condición: monocultivo con más del 80 %; sin flores con
  F = 0; sin asignar con más del 1 %; cultivo sin datos con "Otro" o un cultivo sin datos publicados.
- **CA-04-07** Cada diagnóstico guarda `version_reglas` y la entrada completa.

**Flujo**
- **CA-04-08** Sin superficie total o sin sectores de cultivo, el botón explica qué falta y no se crea un diagnóstico.
- **CA-04-09** "Solicitar diagnóstico" crea uno y muestra el resultado. Si hay uno vigente, no crea otro y muestra ese.
- **CA-04-10** Después de modificar un sector, el último diagnóstico aparece "Desactualizado". "Actualizar" crea uno
  nuevo y el anterior queda en el historial.
- **CA-04-11** El historial lista todos los diagnósticos de la finca, del más nuevo al más viejo, y cada uno se abre
  con sus datos guardados, aunque la finca haya cambiado.
- **CA-04-12** "Cómo se calculó" muestra las fórmulas con los números del diagnóstico.

**Permisos y seguridad**
- **CA-04-13** Ver o pedir diagnósticos de una finca ajena responde 404, también cambiando el `diagnosticoId` en la
  URL.
- **CA-04-14** El servidor ignora cualquier resultado o superficie enviados por el navegador.
- **CA-04-15** El vigésimo primer diagnóstico en una hora responde "Demasiadas solicitudes".
- **CA-04-16** Al borrar la finca o la cuenta se borran sus diagnósticos (cascada).

**Frontend**
- **CA-04-17** El nivel se entiende sin ver colores (texto e ícono) y la pantalla funciona a 360 px.
- **CA-04-18** Mis fincas muestra el nivel del último diagnóstico, "Sin diagnóstico" o "Desactualizado".

## 11. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Dominio:** `diagnosticar` con los tests de la tabla de ejemplos, alertas, áreas aptas y geometría | `web/src/dominio/diagnostico/` | CA-04-01 a 07 |
| T2 | **Base y acción:** esquema y migración, armado de la entrada, acción con requisitos y límite (después de T1) | `web/src/db/schema/diagnostico.ts`, `…/diagnostico/acciones.ts` | CA-04-08, 09, 13 a 16 |
| T3 | **Pantalla del diagnóstico** con semáforo, medidor, áreas aptas, dibujo y "Cómo se calculó" (en paralelo con T4, después de T2) | `web/src/app/fincas/[id]/diagnostico/` | CA-04-12, 17 |
| T4 | **Historial, desactualizado y etiquetas** en Mis fincas e Inicio (en paralelo con T3) | `…/diagnostico/historial/`, `web/src/app/fincas/` | CA-04-10, 11, 18 |
| T5 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

## 12. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| **Validar los umbrales** de riesgo (20 % y 10 %) y el 80 % de monocultivo con el especialista | Analistas de dominio | Hoy vienen del prototipo, sin validación experta. |
| **Revisar los textos** de mensajes, alertas y beneficios | Grupo | Es lo que lee el productor. Tiene que ser claro y no prometer de más. |
| Confirmar que el **módulo 02 actualiza `actualizado_en`** al guardar sectores | Quien implemente el 02 | Sin eso no funciona "Desactualizado". |
| Decidir si más adelante se suma un **análisis por cultivo** | Grupo | Se descartó para esta versión. |
