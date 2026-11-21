# Especificación 06: Calendario agroecológico

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 (redacción); Integrantes 2 y 4, analistas de dominio (textos y criterios) |
| **Depende de** | [01](01-usuarios-y-autenticacion.md) (perfil, emails), [03](03-catalogo-de-especies.md) (semanas), [05](05-propuesta-de-rediseno.md) (propuesta elegida) |
| **Reglas que aplica** | RN-10, RN-11, RS-01, RS-02, RS-05, RS-06, RS-07, RD-03, RD-04, RD-08 |

---

## 1. Objetivo y alcance

Convertir la **propuesta elegida** de una finca en un **calendario de tareas con fechas**: cuándo sembrar cada planta,
hasta cuándo se puede sembrar, cuándo cortarla y cuándo no pulverizar. El productor marca lo que va haciendo y recibe
avisos.

**Incluye:**
- la generación del calendario a 12 meses;
- los 4 tipos de tareas y los períodos informativos;
- marcar tareas como hechas;
- las vistas por finca y "Mis tareas";
- las próximas tareas en Inicio;
- el email semanal opcional;
- descargar `.ics`;
- regenerar al cambiar la propuesta elegida;
- la temporada siguiente.

**No incluye:**
- posponer tareas, agregar tareas propias o marcar "no aplica";
- notificaciones push;
- sincronización con Google Calendar por cuenta;
- encuestas de seguimiento.

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Período | **12 meses desde la generación** (una "temporada"). Cuando termina, se genera la siguiente y la anterior queda como historial | Siempre muestra lo que viene. |
| Checklist | Marcar **"Hecha"**, que guarda la fecha, con una **nota opcional**. Las vencidas sin hacer quedan **"Atrasada"** | Como el prototipo de calendario de la v1. Sirve para el seguimiento futuro. |
| Alertas | **En la app** ("Próximas tareas") + **email semanal opcional** (Resend) | Funciona sin instalar nada. Las push quedan para la PWA. |
| Tipos de tarea | **Siembra**, **fecha límite de siembra**, **corte** y **no pulverizar**. Además, la floración y la cosecha de los cultivos y la floración de las franjas como **informativas** | Lo que pide el documento del proyecto. |
| Fecha límite de siembra | **Calculada:** inicio de la floración del cultivo − 1 semana − el máximo de semanas que tarda la planta en florecer. Se usa el cultivo que florece primero. Avisa si cae fuera de la ventana de siembra | Es el "plantado máximo" del prototipo, aplicando RN-10. |
| Corte sin datos | **Al final de la floración** de la planta, marcado **"fecha estimada"** | RN-11: siempre hay una tarea de corte. |
| Modificar el calendario | **Solo marcar hechas** (y desmarcar). No se posponen ni se agregan tareas | Decisión del grupo: el calendario sale de la propuesta. |
| Vistas | **Calendario por finca** + **"Mis tareas"** (todas las fincas). Inicio muestra las **próximas 5** | El productor puede tener varias fincas. |
| Cambio de propuesta elegida | **Se pregunta y se regenera:** se reemplazan las tareas futuras y se conservan las hechas | No se pierde lo hecho. |
| Exportar | **Descargar `.ics`** | Sin conectar cuentas ni dar permisos. |
| Email semanal | **Lunes a las 7:00** (hora de Argentina), con las tareas de las próximas 2 semanas y las atrasadas. Si no hay ninguna, no se envía. Lo dispara una tarea programada de Vercel | Para planificar la semana. |

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Usuario** | Ver, marcar y exportar las tareas de **sus** fincas. Activar o desactivar el email semanal. Lo ajeno responde 404 (RS-02). |
| **Administrador** | Lo mismo, solo con sus fincas. |
| **Tarea programada** (Vercel Cron) | Llamar al envío semanal con una clave secreta (sección 8). |

## 4. Generación del calendario

Todas las fechas se calculan en la zona horaria **America/Argentina/Jujuy**. "Hoy" lo define el servidor.

### 4.1 Entrada

- la **propuesta elegida** de la finca, con su mezcla (y la copia de los datos de cada planta: semanas de siembra,
  floración y corte, y semanas hasta la floración, en la ecorregión de la finca);
- los **cultivos** de la finca, con sus semanas de floración y cosecha publicadas en el catálogo para esa ecorregión;
- **hoy** = inicio de la temporada; el **fin** es hoy + 12 meses.

### 4.2 De semanas a fechas

- **Qué semana es** (como en el módulo 03): la semana `n` de un año va del día `7·(n−1)+1` al `7·n`, y la 52 llega
  hasta el 31 de diciembre.
- **Rangos dentro de la temporada:** cada rango `[inicio, fin]` se convierte en la **próxima vez que ocurre** dentro de
  la temporada.
  - Si hoy está dentro del rango, la tarea empieza en la fecha real de inicio, aunque sea pasada, y queda **"En
    curso"**.
  - Si un rango cruza el fin de año, por ejemplo `[40, 52]` seguido de `[1, 4]`, se toma como un período continuo.
- **Una sola fuente:** la conversión está en una función de dominio compartida con el módulo 03.

### 4.3 Tareas que se generan

Por **cada planta de la mezcla**:

| Tipo | Fechas | Texto |
| --- | --- | --- |
| **Siembra** | La ventana de siembra del catálogo | "Sembrá {planta} en las franjas ({dosis si hay})." |
| **Fecha límite de siembra** | Un día: el inicio de la floración del cultivo que florece primero − (1 + semanas hasta la floración máx.) × 7 días | "Última fecha para sembrar {planta} y que florezca antes que {cultivo}." Muestra el cálculo: "{cultivo} florece desde el {fecha}; {planta} tarda hasta {n} semanas en florecer; se suma 1 semana de anticipación." |
| **Corte** | Las semanas de corte del catálogo. Si no hay, la **semana siguiente al fin de su floración**, marcada **"fecha estimada"** | "Cortá {planta} antes de que forme semillas y se vuelva maleza. {texto de manejo del catálogo}" (RN-11) |
| **No pulverizar** | La unión de los períodos de floración de las plantas de la mezcla | "Las franjas están en flor: evitá aplicar insecticidas, sobre todo en las horas de mayor actividad de los polinizadores. Consultá con tu ingeniero agrónomo." |

**Casos especiales de la fecha límite:**
- si **cae antes** del inicio de la ventana de siembra, se agrega el aviso: "Para que florezca antes que {cultivo}
  convendría sembrar antes del {fecha}, pero la siembra recomendada empieza el {fecha}.";
- si **ya pasó** para esta temporada: "Para esta temporada ya pasó la fecha ideal: si sembrás ahora, puede florecer
  después que {cultivo}.";
- si **ningún cultivo** de la finca tiene datos de floración, no se genera, y se avisa: "No sabemos cuándo florecen
  tus cultivos: no podemos calcular la fecha límite."

**Períodos informativos**, que no se marcan como hechos:
- floración de cada **cultivo**;
- cosecha de cada **cultivo**;
- floración de cada **planta** de la mezcla.

### 4.4 Estados de una tarea

| Estado | Condición |
| --- | --- |
| **Próxima** | Empieza después de hoy |
| **En curso** | Hoy está entre su inicio y su fin |
| **Hecha** | El usuario la marcó. Guarda la fecha y la nota |
| **Atrasada** | Su fin ya pasó y no está hecha |

El estado se **calcula al mostrar**, menos "Hecha", que se guarda. "Desmarcar" vuelve al estado calculado.

## 5. Flujos

### 5.1 Generar

- **Cuándo:** al haber una **propuesta elegida** sin calendario, la finca muestra **"Armar mi calendario"**. Se genera
  en el servidor y se abre.
- **Sin propuesta elegida:** "Primero elegí una propuesta de rediseño", con un enlace.
- **Propuesta sin mezcla** (sin plantas compatibles): "Tu propuesta no tiene plantas recomendadas: no hay tareas para
  generar."

### 5.2 Ver

**Calendario de la finca** (`/fincas/[id]/calendario`), con dos vistas:
- **Lista** (por defecto en el celular): tareas agrupadas por mes, con su estado, tipo, planta, fechas y un botón
  "Marcar hecha";
- **Meses:** una grilla de 12 meses con barras por tarea y período informativo, como el prototipo de la v1.

Arriba se ven la propuesta en la que se basa, la temporada (del {inicio} al {fin}) y los avisos de 4.3.

**Mis tareas** (`/tareas`): todas las tareas de todas las fincas, en orden de fecha, con filtros por finca, estado y
tipo.

**Inicio** (módulo 01): el bloque **"Próximas tareas"** muestra las 5 próximas o en curso, más las atrasadas primero,
con un enlace a Mis tareas.

### 5.3 Marcar como hecha

El usuario toca "Marcar hecha" y se abre un panel con la fecha (por defecto hoy, no futura, editable) y una nota
opcional de hasta 300 caracteres.
- **"Desmarcar"** borra la fecha y la nota, con confirmación.
- Los **períodos informativos** no se marcan.

### 5.4 Cambio de propuesta elegida

Al marcar otra propuesta como elegida (módulo 05), si la finca ya tiene calendario:
1. Aviso: "Se va a rehacer el calendario con la nueva propuesta. Las tareas que ya marcaste como hechas se conservan
   en el historial."
2. Al confirmar:
   - se **cierra** el calendario actual, que pasa al historial;
   - se genera uno nuevo con la misma fecha de fin de temporada que el anterior. Si a esa temporada le queda menos de
     un mes, se usan 12 meses desde hoy.
3. Las tareas **hechas** quedan en el calendario cerrado. El historial se ve en `/fincas/[id]/calendario/historial`.

Si la propuesta elegida queda **desactualizada** (módulo 05), el calendario muestra el mismo aviso con un enlace a la
propuesta.

### 5.5 Temporada siguiente

Cuando a la temporada le queda **menos de un mes**, o ya terminó, aparece **"Generar la próxima temporada"**. Cierra
la actual, que pasa al historial, y genera 12 meses desde el día siguiente a su fin.

### 5.6 Email semanal

- **Activación:** en **Mi perfil** (módulo 01) hay una casilla, desactivada por defecto: "Quiero recibir los lunes un
  resumen de mis tareas por email".
- **Envío:** cada lunes a las 7:00, a los usuarios con la casilla activa y con tareas próximas (14 días), en curso o
  atrasadas. Si no tienen ninguna, no se envía.
- **Contenido:** las tareas agrupadas por finca, con un enlace a Mis tareas. **No** incluye notas ni ubicaciones.
- **Baja:** al pie va el enlace **"Dejar de recibir este resumen"**. Funciona **sin iniciar sesión**, con un token
  firmado de un solo propósito, y desactiva la casilla.

### 5.7 Descargar `.ics`

- **Qué se descarga:**
  - "Agregar a mi calendario" en la finca descarga las tareas de su temporada actual;
  - en Mis tareas descarga las de todas las fincas.
- **Formato de los eventos:** eventos de **día completo**, con el título y la descripción de la tarea y un **UID
  estable** por tarea (al reimportar no se duplican). Los informativos van con el prefijo "ℹ️".
- **Qué no se ofrece:** suscripción por URL pública, porque una URL así filtraría datos si se comparte.

## 6. Frontend

| Ruta | Pantalla |
| --- | --- |
| `/fincas/[id]/calendario` | Calendario de la finca (lista y meses) |
| `/fincas/[id]/calendario/historial` | Calendarios cerrados con sus tareas hechas |
| `/tareas` | Mis tareas |
| `/baja-resumen?token=…` | Confirmación de la baja del email (pública) |

- **Celular primero:**
  - la vista por defecto es la lista;
  - la grilla de meses se desplaza horizontalmente dentro de su contenedor, nunca la página;
  - "Marcar hecha" es un botón grande.
- **Estados:** se reconocen sin depender del color, con ícono y texto: ⏳ Próxima, 🟢 En curso, ✅ Hecha, ⚠️ Atrasada.
- **Inicio:** el bloque de próximas tareas y la tarjeta **"Mis tareas"**.
- **Ficha de la finca:** muestra "Calendario" cuando hay una propuesta elegida.

## 7. Backend

| Qué | Dónde |
| --- | --- |
| Conversión de semanas a fechas y generación de tareas | `web/src/dominio/calendario/generar.ts`. Función pura que recibe la propuesta, los cultivos y "hoy". |
| Estados | `web/src/dominio/calendario/estado.ts` |
| Archivo `.ics` | `web/src/dominio/calendario/ics.ts`. Escapa `,`, `;`, `\` y saltos de línea, y corta las líneas a 75 octetos. |
| Acciones: generar, marcar, desmarcar, regenerar, temporada siguiente | `web/src/app/fincas/[id]/calendario/acciones.ts` |
| Envío semanal | `web/src/app/api/tareas/resumen-semanal/route.ts`, llamado por Vercel Cron. Se configura en `web/vercel.json`. |
| Esquema | `web/src/db/schema/calendario.ts` |

**Reglas del servidor:**
- **Dueño:** se filtra por el usuario de la sesión. 404 para lo ajeno, también por id de tarea.
- **Fecha de "Hecha":** no puede ser futura ni anterior a 12 meses antes del inicio de la temporada.
- **Generar y regenerar:** se hace en una transacción. Hay **un solo calendario activo por finca**.
- **Envío semanal:**
  - exige el encabezado `Authorization: Bearer <CRON_SECRET>`; sin él responde 401;
  - envía en lotes y registra solo cantidades, sin emails (RS-05);
  - se puede volver a ejecutar sin duplicar envíos: guarda la fecha del último resumen enviado a cada usuario.

## 8. Base de datos

| Tabla | Campos principales | Restricciones |
| --- | --- | --- |
| `calendario` | `id`, `establecimiento_id`, `propuesta_id`, `temporada_inicio`, `temporada_fin` (date), `generado_en`, `cerrado_en`, `version_reglas`, `avisos` (jsonb) | FK a la finca **`ON DELETE CASCADE`**. FK a la propuesta **`ON DELETE SET NULL`**: si se borra la propuesta, el calendario sigue como historial. **Índice único parcial:** un solo calendario con `cerrado_en IS NULL` por finca. |
| `tarea` | `id`, `calendario_id`, `tipo` (`siembra`, `limite_siembra`, `corte`, `no_pulverizar`, `info_floracion_cultivo`, `info_cosecha_cultivo`, `info_floracion_planta`), `planta_nombre`, `cultivo_nombre`, `titulo`, `descripcion`, `fecha_inicio`, `fecha_fin` (date), `estimada` (bool), `hecha_en` (date), `nota`, `orden` | FK **`ON DELETE CASCADE`**. `CHECK (fecha_fin >= fecha_inicio)`. `CHECK` de que las informativas no puedan tener `hecha_en`. Índices por (`calendario_id`, `fecha_inicio`). |
| `user` (módulo 01) | + `resumen_semanal` (bool, por defecto `false`), `resumen_ultimo_envio` (date) | — |

Las tareas guardan **textos y nombres copiados**, no claves a las plantas: el calendario se lee igual aunque el
catálogo cambie.

**Variables de entorno nuevas** (RS-01):
- `CRON_SECRET`: clave de la tarea programada, cargada en Vercel;
- `EMAIL_BAJA_SECRET`: firma de los enlaces de baja.

## 9. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Ver o marcar tareas ajenas | Filtrar por el dueño. 404 también por id de tarea. | RS-02 |
| Alguien dispara el envío masivo de emails | El endpoint de cron exige `CRON_SECRET`. Es idempotente por semana. | RS-01 |
| Baja de otro usuario adivinando el enlace | Token firmado con `EMAIL_BAJA_SECRET`, con el id del usuario y el propósito "baja-resumen". Se verifica la firma. | RS-07 |
| Datos de más en el email | Solo nombres de fincas, tareas y fechas. Sin notas ni ubicaciones. Envío solo a quien lo activó. | RS-05 |
| Calendario expuesto por URL | No hay suscripción pública. El `.ics` se descarga con la sesión iniciada. | RS-02 |
| Inyección en el `.ics` o en las notas | Escape de `.ics` según RFC 5545. Notas de hasta 300 caracteres, mostradas como texto. | RS-07 |
| Consentimiento del email | Casilla desactivada por defecto y baja en cada email. | Ley 25.326 |

## 10. Criterios de aceptación

Ejemplo de referencia (ecorregión Valles Templados, año 2026):
- **Tomate:** floración en las semanas `[40, 52]` y `[1, 4]`.
- **Caléndula:** siembra en las semanas `[30, 35]`, floración en `[38, 52]` y `[1, 10]`, y tarda de 8 a 10 semanas en
  florecer.
- **Hoy:** 1 de julio de 2026 (semana 26).

| Cálculo | Resultado |
| --- | --- |
| Inicio de la floración del tomate | Semana 40 = día 274 = **1 de octubre de 2026** |
| Fecha límite de siembra de la caléndula | 1 de octubre − (1 + 10) × 7 días = **16 de julio de 2026** (semana 29) |
| Ventana de siembra | Semana 30 = día 204 = **23 de julio** a semana 35 = día 245 = **2 de septiembre** |
| Aviso | La fecha límite (16/7) cae **antes** de la ventana (23/7): se muestra el aviso de 4.3 |

**Generación**
- **CA-06-01** Con el ejemplo de referencia se generan las fechas de la tabla y el aviso.
- **CA-06-02** La conversión de semanas a fechas coincide con el módulo 03, incluida la semana 52 hasta el 31/12 y los
  rangos que cruzan el año, que se toman como un período continuo.
- **CA-06-03** Cada planta de la mezcla genera siembra, corte y la parte de floración del "no pulverizar". La fecha
  límite se genera si hay un cultivo con floración publicada.
- **CA-06-04** Si una planta no tiene semanas de corte, el corte queda en la semana siguiente al fin de su floración,
  con `estimada = true`.
- **CA-06-05** Si la fecha límite ya pasó, se muestra el aviso de temporada pasada. Si ningún cultivo tiene floración,
  no se genera y se avisa.
- **CA-06-06** Sin propuesta elegida no se puede generar. Con una propuesta sin mezcla, se informa que no hay tareas.

**Estados y checklist**
- **CA-06-07** Los estados Próxima, En curso y Atrasada se calculan con "hoy" en la zona horaria de Jujuy. Hecha se
  guarda.
- **CA-06-08** Marcar hecha guarda la fecha y la nota. Se rechazan las fechas futuras y las notas de más de 300
  caracteres. Desmarcar vuelve al estado calculado.
- **CA-06-09** Los períodos informativos no se pueden marcar, ni por la pantalla ni por una acción directa.

**Cambios de temporada y de propuesta**
- **CA-06-10** Elegir otra propuesta (con confirmación) cierra el calendario actual con sus tareas hechas y genera uno
  nuevo. Nunca hay dos calendarios activos en la misma finca.
- **CA-06-11** "Generar la próxima temporada" aparece cuando falta menos de un mes y genera 12 meses desde el día
  siguiente al fin.

**Vistas**
- **CA-06-12** Mis tareas lista las tareas de todas las fincas del usuario, ordenadas por fecha y filtrables. Inicio
  muestra primero las atrasadas y después las 5 próximas o en curso.
- **CA-06-13** Las tareas de fincas ajenas responden 404, también al marcarlas por id.

**Email y `.ics`**
- **CA-06-14** El endpoint semanal sin `CRON_SECRET` responde 401. Con la clave, envía solo a quienes activaron el
  resumen y tienen tareas, y una segunda ejecución la misma semana no reenvía.
- **CA-06-15** El enlace de baja desactiva el resumen sin iniciar sesión. Un token alterado o de otro propósito se
  rechaza.
- **CA-06-16** El `.ics` descargado se importa en Google Calendar (prueba manual), tiene eventos de día completo con
  UID estable, y escapa las comas, los punto y coma y los saltos de línea.
- **CA-06-17** Las pantallas funcionan a 360 px y los estados se distinguen sin color.

## 11. Plan de implementación

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Dominio:** semanas a fechas, generación de tareas, fecha límite, avisos y estados, con el ejemplo de referencia | `web/src/dominio/calendario/` | CA-06-01 a 05, 07 |
| T2 | **Base y acciones:** esquema, migración, generar, marcar, desmarcar, regenerar y temporada siguiente (después de T1) | `web/src/db/schema/calendario.ts`, `acciones.ts` | CA-06-06, 08 a 11, 13 |
| T3 | **Pantallas:** calendario de la finca, historial, Mis tareas e Inicio (después de T2) | `web/src/app/fincas/[id]/calendario/`, `web/src/app/tareas/` | CA-06-12, 17 |
| T4 | **Email semanal y baja** (en paralelo con T3; requiere Resend y dominio, ver el módulo 01) | `web/src/app/api/tareas/`, `web/vercel.json`, `web/src/app/baja-resumen/` | CA-06-14, 15 |
| T5 | **`.ics`** (en paralelo con T3) | `web/src/dominio/calendario/ics.ts` | CA-06-16 |
| T6 | **Revisión final:** permisos, celular y auditoría de seguridad | — | todos |

## 12. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| **Revisar los textos de las tareas**, sobre todo "no pulverizar", con el especialista | Analistas de dominio | Son indicaciones agronómicas que lee el productor. |
| **Dominio y Resend** (pendiente del módulo 01) | Grupo | Sin eso, el email semanal no llega. |
| Confirmar que **Vercel Cron** del plan gratuito alcanza (una ejecución semanal) | Quien implemente T4 | El plan gratuito tiene límites de tareas programadas. |
| **Revisar "Solo marcar hechas"** después de probarlo con productores: posponer o agregar tareas propias puede hacer falta | Grupo | Se descartó para esta versión. |
| Las **notas de tareas hechas** podrían alimentar las futuras encuestas de seguimiento | Grupo | Módulo futuro. |
