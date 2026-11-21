# PoliCampo

**Sistema web de apoyo a la toma de decisiones para el rediseño agroecológico de terrenos agrícolas en Jujuy.**

PoliCampo ayuda a productores e ingenieros agrónomos a **incorporar franjas florales y plantas de servicio** en sus
fincas. El objetivo es recuperar la biodiversidad (polinizadores e insectos benéficos), mejorar el rendimiento y la
calidad de los cultivos y reducir el uso de agroquímicos. Toma como referencia la recomendación de destinar
**al menos un 20 % del predio** a vegetación natural (Garibaldi y otros).

Es un trabajo de campo interdisciplinario de la Facultad de Ingeniería de la Universidad Nacional de Jujuy (UNJu),
año 2026, con estudiantes de Ingeniería Informática, Ingeniería Industrial y Licenciatura en Sistemas.

---

## El problema

En Jujuy predominan sistemas de producción con uso intensivo de agroquímicos, que eliminan polinizadores nativos e
insectos benéficos. La agroecología propone restaurar la biodiversidad del predio, pero falta **información técnica
organizada**:
- qué especies sembrar;
- dónde ubicarlas;
- cuándo sembrarlas y cortarlas.

Por eso la biodiversidad se percibe como "superficie perdida".

## Para quién es

- **Usuarios:** productores agrícolas e ingenieros agrónomos de Jujuy, sobre todo de Valles y Yungas. Tienen los mismos
  permisos.
- **Administradores:** gestionan el sistema y el catálogo técnico (especies, reglas).

Se usa mucho **desde el celular, en el campo**: la interfaz tiene que ser responsive y funcionar con mala conexión.

## Qué hace (alcance funcional)

1. **Registro de fincas y sectores:** por cuestionario, por croquis o ubicando el campo en un mapa (uno de los tres por
   finca).
2. **Diagnóstico:** detecta el déficit de biodiversidad (por ejemplo, si no llega al 20 %) y las áreas aptas para
   intervenir.
3. **Propuesta de rediseño:** ubicación de corredores y franjas florales dentro del terreno.
4. **Recomendación de plantas de servicio** compatibles con el cultivo, la ecorregión y el período de floración.
5. **Calendario agroecológico:** siembra, floración y corte (antes de que la vegetación se convierta en maleza).
6. **Informe técnico descargable** con el diagnóstico, las especies y el rediseño.
7. **Encuestas de seguimiento** después de la cosecha, para validar y recalibrar las reglas.

El detalle está en [docs/proyecto/semana-2-formulacion-del-proyecto.md](docs/proyecto/semana-2-formulacion-del-proyecto.md).

## Estado del proyecto

| Etapa | Estado |
| --- | --- |
| **v1: prototipo en Django** (este repositorio) | Autenticación, landing, carga de fincas por cuestionario y croquis, y mapa de entrada y salida. Queda como **referencia** de las reglas y las pantallas. |
| **v2: nueva versión** (carpeta [`web/`](web/README.md)) | **En preparación.** Stack: **Next.js** (React), **PostgreSQL en Neon** y despliegue en **Vercel**. La infraestructura ya está conectada; las funcionalidades se desarrollan a partir de **especificaciones**, con agentes de IA. |

## Metodología de la v2

Desarrollo guiado por especificaciones:

1. **Documentación** del proyecto, anonimizada, en [`docs/`](docs/README.md).
2. **Base común:** este README, el [glosario](docs/glosario.md), las [reglas del proyecto](docs/reglas-del-proyecto.md)
   y las instrucciones para agentes en [AGENTS.md](AGENTS.md).
3. **Infraestructura:** base de datos en Neon y despliegue en Vercel, conectados con sus CLI. ✅ Ver
   [web/README.md](web/README.md#infraestructura).
4. **Especificaciones** a partir de la documentación, separadas en frontend, backend, base de datos y seguridad.
5. **Auditoría de seguridad** de las especificaciones y del código.
6. **Implementación** por especificación, con varios agentes trabajando en paralelo.

## Estructura del repositorio

```
AGENTS.md            Instrucciones para cualquier agente de IA (leer antes de trabajar)
README.md            Este archivo
docs/                Documentación del proyecto (anonimizada)
  README.md          Índice de la documentación
  glosario.md        Términos del dominio y del sistema
  reglas-del-proyecto.md
  proyecto/          Formulación del proyecto, casos de uso
  entrevistas/       Relevamiento con un especialista
  img/               Diagramas
web/                 v2: app Next.js (ver web/README.md)
usuarios/ principal/ campos/ mapa/ suscripciones/ templates/ static/ policampo/
                     Código de la v1 (Django), como referencia
```

## Cómo ejecutar la v1 (Django)

Hace falta Python 3.11 o superior y PostgreSQL.

1. Crear el entorno e instalar las dependencias:
   ```bash
   python -m venv venv
   ```
   ```bash
   venv\Scripts\pip install -r requirements.txt
   ```
2. Copiar `.env.example` como `.env` y completar los valores. El archivo `.env` **nunca** se sube al repositorio.
3. Crear las tablas y levantar el servidor:
   ```bash
   venv\Scripts\python manage.py migrate
   ```
   ```bash
   venv\Scripts\python manage.py runserver
   ```

## Cómo ejecutar la v2 (Next.js)

Ver [web/README.md](web/README.md).

## Datos personales

El sistema trata datos de usuarios y la ubicación de sus fincas: se rige por la **Ley 25.326 de Protección de Datos
Personales**. La documentación del repositorio está anonimizada. Ver las
[reglas del proyecto](docs/reglas-del-proyecto.md#2-privacidad-y-seguridad).

## Licencia

Repositorio privado. La titularidad del código y de la base de conocimiento corresponde al equipo desarrollador
(Ley 11.723). La licencia de uso está a definir.
