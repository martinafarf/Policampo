# Auditoría de seguridad de las especificaciones

| | |
| --- | --- |
| **Fecha** | 2026-11-21 |
| **Alcance** | Especificaciones [01](01-usuarios-y-autenticacion.md) a [07](07-informe-tecnico.md), [reglas del proyecto](../reglas-del-proyecto.md) y la **infraestructura real** (Vercel, Neon y GitHub) configurada para la v2 |
| **Método** | Revisión transversal según los tres pilares de la seguridad de la información (**C**onfidencialidad, **I**ntegridad y **D**isponibilidad), la **Ley 25.326** y los riesgos web habituales (OWASP Top 10). La infraestructura se verificó con las CLI de Vercel, Neon y GitHub, solo en modo lectura. |
| **Resultado** | **4 hallazgos de severidad alta**, **10 de severidad media** y **5 de severidad baja**. Ninguno exige rehacer una especificación: se resuelven con reglas nuevas (RS-11 a RS-18), ajustes puntuales y cambios de configuración. |

## 1. Lo que ya está bien

Las especificaciones ya cubren los riesgos más comunes:
- **Acceso a datos ajenos:** filtro por dueño en el servidor, 404 para lo ajeno e ids uuid, en todos los módulos.
- **Datos manipulados desde el navegador:** las superficies, los diagnósticos, las propuestas y las fotos de los
  informes los calcula siempre el servidor.
- **Contraseñas:** hash con scrypt, contraseñas filtradas rechazadas, verificación de email y sesiones que se cierran
  al cambiar la contraseña.
- **Inyección:** consultas parametrizadas (Drizzle), escape de React, CSV con protección contra fórmulas y `.ics`
  escapado.
- **Datos mínimos:** el nombre es opcional en los informes, el PDF y el mapa no tienen coordenadas, y los logs no
  tienen datos personales.
- **Trazabilidad:** versión de las reglas, fotos inmutables e historial del catálogo.
- **Secretos:** solo en variables de entorno, con `server-only`.

## 2. Hallazgos

Severidad: **Alta** = puede exponer o romper datos reales, o incumplir la ley; **Media** = debilidad importante que
conviene resolver antes de producción; **Baja** = mejora recomendable.

### Alta

| ID | Pilar | Hallazgo | Evidencia | Decisión y acción |
| --- | --- | --- | --- | --- |
| **A-01** | C, I | **Las vistas previas usan la base de producción.** Cada rama o PR despliega una vista previa en Vercel con el mismo `DATABASE_URL` que producción: un PR con un error puede modificar o borrar datos reales. | `vercel env ls`: `DATABASE_URL` cargada en *Production* y *Preview*. Neon tiene una sola rama, `production`. | **Rama de Neon `desarrollo`**, separada, para las vistas previas y las computadoras del grupo. Producción queda solo para `main`. → **RS-11** y cambio de configuración (sección 4). |
| **A-02** | C, I | **La aplicación se conecta con el rol dueño de la base** (`neondb_owner`), que puede crear y borrar tablas. Si se aprovecha una falla de la app, el daño no tiene límite. | La cadena de conexión usa `neondb_owner`. | **Mínimo privilegio:** el rol `policampo_app`, usado por la app, solo puede leer y escribir datos; el rol `policampo_migraciones`, que puede cambiar el esquema, solo se usa para migrar. → **RS-12**. |
| **A-03** | D, C | **Los límites de intentos no funcionarían en Vercel.** Si los contadores se guardan en memoria, cada pedido puede caer en otra instancia: el límite de 5 intentos de ingreso y los de diagnósticos, informes y registros se pueden saltear. | Especificaciones 01 (sección 8), 04 (7.2), 05 (8), 06 y 07 (7): no dicen dónde se guardan los contadores. | **Tabla de contadores en Postgres**, compartida por todas las instancias. Better Auth usa el almacenamiento en base de datos para su límite de intentos. → **RS-13**. |
| **A-04** | C (legal) | **Transferencia internacional de datos y registro de la base.** Neon (`aws-us-east-1`), Vercel y Resend procesan datos personales en Estados Unidos. La Ley 25.326 (art. 12) limita la transferencia a países sin protección adecuada, salvo, entre otras excepciones, el consentimiento expreso del titular. Además, las bases con datos personales se inscriben ante la AAIP (art. 21). | Región de Neon; servicios de Vercel y Resend. | **Informar y pedir consentimiento:** la política de privacidad nombra cada servicio y su país, y la casilla del registro pide consentimiento expreso para esa transferencia. **Consultar con la cátedra** la inscripción ante la AAIP antes de un uso real. → **RS-17** y especificación 01. |

### Media

| ID | Pilar | Hallazgo | Acción |
| --- | --- | --- | --- |
| **M-01** | I | **No hay integración continua.** Vercel compila, pero nadie corre los tests, el lint ni el chequeo de tipos en cada PR: RD-04 depende de que cada uno se acuerde. | **GitHub Actions** en cada PR con lint, chequeo de tipos, tests y `npm audit`. Los PRs no se mergean con chequeos fallidos. → **RS-18**. |
| **M-02** | I | **`main` no está protegida.** RD-05 ("todo entra por PR") es solo una convención: GitHub Free no permite proteger ramas en repositorios privados (la API responde "Upgrade to GitHub Pro"). | **Riesgo aceptado** (decisión de Integrante 3, 2026-11-21): no se va a activar GitHub Pro. Mitigación: RD-05 por acuerdo del grupo, la CI en cada PR (RS-18) y la revisión antes de mergear. Si el repositorio pasa a una organización con un plan que lo permita, se protege `main`. |
| **M-03** | I | **Las alertas de dependencias vulnerables están desactivadas** (Dependabot). | Activar las alertas y las actualizaciones de seguridad de Dependabot. Son gratis en repositorios privados. → **RS-18**. |
| **M-04** | I | **Escrituras simultáneas.** Si el usuario guarda sectores desde el celular y desde la compu, la última escritura borra la otra sin avisar (especificaciones 02 y 05). | **Control de versión:** cada guardado envía la versión que editó. Si la finca cambió mientras tanto, el servidor responde "La finca cambió en otro dispositivo" y no pisa nada. → **RS-15** y especificación 02. |
| **M-05** | D, I | **No hay plan de respaldo.** El plan gratuito de Neon tiene una ventana de restauración corta, y una migración con errores puede romper datos. | Antes de **cada migración en producción**, crear una **rama de respaldo** en Neon: es instantánea y gratis. Documentar cómo restaurar. Verificar la ventana de restauración del plan vigente. → **RS-16**. |
| **M-06** | C | **Faltan los encabezados HTTP de seguridad.** Ninguna especificación define CSP, HSTS, protección contra *clickjacking* ni política de referencia. | Configurar en `next.config.ts`: `Content-Security-Policy` (que permita las imágenes de Esri), `Strict-Transport-Security`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` (ubicación solo para el propio sitio) y `X-Content-Type-Options`. → **RS-14**. |
| **M-07** | C | **El registro revela si un email ya está registrado.** Permite averiguar si una persona usa PoliCampo. | **Riesgo aceptado** por decisión del grupo (usabilidad). Mitigación: el límite de intentos del registro (RS-13) impide probar emails en masa. Se registra en la especificación 01. |
| **M-08** | I | **Un administrador puede desactivar a otro.** Como los analistas de dominio tienen rol Administrador (especificación 03), un analista podría bloquear a otro administrador. | **Un administrador no puede desactivar a otro administrador**: solo se hace con el comando del servidor. Todas las acciones de administración quedan en el registro de eventos (B-02). → Especificación 01. |
| **M-09** | C, I | **Orígenes confiables mal configurados.** Si para que funcionen las vistas previas se agrega un comodín como `*.vercel.app` a los orígenes confiables de Better Auth, cualquier sitio de `vercel.app` podría hacer pedidos autenticados. | `trustedOrigins`: el dominio de producción y, en las vistas previas, **solo la URL exacta de ese despliegue** (`VERCEL_URL`). **Nunca comodines.** → Especificación 01. |
| **M-10** | C (legal) | **Datos que quedan después de borrar la cuenta:** los logs de Vercel, el historial de envíos de Resend y la ventana de restauración de Neon guardan datos por un tiempo. | La **política de privacidad** dice qué queda y por cuánto tiempo. Los emails llevan lo mínimo. La retención de logs de Vercel queda en su mínimo. → Especificación 01 (pendientes). |

### Baja

| ID | Pilar | Hallazgo | Acción |
| --- | --- | --- | --- |
| **B-01** | D | **Cálculos pesados sin tope de tiempo:** la resolución de anchos y combinaciones de la propuesta, y la generación del PDF. | Topes de iteraciones y un tiempo máximo de **10 s** por operación, con un error claro ("No se pudo generar, probá con menos franjas"). → Especificaciones 05 y 07. |
| **B-02** | C, I | **No hay registro de eventos de seguridad.** Los logs de Vercel duran poco y no sirven para investigar un incidente. | Tabla **`evento_seguridad`**, que se conserva 90 días. Registra ingresos fallidos, cambios de contraseña y de email, desactivaciones, borrados de cuenta, acciones de administración y envíos masivos, con el id del usuario y sin datos personales. → Especificación 01. |
| **B-03** | C | **No hay procedimiento para rotar secretos** (`BETTER_AUTH_SECRET`, `CRON_SECRET`, `EMAIL_BAJA_SECRET`, `RESEND_API_KEY`, contraseñas de la base). | Documentar en `web/README.md` cómo y cuándo rotarlos: siempre que alguien deje el grupo o haya sospecha de filtración. |
| **B-04** | C | **El enlace de baja del email no vence.** | **Aceptado:** solo sirve para darse de baja, está firmado y tiene propósito único. |
| **B-05** | D (legal) | **El plan Hobby de Vercel es para uso no comercial**, y el modelo de negocio prevé suscripciones. | Mientras sea un proyecto académico no aplica. Si se comercializa, pasar al plan Pro. |

## 3. Cambios en las especificaciones y las reglas

| Documento | Cambio |
| --- | --- |
| [Reglas del proyecto](../reglas-del-proyecto.md) | Reglas nuevas **RS-11 a RS-18** (A-01, A-02, A-03, M-06, M-04, M-05, A-04, M-01 y M-03). |
| [01](01-usuarios-y-autenticacion.md) | Registro: el email existente se informa (**riesgo aceptado**, M-07). Consentimiento con transferencia internacional (A-04). Orígenes confiables sin comodines (M-09). Administradores que no se desactivan entre sí (M-08). Registro de eventos de seguridad (B-02). Contadores en Postgres (A-03). Pendientes de la AAIP y de la retención (A-04, M-10). |
| [02](02-establecimientos-y-sectores.md) | Control de versión al guardar (M-04). |
| [05](05-propuesta-de-rediseno.md) | Topes de cálculo (B-01). |
| [07](07-informe-tecnico.md) | Tope de tiempo del PDF (B-01). |
| [`web/README.md`](../../web/README.md) | Entornos, rotación de secretos y respaldo antes de migrar (A-01, B-03, M-05). |

## 4. Cambios de configuración pendientes

Requieren acción sobre Vercel, Neon o GitHub. No se ejecutaron durante la auditoría: los 1, 3 y 4 se aplicaron después, con aprobación.

| N.º | Cambio | Hallazgo | Quién |
| --- | --- | --- | --- |
| 1 | **✅ Aplicado el 2026-11-21** (PR #10). Crear la rama de Neon `desarrollo` y apuntar el `DATABASE_URL` de *Preview* de Vercel a esa rama. *Production* sigue con la rama `production`. | A-01 | Claude, con aprobación de Integrante 3 |
| 2 | Crear los roles `policampo_app` (solo datos) y `policampo_migraciones` en Neon, y usar `policampo_app` en Vercel. | A-02 | Al implementar T1 del módulo 01, porque las tablas todavía no existen |
| 3 | **✅ Aplicado el 2026-11-21.** Activar las alertas y las actualizaciones de seguridad de Dependabot. | M-03 | Claude, con aprobación |
| 4 | **✅ Aplicado el 2026-11-21** (PR #10). Agregar el flujo de GitHub Actions (lint, tipos, tests y `npm audit`). | M-01 | Claude, con aprobación |
| 5 | ~~Pedir el GitHub Student Developer Pack y proteger `main`.~~ **Descartado:** riesgo aceptado (ver M-02). | M-02 | — |
