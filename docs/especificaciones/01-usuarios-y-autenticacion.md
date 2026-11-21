# Especificación 01: Usuarios y autenticación

| | |
| --- | --- |
| **Estado** | Borrador para revisión |
| **Fecha** | 2026-11-21 |
| **Responsable** | Integrante 3 |
| **Depende de** | Infraestructura de la v2 (`web/`, Neon, Vercel), ya hecha |
| **Reglas que aplica** | RS-01, RS-02, RS-03, RS-04, RS-05, RS-06, RS-07, RS-08, RD-02, RD-03, RD-04, RD-08 |
| **Casos de uso** | Registrar usuario, Validar usuario ([casos de uso](../proyecto/semana-3-alternativas-y-casos-de-uso.md)) |

---

## 1. Objetivo y alcance

Que productores e ingenieros agrónomos puedan **crear una cuenta, ingresar y administrar sus datos personales** de
forma segura. También que un administrador pueda gestionar las cuentas. Es la base de todos los demás módulos: cada
establecimiento, diagnóstico e informe pertenece a un usuario.

**Incluye:**
- la landing pública y la página de política de privacidad;
- registro con verificación de email;
- ingreso con nombre de usuario o email;
- cierre de sesión y recuperación de contraseña;
- la página de inicio del usuario y el perfil: cambiar contraseña, email y nombre, y eliminar la cuenta;
- para administradores: un comando para crear el primero, y una pantalla para listar usuarios y desactivar o
  reactivar cuentas.

**No incluye:**
- ingreso con Google u otras redes;
- verificación en dos pasos;
- cambio del nombre de usuario;
- pagos y suscripción;
- el backoffice del catálogo de especies (módulo 03).

## 2. Decisiones

Se tomaron en la ronda de preguntas del 2026-11-21.

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Librería de autenticación | **Better Auth**, con sus plugins de nombre de usuario y de administración | Guarda usuarios y sesiones en nuestra base. Trae email y contraseña, ingreso por nombre de usuario, recuperación, roles y límite de intentos sin programar la criptografía a mano. |
| Modelo de datos y migraciones | **Drizzle ORM** + `drizzle-kit`, sobre el driver de Neon | Liviano, en TypeScript, con migraciones SQL legibles versionadas en el repo (RD-08). |
| Verificación de email | **Obligatoria**: no se puede ingresar hasta confirmar el email | Evita cuentas con emails ajenos o mal escritos y asegura que la recuperación llegue a quien corresponde. |
| Envío de emails | **Resend** | Se integra fácil con Next.js y Vercel, y el plan gratis alcanza. |
| Consentimiento | **Casilla obligatoria** de aceptación de la política de privacidad, que incluye el **consentimiento expreso para que los datos se procesen en servicios de Estados Unidos** (Neon, Vercel y Resend). Se guarda la fecha y la versión aceptada | Ley 25.326: consentimiento informado y demostrable, y transferencia internacional (art. 12). [Auditoría](auditoria-seguridad.md) A-04. |
| Eliminar cuenta | **Desde el perfil**, confirmando con la contraseña. Borra la cuenta y todos sus datos | Derecho de supresión de la Ley 25.326. |
| Duración de la sesión | **30 días**, y se renueva mientras se usa | Uso en el campo desde el celular, sin tener que ingresar en cada visita. |
| Datos al registrarse | **Solo** email, nombre de usuario y contraseña. Nombre y apellido son opcionales, en el perfil | Datos mínimos (RS-05). |
| Protección del ingreso | **Límite por tiempo**: 5 intentos fallidos cada 15 minutos, por cuenta y por IP. Sin bloqueo permanente | Frena ataques sin permitir que un atacante deje al dueño sin acceso. |
| Email ya registrado | El registro **dice en pantalla** "Ese email ya está registrado" | **Riesgo aceptado** por usabilidad ([auditoría](auditoria-seguridad.md) M-07). Mitigación: el límite de intentos del registro impide probar emails en masa. |
| Contraseña | **8 caracteres o más**, distinta del usuario y del email, y **no filtrada** (consulta a Have I Been Pwned por k-anonimato) | Equilibrio entre seguridad y comodidad en el celular. |
| Nombre de usuario | **3 a 30 caracteres**: letras sin acentos, números, `.` y `_`. Sin distinguir mayúsculas. No puede tener forma de email | No se confunde con un email al ingresar, y "Ana" y "ana" son el mismo usuario. |
| Administradores | **Comando** `npm run crear-admin`. Pantalla de administración con la lista de usuarios y desactivar o reactivar | El registro público nunca crea administradores (RS-03). |
| Landing | **Entra en este módulo**, junto con la política de privacidad | Es la puerta de entrada al registro y al ingreso. |
| Perfil | Cambiar **contraseña** (pidiendo la actual), **email** (se confirma en el email nuevo) y **nombre y apellido**. El nombre de usuario no se cambia | — |
| Después de ingresar | Página **Inicio** con accesos a Mis fincas, Diagnóstico, Rediseño e Informes, marcados "Próximamente" hasta que existan | Los módulos 02 a 07 todavía no están. |

> **Para quien implemente:** Better Auth y Drizzle cambian seguido. Antes de programar, verificá en su documentación
> oficial los nombres exactos de las opciones y plugins que se mencionan acá (por ejemplo `username`, `admin`,
> `haveIBeenPwned`, `requireEmailVerification`, `rateLimit`). Si algo de esta especificación no se puede hacer con la
> librería, avisá antes de buscar otra solución.

## 3. Actores y permisos

| Actor | Puede |
| --- | --- |
| **Visitante** (sin sesión) | Ver la landing y la política de privacidad, registrarse, verificar su email, ingresar y recuperar su contraseña. |
| **Usuario** | Lo anterior, más ver Inicio, su perfil, cambiar sus datos, cerrar sesión y eliminar su cuenta. Solo accede a **sus** datos (RS-02). |
| **Administrador** | Lo mismo que un usuario, más ver la lista de usuarios y desactivar o reactivar cuentas. **No** ve contraseñas ni puede ingresar como otro usuario. |

## 4. Flujos

### 4.1 Registro

1. El visitante abre **Registrarse** y completa: email, nombre de usuario, contraseña, repetir contraseña y la casilla
   "Leí y acepto la política de privacidad" (con enlace).
2. El sistema valida en el servidor (ver sección 6.2).
   - Si hay errores, vuelve al formulario con un mensaje junto a cada campo y conserva lo escrito, salvo las
     contraseñas.
3. Si todo está bien:
   - crea la cuenta con rol **Usuario**, **sin verificar**;
   - guarda la fecha y la versión de la política aceptada;
   - envía el email de verificación.
4. Muestra: "Te enviamos un email a **a…@dominio.com** para confirmar tu cuenta. Revisá también la carpeta de spam."
   Ofrece "Reenviar email", con un máximo de 1 cada 60 segundos.

### 4.2 Verificación de email

1. El usuario toca el enlace del email. El enlace vence a las **24 horas** y sirve **una sola vez**.
2. Si el enlace es válido, la cuenta queda verificada, se inicia la sesión y se va a **Inicio** con el mensaje "¡Tu
   cuenta está confirmada!".
3. Si venció o ya se usó: "El enlace venció o ya fue usado", con un botón para pedir uno nuevo, ingresando el email.

### 4.3 Ingreso

1. El visitante abre **Iniciar sesión** e ingresa "Usuario o email" y la contraseña.
2. Si el dato tiene `@`, se busca por email; si no, por nombre de usuario. En los dos casos sin distinguir mayúsculas.
3. Resultados:
   - **Correcto y verificado:** inicia la sesión de 30 días y va a **Inicio**. Si venía de una página protegida, vuelve
     a esa página, siempre que sea interna del sitio.
   - **Datos incorrectos:** un único mensaje, "Usuario, email o contraseña incorrectos". No dice cuál de los dos falló.
   - **Correcto pero sin verificar:** "Tenés que confirmar tu email antes de ingresar", con un botón para reenviar el
     email.
   - **Cuenta desactivada por un administrador:** "Tu cuenta está desactivada. Escribinos a <email de contacto>."
   - **Más de 5 intentos fallidos en 15 minutos:** "Demasiados intentos. Probá de nuevo en unos minutos."

### 4.4 Cierre de sesión

1. El usuario toca **Cerrar sesión**, en el menú.
2. Se borra la sesión en el servidor y la cookie, y se borran del navegador los borradores guardados en
   `localStorage` con el prefijo `policampo_` (RS-08).
3. Va a la landing con el mensaje "Cerraste sesión".

### 4.5 Recuperación de contraseña

1. Desde **Iniciar sesión**, "¿Olvidaste tu contraseña?", se ingresa el email.
2. Siempre se muestra el mismo mensaje, exista o no la cuenta: "Si hay una cuenta con ese email, te enviamos un
   enlace para crear una contraseña nueva."
3. El enlace vence en **1 hora** y sirve una sola vez. Abre **Nueva contraseña**, con contraseña y repetición, y las
   mismas reglas que el registro.
4. Al guardarla:
   - se cierran **todas** las sesiones abiertas de esa cuenta;
   - se envía un email avisando del cambio;
   - se va a **Iniciar sesión** con el mensaje "Tu contraseña se cambió. Ya podés ingresar."

### 4.6 Perfil

En **Mi perfil**, el usuario ve su nombre de usuario (no editable) y su email, y puede:

- **Cambiar nombre y apellido** (opcionales, hasta 60 caracteres cada uno).
- **Resumen semanal por email:** casilla desactivada por defecto. La agrega el
  [módulo 06](06-calendario-agroecologico.md#56-email-semanal).
- **Cambiar la contraseña:**
  - pide la actual, la nueva y la repetición;
  - cierra las demás sesiones, pero no la actual;
  - envía un email de aviso.
- **Cambiar el email:**
  - pide el email nuevo y la contraseña actual;
  - envía un enlace de confirmación al **email nuevo**, que vence a las 24 horas;
  - hasta confirmarlo, el email sigue siendo el anterior;
  - al confirmarlo, avisa por email a la dirección **anterior**.
- **Eliminar mi cuenta** (zona de peligro):
  - explica qué se borra: la cuenta, todos sus establecimientos, diagnósticos, propuestas e informes;
  - aclara que no se puede deshacer;
  - pide la contraseña y escribir `ELIMINAR`;
  - al confirmar, borra todo, cierra la sesión, limpia el `localStorage` como en 4.4, envía un email de confirmación y
    va a la landing con "Tu cuenta fue eliminada".

### 4.7 Administración

- **Crear el primer administrador:** `npm run crear-admin -- --email <email>`.
  - Si la cuenta existe, la pasa a rol Administrador.
  - Si no existe, la crea verificada, pidiendo la contraseña por consola, sin mostrarla.
  - Solo puede correrlo alguien con acceso a la base, por ejemplo con el `DATABASE_URL` en su `.env.local`.
- **Usuarios** (`/admin/usuarios`, solo administradores):
  - tabla con nombre de usuario, email, fecha de registro, si está verificado, rol y estado (activo o desactivado);
  - búsqueda por usuario o email y paginación de a 20.
- **Desactivar o reactivar cuenta:**
  - desactivar cierra todas sus sesiones e impide ingresar;
  - un administrador no puede desactivarse a sí mismo **ni desactivar a otro administrador**: eso solo se hace con
    el comando del servidor (auditoría M-08);
  - queda registrado quién lo hizo y cuándo.

## 5. Frontend

### 5.1 Pantallas y rutas

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/` | **Landing:** qué es PoliCampo, beneficios, cómo funciona, para quién es, y botones "Registrarse" e "Iniciar sesión". Se reutiliza el contenido de la v1. Con la sesión iniciada, los botones cambian a "Ir a Inicio". | Pública |
| `/privacidad` | **Política de privacidad:** qué datos se guardan, para qué, por cuánto tiempo, derechos de acceso, rectificación y supresión, y email de contacto. Muestra su número de versión. | Pública |
| `/registro` | Registro | Solo sin sesión |
| `/registro/enviado` | "Revisá tu email" + reenviar | Solo sin sesión |
| `/verificar-email` | Resultado del enlace de verificación | Pública |
| `/ingresar` | Iniciar sesión | Solo sin sesión |
| `/recuperar` | Pedir el enlace de recuperación | Solo sin sesión |
| `/recuperar/nueva` | Nueva contraseña (con el token del enlace) | Pública |
| `/inicio` | **Inicio:** "Hola, {nombre o usuario}" y tarjetas de Mis fincas, Diagnóstico, Rediseño e Informes, con la etiqueta "Próximamente" mientras no existan | Usuario |
| `/perfil` | Mi perfil | Usuario |
| `/admin/usuarios` | Lista de usuarios | Administrador |

Las páginas "solo sin sesión" redirigen a `/inicio` si ya hay sesión. Las páginas de usuario sin sesión redirigen a
`/ingresar?volver=<ruta>`. `/admin/*` sin rol de administrador responde **404**.

### 5.2 Comportamiento

- **Celular primero** (RD-03):
  - formularios en una sola columna desde 360 px;
  - campos y botones de 44 px de alto como mínimo;
  - teclado adecuado: `type="email"` y `autocomplete` correctos (`username`, `email`, `current-password`,
    `new-password`).
- **Contraseñas:** botón para mostrar u ocultar. El indicador de requisitos se actualiza mientras se escribe.
- **Mensajes:**
  - en español, junto al campo que falló, y anunciados a lectores de pantalla (`aria-live`);
  - nunca muestran detalles técnicos ni errores del servidor.
- **Botones al enviar:** se deshabilitan mientras se envía y muestran "Enviando…", para evitar dobles envíos con mala
  conexión.
- **Menú con sesión:** Inicio, Mi perfil, Usuarios (solo administradores) y Cerrar sesión.
- **Diseño:**
  - toma la paleta y el tono de la v1 (verde, flores);
  - el detalle visual lo define quien implemente, respetando la accesibilidad (contraste AA y etiquetas en todos los
    campos).

## 6. Backend

### 6.1 Organización

- **Better Auth:**
  - se configura en `web/src/lib/auth.ts`, solo servidor, con su adaptador de Drizzle;
  - su manejador se expone en `web/src/app/api/auth/[...all]/route.ts`.
- **Esquema de la base:** `web/src/db/schema/`. Las migraciones van en `web/drizzle/`.
- **Emails:** se envían desde `web/src/lib/email/`, con plantillas en español:
  - verificación;
  - recuperación;
  - aviso de cambio de contraseña;
  - confirmación de email nuevo;
  - aviso al email anterior;
  - cuenta eliminada.
- **Límites de intentos:** los contadores se guardan en la base de datos (almacenamiento `database` de Better Auth
  y la tabla `limite_uso` para los demás módulos), nunca en memoria (RS-13).
- **Orígenes confiables** (`trustedOrigins`): el dominio de producción y, en las vistas previas, solo la URL exacta
  del despliegue (`VERCEL_URL`). **Nunca comodines** como `*.vercel.app` (auditoría M-09).
- **Registro de eventos de seguridad** (auditoría B-02): ingresos fallidos, cambios de contraseña y de email,
  desactivaciones y reactivaciones, borrados de cuenta, acciones de administración y envíos masivos se guardan en la
  tabla `evento_seguridad`, con el id del usuario y sin datos personales.
- **Páginas protegidas:** cada página y cada acción del servidor protegida **verifica la sesión y el rol en el
  servidor**. Un filtro previo de rutas puede redirigir antes, pero **no reemplaza** esta verificación (RS-02).

### 6.2 Validaciones (en el servidor, RS-06)

| Campo | Regla |
| --- | --- |
| Email | Formato válido, hasta 254 caracteres, se guarda en minúsculas y sin espacios. Único. |
| Nombre de usuario | `^[a-zA-Z0-9._]{3,30}$`, sin `@`. Se guarda en minúsculas para compararlo, y se muestra como se escribió. Único sin distinguir mayúsculas. Reservados: `admin`, `administrador`, `policampo`, `soporte`. |
| Contraseña | De 8 a 128 caracteres. Distinta del nombre de usuario y del email. No aparece en Have I Been Pwned. Si el servicio no responde, **se acepta igual** y queda registrado en el log, sin la contraseña. |
| Repetir contraseña | Igual a la contraseña. |
| Consentimiento | Marcado obligatoriamente. |
| Nombre y apellido | Opcionales, hasta 60 caracteres, sin etiquetas HTML. |

### 6.3 Variables de entorno (RS-01)

| Variable | Uso | Dónde |
| --- | --- | --- |
| `DATABASE_URL` | Conexión a Neon | Ya existe |
| `BETTER_AUTH_SECRET` | Firma de sesiones y tokens. Valor aleatorio de 32 bytes o más | `.env.local` y Vercel (secreto) |
| `BETTER_AUTH_URL` | URL base del sitio (por ejemplo `https://policampo.vercel.app`) | `.env.local` y Vercel |
| `RESEND_API_KEY` | Envío de emails | `.env.local` y Vercel (secreto) |
| `EMAIL_REMITENTE` | Dirección remitente, por ejemplo `PoliCampo <no-responder@…>` | `.env.local` y Vercel |
| `EMAIL_CONTACTO` | Email que se muestra para consultas y privacidad | `.env.local` y Vercel |

Se agregan a `web/.env.example` con valores ficticios.

## 7. Base de datos

Better Auth crea sus tablas: `user`, `session`, `account` y `verification`. **Esos nombres son de la librería y se
mantienen en inglés** (RD-02 permite términos técnicos del framework). En el glosario, **usuario** corresponde a la
tabla `user`.

| Tabla | Campos propios del proyecto o de los plugins | Notas |
| --- | --- | --- |
| `user` | `username` (único, en minúsculas), `display_username`, `email` (único, en minúsculas), `email_verified`, `nombre`, `apellido`, `role` (`usuario` o `administrador`, por defecto `usuario`), `banned`, `banned_at`, `banned_by`, `politica_privacidad_version`, `politica_privacidad_aceptada_en`, `created_at`, `updated_at` | Los nombres exactos de los campos de los plugins los fija Better Auth. Los campos agregados por nosotros van en español. |
| `session` | Lo de Better Auth: token, vencimiento, IP y agente del navegador | Se borra en cascada al borrar el usuario. |
| `account` | Lo de Better Auth: hash de la contraseña | **Nunca** se expone ni se registra en los logs. |
| `verification` | Tokens de verificación de email, recuperación y cambio de email | Vencen como se indica en la sección 4. |
| `limite_uso` | `clave` (por ejemplo `diagnostico:<id-usuario>`), `ventana_inicio`, `cantidad` | Contadores de los límites de los módulos 04 a 07 (RS-13). Las filas viejas se limpian solas. |
| `evento_seguridad` | `id`, `tipo`, `usuario_id` (FK **`ON DELETE SET NULL`**), `actor_id`, `fecha`, `detalle` (jsonb, sin datos personales) | Se conserva **90 días**. Solo inserción. |

- **Migraciones:**
  - se generan con `drizzle-kit generate` y se versionan en `web/drizzle/`;
  - se aplican con `drizzle-kit migrate` (RD-08);
  - **nunca** se cambia el esquema a mano en Neon.
- **Borrado en cascada:** al eliminar un `user`, se borran sus sesiones, cuentas y verificaciones. Los módulos
  siguientes **tienen que** definir `ON DELETE CASCADE` en todo lo que dependa del usuario, como los establecimientos.
- **Ramas de Neon:** las pruebas de migraciones se hacen en una **rama de Neon de desarrollo**, no en `production`.
  Crear esa rama es una tarea de este módulo (sección 10).

## 8. Seguridad

| Amenaza | Control | Regla |
| --- | --- | --- |
| Robo de contraseñas de la base | Hash con el algoritmo por defecto de Better Auth (scrypt). Nunca se guardan ni se registran en claro. | RS-04 |
| Fuerza bruta en el ingreso | Límite de 5 intentos cada 15 minutos por cuenta y por IP. Límites también en registro, recuperación y reenvío de emails. | RS-04 |
| Contraseñas débiles o filtradas | Reglas de 6.2 + Have I Been Pwned. Solo se envían los primeros 5 caracteres del hash SHA-1, nunca la contraseña. | RS-04 |
| Descubrir qué emails están registrados | Mensaje único al ingresar y en la recuperación. El registro **sí** dice si el email existe: **riesgo aceptado** (auditoría M-07), mitigado con el límite de intentos del registro. | RS-05 |
| Robo de la sesión | Cookie `HttpOnly`, `Secure` (en producción) y `SameSite=Lax`. La sesión se renueva con el uso. Al cambiar la contraseña se cierran las demás sesiones. | RS-07 |
| Peticiones falsificadas (CSRF) | Better Auth verifica el origen de las peticiones (`trustedOrigins` = URL del sitio). Los formularios del sitio usan acciones del servidor o el cliente de Better Auth. | RS-07 |
| Acceso a datos ajenos | Toda operación verifica la sesión y el dueño en el servidor. `/admin/*` verifica el rol. Las rutas ajenas responden 404. | RS-02, RS-03 |
| Redirección abierta | `volver` solo acepta rutas internas que empiezan con `/` (no `//` ni URLs completas). | RS-07 |
| Inyección de HTML o SQL | React escapa por defecto (prohibido `dangerouslySetInnerHTML` con datos del usuario). Drizzle parametriza las consultas. | RS-07 |
| Secretos expuestos | Variables de la sección 6.3 solo en el servidor (nunca con el prefijo `NEXT_PUBLIC_`). `server-only` en `auth.ts` y `db.ts`. | RS-01 |
| Datos personales en los logs | Se registran eventos ("ingreso fallido", "cuenta desactivada") con el id del usuario, **nunca** el email, la contraseña ni los tokens. | RS-05 |
| Borradores en una computadora compartida | Se limpian al cerrar sesión y al eliminar la cuenta. | RS-08 |
| Consentimiento no demostrable | Se guarda la versión y la fecha de aceptación de la política. Si cambia la versión, se pide aceptar la nueva al ingresar. | Ley 25.326 |

## 9. Criterios de aceptación

Cada criterio se cubre con al menos un test (RD-04).

**Registro y verificación**
- **CA-01-01** Un visitante se registra con datos válidos: la cuenta queda creada con rol Usuario y sin verificar, se
  guarda el consentimiento con su versión y fecha, y se envía un email de verificación.
- **CA-01-02** El registro falla, con un mensaje en el campo correspondiente, si:
  - el email ya existe, aunque cambien las mayúsculas;
  - el usuario ya existe, aunque cambien las mayúsculas;
  - el usuario tiene caracteres no permitidos, `@` o es un nombre reservado;
  - la contraseña tiene menos de 8 caracteres, es igual al usuario o al email, o está filtrada;
  - las contraseñas no coinciden;
  - falta la casilla de consentimiento.
- **CA-01-03** Desde el registro público no se puede crear un administrador, aunque se envíe `role` en la petición.
- **CA-01-04** El enlace de verificación válido verifica la cuenta e inicia la sesión. Vencido (más de 24 h) o ya
  usado, muestra el error y permite pedir otro.

**Ingreso y sesión**
- **CA-01-05** Un usuario verificado ingresa con su nombre de usuario y también con su email, sin importar las
  mayúsculas, y llega a `/inicio`.
- **CA-01-06** Con datos incorrectos el mensaje es siempre "Usuario, email o contraseña incorrectos".
- **CA-01-07** Un usuario sin verificar no puede ingresar y ve la opción de reenviar el email.
- **CA-01-08** Al sexto intento fallido en 15 minutos se responde "Demasiados intentos" (HTTP 429), aunque la
  contraseña sea correcta.
- **CA-01-09** La sesión dura 30 días sin uso y se renueva al usarse. La cookie es `HttpOnly`, `SameSite=Lax` y, en
  producción, `Secure`.
- **CA-01-10** Cerrar sesión invalida la sesión en el servidor y borra del navegador las claves `policampo_*`.
- **CA-01-11** `?volver=https://otro-sitio.com` o `?volver=//otro-sitio.com` lleva a `/inicio`, no afuera.

**Recuperación**
- **CA-01-12** Pedir la recuperación muestra el mismo mensaje exista o no el email. Solo se envía si existe.
- **CA-01-13** El enlace de recuperación vence a la hora y sirve una vez. Al usarlo se cambia la contraseña, se cierran
  todas las sesiones y se envía el aviso.

**Perfil**
- **CA-01-14** El usuario cambia su nombre y apellido. El nombre de usuario no se puede cambiar, ni aunque se envíe en
  la petición.
- **CA-01-15** Cambiar la contraseña exige la actual. Las otras sesiones se cierran y la actual sigue activa.
- **CA-01-16** Cambiar el email exige la contraseña. El email cambia recién al confirmar desde el email nuevo, y se
  avisa al anterior.
- **CA-01-17** Eliminar la cuenta exige la contraseña y escribir `ELIMINAR`. Después no queda ningún registro del
  usuario, ni sus sesiones, cuentas o verificaciones, y no se puede volver a ingresar.

**Permisos y administración**
- **CA-01-18** Sin sesión, `/inicio` y `/perfil` redirigen a `/ingresar?volver=…`. Con sesión, `/ingresar` y
  `/registro` redirigen a `/inicio`.
- **CA-01-19** Un Usuario que abre `/admin/usuarios` o llama a sus acciones recibe 404.
- **CA-01-20** `npm run crear-admin` crea o asciende un administrador. El administrador ve la lista de usuarios y puede
  desactivar y reactivar cuentas, pero no la suya. Ningún administrador puede desactivar a otro administrador. La cuenta desactivada pierde sus sesiones y no puede
  ingresar.
- **CA-01-21** La lista de usuarios nunca incluye hashes ni tokens.

**Privacidad, frontend y logs**
- **CA-01-22** `/privacidad` es pública y muestra la versión vigente.
- **CA-01-23** Todas las pantallas se usan sin scroll horizontal a 360 px de ancho. Todos los campos tienen etiqueta y
  `autocomplete`.
- **CA-01-24** Los logs del servidor no contienen emails, contraseñas ni tokens (test que revisa los mensajes
  registrados en los flujos de ingreso fallido y recuperación).

## 10. Plan de implementación

Las tareas en orden. Las que dicen "en paralelo" pueden hacerlas personas o agentes distintos, cada uno en su rama
(RD-07).

| Orden | Tarea | Archivos principales | Criterios |
| --- | --- | --- | --- |
| T1 | **Base:**<br>– Drizzle y la primera migración;<br>– Better Auth con los plugins de usuario y administración;<br>– variables de entorno;<br>– rama de Neon de desarrollo;<br>– configuración de tests. | `web/src/lib/auth.ts`, `web/src/db/`, `web/drizzle/`, `web/.env.example` | CA-01-03, CA-01-09 |
| T2 | **Emails:**<br>– servicio de envío con Resend;<br>– plantillas en español;<br>– en desarrollo, mostrarlos en la consola. | `web/src/lib/email/` | (soporte de T3 a T5) |
| T3 | **Registro, verificación e ingreso** (después de T1 y T2) | `web/src/app/(cuentas)/…` | CA-01-01 a 08, 11, 18 |
| T4 | **Recuperación de contraseña** (en paralelo con T5) | `web/src/app/(cuentas)/recuperar/…` | CA-01-12, 13 |
| T5 | **Perfil:** datos, contraseña, email y eliminar cuenta (en paralelo con T4) | `web/src/app/perfil/…` | CA-01-10, 14 a 17 |
| T6 | **Administración:** comando `crear-admin` y `/admin/usuarios` (en paralelo con T4 y T5) | `web/scripts/`, `web/src/app/admin/…` | CA-01-19 a 21 |
| T7 | **Landing, privacidad e inicio** (en paralelo desde el principio; solo usa la sesión en los botones) | `web/src/app/page.tsx`, `privacidad/`, `inicio/` | CA-01-22, 23 |
| T8 | **Revisión final:** logs sin datos personales, celular, accesibilidad y auditoría de seguridad | — | CA-01-24 |

## 11. Pendientes

| Pendiente | Quién | Por qué importa |
| --- | --- | --- |
| Crear la cuenta de **Resend** y cargar `RESEND_API_KEY` en Vercel | Integrante 3 | Sin eso no se envían emails, ni la verificación ni la recuperación. |
| **Dominio para enviar emails.** Sin un dominio propio verificado, Resend solo envía al email del dueño de la cuenta. Opciones: comprar un dominio, por ejemplo `policampo.com.ar` en NIC Argentina, o usar un dominio que el grupo ya tenga | Grupo | Hasta resolverlo, las pruebas de email solo funcionan con la cuenta del dueño de Resend. |
| Texto de la **política de privacidad** (versión 1) y **email de contacto** | Grupo | La página `/privacidad` y el consentimiento los necesitan. |
| Consultar con la cátedra la **inscripción de la base ante la AAIP** antes de un uso real (auditoría A-04) | Grupo | Ley 25.326, art. 21. |
| La política de privacidad tiene que nombrar **Neon, Vercel, Resend y Esri** y su país, y decir **qué queda después de borrar una cuenta** y por cuánto tiempo (logs, historial de envíos, ventana de restauración) (auditoría A-04 y M-10) | Grupo | Transparencia y consentimiento válido. |
