# PoliCampo v2 (web)

Nueva versión de PoliCampo: **Next.js** (React) + **PostgreSQL en Neon**, desplegada en **Vercel**.

Por ahora tiene una página provisoria, la ruta `/api/salud` (comprueba la conexión con la base) y la **base de la
autenticación** (módulo 01, tarea T1): Better Auth, Drizzle y las tablas de usuarios y sesiones.
Las funcionalidades se construyen a partir de las especificaciones (ver [AGENTS.md](../AGENTS.md)).

## Cómo correrla en tu computadora

Hace falta Node.js 22 o superior.

1. Instalar las dependencias (dentro de `web/`):
   ```bash
   npm install
   ```
2. Crear `web/.env.local` siguiendo [.env.example](.env.example): `DATABASE_URL` (rol `policampo_app` de la rama
   `desarrollo`), `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`. Los valores de la base los pasa quien administra el
   proyecto, por un canal privado. **`.env.local` nunca se sube** (regla RS-01).
3. Para correr los tests, crear `web/.env.test.local` con `TEST_DATABASE_URL`: una base **descartable** cuyo nombre
   termine en `_test` (por ejemplo `policampo_test` en la rama `pruebas` de Neon). Los tests la borran y la
   recrean.
4. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Abrir http://localhost:3000. En http://localhost:3000/api/salud tiene que aparecer `"baseDeDatos":"ok"`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila para producción (lo mismo que hace Vercel) |
| `npm run lint` | Revisa el código con ESLint |
| `npm run typecheck` | Genera los tipos de las rutas y chequea los tipos con TypeScript (lo corre la CI) |
| `npm test` | Corre los tests (Vitest) contra la base de tests |
| `npm run db:generar` | Crea una migración en `drizzle/` a partir de los cambios en `src/db/schema/` |
| `npm run db:migrar` | Aplica las migraciones con `DATABASE_URL_MIGRACIONES` (rol `policampo_migraciones`) |

## Infraestructura

| Servicio | Proyecto | Detalle |
| --- | --- | --- |
| **Neon** (PostgreSQL) | `Policampo` | Región `aws-us-east-1`. Base `neondb`. Ramas: `production` (solo producción) y `desarrollo` (vistas previas y trabajo local). |
| **Vercel** | `policampo` | Carpeta raíz `web/`. Conectado al repo de GitHub: cada push a una rama crea una vista previa, y cada cambio en `main` despliega a producción. `DATABASE_URL` está cargada como secreto: **Production** usa la rama `production` de Neon y **Preview**, la rama `desarrollo` (regla RS-11). |

No se cambia la configuración de Neon ni de Vercel sin acordarlo con el grupo (ver [AGENTS.md](../AGENTS.md)).

## Entornos (regla RS-11)

| Entorno | Rama de Neon | Quién la usa |
| --- | --- | --- |
| Producción | `production` | Solo el despliegue de `main` en Vercel |
| Desarrollo | `desarrollo` | Las vistas previas de Vercel y el `.env.local` de cada integrante |
| Tests | `pruebas` (base `policampo_test`) | Los tests de cada integrante. Descartable: se borra en cada corrida |

Nunca se usa la base de producción para probar ni se copian sus datos a desarrollo.

## Roles de la base (regla RS-12)

| Rol | Puede | Dónde se usa |
| --- | --- | --- |
| `policampo_app` | Leer, insertar, modificar y borrar **datos**. No puede crear, cambiar ni borrar tablas. | `DATABASE_URL` de la app (local y Vercel) |
| `policampo_migraciones` | Cambiar el esquema (migraciones). Las tablas que crea quedan disponibles para `policampo_app`. | `DATABASE_URL_MIGRACIONES`, solo en la computadora de quien migra |
| `neondb_owner` | Todo (dueño). | Solo para administrar roles. La app no lo usa. |

Estado: los roles existen en `desarrollo` y en `production` (creados el 2026-11-21, con la rama de respaldo
`respaldo-2026-11-21`). En Vercel, Preview y Production usan `policampo_app`.

## Respaldo antes de migrar (regla RS-16)

1. Antes de migrar producción, crear la rama de respaldo:
   ```bash
   neonctl branches create --project-id <id> --name respaldo-AAAA-MM-DD --parent production
   ```
2. Aplicar la migración con el rol `policampo_migraciones` (RS-12).
3. **Si algo sale mal:** restaurar `production` desde la rama de respaldo (consola de Neon → Branches → Restore) y
   avisar al grupo.
4. Borrar las ramas de respaldo de más de 30 días.

## Rotación de secretos

Se rotan **cuando alguien deja el grupo, cuando hay sospecha de filtración y una vez por cuatrimestre**:
`BETTER_AUTH_SECRET`, `CRON_SECRET`, `EMAIL_BAJA_SECRET`, `RESEND_API_KEY` y las contraseñas de los roles de la
base.

1. Generar el valor nuevo: en Neon, restablecer la contraseña del rol; en Resend, crear una clave nueva; para los
   secretos propios, un valor aleatorio de 32 bytes o más.
2. Cargarlo en Vercel como secreto (`vercel env add … --sensitive`) y volver a desplegar.
3. Revocar el valor viejo.
4. Rotar `BETTER_AUTH_SECRET` cierra todas las sesiones: avisar a los usuarios.

## Estructura

```
src/app/                    Pantallas y rutas (App Router)
src/app/api/salud/          GET /api/salud: estado de la app y de la base
src/app/api/auth/[...all]/  Rutas de Better Auth (registro, ingreso, verificación…)
src/lib/auth.ts             Configuración de Better Auth (especificación 01)
src/lib/email/              Envío de emails con Resend y plantillas (simulado en la consola si no hay clave)
src/lib/sesion.ts           requerirUsuario(), requerirAdministrador(), obtenerUsuario()
src/lib/cuentas.ts          Registro, ingreso y reenvío de la verificación
src/lib/limites.ts          Límites de intentos en la base (regla RS-13)
src/dominio/usuarios/       Validaciones del registro y ruta segura (funciones puras)
src/app/(cuentas)/          Pantallas de registro, verificación e ingreso
src/componentes/            Piezas de pantalla reutilizables (ui/, cuentas/)
src/lib/db.ts               Conexión simple a Neon (la usa /api/salud)
src/db/                     Drizzle: conexión (index.ts) y esquema (schema/)
drizzle/                    Migraciones SQL versionadas (regla RD-08)
tests/                      Tests (Vitest)
```

Esta versión de Next.js (16) tiene cambios respecto de versiones anteriores: antes de escribir código, consultar la
documentación incluida en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md) de esta carpeta).
