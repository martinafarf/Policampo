# Especificación 05: Propuesta de rediseño y plantas de servicio

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 (redacción); Integrantes 2 y 4, analistas de dominio (validación de criterios) |
| **Depende de** | [02](02-establecimientos-y-sectores.md) (geometrías), [03](03-catalogo-de-especies.md) (consulta de plantas), [04](04-diagnostico.md) (diagnóstico) |
| **Reglas que aplica** | RN-01, RN-07, RN-08, RN-09, RN-10, RN-11, RN-12, RS-02, RS-06, RS-07, RS-08, RD-04, RD-08 |
| **Casos de uso** | Generar propuesta de rediseño ([casos de uso](../proyecto/semana-3-alternativas-y-casos-de-uso.md), caso de prueba 04) |

---

## 1. Objetivo y alcance

A partir de un diagnóstico, proponer **dónde ubicar franjas y corredores florales** y **qué mezcla de plantas de
servicio sembrar**, para llegar al porcentaje objetivo (20 % por defecto). Cada recomendación explica **por qué** se
hizo (RN-07).

**Incluye:**
- las alternativas de disposición y su comparación;
- elegir una alternativa y ajustarla: parámetros, dibujo y especies;
- la selección de la mezcla de plantas;
- la propuesta en texto para las fincas cargadas por cuestionario;
- guardar varias propuestas y marcar una como "Elegida";
- la marca de "desactualizada".

**No incluye:**
- el calendario de tareas (06);
- el informe descargable (07);
- costos;
- preguntar por el riego;
- condiciones de suelo.

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Cómo se arma | **El sistema genera las alternativas** con sus números y **el usuario elige** una y la ajusta | El productor compara con información, sin tener que saber de diseño. |
| Disposiciones (croquis y mapa) | Las 4 del mapa de la v1: **perimetral**, **corredores transversales**, **islas centrales** y **matriz**. Además, **"usar la superficie libre"** cuando alcanza | Se reutiliza el trabajo de Agus. La quinta implementa "primero lo libre". |
| Objetivo | **20 % por defecto, ajustable entre 10 % y 40 %**, con aviso si queda por debajo del 20 % | RN-01: se informa, no se bloquea. |
| De dónde sale la superficie | **Primero la superficie libre.** Si no alcanza, de los bordes de los cultivos, mostrando **cuánto pierde cada cultivo** | El productor decide sabiendo el costo productivo. |
| Fincas de cuestionario | **Propuesta en texto + esquema 3×3:** cuántas hectáreas poner en cada ubicación libre y qué disposición conviene | No tienen dibujo, pero sí ubicaciones relativas. |
| Plantas candidatas | **Publicadas, aptas para la ecorregión, con grado mayor que 0 con al menos un cultivo y ningún grado negativo** con los cultivos de la finca | Un antagonismo descarta la planta (RN-08). |
| Mezcla | **De 2 a 4 especies**, eligiendo la combinación que **florece al menos 1 semana antes** de los cultivos y **cubre más del 80 %** de su floración. Si ninguna cumple, la mejor posible, explicando qué semanas quedan descubiertas | Prototipo de calendario de la v1, ampliado (RN-10). |
| Dependencia de la polinización | **Cambia la prioridad.** Si algún cultivo tiene dependencia alta o media, se priorizan las plantas que atraen polinizadores y la cobertura de floración es obligatoria. Si no, se priorizan control biológico y cobertura de suelo | RN-09. |
| Agua | **Solo se informa** la necesidad de agua de cada planta. No se pregunta por el riego | Decisión del grupo. |
| Guardado | **Varias propuestas por finca; una "Elegida".** Una propuesta guardada no cambia | El calendario y el informe usan la elegida. |
| Ajustes del usuario | **Parámetros, especies y dibujo:** puede mover o redibujar franjas. El servidor **recalcula y verifica todo al guardar** | Decisión del grupo, con la misma protección del módulo 02. |
| Costos | **No se muestran** | Decisión del grupo. |
| Cambios posteriores | **"Desactualizada"** con el motivo y un botón para generar otra | Igual que el diagnóstico. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Generar, ajustar, guardar, elegir y borrar propuestas de **sus** fincas. Lo ajeno responde 404 (RS-02). |
| **Administrador** | Lo mismo, solo con sus fincas. |

## 4. Diseño espacial

### 4.1 Superficie objetivo

- **Superficie de flores objetivo** = objetivo % × superficie total.
- **Superficie a agregar** = max(0, superficie de flores objetivo − superficie de flores actual del diagnóstico).
- Si la superficie a agregar es 0, porque la finca ya llega al objetivo, la propuesta solo **recomienda la mezcla**
  para los sectores de flores existentes y no genera franjas.

### 4.2 Disposiciones (croquis y mapa)

Cada disposición genera **franjas**: polígonos dentro del contorno. Se calculan **resolviendo el ancho**, la
cantidad o el tamaño hasta que la **superficie nueva de flores** llegue a la superficie a agregar, con una tolerancia
de 1 %. La superficie nueva es la franja menos lo que ya era sector de flores.

| Disposición | Cómo se genera | Parámetros que se ajustan |
| --- | --- | --- |
| **Usar la superficie libre** | Toma partes de la superficie libre del diagnóstico, empezando por las pegadas al borde, hasta cubrir la superficie a agregar. Solo se ofrece si la superficie libre alcanza. | Ninguno |
| **Perimetral** | Una franja a lo largo de todo el borde del contorno, hacia adentro. | Ancho, que es el resultado |
| **Corredores transversales** | N franjas paralelas que cruzan el terreno. | Cantidad, de 1 a 6; ángulo, de 0° a 180° |
| **Islas centrales** | Parches dentro del terreno, separados de los bordes. | Cantidad de islas, de 1 a 9 |
| **Matriz** | Perimetral + corredores. | Cantidad de corredores; ángulo |

Para cada alternativa se calculan:
- la superficie de franjas;
- el **% de flores logrado**;
- el ancho, si corresponde;
- la **pérdida por cultivo**: superficie de cada sector de cultivo que queda bajo una franja, en ha y en %;
- la superficie libre usada.

Las alternativas se **ordenan por menor pérdida total de cultivo** ("primero lo libre"). A igualdad de pérdida, va
primero la de menor perímetro de franjas, que es más fácil de manejar.

**Ancho mínimo y máximo:** las franjas tienen entre **3 m** y **30 m** de ancho (a validar). Si para llegar al
objetivo hiciera falta salir de ese rango, la alternativa se muestra igual, marcando que **no llega al objetivo** o
que el ancho es excesivo.

Los algoritmos del mapa de la v1 (`mapa/static/mapa/js/salida_mapa.js`) se adaptan a TypeScript **como funciones de
dominio puras**. Funcionan igual sobre coordenadas geográficas (mapa) y planas (croquis).

### 4.3 Edición del dibujo

Después de elegir una alternativa, el usuario puede **mover vértices, borrar franjas o dibujar franjas nuevas**.
Mientras edita, los números se recalculan en el navegador. **Al guardar, el servidor**:
- descarta los números enviados y recalcula todo desde las geometrías;
- valida que cada franja sea un polígono válido (de 3 a 500 vértices, sin cruzarse), **dentro del contorno**, sin
  superponerse con otras franjas, y con un ancho mínimo de 3 m (como el ancho promedio: superficie / largo medio);
- permite que las franjas tapen sectores de cultivo: eso es la pérdida de cultivo, y se informa.

La propuesta guarda `editada_a_mano = true`.

### 4.4 Fincas de cuestionario

Sin dibujo, la propuesta es **en texto**:
- **Disposición recomendada:** **perimetral** si hay al menos 3 ubicaciones de borde libres; si no, **corredores entre
  lotes** ("franjas entre los sectores de cultivo").
- **Reparto:** la superficie a agregar se reparte **en partes iguales entre las ubicaciones de borde libres**. Si no
  hay ninguna libre, se reparte "en los bordes de los sectores de cultivo", en proporción a su superficie, mostrando la
  pérdida por cultivo.
- **Esquema 3×3** con las ubicaciones propuestas resaltadas.
- **El usuario puede cambiar el reparto** entre ubicaciones: el total tiene que dar la superficie a agregar.

## 5. Mezcla de plantas de servicio

### 5.1 Candidatas

Se obtienen **solo** con la consulta del catálogo (módulo 03). Una planta es candidata si:
- está **publicada** y es **apta para la ecorregión** de la finca;
- tiene grado **mayor que 0** con al menos un cultivo de la finca, y **ningún grado negativo** con ninguno (RN-08);
- **si la prioridad es control biológico** (5.3), además tiene la función control biológico o cobertura de suelo.

**Puntaje de compatibilidad** de cada candidata: la suma, para cada cultivo, de su grado × (superficie de ese cultivo
/ superficie total de cultivos). Los cultivos sin compatibilidad cargada suman 0.

Si no queda ninguna candidata, la propuesta se guarda **sin mezcla**, con el mensaje "No se encontraron cultivos de
servicio compatibles para {cultivos} en {ecorregión}" (caso de prueba 04).

### 5.2 Floración: anticipación y cobertura (RN-10)

Para cada cultivo con datos de floración publicados en la ecorregión:
- **Anticipación:** la mezcla tiene que florecer en la **semana anterior al inicio** de cada rango de floración del
  cultivo. La semana anterior a la 1 es la 52.
- **Cobertura:** de las semanas en que florece el cultivo, qué porcentaje cubre la floración de la mezcla (la unión de
  la floración de sus especies). Tiene que ser **más del 80 %**.

Los cultivos sin datos de floración (por ser "Otro" o no estar publicados) no se evalúan y se avisa: "No sabemos
cuándo florece {cultivo}: la mezcla no está ajustada a su floración."

Los valores de 1 semana y 80 % son constantes con nombre: están **a validar**.

### 5.3 Prioridad según la dependencia de la polinización (RN-09)

| Situación de los cultivos de la finca | Prioridad | Floración (5.2) |
| --- | --- | --- |
| Algún cultivo con dependencia **alta o media** | **Atraer polinizadores** | **Obligatoria** para esos cultivos |
| Todos con dependencia **baja o ninguna** | **Control biológico y cobertura de suelo** | Deseable: suma, pero no descarta |

### 5.4 Elección de la combinación

1. **Se limitan las candidatas:** se toman las **15** de mayor puntaje de compatibilidad.
2. **Se generan las combinaciones** de 2, 3 y 4 especies.
3. **Se ordenan con este criterio,** en este orden:
   1. cumple la floración obligatoria (5.3): primero las que cumplen para más cultivos;
   2. mayor cobertura promedio de floración;
   3. **menos especies**, porque es más simple de manejar;
   4. más especies de **flora espontánea o del mercado local**;
   5. menor **riesgo de maleza** sumado;
   6. mayor puntaje de compatibilidad sumado.
4. **Se elige la primera.** Si no cumple la floración obligatoria, se muestra igual, con las **semanas descubiertas**
   de cada cultivo.
5. **Proporciones:** las especies van en **partes iguales** de la mezcla. Por ejemplo, 3 especies van al 33,3 % cada
   una.

Si hay **una sola** candidata, la mezcla es de 1 especie, con el aviso "Hay una sola planta compatible: conviene
consultar con un ingeniero agrónomo".

### 5.5 Explicación (RN-07)

Para cada especie de la mezcla se muestra:
- **por qué entra:** el grado y la justificación con cada cultivo, la función y si es espontánea o local;
- cuándo se siembra, florece y se corta en esa ecorregión;
- su **necesidad de agua** y su **riesgo de maleza**, solo informativos;
- la fuente del dato.

Para la mezcla completa se muestra la anticipación y la cobertura por cultivo, con un pequeño gráfico de semanas: el
cultivo contra la mezcla.

### 5.6 Cambiar una especie

El usuario puede **reemplazar** una especie por otra **candidata**, nunca por una que no lo sea. El sistema recalcula
la anticipación y la cobertura, y avisa si la nueva mezcla deja de cumplir. Al guardar, el servidor vuelve a verificar
que todas sean candidatas.

## 6. Flujos

### 6.1 Generar

1. Desde el diagnóstico, o desde la ficha, **"Ver propuesta de rediseño"** se activa (estaba desactivado en el 04).
   - Si no hay un diagnóstico vigente, pide actualizarlo primero.
2. `/fincas/[id]/propuestas/nueva` genera:
   - **en croquis y mapa:** las alternativas, como tarjetas comparables con una miniatura, el % logrado, la pérdida de
     cultivo y el ancho;
   - **en cuestionario:** la propuesta en texto con su esquema;
   - **en todos:** la mezcla de plantas recomendada, que es la misma para cualquier disposición.
3. Arriba se ve el **objetivo** (20 %), que se puede cambiar entre 10 % y 40 %. Al cambiarlo, se regeneran las
   alternativas.
4. El usuario **elige** una alternativa: se abre el editor con el dibujo y los parámetros.
5. Ajusta parámetros, dibujo o especies (4.2, 4.3 y 5.6). Hay un **borrador local** en
   `policampo_borrador_propuesta_<id-finca>` (RS-08).
6. **Guardar:** el usuario le pone un nombre opcional, como "Perimetral 20 %". El servidor recalcula, valida y guarda.
   Si es la primera propuesta de la finca, queda como **Elegida**.

### 6.2 Ver, elegir y administrar

- **`/fincas/[id]/propuestas`** muestra la lista de propuestas guardadas con su nombre, fecha, disposición, % logrado,
  pérdida de cultivo, la etiqueta **Elegida** y, si corresponde, **Desactualizada**.
- **`/fincas/[id]/propuestas/[propuestaId]`** muestra el detalle: el dibujo o el esquema, los números, la mezcla con
  su explicación y los avisos.
- **Acciones:**
  - **"Marcar como elegida"**, que quita la marca de la anterior;
  - **"Duplicar y editar"**, que crea una nueva a partir de esta;
  - **"Borrar"**, con confirmación.

  Una propuesta guardada no se edita.
- **Fuera de las propuestas:** en Inicio se activa la tarjeta **"Rediseño"**, que lleva a Mis fincas. La ficha de la
  finca muestra la propuesta elegida, si hay.

### 6.3 Desactualizada

Una propuesta queda **Desactualizada**, con el motivo, si pasa alguna de estas cosas:
- la finca cambió después de crearla;
- hay un diagnóstico más nuevo que el que usó;
- alguna especie de su mezcla **ya no está publicada**.

La propuesta se sigue mostrando tal cual se guardó, incluidas las especies retiradas. Ofrece **"Generar una nueva"**.

## 7. Frontend

| Ruta | Pantalla |
| --- | --- |
| `/fincas/[id]/propuestas` | Propuestas guardadas |
| `/fincas/[id]/propuestas/nueva` | Alternativas, editor y mezcla |
| `/fincas/[id]/propuestas/[propuestaId]` | Detalle |

- **Celular primero:**
  - las alternativas se ven como un carrusel de tarjetas;
  - el editor reutiliza el croquis y el mapa del módulo 02, con una capa de franjas en otro color y la pérdida de
    cultivo rayada;
  - los botones para mover, borrar y dibujar son grandes.
- **Gráfico de semanas:** dos barras de 12 meses, cultivo y mezcla, con la semana de anticipación marcada, y un texto
  alternativo como "La mezcla florece desde septiembre; el tomate, desde octubre. Cubre el 92 %.".
- **Avisos visibles:**
  - objetivo debajo del 20 %;
  - no llega al objetivo;
  - ancho fuera de rango;
  - floración sin cubrir;
  - cultivo sin datos;
  - una sola especie o ninguna.

## 8. Backend

| Qué | Dónde |
| --- | --- |
| Disposiciones, resolución del ancho y pérdida por cultivo | `web/src/dominio/propuesta/disposiciones.ts`: funciones puras |
| Candidatas, puntaje, floración y elección de la mezcla | `web/src/dominio/propuesta/mezcla.ts`: funciones puras. Recibe los datos del catálogo ya consultados. |
| Reparto del cuestionario | `web/src/dominio/propuesta/cuestionario.ts` |
| Acciones: generar, guardar, elegir, duplicar, borrar | `web/src/app/fincas/[id]/propuestas/acciones.ts` |
| Esquema | `web/src/db/schema/propuesta.ts` |

**Reglas del servidor:**
- **Dueño:** la finca se carga filtrando por el usuario de la sesión. 404 si no es suya, también por `propuestaId`.
- **Generar:** las candidatas y la mezcla se calculan **en el servidor**, con la consulta del catálogo. El navegador
  puede previsualizar los ajustes, pero **guardar siempre recalcula y verifica**: geometrías (4.3), que las especies
  sean candidatas (5.6) y los números.
- **Guardado:** se hace en una transacción. **"Elegida":** única por finca, garantizada en la base.
- **Límites:** 30 propuestas guardadas por finca; 1 MB por petición; 20 franjas por propuesta.

## 9. Base de datos

**`propuesta`**

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid | PK |
| `establecimiento_id` | uuid | FK, **`ON DELETE CASCADE`** |
| `diagnostico_id` | uuid | FK a `diagnostico`, `ON DELETE CASCADE` |
| `creado_en` | timestamptz | |
| `nombre` | texto | Opcional, hasta 60 caracteres |
| `version_reglas` | texto | Igual que en el diagnóstico |
| `elegida` | booleano | **Índice único parcial** en (`establecimiento_id`) donde `elegida = true` |
| `objetivo_pct` | numeric(4,1) | Entre 10 y 40 |
| `disposicion` | enum `superficie_libre`, `perimetral`, `transversal`, `islas`, `matriz`, `texto` | `texto` es la del cuestionario |
| `parametros` | jsonb | Cantidad, ángulo, ancho resultante |
| `franjas` | jsonb | GeoJSON. Nulo en cuestionario. |
| `reparto` | jsonb | Ubicación → ha. Solo cuestionario. |
| `editada_a_mano` | booleano | |
| `superficie_franjas_ha`, `superficie_libre_usada_ha` | numeric(12,4) | |
| `porcentaje_logrado` | numeric(5,1) | |
| `perdida_por_cultivo` | jsonb | Lista de `{ sector, cultivo, ha, pct }` |
| `floracion` | jsonb | Anticipación, cobertura y semanas descubiertas por cultivo |
| `avisos` | jsonb | |

**`propuesta_especie`**

| Campo | Tipo | Notas |
| --- | --- | --- |
| `propuesta_id` | uuid | FK, **`ON DELETE CASCADE`** |
| `planta_id` | uuid | FK a `planta_servicio`, **`ON DELETE RESTRICT`**: una planta usada no se borra (módulo 03) |
| `proporcion_pct` | numeric(4,1) | |
| `orden` | entero | |
| `copia` | jsonb | **Copia** de los datos de la planta en ese momento: nombres, grados y justificaciones, semanas de la ecorregión, agua, riesgo de maleza y fuente. La propuesta se muestra igual aunque el catálogo cambie. |

## 10. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Propuestas ajenas | Filtrar por el dueño de la finca. 404 también por `propuestaId`. | RS-02 |
| Números o especies manipulados al guardar | El servidor recalcula todo y verifica que las especies sean candidatas publicadas. | RS-06, RN-07 |
| Geometrías maliciosas | Las mismas validaciones del módulo 02, más 20 franjas como máximo y 1 MB. | RS-06 |
| Recomendar algo no validado | Las candidatas salen solo de la consulta de lo publicado (módulo 03). | RN-13 |
| Recomendaciones no trazables | Explicación por especie, versión de las reglas y copia de los datos del catálogo. | RN-07 |
| Borradores en una computadora compartida | Clave por finca. Se borra al guardar y al cerrar sesión. | RS-08 |

## 11. Criterios de aceptación

**Diseño espacial**
- **CA-05-01** Con un objetivo del 20 %, la superficie a agregar es 0,20 × total − flores actuales. Si es 0, no se
  generan franjas y solo se recomienda la mezcla.
- **CA-05-02** En croquis y mapa se generan las disposiciones perimetral, transversal, islas y matriz, más "superficie
  libre" cuando alcanza. Cada una llega a la superficie a agregar con una tolerancia de 1 %, o se marca que no llega.
- **CA-05-03** Las alternativas se ordenan por menor pérdida de cultivo. Con superficie libre suficiente, "Usar la
  superficie libre" va primera, con pérdida 0.
- **CA-05-04** La pérdida por cultivo se calcula como la superficie de cada sector de cultivo bajo las franjas.
- **CA-05-05** Ejemplo perimetral: croquis cuadrado de 4 ha (lado 200 m), sin flores y con objetivo de 20 %, da
  0,8 ha (8.000 m²) a agregar. La franja interior de ancho *w* ocupa 200² − (200 − 2w)² = 8.000, de donde
  w = (200 − √32.000) / 2 ≈ **10,6 m**. Se acepta una tolerancia de 1 % en la superficie.
- **CA-05-06** Cambiar el objetivo a 15 % muestra el aviso de que está debajo del 20 % y regenera las alternativas.
  Los valores fuera de 10 a 40 se rechazan.
- **CA-05-07** En el cuestionario, la disposición es perimetral si hay 3 o más bordes libres y el reparto es en partes
  iguales entre ellos. El reparto editado tiene que sumar la superficie a agregar.

**Edición**
- **CA-05-08** Una franja dibujada a mano fuera del contorno, superpuesta con otra, con más de 500 vértices o de menos
  de 3 m de ancho promedio se rechaza al guardar.
- **CA-05-09** Si el navegador envía números falsos, el servidor guarda los recalculados. La propuesta queda con
  `editada_a_mano`.

**Mezcla**
- **CA-05-10** Las candidatas excluyen las plantas no publicadas, las no aptas para la ecorregión y las que tienen
  algún grado negativo con un cultivo de la finca. Con prioridad control biológico, solo entran las que tienen esa
  función o cobertura de suelo.
- **CA-05-11** Ejemplo: tomate con floración en las semanas 40 a 52 y 1 a 4, dependencia alta. Una mezcla que florece
  en las semanas 38 a 52 y 1 a 2 cumple la anticipación (semana 39) y cubre 15 de 17 semanas (88 %): **cumple**. Una
  que florece en las semanas 41 a 52 no cumple la anticipación.
- **CA-05-12** La elección respeta el orden de criterios de 5.4. Ante dos combinaciones con igual cobertura, gana la
  de menos especies.
- **CA-05-13** Sin candidatas, se muestra "No se encontraron cultivos de servicio compatibles…" y la propuesta se
  puede guardar sin mezcla.
- **CA-05-14** Reemplazar una especie solo ofrece candidatas. Al guardar, una especie no candidata enviada por el
  navegador se rechaza.
- **CA-05-15** Cada especie muestra su justificación por cultivo, sus semanas, agua, riesgo de maleza y fuente. La
  mezcla muestra la cobertura por cultivo.

**Guardado y estado**
- **CA-05-16** La primera propuesta guardada queda Elegida. Marcar otra quita la marca anterior: nunca hay dos
  elegidas en una finca.
- **CA-05-17** Una propuesta guardada no cambia. "Duplicar y editar" crea una nueva.
- **CA-05-18** Una propuesta queda Desactualizada si la finca cambió, si hay un diagnóstico más nuevo o si una especie
  dejó de estar publicada. Muestra el motivo y sigue mostrando la especie retirada desde su copia.
- **CA-05-19** Las propuestas de otra finca o de otro usuario responden 404.
- **CA-05-20** Al borrar la finca o la cuenta se borran sus propuestas. Una planta usada en una propuesta no se puede
  borrar del catálogo.
- **CA-05-21** El editor y el detalle funcionan a 360 px, con el gráfico de semanas con texto alternativo.

## 12. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Dominio espacial:** disposiciones, resolución del ancho, pérdida por cultivo, validación de franjas y reparto del cuestionario | `web/src/dominio/propuesta/disposiciones.ts`, `cuestionario.ts` | CA-05-01 a 05, 07, 08 |
| T2 | **Dominio de la mezcla:** candidatas, puntaje, floración y elección (en paralelo con T1) | `web/src/dominio/propuesta/mezcla.ts` | CA-05-10 a 13 |
| T3 | **Base y acciones:** esquema, migración, generar, guardar con recálculo, elegir, duplicar y borrar (después de T1 y T2) | `web/src/db/schema/propuesta.ts`, `acciones.ts` | CA-05-09, 14, 16, 17, 19, 20 |
| T4 | **Pantallas:** alternativas, editor con dibujo y mezcla con explicación (después de T3) | `web/src/app/fincas/[id]/propuestas/` | CA-05-06, 15, 21 |
| T5 | **Desactualizada,** activación en el diagnóstico, la ficha e Inicio (en paralelo con T4) | — | CA-05-18 |
| T6 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

## 13. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| **Validar** la anticipación de 1 semana, la cobertura del 80 %, el ancho de franja de 3 a 30 m y el límite de 2 a 4 especies | Analistas de dominio con el especialista | Hoy son valores del prototipo o propuestos. |
| Revisar si las **proporciones iguales** de la mezcla son razonables, o si cada especie necesita su proporción o dosis propia | Analistas de dominio | Afecta la siembra real. |
| Confirmar que la **pérdida de cultivo** se entiende bien en la pantalla | Grupo | Es la información más sensible para el productor. |
| **Costos:** se descartaron por ahora. Retomarlos si el grupo consigue precios de referencia confiables | Grupo | El documento del proyecto los menciona. |
| **Agua:** solo se informa. Si en las pruebas aparecen recomendaciones de plantas de mucha agua para fincas de secano, reconsiderar preguntar por el riego | Grupo | Riesgo de recomendaciones inviables. |
