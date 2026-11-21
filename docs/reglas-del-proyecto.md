# Reglas del proyecto

Reglas que **todas las personas y todos los agentes** cumplen al trabajar en PoliCampo. Si una especificación o una
tarea contradice una regla, gana la regla: se avisa y se discute antes de seguir.

Cada regla tiene un código para poder citarla en especificaciones, revisiones y commits (por ejemplo,
"cumple RN-03").

---

## 1. Reglas del dominio

Son las reglas de negocio que el sistema debe respetar. Las marcadas **(a validar)** salen de la documentación o de la
entrevista, pero todavía tienen que confirmarlas un experto o el grupo al escribir la especificación.

| Código | Regla | Origen |
| --- | --- | --- |
| **RN-01** | **Regla del 20 %.** El diagnóstico compara la superficie destinada a biodiversidad (sectores de flores, franjas, refugios) con **el 20 % de la superficie total** del establecimiento. Es un mínimo recomendado, no una obligación: el sistema informa y recomienda, no bloquea. | Doc., Ent. |
| **RN-02** | **Tipos de sector.** En los tres métodos, cada sector es **Cultivo** o **Sector de flores**. Un sector de cultivo indica su cultivo: uno del catálogo u "Otro" con texto. Un sector de flores no lleva cultivo, puede tener un subtipo (flora espontánea, borde silvestre, banda implantada, vegetación natural) y se nombra automáticamente ("Sector de flores N"). | v1, Esp. 02 |
| **RN-03** | **Un método por establecimiento.** Cada establecimiento se carga con **uno** de los tres métodos (cuestionario, croquis o mapa) y se edita solo con ese método. Para usar otro, se "carga de nuevo": se conservan los datos generales y se borran los sectores y el dibujo. Nunca se mezclan métodos. | v1, Esp. 02 |
| **RN-04** | **Datos de entrada.** Del establecimiento se piden: nombre, dirección, departamento, localidad (de la lista del departamento u "Otra"), ecorregión (Valles Templados, Quebrada de Humahuaca, Yungas, Puna o Chaco Seco, sugerida según el departamento) y superficie total. De cada sector: tipo, cultivo o subtipo, superficie y, en el cuestionario, ubicación relativa. No se piden más datos sin una especificación que lo justifique. | v1, Esp. 02 |
| **RN-05** | **Superficie calculada en los métodos con dibujo.** En croquis y mapa, la superficie de cada sector (y en el mapa, también la total, a partir del contorno) **la calcula el servidor** desde el dibujo: no se escribe a mano ni se confía en lo que manda el navegador. | v1, Esp. 02 |
| **RN-06** | **Superficies coherentes.** La suma de las superficies de los sectores no puede superar la superficie total del establecimiento. Todas las superficies son mayores que cero y se expresan en hectáreas. | v1 |
| **RN-07** | **Recomendaciones deterministas.** El diagnóstico, la propuesta y las especies recomendadas salen de un **motor de reglas** con datos validados. **No se usa IA generativa** para decidir recomendaciones agronómicas: tienen que ser trazables ("se recomienda X porque…"). | Doc. |
| **RN-08** | **Compatibilidad según el cultivo.** Cada par cultivo–planta de servicio tiene un grado de compatibilidad de **−5 a +5** con justificación agronómica. Solo se recomiendan plantas con grado mayor que 0, aptas para la ecorregión y ordenadas por grado. Si no hay ninguna compatible, el sistema lo dice ("No se encontraron cultivos de servicio compatibles") en lugar de inventar una. | Doc. (caso de prueba 04), Esp. 03 |
| **RN-09** | **No todos los cultivos dependen de la polinización** (por ejemplo, la caña de azúcar y el tabaco no). El diagnóstico tiene en cuenta si el cultivo la necesita. **(a validar)** | Ent. |
| **RN-10** | **Floración anticipada.** Las plantas de servicio propuestas tienen que florecer **antes** que el cultivo principal y cubrir su período de floración. **(a validar)**: el prototipo del calendario pide al menos 1 semana de anticipación y más del 80 % de cobertura. | Doc., prototipo de calendario |
| **RN-11** | **Corte antes de la maleza.** El calendario incluye el corte de cada planta de servicio antes de que complete su ciclo y se vuelva maleza. | Doc. |
| **RN-12** | **Información local.** Las especies recomendadas tienen que estar disponibles en Jujuy (mercado local o flora espontánea) y ser adecuadas a la ecorregión del establecimiento. | Doc. |
| **RN-13** | **El catálogo lo valida un especialista.** Especies, datos agronómicos de cultivos y compatibilidades se cargan y modifican solo desde el backoffice, por un administrador. Tienen estado **Borrador**, **Publicado** o **Retirado**: solo lo publicado se usa para recomendar, y publicar exige una **fuente** y quién lo validó. Cada cambio queda en un historial. | Doc., Esp. 03 |

## 2. Privacidad y seguridad

PoliCampo trata datos personales (usuarios) y datos sensibles para el productor (ubicación y producción de su finca):
aplica la **Ley 25.326 de Protección de Datos Personales**.

| Código | Regla |
| --- | --- |
| **RS-01** | **Secretos fuera del código.** Contraseñas, claves de API, cadenas de conexión (Neon) y tokens (Vercel) van en variables de entorno (archivo `.env` local o configuración de Vercel). **Nunca** se escriben en el código, en la documentación, en los commits ni en los mensajes. Se sube solo el ejemplo con valores ficticios (`.env.example`). |
| **RS-02** | **Cada usuario ve solo lo suyo.** Un usuario solo puede ver, editar o borrar sus propios establecimientos, sectores, diagnósticos e informes. Esto se controla **en el servidor** en cada operación, no solo ocultándolo en la interfaz. Para los establecimientos ajenos la respuesta es "no encontrado". |
| **RS-03** | **Roles.** Solo hay dos: **Usuario** y **Administrador**. Todo registro nuevo es Usuario. Los administradores se crean aparte, nunca desde el registro público. |
| **RS-04** | **Autenticación.** Registro con email (único), nombre de usuario (único, sin distinguir mayúsculas) y contraseña, con **verificación de email obligatoria** y consentimiento de la política de privacidad. Se puede ingresar con nombre de usuario **o** email. Las contraseñas se guardan con un algoritmo de hash seguro: tienen 8 caracteres o más, no pueden ser iguales al usuario ni al email, y no pueden estar filtradas. El ingreso tiene límite de intentos. Hay recuperación de contraseña por email. Detalle en la [especificación 01](especificaciones/01-usuarios-y-autenticacion.md). |
| **RS-05** | **Datos mínimos.** Se piden solo los datos personales necesarios. No se guardan datos personales en los logs. |
| **RS-06** | **Validación en el servidor.** Todo dato que llega del usuario se valida en el servidor: tipos, rangos y tamaños máximos. La interfaz puede validar antes, pero eso no reemplaza al servidor. |
| **RS-07** | **Protecciones web estándar:** HTTPS, protección CSRF, escape de todo dato mostrado (sin inyectar HTML ni scripts), consultas parametrizadas a la base de datos (sin SQL armado a mano con datos del usuario). |
| **RS-08** | **Navegador compartido.** Los borradores guardados en el navegador (localStorage) se separan por establecimiento y se borran al cerrar sesión. (La v1 ya los separa, pero todavía no los borra.) |
| **RS-09** | **Documentación anonimizada.** Ningún documento del repositorio tiene nombres, contactos, horarios ni ubicaciones de personas reales: se usan los identificadores anónimos (ver [docs/README.md](README.md#datos-personales-y-anonimización)). Los originales van en `docs/privado/`, que no se sube. |
| **RS-10** | **Repositorio privado.** El repositorio no se hace público: su historial tiene datos personales del equipo y de terceros. |

## 3. Desarrollo

| Código | Regla |
| --- | --- |
| **RD-01** | **Primero la especificación.** No se programa una funcionalidad sin una especificación aprobada. Si al implementar algo no está claro, se pregunta y se actualiza la especificación; no se improvisa. |
| **RD-02** | **Idioma español.** Interfaz, documentación, especificaciones, comentarios, mensajes de commit y nombres del dominio en el código (entidades, campos, funciones), usando los términos del [glosario](glosario.md). Los términos técnicos del framework quedan en inglés. |
| **RD-03** | **Celular primero.** Toda pantalla se diseña primero para el celular (desde 360 px de ancho), se usa con el dedo y tiene que funcionar con conexión lenta. |
| **RD-04** | **Tests.** Cada especificación se implementa con tests de sus criterios de aceptación. Como mínimo: registro, login, permisos (RS-02) y las reglas del dominio. No se integra código con tests que fallan. |
| **RD-05** | **Ramas y Pull Requests.** No se trabaja directo en `main`. Cada tarea va en su propia rama (`feature/…`, `fix/…`, `docs/…`) y entra a `main` por Pull Request revisado. Nada de `push --force` sobre ramas compartidas. |
| **RD-06** | **Commits claros.** Un commit por cambio con sentido, con un mensaje en español que explique qué y por qué. Por ejemplo: "Agregar el cálculo del déficit de biodiversidad (RN-01)". |
| **RD-07** | **Una tarea, sus archivos.** Al trabajar en paralelo, cada persona o agente toca solo los archivos de su especificación. Si necesita cambiar algo compartido (modelo de datos, estilos globales), lo avisa antes. |
| **RD-08** | **Cambios en la base de datos por migraciones.** El esquema de la base se modifica solo con migraciones versionadas en el repositorio, nunca a mano en Neon. |
| **RD-09** | **Explicar el código.** El equipo tiene que poder defender el código: cada PR explica qué hace y cómo. El código usa nombres claros y comentarios donde la lógica no es obvia, sobre todo en las reglas del dominio. |
| **RD-10** | **La v1 es referencia.** El código Django (v1) no se sigue desarrollando: se consulta para reutilizar reglas, validaciones y textos. |

## 4. Documentación

| Código | Regla |
| --- | --- |
| **RDOC-01** | Los términos nuevos se agregan al [glosario](glosario.md) en el mismo cambio que los introduce. |
| **RDOC-02** | Las decisiones que cambian una regla se registran acá, con su código, y se avisa al grupo. |
| **RDOC-03** | Todo documento nuevo de relevamiento (entrevistas, encuestas, reuniones) se anonimiza antes de agregarlo (RS-09). Los libros y artículos con derechos de autor no se suben: se citan en la bibliografía. |
