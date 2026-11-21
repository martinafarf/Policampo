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
| `npm run typecheck` | Genera los tipos de las rutas y chequea los tipos con TypeScript (lo corre la CI) |

## Infraestructura

| Servicio | Proyecto | Detalle |
| --- | --- | --- |
| **Neon** (PostgreSQL) | `Policampo` | Región `aws-us-east-1`. Base `neondb`. Ramas: `production` (solo producción) y `desarrollo` (vistas previas y trabajo local). |
| **Vercel** | `policampo` | Carpeta raíz `web/`. Conectado al repo de GitHub: cada push a una rama crea una vista previa, y cada cambio en `main` despliega a producción. `DATABASE_URL` está cargada como secreto: **Production** usa la rama `production` de Neon y **Preview**, la rama `desarrollo` (regla RS-11). |

No se cambia la configuración de Neon ni de Vercel sin acordarlo con el grupo (ver [AGENTS.md](../AGENTS.md)).

## Estructura

```
src/app/            Pantallas y rutas (App Router)
src/app/api/salud/  GET /api/salud: estado de la app y de la base
src/lib/db.ts       Conexión a Neon (solo servidor)
```

Esta versión de Next.js (16) tiene cambios respecto de versiones anteriores: antes de escribir código, consultar la
documentación incluida en `node_modules/next/dist/docs/` (ver [AGENTS.md](AGENTS.md) de esta carpeta).
