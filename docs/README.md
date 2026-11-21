# Documentación de PoliCampo

Documentación del proyecto **PoliCampo**, un sistema web de apoyo a la toma de decisiones agroecológicas para
productores e ingenieros agrónomos de Jujuy. Es un trabajo de campo interdisciplinario de la Facultad de Ingeniería
de la UNJu, año 2026.

Esta carpeta es la **fuente de referencia** para escribir las especificaciones y para los agentes de IA que trabajan
en el proyecto.

## Contenido

### Base común: leer primero

| Archivo | Contenido |
| --- | --- |
| [reglas-del-proyecto.md](reglas-del-proyecto.md) | Reglas del dominio, de privacidad y seguridad, de desarrollo y de documentación. |
| [glosario.md](glosario.md) | Términos del dominio y del sistema, con su nombre en el código. |
| [../AGENTS.md](../AGENTS.md) | Instrucciones para agentes de IA. |
| [especificaciones/](especificaciones/README.md) | Especificaciones de los módulos de la v2. |

### `proyecto/`: formulación del proyecto

| Archivo | Contenido |
| --- | --- |
| [semana-2-formulacion-del-proyecto.md](proyecto/semana-2-formulacion-del-proyecto.md) | Documento principal: introducción, justificación, análisis de entradas, procesos y salidas, objetivos, alcance funcional, viabilidad (operativa, técnica, legal y económica), modelo de negocio, planificación por sprints, roles, casos de uso y diagramas de colaboración y de secuencia. |
| [semana-3-alternativas-y-casos-de-uso.md](proyecto/semana-3-alternativas-y-casos-de-uso.md) | Alternativas de solución evaluadas y lista de casos de uso. |
| [semana-3-actividad-generar-informe.md](proyecto/semana-3-actividad-generar-informe.md) | Caso de uso 006 "Generar informe" con su diagrama de actividad. |

### `entrevistas/`: relevamiento con un especialista

Entrevistas a un ingeniero agrónomo, investigador en agroecología y apicultor (**Especialista 1**).

| Archivo | Contenido |
| --- | --- |
| [especialista-1-audios-notas.md](entrevistas/especialista-1-audios-notas.md) | Notas ordenadas por tema de los audios que envió el especialista. **Empezar por acá.** |
| [especialista-1-conceptos-del-dominio.md](entrevistas/especialista-1-conceptos-del-dominio.md) | Conceptos del dominio que surgen de los audios: polinizadores, plantas de servicio, etc. |
| [especialista-1-audios-transcripcion.md](entrevistas/especialista-1-audios-transcripcion.md) | Transcripción de los audios. |
| [especialista-1-reunion-a-transcripcion.md](entrevistas/especialista-1-reunion-a-transcripcion.md) | Transcripción de la reunión A. |
| [especialista-1-reunion-b-transcripcion.md](entrevistas/especialista-1-reunion-b-transcripcion.md) | Transcripción de la reunión B. |
| [especialista-1-reunion-c-transcripcion.md](entrevistas/especialista-1-reunion-c-transcripcion.md) | Transcripción de la reunión C. |

Las transcripciones son automáticas: pueden tener errores de reconocimiento de voz, sobre todo en los nombres de las plantas.

### `img/`

Diagramas e imágenes que se usan en los documentos: diagrama de entradas, procesos y salidas, relación con el ambiente,
modelo de negocio, Gantt, PERT, casos de uso, colaboración, secuencia y actividad, y gráficos de la encuesta.

## Datos personales y anonimización

Por la Ley 25.326 de Protección de Datos Personales, los documentos están **anonimizados**:

| En los documentos | Quién es |
| --- | --- |
| Integrante 1 a 8 | Integrantes del equipo (los roles están en la sección "Roles y Responsabilidades del Equipo") |
| Docente 1 y 2, Adscripto/a 1 a 3 | Docentes y estudiantes adscriptos de la cátedra |
| Especialista 1 | Ingeniero agrónomo entrevistado |
| Ing. Contacto 1, Investigadora 1, Asesor 1 | Profesionales que facilitaron contactos o asesoramiento |
| Productor A | Productor entrevistado en la Quebrada de Humahuaca |

Se omitieron (y está marcado en el texto) los horarios, lugares de trabajo y de residencia, contactos y enlaces internos.
También quedaron afuera las capturas de pantalla del prototipo, que tenían usuarios de prueba y ubicaciones reales.
Los originales con los nombres reales **no se suben al repositorio**.

**Regla para todo documento nuevo:** antes de agregarlo a `docs/`, reemplazar los nombres y datos de contacto de
personas reales por estos mismos identificadores.

## Bibliografía

- Garibaldi, L. A., y otros. *Paisajes agrícolas multifuncionales: De la ciencia a la práctica*. Es la base de la regla
  de destinar al menos un **20 %** de la superficie del predio a vegetación natural (corredores y franjas florales) para
  conservar la biodiversidad y los polinizadores. El libro está protegido por derechos de autor y no se incluye en el
  repositorio.

## Pendiente

- Agregar el informe final ("Informe"), anonimizado, cuando esté disponible en Markdown.
