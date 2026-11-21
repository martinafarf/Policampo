# AGENTS.md: instrucciones para agentes de IA

Este archivo es para **cualquier agente de IA** que trabaje en este repositorio: Claude Code, Gemini, Codex, Cursor,
etc. Las personas del equipo también lo usan como guía. Leelo completo antes de hacer cambios.

## 1. Contexto en 30 segundos

- **PoliCampo** es un sistema web de apoyo a la toma de decisiones agroecológicas para productores e ingenieros
  agrónomos de Jujuy. Diagnostica la biodiversidad de una finca (regla del 20 %), propone franjas florales y plantas de
  servicio, arma un calendario y genera un informe. Ver [README.md](README.md).
- Es un **trabajo universitario grupal** (UNJu, 2026). El equipo está aprendiendo: **explicá lo que hacés** para que
  puedan defender el código.
- **Etapas del código:**
  - **v1** (este repositorio): prototipo en Django + PostgreSQL. **Es solo referencia.**
  - **v2** (carpeta `web/`): **Next.js 16** (React), **PostgreSQL en Neon** y despliegue en **Vercel**. Por ahora es
    un esqueleto conectado a la base. Se construye a partir de especificaciones: la arquitectura interna (librerías,
    autenticación, migraciones) se define en ellas y **no la asumas**. Next.js 16 cambió respecto de versiones
    anteriores: antes de escribir código, leé [web/AGENTS.md](web/AGENTS.md) y la documentación en
    `web/node_modules/next/dist/docs/`.

## 2. Qué leer antes de trabajar

En este orden:

1. [docs/reglas-del-proyecto.md](docs/reglas-del-proyecto.md): **obligatorio**. Reglas del dominio (RN), privacidad y
   seguridad (RS), desarrollo (RD) y documentación (RDOC).
2. [docs/glosario.md](docs/glosario.md): usá exactamente estos términos y nombres.
3. La **especificación** de tu tarea. Si no existe, no programes: ver la sección 4.
4. Lo que necesites de [docs/](docs/README.md): la formulación del proyecto, los casos de uso y las entrevistas.

## 3. Reglas que no se rompen

- **Nunca** escribas, muestres ni subas secretos: contraseñas, `.env`, cadenas de conexión de Neon, tokens de Vercel,
  claves de API (RS-01).
- **Nunca** agregues nombres, contactos, horarios ni ubicaciones de personas reales. No leas ni subas `docs/privado/`
  (RS-09).
- **Nunca** hagas `push` a `main`, `push --force`, ni reescribas el historial. Trabajá en una rama y abrí un Pull
  Request (RD-05).
- **Nunca** hagas el repositorio público ni subas nada al remoto `upstream`, que es el repo original del grupo y solo
  sirve para leer (RS-10).
- **Nunca** cambies la configuración de Neon o de Vercel (proyectos, variables, dominios, bases) sin que una persona lo
  pida explícitamente.
- **Nunca** uses IA generativa para producir recomendaciones agronómicas dentro del sistema: el motor de reglas es
  determinista y trazable (RN-07).
- **Cada usuario ve solo sus datos:** toda operación sobre establecimientos o sus derivados verifica el dueño en el
  servidor (RS-02).
- **Antes de un cambio grande, mostrá el plan y esperá la aprobación.** Por ejemplo: un modelo de datos nuevo, una
  dependencia nueva, cambios en varios módulos o cualquier cosa difícil de deshacer.

## 4. Forma de trabajo (guiada por especificaciones)

```
documentación → especificación → plan → implementación + tests → revisión → Pull Request
```

1. **Especificación.** Cada funcionalidad tiene una especificación con: objetivo, actores, datos, reglas que aplica
   (con su código RN/RS), flujos, criterios de aceptación y requisitos de seguridad. Si falta información, **preguntá**
   y no la inventes. Las reglas marcadas "(a validar)" se confirman con el grupo antes de implementarlas.
2. **Plan.** Antes de programar, listá los archivos que vas a crear o tocar y los pasos.
3. **Implementación.**
   - Hacé el cambio mínimo que cumple la especificación, en español (RD-02) y para celular primero (RD-03).
   - No agregues funcionalidades que no estén en la especificación.
4. **Tests.** Escribí tests para cada criterio de aceptación y corrélos (RD-04). Si fallan, no lo des por terminado.
5. **Pull Request.** Escribí en español qué hace, cómo, qué reglas cumple y cómo se probó.

### Trabajo en paralelo

Cuando varios agentes trabajan a la vez:
- Una especificación por agente, cada una en su propia rama.
- Cada agente toca **solo los archivos de su tarea**. El modelo de datos, la configuración global y los estilos
  compartidos los cambia uno solo, y avisa antes (RD-07).
- Las tareas que dependen de otra empiezan cuando la otra se integró en `main`.

## 5. Convenciones

| Tema | Convención |
| --- | --- |
| Idioma | Español en la interfaz, la documentación, los comentarios, los commits y los nombres del dominio. Inglés solo en los términos técnicos del framework. |
| Nombres | Los del [glosario](docs/glosario.md), columna "Nombre en el código": `establecimiento`, `parcela`, `superficie_total_ha`, `metodo_caracterizacion`, etc. |
| Unidades | Superficies en hectáreas (ha), con hasta 4 decimales. Los m² solo para mostrar. |
| Ramas | `feature/<tema>`, `fix/<tema>`, `docs/<tema>`, en minúsculas y con guiones. |
| Commits | En español, en infinitivo y explicando el porqué. Por ejemplo: "Agregar el cálculo del déficit de biodiversidad (RN-01)". |
| Documentación | Términos nuevos al glosario; cambios de reglas en las reglas del proyecto (RDOC-01, RDOC-02). |

## 6. Mapa del repositorio

| Ruta | Qué hay |
| --- | --- |
| `docs/` | Documentación anonimizada. Empezar por [docs/README.md](docs/README.md). |
| `docs/privado/` | Originales con datos reales. **Ignorado por Git: no leer, no subir.** |
| `web/` | **v2**: app Next.js. Ver [web/README.md](web/README.md). La conexión a la base está en `web/src/lib/db.ts` (solo servidor). |
| `web/.env.local`, `web/.vercel/` | Secretos y configuración local de Vercel. **Ignorados por Git: no leer, no mostrar, no subir.** |
| `usuarios/` | v1: usuario personalizado, login con usuario o email, registro. |
| `principal/` | v1: landing page pública. |
| `campos/` | v1: establecimientos y sectores (cuestionario y croquis), un método por finca. |
| `mapa/` | v1: mapa de entrada (terreno) y salida (propuesta) con Leaflet. |
| `suscripciones/` | v1: pantallas de plan y pago (sin pagos reales). |
| `templates/`, `static/` | v1: plantillas HTML, CSS y JS. |
| `policampo/` | v1: configuración de Django. |

Las ramas `feature/calendario-bruce` (calendario de floración) y `Diagnostico-Informe` (diagnóstico, informe y
catálogo de especies con compatibilidades) tienen prototipos que **todavía no están en `main`**. Sirven de referencia
para las especificaciones de esos módulos.

### Cómo correr la v2

Dentro de `web/`:

```bash
npm run dev
```
```bash
npm run build
```
```bash
npm run lint
```

`GET /api/salud` tiene que responder `"baseDeDatos":"ok"`. Cada push a una rama crea una vista previa en Vercel, y
cada cambio en `main` despliega a producción. Antes de pedir revisión, comprobá que `npm run build` funcione.

### Cómo correr la v1 (solo para consultarla)

```bash
venv\Scripts\python manage.py runserver
```
```bash
venv\Scripts\python manage.py test
```

Necesita un `.env` con las variables de `.env.example`. **No lo leas ni lo muestres.**

## 7. Cuándo una tarea está terminada

- [ ] Cumple todos los criterios de aceptación de su especificación.
- [ ] Respeta las reglas RN, RS y RD que aplican, y están citadas en el PR.
- [ ] Tiene tests que pasan, y no rompe los tests existentes.
- [ ] Funciona en el celular (360 px) y en la computadora.
- [ ] No tiene secretos, datos personales reales ni archivos de `docs/privado/`.
- [ ] Usa los términos del glosario. Si agrega términos nuevos, actualizó el glosario.
- [ ] Está en una rama propia, con commits claros, y tiene un Pull Request con la explicación.
