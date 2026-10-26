# Cómo presentar los proyectos: qué resuelve, por qué hacía falta y qué logra

> Fecha: 2026-10-26. Aplicada al sitio el 2026-10-26 (tipos `solves`, `need`, `constraints`, `solution`; «Mi parte» al final; pruebas en `test/content.test.ts`).
> Pedido: que los proyectos y la experiencia expliquen la solución, como lo haría un ingeniero de sistemas, y no una lista de lo que hice.

## 1. Lo que dicen las fuentes

| Fuente | Qué aporta |
|---|---|
| SEBoK / INCOSE, *Stakeholder Needs Definition* | Una necesidad se escribe desde quien la tiene («los usuarios necesitan que el sistema…»), **sin nombrar la solución** y **con su motivo**. Se identifican aparte las **restricciones**, que son lo que el proyecto no controla. Sobre las necesidades se valida: *¿construimos lo correcto?* |
| FHWA, *Concept of Operations* (guía de ingeniería de sistemas) | Un ConOps responde quién, qué, por qué, dónde y cómo. El **por qué** es: «¿qué le falta a la organización que el sistema le dará?». Cada necesidad dice **cómo se validará**. Hay que describir también los escenarios de falla, no solo el «día soleado». |
| Refactor Talent; Soltech (cómo evalúan portafolios) | Lo que mira quien contrata: si sabes **definir y descomponer un problema real**, cuáles eran las **restricciones**, qué alternativas descartaste y por qué, y qué pasó después. Un proyecto sin el «por qué» queda en una muestra de código. |
| MentorCruise (lectura en frío de 60 segundos) | Estructura que funciona: **problema (la restricción concreta) → decisiones (incluida una alternativa descartada) → resultado (qué cambió y cómo se sabe)**. Un resultado sin método de medición no cuenta. |
| Guías de bullets de CV (Indeed y otras) | El bullet fuerte dice qué cambió y **por qué importaba**. El que suena a descripción de tareas no. |

**Conclusión.** Los números del tipo «4 días, 5 fases y 17 tareas» describen el **proceso**, no el resultado: no le dicen al lector qué problema dejó de existir. Si el plazo importa, va como **restricción** («había que tenerlo en 4 días»), no como logro.

## 2. Estructura propuesta

### Tarjeta del proyecto (2 líneas)

1. **Qué necesidad atiende y para quién.**
2. **Qué hace ahora el sistema** que antes no pasaba.

Sin «construí» ni «entregué». El nombre propio aparece después, en «Mi parte».

### Página del proyecto (caso de estudio)

| Sección | Pregunta que responde | Viene de |
|---|---|---|
| **La necesidad** | ¿Quién tenía qué problema y qué le costaba? | ConOps: el «por qué» |
| **Restricciones** | ¿Qué no se podía cambiar o elegir? | SEBoK: *drivers and constraints* |
| **La solución** | ¿Qué hace el sistema, en términos de quien lo usa? | Necesidad → capacidad |
| **Cómo funciona** | Componentes y flujo | Ya existe (arquitectura) |
| **Decisiones** | ¿Qué se eligió y qué se descartó, y por qué? | Ya existe |
| **Cómo se valida** | ¿Cómo se sabe que funciona, y qué pasa cuando algo falla? | Validación, escenarios de falla |
| **Resultado** | ¿Qué cambió para el usuario? Solo con evidencia | Validación de la necesidad |
| **Límites** | Lo que todavía no resuelve | Ya existe |
| **Mi parte** | Qué hice yo, en una o dos frases, al final | Antes «Rol» |

La sección «Mi parte» sigue: es lo que confirma que el trabajo es tuyo. Solo deja de ser el titular.

### Bullets de experiencia

Forma: **capacidad que hoy tiene el cliente + cómo se logró + por qué importaba**.

## 3. Ejemplos con lo que ya está verificado

### Bikans

- **Hoy (tarjeta):** «SaaS colombiano de nómina y retención en la fuente para contadores. Unificó dos herramientas que obligaban a digitar los mismos datos dos veces.» / «Construí el frontend en React, el panel de administración y la autenticación de dos factores…»
- **Propuesto (tarjeta):** «Una sola plataforma de nómina y retención en la fuente para los clientes de Bikans Asesores: los datos de la empresa y de los empleados se cargan una vez y alimentan las dos herramientas, en vez de digitarse dos veces.»
- **La necesidad:** los clientes de la firma llevaban la nómina en una herramienta y la retención en otra, y digitaban dos veces los mismos datos de la empresa y de los empleados. Un dato cargado dos veces puede no coincidir, y los dos cálculos dependen de él.
- **Restricciones:** cada cliente accede solo a las herramientas que tiene contratadas, y se trata de datos de nómina y tributarios de terceros.
- **La solución:**
  - un registro único de empleados, identificados por cédula, que comparten la nómina y la retención;
  - un solo inicio de sesión con segundo factor obligatorio;
  - acceso por herramienta, que asigna la firma.

### Detector de phishing por homógrafos IDN (tesis)

- **Propuesto (tarjeta):** «Detecta dominios que imitan a otros con letras Unicode casi idénticas, como una "а" cirílica en lugar de una "a" latina, en URLs y correos, y explica por qué marca cada uno como phishing.»
- **La necesidad:** a simple vista, esos dominios no se distinguen del original, así que el usuario no tiene cómo notarlo. Un filtro que solo diga «peligroso» no ayuda a decidir; hace falta la razón.
- **Restricciones:**
  - los servicios externos de reputación pueden fallar o no tener llaves;
  - los datasets públicos no traían homógrafos reales.
- **Cómo se valida:** si fallan las fuentes externas, el sistema no marca todo como phishing. El umbral está puesto por encima del piso de degradación (ya está en «Decisiones»).

### API Auth Gateway (hackatón)

- **Propuesto (tarjeta):** «Pone usuarios y permisos delante de una API de inventario que le devolvía todo a cualquiera: cada persona ve solo los activos que le pertenecen, sin modificar la API original.»

### Content Engine

- **Propuesto (tarjeta):** «Convierte mis notas, documentos y enlaces en artículos y posts verificables. Ninguna cifra se publica sin una fuente, y nada sale sin mi confirmación.»

## 4. Lo que no puedo reescribir sin datos tuyos

Para que estos bullets hablen de la solución hay que saber **qué problema existía**. No lo voy a suponer:

| Bullet actual | Lo que falta saber |
|---|---|
| «Entregué en 4 días un agente de automatización en n8n que integra QuickBooks Online (OAuth 2.0), en 5 fases y 17 tareas…» | ¿Qué datos lleva el agente a QuickBooks (facturas, pagos, clientes…) y desde dónde? ¿Quién lo hacía antes y cómo, a mano? ¿Qué cambió para el cliente: menos tiempo, menos errores, datos al día? ¿El plazo de 4 días era una restricción del cliente? |
| «Automaticé la distribución de contenido de 6 proyectos inmobiliarios…» | ¿Qué contenido, a quién y por qué canal? ¿Cómo se hacía antes? ¿Qué se personaliza por contacto y para qué? |
| «Construí plugins e integraciones de APIs para clientes de EE. UU. en 3 industrias…» | Uno o dos ejemplos concretos: qué sistema conectaste con cuál y qué problema resolvía. |

Plantilla para el de QuickBooks, una vez tengas los datos:

> Integración en n8n que lleva **[qué datos]** de **[sistema origen]** a QuickBooks Online por OAuth 2.0, para que **[quién]** deje de **[tarea manual]**; **[qué cambió]**.

## 5. Cambios en el sitio, cuando lo apruebes

1. **Tipos y datos:** en `types/index.ts` y `data/projects.*.json`:
   - `contribution` pasa a `solves`, lo que el sistema hace;
   - el caso de estudio gana `need`, que reemplaza a `problem`, `constraints` y `results`;
   - `role` pasa a ser «Mi parte», al final.
2. **Componentes:** `CaseStudy.tsx`, `ProjectCard.tsx` y los textos de ES/EN.
3. **Experiencia y CV:** los bullets de Coordenadas.co se reescriben con tus respuestas, y luego se regenera el CV en PDF.
4. **Pruebas:**
   - la paridad ES/EN ya existe;
   - una prueba nueva impide que la tarjeta empiece con verbos en primera persona («Construí», «Entregué», «Desarrollé»);
   - otra impide que aparezcan métricas de proceso («en N días», «N fases», «N tareas») fuera de «Restricciones».
