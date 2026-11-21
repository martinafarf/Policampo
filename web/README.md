# PoliCampo v2 (web)

Nueva versión de PoliCampo: **Next.js** (React) + **PostgreSQL en Neon**, desplegada en **Vercel**.

Por ahora es un **esqueleto**: una página provisoria y la ruta `/api/salud`, que comprueba la conexión con la base.
Las funcionalidades se construyen a partir de las especificaciones (ver [AGENTS.md](../AGENTS.md)).

## Cómo correrla en tu computadora

Hace falta Node.js 20 o superior.

1. Instalar las dependencias (dentro de `web/`):
   ```bash
   npm install
   ```
2. Crear `web/.env.local` con la variable `DATABASE_URL`, siguiendo [.env.example](.env.example). Hay dos formas:
   - Con acceso al proyecto de Neon:
     ```bash
     neonctl connection-string --project-id <id-del-proyecto> --pooled
     ```
   - Con acceso al proyecto de Vercel: `vercel link` y después `vercel env pull`.

   **`.env.local` nunca se sube** (regla RS-01).
3. Levantar el servidor de desarrollo:
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

## Infraestructura

| Servicio | Proyecto | Detalle |
| --- | --- | --- |
| **Neon** (PostgreSQL) | `Policampo` | Región `aws-us-east-1`. Rama `production`, base `neondb`. |
| **Vercel** | `policampo` | Carpeta raíz `web/`. Conectado al repo de GitHub: cada push a una rama crea una vista previa, y cada cambio en `main` despliega a producción. `DATABASE_URL` está cargada como secreto. **Pendiente** (regla RS-11): hoy las vistas previas también usan la rama `production`; tienen que pasar a la rama `desarrollo`. |

No se cambia la configuración de Neon ni de Vercel sin acordarlo con el grupo (ver [AGENTS.md](../AGENTS.md)).

## Entornos (regla RS-11)

| Entorno | Rama de Neon | Quién la usa |
| --- | --- | --- |
| Producción | `production` | Solo el despliegue de `main` en Vercel |
| Desarrollo | `desarrollo` | Las vistas previas de Vercel y el `.env.local` de cada integrante |

Nunca se usa la base de producción para probar ni se copian sus datos a desarrollo.

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
src/app/            Pantallas y rutas (App Router)
src/app/api/salud/  GET /api/salud: estado de la app y de la base
src/lib/db.ts       Conexión a Neon (solo servidor)
```

Esta versión de Next.js (16) tiene cambios respecto de versiones anteriores: antes de escribir código, consultar la
documentación incluida en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md) de esta carpeta).
