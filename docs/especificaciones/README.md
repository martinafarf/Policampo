# Especificaciones de PoliCampo v2

Cada especificación describe un módulo con el detalle suficiente para implementarlo sin adivinar. **No se programa
nada sin una especificación aprobada** (regla RD-01).

## Módulos

| N.º | Módulo | Estado | Depende de |
| --- | --- | --- | --- |
| 01 | [Usuarios y autenticación](01-usuarios-y-autenticacion.md) (incluye landing y privacidad) | Borrador para revisión | — |
| 02 | [Establecimientos y sectores](02-establecimientos-y-sectores.md) (cuestionario, croquis, mapa) | Borrador para revisión | 01 |
| 03 | [Catálogo de especies y compatibilidades](03-catalogo-de-especies.md) (backoffice y Guía de especies) | Borrador para revisión | 01, 02 (tabla `cultivo`) |
| 04 | Diagnóstico (regla del 20 %) | Pendiente | 02, 03 |
| 05 | Propuesta de rediseño y plantas de servicio | Pendiente | 04 |
| 06 | Calendario agroecológico | Pendiente | 05 |
| 07 | Informe técnico descargable | Pendiente | 04, 05, 06 |

Quedan para más adelante: las encuestas de seguimiento y los pagos o suscripción.

## Estados

- **Borrador para revisión:** escrito a partir de la ronda de preguntas. Falta que el grupo lo revise.
- **Aprobada:** el grupo la revisó. Se puede implementar.
- **Implementada:** cumple todos sus criterios de aceptación y está en `main`.

## Estructura de cada especificación

1. **Objetivo y alcance:** qué incluye y qué no.
2. **Decisiones:** lo que se resolvió en la ronda de preguntas, con su motivo.
3. **Actores y permisos.**
4. **Flujos:** paso a paso de cada caso de uso.
5. **Frontend:** pantallas, rutas, textos y comportamiento en el celular.
6. **Backend:** operaciones, validaciones y lógica.
7. **Base de datos:** tablas, campos, restricciones y migraciones.
8. **Seguridad:** amenazas y controles, con las reglas RS que aplica.
9. **Criterios de aceptación:** condiciones verificables con tests (CA-NN-xx).
10. **Plan de implementación:** tareas en orden, para repartir entre personas o agentes.
11. **Pendientes:** lo que falta definir o conseguir.

Las especificaciones usan los términos del [glosario](../glosario.md) y citan las
[reglas del proyecto](../reglas-del-proyecto.md) por su código.
