# Glosario de PoliCampo

Términos del dominio agroecológico y del sistema. **Usar siempre estos nombres**: en la documentación, en las
especificaciones, en la interfaz y en el código. Así personas y agentes hablan de lo mismo.

- **Nombre en el código:** cómo se llama la entidad o el concepto en el código, en español (ver
  [reglas del proyecto](reglas-del-proyecto.md#3-desarrollo)).
- **Fuente:** de dónde sale el término.
  - **Doc.**: [formulación del proyecto](proyecto/semana-2-formulacion-del-proyecto.md).
  - **Ent.**: [entrevistas al Especialista 1](entrevistas/especialista-1-conceptos-del-dominio.md).
  - **v1**: decisiones del grupo aplicadas en el prototipo Django.
  - **Prototipo de diagnóstico**: rama `Diagnostico-Informe` (app `agroecologia`).
  - **Esp. NN**: [especificación](especificaciones/README.md) número NN.

---

## 1. Sistema: entidades y funciones

| Término | Definición | Nombre en el código | Fuente |
| --- | --- | --- | --- |
| **Usuario** | Productor o ingeniero agrónomo registrado. Ambos tienen **los mismos permisos**: el sistema no los distingue. En la base, la tabla de Better Auth se llama `user`. | `usuario` (tabla `user`) | v1, Esp. 01 |
| **Cuenta verificada** | Cuenta cuyo email se confirmó con el enlace enviado al registrarse. Sin verificar no se puede ingresar. | `email_verified` | Esp. 01 |
| **Cuenta desactivada** | Cuenta que un administrador bloqueó: no puede ingresar y se cierran sus sesiones. Se puede reactivar. | `banned` | Esp. 01 |
| **Sesión** | Estado de "usuario ingresado" en un dispositivo. Dura 30 días y se renueva con el uso. | `session` | Esp. 01 |
| **Consentimiento** | Aceptación de la política de privacidad al registrarse, con la versión y la fecha guardadas (Ley 25.326). | `politica_privacidad_version`, `politica_privacidad_aceptada_en` | Esp. 01 |
| **Administrador** | Gestiona el sistema y el catálogo técnico (especies, reglas). No se registra desde la web: se crea aparte. | `administrador` | v1 |
| **Establecimiento** (o **finca**, **predio**) | Terreno agrícola de un usuario. Tiene nombre, dirección, departamento, localidad, ecorregión y superficie total. **"Finca"** y **"predio"** son sinónimos en el uso diario; en el código se usa siempre `establecimiento`. | `establecimiento` | Doc., v1 |
| **Superficie total** | Superficie del establecimiento, en hectáreas (ha). En el método mapa se calcula sola a partir del contorno dibujado. | `superficie_total_ha` | v1 |
| **Sector** (o **parcela**) | Porción del establecimiento con un uso: **Cultivo** o **Sector de flores**. Tiene tipo, cultivo o subtipo, superficie y, según el método, ubicación relativa o geometría. En la v1 la tabla se llamaba `parcela`; en la v2, `sector`. | `sector` | Doc., v1, Esp. 02 |
| **Sector de flores** | Sector con plantas con flores o vegetación natural que atraen polinizadores e insectos benéficos. Cuenta para el 20 %. Subtipos opcionales: flora espontánea, borde o cerco silvestre, banda floral implantada, cortina forestal o vegetación natural. Se nombra automáticamente: "Sector de flores 1", "Sector de flores 2"… | `sector_flores`, `subtipo_flores` | v1, Esp. 02 |
| **Superficie distribuida / restante** | Suma de las superficies de los sectores cargados / superficie total menos la distribuida. | — | v1 |
| **Método de caracterización** | Cómo se cargó el establecimiento: **cuestionario**, **croquis** o **mapa**. Cada establecimiento usa **un solo método** y se edita solo con ese. | `metodo_caracterizacion` | v1 |
| **Cuestionario** | Método de carga por formulario: datos del establecimiento y lista de sectores. | `cuestionario` | Doc., v1 |
| **Croquis** | Método de carga dibujando los sectores en un **plano cuadrado a escala**, armado a partir de la superficie total (lado = √(ha × 10.000) m). No usa mapa. | `croquis` | Doc., v1, Esp. 02 |
| **Mapa** | Método de carga dibujando el **contorno** del terreno y sus sectores sobre una imagen satelital (Leaflet + Esri). La superficie total sale del contorno. En la v1 tenía un paso 2 de propuesta: en la v2 eso es el módulo 05. | `mapa` | Doc., v1, Esp. 02 |
| **Diagnóstico** | Evaluación del establecimiento: porcentaje actual de biodiversidad comparado con el 20 % recomendado, el déficit, el nivel de riesgo y las áreas aptas para intervenir. | `diagnostico` | Doc. |
| **Nivel de riesgo** | Resultado del diagnóstico: **crítico**, **moderado** o **adecuado**, según el déficit de biodiversidad. Los umbrales los define la especificación del diagnóstico. | `nivel_riesgo` | Prototipo de diagnóstico |
| **Áreas aptas** | Zonas del predio donde conviene ubicar franjas florales, por ejemplo bordes perimetrales y cabeceras de lote. | `areas_aptas` | Doc. |
| **Propuesta de rediseño** | Distribución propuesta de corredores y franjas florales dentro del terreno, con las plantas de servicio y las tareas a realizar. | `propuesta_rediseno` | Doc. |
| **Informe técnico** | Documento descargable e imprimible que consolida el diagnóstico, las especies elegidas y el rediseño. | `informe` | Doc. |
| **Calendario agroecológico** | Cronograma de siembra, floración y corte de las plantas de servicio, coordinado con el cultivo principal. Tiene alertas. | `calendario` | Doc. |
| **Encuesta de seguimiento** (o **post-cosecha**) | Preguntas breves y periódicas al usuario: tareas realizadas, avistamientos de polinizadores y resultados de la producción. Sirve para recalibrar las reglas. | `encuesta` | Doc. |
| **Motor de reglas** | Lógica **determinista** ("si se cumple esto, entonces aquello") que genera el diagnóstico y las recomendaciones a partir de reglas validadas por expertos. **No es IA generativa.** | `motor_reglas` | Doc. |
| **Cultivo (catálogo)** | Lista de cultivos que se pueden elegir para un sector (tomate, durazno, palta…). La mantiene el administrador. Si falta, se elige "Otro" con texto libre, pero para ese cultivo no habrá recomendaciones. | `cultivo` | Esp. 02 |
| **Catálogo de especies** | Base de datos de plantas de servicio con su información técnica: floración, siembra, corte, agua, beneficios y disponibilidad en Jujuy. La mantiene el administrador. | `cultivo_servicio` | Doc. |
| **Matriz de compatibilidad** | Relación entre cada cultivo y cada planta de servicio, con un grado de compatibilidad (de −5 a +5) y su justificación agronómica. | `compatibilidad` | Prototipo de diagnóstico |
| **Licencia / Suscripción** | Pago periódico por el uso del sistema. Está **fuera del alcance actual**. | `suscripcion` | Doc. |
| **Ecorregión** | Región ambiental de Jujuy donde está el establecimiento: **Valles Templados**, **Quebrada de Humahuaca**, **Yungas**, **Puna** o **Chaco Seco**. Se sugiere según el departamento. Condiciona las especies recomendadas. | `ecorregion` | v1, Esp. 02 |
| **Departamento / Localidad** | División política de Jujuy y pueblo o ciudad donde está el establecimiento. | `departamento`, `localidad` | v1 |

## 2. Dominio agroecológico

| Término | Definición | Fuente |
| --- | --- | --- |
| **Agroecología** | Enfoque de producción que restaura la biodiversidad del sistema agrícola en lugar de depender de insumos químicos. | Doc. |
| **Agrobiodiversidad** | Diversidad biológica dentro del sistema agrícola: plantas, polinizadores e insectos benéficos. | Ent. |
| **Agroecosistema** | El sistema agrícola visto como un ecosistema: cultivos, suelo, agua, insectos y manejo. | Doc. |
| **Regla del 20 %** | Recomendación de destinar **al menos el 20 % de la superficie del predio** a vegetación natural o espacios de biodiversidad (franjas florales, refugios, bordes) para conservar polinizadores y controlar plagas. Viene de Garibaldi y otros, y la confirmó el Especialista 1. Es **una referencia**, no una ley universal: ver la regla RN-01 en las [reglas del proyecto](reglas-del-proyecto.md#1-reglas-del-dominio). | Doc., Ent. |
| **Franja floral** (o **banda floral**) | Sector delimitado del predio sembrado con plantas con flores que dan néctar y polen a los insectos. | Ent. |
| **Corredor floral** (o **corredor biológico**) | Franja floral continua que conecta zonas del predio y permite el desplazamiento de los insectos. | Doc. |
| **Borde multifuncional** (o **borde vegetado**) | Franja de vegetación en el perímetro del predio o de un lote. | Doc. |
| **Refugio de biodiversidad** | Zona del predio que conserva vegetación, árboles y flores como refugio y alimento para los insectos. | Ent. |
| **Cabecera de lote** | Extremo de un lote de cultivo. Es un lugar frecuente para ubicar franjas florales. | Doc. |
| **Cultivo principal** (o **cultivo comercial**) | Lo que el productor cultiva para vender: tomate, pimiento, palta, durazno, cítricos, frutilla, etc. | Doc. |
| **Planta de servicio** (o **cultivo de servicio**) | Planta que se incorpora para cumplir una función además de la producción: atraer polinizadores, proteger o fertilizar el suelo, controlar plagas. Por ejemplo vicia, hinojo, perejil, trigo sarraceno, caléndula, borraja o trébol blanco. | Ent. |
| **Planta atractora** | Planta de servicio elegida para atraer polinizadores e insectos benéficos. | Doc. |
| **Cultivo de cobertura** | Planta de servicio cuya función principal es cubrir y proteger el suelo. | Ent. |
| **Flora espontánea** | Plantas que crecen solas en el predio (por ejemplo hinojo o vicia) y que se pueden conservar sin costo. | Doc. |
| **Período de floración** | Época del año en que florece una planta. La floración de las plantas de servicio debe **anticiparse y cubrir** la del cultivo principal. | Doc. |
| **Corte** | Poda o siega de una planta de servicio antes de que complete su ciclo y se convierta en **maleza**. | Doc. |
| **Polinización** | Transporte de polen necesario para que muchas plantas formen frutos o semillas. **No todos los cultivos la necesitan**: el tomate sí; la caña de azúcar y el tabaco no. | Ent. |
| **Polinizador** | Organismo que poliniza las flores. No son solo las abejas melíferas. | Ent. |
| **Polinizadores nativos** | Polinizadores propios de la región (abejas nativas, abejorros, etc.). Hay que favorecerlos. | Ent. |
| **Abeja melífera** (*Apis mellifera*) | Abeja de la apicultura. Si predomina, compite con los polinizadores nativos. | Ent. |
| **Especificidad flor–polinizador** | No todos los polinizadores pueden polinizar todas las flores. Por ejemplo, el tomate necesita polinización por vibración (abejorros y algunas abejas nativas). | Ent. |
| **Insectos benéficos** | Insectos que polinizan o controlan plagas. | Ent. |
| **Control biológico de plagas** | Control de plagas por otros organismos que se alimentan de ellas o las parasitan. | Ent. |
| **Servicios ecosistémicos** | Beneficios que la naturaleza le da a la producción: polinización, control de plagas, fertilidad del suelo. | Ent. |
| **Servicio de polinización** | Contratación de un apicultor que lleva colmenas al cultivo cuando faltan polinizadores. Es un costo que el rediseño busca reducir. | Ent. |
| **Monocultivo** | Producción de un único cultivo en todo el predio. Reduce la biodiversidad. | Ent. |
| **Agroquímicos** (o **fitosanitarios**) | Pesticidas, herbicidas y fertilizantes sintéticos. Afectan a polinizadores e insectos benéficos. | Doc. |
| **Rendimiento** | Producción obtenida por superficie. Una buena polinización puede aumentarlo y mejorar el tamaño y la calidad del fruto. | Ent. |

## 3. Proyecto y metodología

| Término | Definición |
| --- | --- |
| **v1** | Prototipo en Django de este repositorio. Es referencia, no se sigue desarrollando. |
| **v2** | Nueva versión: React, PostgreSQL en Neon y Vercel, desarrollada a partir de especificaciones. |
| **Especificación** | Documento que describe con precisión una funcionalidad: qué hace, sus datos, sus reglas, sus criterios de aceptación y sus requisitos de seguridad. **No se programa nada sin una especificación aprobada.** |
| **Criterio de aceptación** | Condición verificable que la implementación tiene que cumplir para considerar terminada una especificación. |
| **Agente** | Asistente de IA (Claude, Gemini, Codex, etc.) que trabaja sobre el repositorio siguiendo [AGENTS.md](../AGENTS.md). |
| **PWA** | Aplicación web progresiva: se puede instalar en el celular y tolerar mala conexión. |
| **Backoffice** | Parte del sistema para administradores: carga y validación del catálogo de especies y de las reglas. |
| **Ciencia ciudadana** | Uso de los datos que cargan los productores (encuestas, avistamientos) para generar conocimiento sobre el impacto de las franjas florales. |
| **Identificadores anónimos** | Nombres genéricos que reemplazan a personas reales en la documentación: Integrante N, Docente N, Especialista 1, Productor A, etc. Ver [docs/README.md](README.md#datos-personales-y-anonimización). |
