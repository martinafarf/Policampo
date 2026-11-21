# Especificación 03: Catálogo de especies y compatibilidades

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 (redacción); Integrantes 2 y 4, analistas de dominio (contenido) |
| **Depende de** | [01](01-usuarios-y-autenticacion.md) (roles), [02](02-establecimientos-y-sectores.md) (tabla `cultivo`) |
| **Reglas que aplica** | RN-07, RN-08, RN-09, RN-10, RN-11, RN-12, RN-13, RS-02, RS-03, RS-06, RS-07, RD-04, RD-08 |

---

## 1. Objetivo y alcance

Construir la **base de conocimiento** de la que salen el diagnóstico, las recomendaciones y el calendario:
- las **plantas de servicio**;
- los **datos agronómicos de los cultivos**;
- la **compatibilidad** entre unos y otros.

La mantienen los administradores, con datos validados y con su fuente. Los usuarios la consultan en una **Guía de
especies**.

**Incluye:**
- el backoffice de plantas de servicio, de datos agronómicos de cultivos y de compatibilidades;
- los estados borrador, publicado y retirado;
- el historial de cambios;
- importar y exportar CSV;
- los datos iniciales tomados de los prototipos y de la entrevista;
- la Guía de especies para usuarios.

**No incluye:**
- la lógica que elige qué plantas recomendar en una finca (módulo 05);
- el calendario de cada finca (06);
- fotos;
- una tabla de polinizadores.

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Períodos (siembra, floración, corte, cosecha) | **Rangos de semanas del año (1 a 52)**. Se cargan y se muestran como meses y quincenas | Permite calcular solapamientos y la floración anticipada (RN-10), como el prototipo de calendario. |
| Períodos por región | **Por ecorregión**: cada especie indica dónde es apta y sus períodos en cada lugar. Sin datos para una ecorregión, no se recomienda ahí | Una planta florece distinto en Yungas que en la Puna (RN-12). |
| Compatibilidad | **Escala de −5 a +5** con justificación agronómica obligatoria | Como el prototipo de diagnóstico. Permite ordenar recomendaciones. |
| Polinizadores | **Solo como texto descriptivo** en especies y cultivos | No hay una lista validada de polinizadores de Jujuy (entrevista al Especialista 1). |
| Datos agronómicos del cultivo | **Dependencia de la polinización, tipo de polinización, polinizadores que necesita y semanas de floración y cosecha por ecorregión** | Los necesitan el diagnóstico (RN-09) y el calendario (RN-10). |
| Validación | **Estados Borrador, Publicado y Retirado**. Publicar exige **fuente** y **quién validó**. Solo lo publicado se usa | Recomendaciones trazables y validadas (RN-07, RN-13). |
| Datos iniciales | **De los prototipos y de la entrevista, en Borrador**, para que los validen los analistas de dominio | Se aprovecha lo relevado sin publicar nada sin validar. |
| Fotos | **No por ahora** | Evita almacenamiento, licencias y datos móviles. |
| Quitar del catálogo | **Retirar** en lugar de borrar. Solo se borra lo que está en Borrador y nunca se usó | Las propuestas e informes ya generados no pierden información. |
| Historial | **Registro de cada cambio**: quién, cuándo, qué acción y el valor antes y después | Explica por qué cambió una recomendación. |
| Consulta de usuarios | **Guía de especies** de solo lectura, para usuarios con sesión | Aporta valor aunque el usuario todavía no tenga una propuesta. |
| Carga masiva | **Formularios + importar y exportar CSV**. Lo importado entra en Borrador, con vista previa y errores por fila | Los analistas van a cargar muchas especies. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Ver la **Guía de especies**: solo lo publicado, sin borradores, retirados ni historial. |
| **Administrador** | Todo lo del backoffice del catálogo: crear, editar, publicar, retirar, importar, exportar y ver el historial. Los analistas de dominio que cargan datos tienen que tener rol Administrador (RS-03: solo hay dos roles). |

## 4. Datos

### 4.1 Planta de servicio

| Dato | Obligatorio | Regla |
| --- | --- | --- |
| Clave | Sí | Única, en minúsculas, con guiones bajos. Por ejemplo `trigo_sarraceno`. No cambia después de creada. |
| Nombre común | Sí | Hasta 80 caracteres. |
| Nombre científico | Para publicar | Hasta 120 caracteres. Por ejemplo *Fagopyrum esculentum*. |
| Funciones | Sí, al menos una | Una o varias: **atrae polinizadores**, **control biológico** (atrae enemigos naturales de plagas), **cobertura de suelo**, **aporta fertilidad** (fija nitrógeno), **refugio**. |
| Ciclo | Sí | Anual, bianual o perenne. |
| Origen | Sí | Nativa de la región, introducida o desconocido. |
| Disponibilidad | Sí | **Flora espontánea** (crece sola y se puede conservar sin costo) y/o **se consigue en el mercado local**. Al menos una de las dos (RN-12). |
| Polinizadores o insectos que atrae | No | Texto, hasta 300 caracteres. |
| Beneficios | Para publicar | Texto, hasta 1.000 caracteres. |
| Necesidad de agua | Sí | Baja, media o alta. |
| Manejo y corte | Para publicar | Texto: cómo y cuándo cortar para que no se convierta en maleza (RN-11). Hasta 500 caracteres. |
| Riesgo de volverse maleza | Sí | Bajo, medio o alto. |
| Dosis de siembra | No | Texto. Por ejemplo "20–30 kg/ha" o "plantín cada 40 cm". |
| Costo de referencia | No | Pesos por hectárea, con la fecha del dato (los precios cambian). |
| Estado, fuente, validado por | Ver 4.5 | — |

### 4.2 Períodos por ecorregión

Una fila por especie y ecorregión en la que es apta:

| Dato | Regla |
| --- | --- |
| Ecorregión | Una de las 5 (módulo 02). |
| Semanas de siembra | Uno o más rangos `[inicio, fin]` entre 1 y 52. Un rango puede cruzar el fin de año, por ejemplo `[[40, 52], [1, 4]]`. |
| Semanas de floración | Igual que la siembra. Obligatorio para publicar. |
| Semanas de corte | Igual que la siembra. |
| Semanas desde la siembra hasta la floración | Mínimo y máximo. Por ejemplo, de 8 a 10. |

**Semanas y fechas:**
- **Qué semana es:** la semana `n` va del día `7·(n−1)+1` al día `7·n` del año. La semana 52 llega hasta el 31 de
  diciembre.
- **Carga por quincenas:** la pantalla carga por **quincenas**. La primera quincena de enero corresponde a las semanas
  1 y 2, y así sucesivamente.
- **Única fuente:** la conversión está en una sola función de dominio, con tests, y la usan la carga, la Guía, el
  calendario y la importación.

### 4.3 Datos agronómicos del cultivo

Amplía la tabla `cultivo` del módulo 02. `activo` sigue indicando si se puede elegir al cargar un sector.

| Dato | Regla |
| --- | --- |
| Dependencia de la polinización | **Alta, media, baja o ninguna** (RN-09). Por ejemplo, el tomate es alta y la caña de azúcar, ninguna. Obligatoria para publicar. |
| Tipo de polinización | Texto. Por ejemplo "por vibración (abejorros y abejas nativas)". |
| Polinizadores que necesita | Texto, hasta 300 caracteres. |
| Períodos por ecorregión | Semanas de **floración** y de **cosecha**, con el mismo formato que 4.2. La floración es obligatoria para publicar en esa ecorregión. |

### 4.4 Compatibilidad

| Dato | Regla |
| --- | --- |
| Cultivo y planta de servicio | El par es único. |
| Grado | Entero de **−5** (antagonismo: no recomendar) a **+5** (máxima sinergia). 0 es neutra. |
| Justificación agronómica | Obligatoria, de 10 a 500 caracteres. Se muestra al productor ("se recomienda porque…", RN-07). |

### 4.5 Estado, fuente y validación

Se aplica a las plantas de servicio, a los datos agronómicos de los cultivos y a las compatibilidades.

| Estado | Significado | Se usa para recomendar | Se ve en la Guía |
| --- | --- | --- | --- |
| **Borrador** | Recién cargado o importado, sin validar | No | No |
| **Publicado** | Validado por un especialista | Sí | Sí |
| **Retirado** | Ya no se recomienda | No | No. Sí se sigue mostrando dentro de propuestas e informes ya generados. |

**Para publicar:**
- tienen que estar completos los campos marcados "Para publicar";
- tiene que haber una **fuente**: tipo (bibliografía, entrevista, institución u observación propia) y descripción.
  Por ejemplo "Garibaldi y otros, *Paisajes agrícolas multifuncionales*" o "Entrevista Especialista 1". Nunca nombres
  de personas reales (RS-09);
- tiene que indicarse **quién lo validó**, como texto con un identificador anónimo o un rol. Por ejemplo "Especialista
  1" o "Analista de dominio (Integrante 2)".

Una compatibilidad solo se puede publicar si su cultivo y su planta están publicados. Al retirar una planta o un
cultivo, sus compatibilidades quedan inutilizables para recomendar, aunque conservan su estado.

**Borrar** solo se permite en estado Borrador y si el registro **nunca se usó** en una propuesta (módulo 05). En otro
caso, se retira.

## 5. Flujos

### 5.1 Plantas de servicio (administrador)

1. **`/admin/catalogo/plantas`:**
   - tabla con nombre común, nombre científico, funciones, ecorregiones con datos, estado y última modificación;
   - filtros por estado, ecorregión y función, y búsqueda por nombre.
2. **"Nueva planta" o "Editar":**
   - un formulario con los datos de 4.1;
   - una sección **"Períodos por ecorregión"**: para cada ecorregión se puede agregar una fila con una grilla de 24
     quincenas, donde se tocan las de siembra, floración y corte, más las semanas hasta la floración.
3. **"Guardar"** mantiene el estado. **"Publicar"** valida lo que exige 4.5 y, si falta algo, lista qué falta.
   **"Retirar"** pide confirmación y un motivo.
4. **Cada acción queda en el historial** (5.5).

### 5.2 Cultivos (administrador)

`/admin/catalogo/cultivos`:
- tabla de cultivos con activo, dependencia de la polinización y estado;
- edición con los datos de 4.3 y la grilla de quincenas de floración y cosecha por ecorregión.

Se pueden crear cultivos nuevos: aparecen en la lista del módulo 02 cuando están **activos**.

### 5.3 Compatibilidades (administrador)

`/admin/catalogo/compatibilidades` muestra una **matriz**: cultivos en filas y plantas de servicio en columnas.
- **Celdas:** muestran el grado con color (rojo los negativos, gris el 0, verde los positivos) o vacío si no hay dato.
- **Al tocar una celda:** se edita el grado, la justificación, la fuente y el estado.
- **En el celular:** la matriz se cambia por una lista filtrada por cultivo.

### 5.4 Importar y exportar CSV

- **Exportar:** descarga `plantas.csv`, `periodos.csv` y `compatibilidades.csv` con el catálogo completo, o filtrado por
  estado.
- **Importar:**
  1. Se sube uno de esos tres archivos (UTF-8, hasta 2 MB y 2.000 filas).
  2. Se muestra una **vista previa**: filas nuevas, filas que modifican registros existentes (por clave) y **errores
     por fila**.
  3. Si hay errores, no se puede confirmar hasta corregir el archivo.
  4. Al confirmar, todo entra en **Borrador**, en una sola transacción, y queda en el historial como "importación".
  5. **Importar nunca publica ni retira.**
- **Formato:** las columnas de cada archivo se documentan en la propia pantalla, con un archivo de ejemplo descargable.
  Los rangos de semanas se escriben como `40-52;1-4`.

### 5.5 Historial

`/admin/catalogo/historial`:
- cada cambio muestra la fecha, el administrador (nombre de usuario), la entidad, la acción y los campos que
  cambiaron, con su valor anterior y el nuevo;
- se puede filtrar por entidad y por administrador;
- **el historial no se edita ni se borra.**

### 5.6 Guía de especies (usuarios)

- **`/guia-especies`:**
  - tarjetas de las plantas **publicadas**;
  - filtros por **ecorregión**, por **cultivo** (muestra las compatibles con grado mayor que 0, ordenadas por grado)
    y por **función**.
- **`/guia-especies/[clave]`:**
  - todos los datos publicados;
  - un **calendario visual** de siembra, floración y corte por ecorregión, con 12 meses;
  - los cultivos compatibles con su justificación;
  - la fuente.
- Aviso fijo: "Información orientativa. Consultá con un ingeniero agrónomo antes de implementar."

## 6. Frontend

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/admin/catalogo` | Resumen: cantidades por estado y accesos | Administrador |
| `/admin/catalogo/plantas`, `/nueva`, `/[id]` | Plantas de servicio | Administrador |
| `/admin/catalogo/cultivos`, `/[id]` | Datos agronómicos de cultivos | Administrador |
| `/admin/catalogo/compatibilidades` | Matriz de compatibilidad | Administrador |
| `/admin/catalogo/importar` | Importar y exportar CSV | Administrador |
| `/admin/catalogo/historial` | Historial | Administrador |
| `/guia-especies`, `/guia-especies/[clave]` | Guía de especies | Usuario con sesión |

- **Rutas de administración:** sin rol de administrador responden **404**, como en el módulo 01.
- **Inicio** (módulo 01) suma la tarjeta **"Guía de especies"**.
- **Grilla de quincenas:**
  - 24 casillas, de enero a diciembre, en dos filas en el celular;
  - un color por tipo de período;
  - accesible con el teclado;
  - con un texto alternativo como "Floración: octubre a enero".
- **Estados:** etiquetas de color Borrador (gris), Publicado (verde) y Retirado (tachado).

## 7. Backend

| Qué | Dónde |
| --- | --- |
| Esquema Drizzle | `web/src/db/schema/catalogo.ts`. Amplía `cultivo` del módulo 02. |
| Dominio: conversión de semanas y quincenas, validación de rangos, reglas de publicación, comparación antes/después para el historial | `web/src/dominio/catalogo/`. Funciones puras con tests. |
| Consultas para otros módulos: "plantas publicadas aptas para la ecorregión X y compatibles con el cultivo Y, ordenadas por grado" | `web/src/dominio/catalogo/consultas.ts`. **Es la única puerta** del motor de reglas al catálogo (módulos 04 a 06). Devuelve solo lo publicado. |
| Acciones de administración | `web/src/app/admin/catalogo/…/acciones.ts`. Cada una verifica el rol en el servidor y escribe el historial **en la misma transacción** que el cambio. |
| Importar y exportar CSV | `web/src/dominio/catalogo/csv.ts`. Para leer CSV se usa una librería mantenida, que se aprueba como dependencia nueva según AGENTS.md. |

## 8. Base de datos

Migraciones con Drizzle (RD-08). Todas las tablas tienen `creado_en` y `actualizado_en`. `estado` es un enum
(`borrador`, `publicado`, `retirado`). La fuente tiene dos campos: `fuente_tipo` (enum) y `fuente_detalle` (texto).

| Tabla | Campos principales | Restricciones |
| --- | --- | --- |
| `planta_servicio` | `id`, `clave`, `nombre_comun`, `nombre_cientifico`, `funciones` (arreglo de enum), `ciclo`, `origen`, `es_espontanea`, `en_mercado_local`, `polinizadores_que_atrae`, `beneficios`, `necesidad_agua`, `manejo_corte`, `riesgo_maleza`, `dosis_siembra`, `costo_referencia_ars_ha`, `costo_referencia_fecha`, `estado`, `fuente_tipo`, `fuente_detalle`, `validado_por` | `clave` única. `CHECK (es_espontanea OR en_mercado_local)`. `CHECK` de que estén los campos obligatorios si `estado = publicado`. |
| `planta_servicio_ecorregion` | `planta_id`, `ecorregion`, `siembra_semanas`, `floracion_semanas`, `corte_semanas` (jsonb con los rangos), `semanas_hasta_floracion_min`, `semanas_hasta_floracion_max` | PK (`planta_id`, `ecorregion`). FK con `ON DELETE CASCADE`. Los rangos se validan en el dominio. |
| `cultivo` (amplía la del módulo 02) | + `dependencia_polinizacion`, `tipo_polinizacion`, `polinizadores_necesarios`, `estado`, `fuente_tipo`, `fuente_detalle`, `validado_por` | — |
| `cultivo_ecorregion` | `cultivo_id`, `ecorregion`, `floracion_semanas`, `cosecha_semanas` | PK (`cultivo_id`, `ecorregion`) |
| `compatibilidad` | `id`, `cultivo_id`, `planta_id`, `grado`, `justificacion`, `estado`, `fuente_tipo`, `fuente_detalle`, `validado_por` | Único (`cultivo_id`, `planta_id`). `CHECK (grado BETWEEN -5 AND 5)`. FK **`ON DELETE RESTRICT`**: no se borra una planta o un cultivo con compatibilidades. |
| `cambio_catalogo` | `id`, `entidad`, `entidad_id`, `accion` (`alta`, `edicion`, `publicacion`, `retiro`, `borrado`, `importacion`), `administrador_id` (FK a `user`, **`ON DELETE SET NULL`**), `fecha`, `antes` (jsonb), `despues` (jsonb), `motivo` | Solo inserción: la aplicación no actualiza ni borra filas. |

**Datos iniciales.** Van por migración, todo en **Borrador**, y cada registro dice en `fuente_detalle` de dónde salió.

| Fuente | Qué se carga |
| --- | --- |
| Prototipo de diagnóstico | **Plantas:** caléndula, borraja, *Vicia villosa* y trébol blanco, con sus textos de período, corte, agua y beneficios. **Compatibilidades:** tomate y pimiento, con sus grados y justificaciones. |
| Prototipo de calendario | **Plantas:** caléndula, albahaca, lavanda, romero, trébol blanco y mostaza blanca, con semanas de plantado y floración y tiempo hasta la floración. **Cultivos:** semanas de floración y cosecha de tomate y morrón (pimiento). La ecorregión de esos datos está **a confirmar**: se cargan como Valles Templados. |
| Entrevista al Especialista 1 | **Plantas:** hinojo, perejil y trigo sarraceno, con la función "atrae polinizadores", flora espontánea cuando corresponda, y sin períodos. |

## 9. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Un usuario modifica el catálogo | Toda acción de `/admin/catalogo` verifica el rol de administrador en el servidor. Sin rol, 404. | RS-03 |
| Recomendaciones basadas en datos sin validar | La consulta para el motor (sección 7) devuelve **solo** lo publicado. Hay tests que lo verifican. | RN-07, RN-13 |
| Cambios sin rastro | Historial obligatorio en la misma transacción. Sin edición ni borrado del historial. | RN-07 |
| Archivos CSV maliciosos | Tope de 2 MB y 2.000 filas. Validación por fila. Todo entra en Borrador. Nada se aplica sin vista previa. | RS-06 |
| Inyección de fórmulas al abrir el CSV exportado en Excel | Las celdas que empiezan con `=`, `+`, `-`, `@`, tabulación o retorno de carro se exportan con `'` adelante. | RS-07 |
| HTML o scripts en los textos (beneficios, justificaciones) | Texto plano con largos máximos. React escapa al mostrar. | RS-07 |
| Datos personales en las fuentes | Las fuentes y "validado por" usan identificadores anónimos. El formulario lo recuerda. | RS-09 |
| Exposición de borradores | La Guía y cualquier consulta de usuario filtran por `estado = publicado`. | RS-02 |

## 10. Criterios de aceptación

**Plantas, cultivos y períodos**
- **CA-03-01** El administrador crea, edita y lista plantas de servicio con los datos de 4.1. La clave es única y no se
  puede cambiar.
- **CA-03-02** Los rangos de semanas aceptan valores de 1 a 52, incluso cruzando el fin de año. Se rechazan valores
  fuera de rango o con inicio mayor que fin dentro de un mismo rango.
- **CA-03-03** La conversión de quincenas a semanas y de semanas a meses es reversible y está cubierta por tests. Por
  ejemplo, la primera quincena de enero son las semanas 1 y 2.
- **CA-03-04** El administrador amplía un cultivo con su dependencia de la polinización y sus semanas de floración y
  cosecha por ecorregión. Un cultivo activo nuevo aparece en la lista del módulo 02.

**Estados**
- **CA-03-05** Publicar falla, indicando qué falta, si no hay fuente, quién validó, nombre científico, beneficios,
  manejo y corte, o al menos una ecorregión con floración.
- **CA-03-06** Una compatibilidad no se puede publicar si su cultivo o su planta no están publicados.
- **CA-03-07** Retirar pide un motivo. Lo retirado no aparece en la Guía ni en la consulta para el motor.
- **CA-03-08** Solo se puede borrar un registro en Borrador que nunca se usó. Si no, se ofrece retirarlo.

**Compatibilidades**
- **CA-03-09** La matriz muestra todos los pares cultivo–planta. Se puede cargar un grado de −5 a +5 con
  justificación; se rechazan los grados fuera de rango y las justificaciones de menos de 10 caracteres.
- **CA-03-10** La consulta "plantas para la ecorregión X y el cultivo Y" devuelve solo plantas publicadas, aptas en X,
  con compatibilidad publicada y grado mayor que 0, ordenadas por grado descendente.

**CSV**
- **CA-03-11** Exportar genera los tres CSV, que vuelven a importarse sin errores.
- **CA-03-12** Importar muestra la vista previa con altas, modificaciones y errores por fila. Con errores no se puede
  confirmar. Al confirmar, todo queda en Borrador.
- **CA-03-13** Los archivos de más de 2 MB o más de 2.000 filas se rechazan.
- **CA-03-14** Una celda exportada que empieza con `=` sale con `'` adelante.

**Historial y permisos**
- **CA-03-15** Cada alta, edición, publicación, retiro, borrado e importación genera una entrada en el historial con el
  antes y el después, en la misma transacción. Si el cambio falla, no queda entrada.
- **CA-03-16** Un Usuario que entra a `/admin/catalogo/*` o llama a sus acciones recibe 404.

**Guía de especies**
- **CA-03-17** La Guía muestra solo plantas publicadas y filtra por ecorregión, por cultivo compatible y por función.
- **CA-03-18** La ficha muestra el calendario por ecorregión, los cultivos compatibles con su justificación, la fuente
  y el aviso de información orientativa.
- **CA-03-19** La Guía y la grilla de quincenas funcionan a 360 px. La grilla tiene texto alternativo.

**Datos iniciales**
- **CA-03-20** Después de migrar existen las plantas, los cultivos ampliados y las compatibilidades de la sección 8, en
  Borrador, con su fuente. La Guía está vacía hasta que se publique algo.

## 11. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Base:**<br>– esquema y migraciones;<br>– datos iniciales;<br>– dominio de semanas, quincenas y rangos;<br>– reglas de publicación;<br>– historial. | `web/src/db/schema/catalogo.ts`, `web/src/dominio/catalogo/` | CA-03-02, 03, 05, 06, 15, 20 |
| T2 | **Plantas de servicio** (después de T1) | `web/src/app/admin/catalogo/plantas/` | CA-03-01, 07, 08 |
| T3 | **Cultivos y compatibilidades** (en paralelo con T2) | `…/cultivos/`, `…/compatibilidades/` | CA-03-04, 09 |
| T4 | **Consulta para el motor** (en paralelo con T2 y T3) | `web/src/dominio/catalogo/consultas.ts` | CA-03-10 |
| T5 | **CSV** (después de T2 y T3) | `…/importar/`, `web/src/dominio/catalogo/csv.ts` | CA-03-11 a 14 |
| T6 | **Historial y Guía de especies** (en paralelo con T5) | `…/historial/`, `web/src/app/guia-especies/` | CA-03-16 a 19 |
| T7 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

## 12. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| **Validar y publicar** los datos iniciales, y cargar los **períodos por ecorregión** que faltan | Analistas de dominio (Integrantes 2 y 4) | Sin datos publicados, el diagnóstico y las recomendaciones no tienen con qué trabajar. |
| **Confirmar la ecorregión** de los datos del prototipo de calendario, hoy asumida como Valles Templados | Analistas de dominio | Las semanas cambian según la región. |
| **Agregar la vid** a la lista de cultivos del módulo 02: el prototipo de calendario la incluye | Analistas de dominio | Consistencia entre módulos. |
| Dar **rol Administrador** a los analistas de dominio que van a cargar el catálogo | Grupo | Solo hay dos roles (RS-03). Un administrador también puede desactivar cuentas (módulo 01). |
| Elegir la **librería de CSV** y aprobarla como dependencia nueva | Quien implemente T5 | Regla de AGENTS.md. |
| Buscar una **fuente validada de polinizadores** de Jujuy (cátedras de Zoología de la FCA-UNJu, según el Especialista 1) | Grupo | Permitiría pasar de texto a una tabla de polinizadores. |
