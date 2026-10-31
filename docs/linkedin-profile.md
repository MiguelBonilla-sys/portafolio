# Perfil de LinkedIn (EN y ES)

> Actualizado: 2026-10-26 (Bikans como sistema completo; proyectos por necesidad y solución; Sibartech como freelance; Coordenadas.co y Bikans enlazadas). Base: `PRODUCT.md`, `data/experience.*.json`, `data/projects.*.json` y `docs/audit/CONTENT_VERIFICATION.md`.
> Esta sesión no tiene acceso a LinkedIn: son textos listos para revisar y pegar a mano. No agregan cargos, cifras ni experiencia que no estén en esas fuentes.

Perfil principal en inglés (mercado remoto) y perfil secundario en español ("Add profile in another language").

Antes de pegar: cada cifra tiene que ser una que puedas defender en una entrevista. Las marcadas con † están pendientes de confirmar en `CONTENT_VERIFICATION.md`.

## Qué cambió frente a la versión anterior

| Antes | Ahora | Por qué |
|---|---|---|
| Titular de rol doble (Full Stack + IA) | "Full Stack Engineer · Python, React & AI Systems" | Mismo titular que el portafolio, el CV y los datos estructurados |
| Tesis descrita con LlamaStack y un número fijo de pruebas | Tesis en coautoría; arquitectura de cinco señales | El repositorio ya no usa LlamaStack y no registra ese número de pruebas |
| "My thesis" | "My co-authored thesis" | El README del proyecto nombra a dos autores |
| Proyecto "API Auth Gateway" con enlace a GitHub | Enlace a la página del proyecto | El repositorio tiene credenciales expuestas pendientes de limpiar |
| Proyecto "Sentinel RAG" | Retirado | No tiene código ni demo públicos |
| Top skill "AI Agents" | "Large Language Models (LLM)" | Lo que muestran los proyectos son integraciones con LLM y RAG |

## Headline (máx. 220 caracteres)

**Recomendado**
- EN: `Full Stack Engineer · Python, React & AI Systems | FastAPI, Django, Next.js, PostgreSQL | LLM integrations & RAG | Open to remote`
- ES: `Full Stack Engineer · Python, React y sistemas con IA | FastAPI, Django, Next.js, PostgreSQL | Integraciones con LLM y RAG | Abierto a remoto`

**Alternativa con evidencia**
- EN: `Full Stack Engineer · Python, React & AI Systems | Payroll SaaS in production · co-authored IDN phishing detector | Open to remote`
- ES: `Full Stack Engineer · Python, React y sistemas con IA | SaaS de nómina en producción · detector de phishing IDN en coautoría | Abierto a remoto`

## About

### English

I build web applications end to end: APIs in FastAPI and Django, interfaces in React and Next.js, and LLM and RAG integrations where they solve a real problem.

I'm a Development Lead at Coordenadas.co, working remotely with clients in Colombia and the U.S. I joined Coordenadas.co as a Frontend Developer in September 2025, and effective November 2026 I lead the technical development of web platforms, digital products and automation solutions. Before both, I was a freelance Junior Backend Engineer for Sibartech Technology SAS, working with Django, FastAPI and PostgreSQL in production.

Some of what I've built:
- Bikans, the payroll and tax withholding platform for the clients of the accounting firm Bikans Asesores, built at Coordenadas.co. Employee data is entered once instead of being typed into two tools. I built the whole system: Django backend, React frontend, two-factor authentication and admin panel.
- My co-authored thesis: an API that flags IDN homograph phishing by combining five signals (Unicode confusables, threat intelligence, an LLM with RAG, a URL classifier and a page probe), with integration and adversarial test suites.
- This portfolio and its content agent (LangGraph.js): it drafts from my notes, checks every number against its source and publishes nothing without my approval.

I also run project infrastructure on Linux with Docker, Coolify and Traefik, and I care about the parts that keep software honest: authentication, tests and clear handoffs.

Open to remote Full Stack roles. Portfolio, case studies and resume: mangel14.dev

### Español

Construyo aplicaciones web de punta a punta: APIs en FastAPI y Django, interfaces en React y Next.js, e integraciones con LLM y RAG cuando resuelven un problema real.

Soy Development Lead en Coordenadas.co y trabajo de forma remota con clientes de Colombia y EE. UU. Ingresé como Frontend Developer en septiembre de 2025 y, a partir de noviembre de 2026, lidero el desarrollo técnico de plataformas web, productos digitales y soluciones de automatización. Antes de ambos, fui Junior Backend Engineer freelance para Sibartech Technology SAS, con Django, FastAPI y PostgreSQL en producción.

Algunas cosas que he construido:
- Bikans, la plataforma de nómina y retención en la fuente para los clientes de la firma contable Bikans Asesores, hecha en Coordenadas.co. Los datos de los empleados se cargan una vez en lugar de digitarse en dos herramientas. Hice el sistema completo: backend en Django, frontend en React, autenticación de dos factores y panel de administración.
- Mi tesis en coautoría: una API que detecta phishing por homógrafos IDN combinando cinco señales (confundibles Unicode, threat intelligence, un LLM con RAG, un clasificador de URL y un sondeo de la página), con pruebas de integración y una suite adversaria.
- Este portafolio y su agente de contenido (LangGraph.js): redacta a partir de mis notas, revisa cada cifra contra su fuente y no publica nada sin mi aprobación.

También mantengo infraestructura de proyectos en Linux con Docker, Coolify y Traefik, y cuido lo que mantiene honesto al software: autenticación, pruebas y entregas claras.

Abierto a roles remotos de Full Stack. Portafolio, casos de estudio y CV: mangel14.dev

## Featured

1. Portafolio: `https://mangel14.dev/en`
2. Caso de estudio del detector IDN: `https://mangel14.dev/en/projects/idn-phishing-detector`
3. CV en PDF: `https://mangel14.dev/cv/miguel-bonilla-cv-en.pdf`
4. El primer artículo publicado del blog, cuando exista (no destacar borradores)

## Experiencia

### Coordenadas.co · Development Lead · Nov 2026 – Present · Bogotá (Remote)

**EN**
- Leading the technical development of web platforms, digital products and automation solutions, bridging hands-on engineering with technical coordination and delivery.

**ES**
- Liderazgo técnico en el desarrollo de plataformas web, productos digitales y soluciones de automatización, combinando la ingeniería de software con la coordinación técnica y la entrega de proyectos.

Skills: React · Django · PostgreSQL · n8n · Docker · Coolify · Traefik · Linux

### Coordenadas.co · Frontend Developer · Sep 2025 – Oct 2026 · Bogotá (Remote)

**EN**
- Bikans: one payroll and tax withholding platform where employee data is entered once instead of being typed into two tools. I built the whole system with Django, React and PostgreSQL, with a mandatory second factor; it is in production.
- Content distribution for 6 real estate projects from a single reusable system that personalizes the data for each contact.
- Plugins and API integrations for U.S. clients in 3 industries.
- I deploy and maintain the projects on a self-hosted Linux server with Docker, Coolify and Traefik: automatic HTTPS and no database ports exposed.

Skills: React · Django · PostgreSQL · n8n · Docker · Coolify · Traefik · Linux

**ES**
- Bikans: una sola plataforma de nómina y retención en la fuente donde los datos de los empleados se cargan una vez, en vez de digitarse en dos herramientas. Hice el sistema completo, en Django, React y PostgreSQL, con segundo factor obligatorio; está en producción.
- Distribución de contenido para 6 proyectos inmobiliarios desde un solo sistema reutilizable, que personaliza los datos para cada contacto.
- Plugins e integraciones de APIs para clientes de EE. UU. en 3 industrias.
- Despliego y mantengo los proyectos en un servidor Linux propio con Docker, Coolify y Traefik: HTTPS automático y bases de datos sin puertos expuestos.

### Sibartech Technology SAS · Junior Backend Engineer · Feb 2024 – Aug 2025 · Colombia

Tipo de empleo: **Freelance** (en LinkedIn, campo «Employment type»).

**EN**
- Developed and maintained production backend services in Python with Django and FastAPI, with PostgreSQL as the primary database.
- Wrote tests with pytest and containerized services with Docker.

Skills: Python · Django · FastAPI · PostgreSQL · pytest · Docker

**ES**
- Desarrollé y mantuve servicios backend en producción con Python, Django y FastAPI, sobre PostgreSQL.
- Escribí pruebas con pytest y contenedoricé servicios con Docker.

### Universidad de San Buenaventura · Systems Engineering · 2021 – Present

**EN**: 10th semester. Software architecture, distributed systems and networking. Co-authored thesis with Juan Sebastián Fandiño Novoa: IDN homograph phishing detection API (FastAPI, PostgreSQL, Redis, ChromaDB).

**ES**: Décimo semestre. Arquitectura de software, sistemas distribuidos y redes. Tesis en coautoría con Juan Sebastián Fandiño Novoa: API de detección de phishing por homógrafos IDN (FastAPI, PostgreSQL, Redis, ChromaDB).

### Licencias y certificaciones

- Ethical Hacking & Cyber Risk · Universidad Sergio Arboleda · 2025
- Mobile Application Development / Desarrollo de aplicaciones móviles · Universidad Nacional de Colombia · 2023–2024

## Proyectos (sección Projects)

Enlaza siempre la página del portafolio: ahí está el caso de estudio y desde ahí el repositorio cuando corresponde.

| Proyecto | Enlace |
|---|---|
| Bikans: Payroll & Tax SaaS | `https://mangel14.dev/en/projects/bikans` |
| IDN Homograph Phishing Detector (co-authored thesis) | `https://mangel14.dev/en/projects/idn-phishing-detector` |
| mangel14.dev & Content Engine | `https://mangel14.dev/en/projects/portafolio-content-engine` |
| API Auth Gateway (hackathon) | `https://mangel14.dev/en/projects/api-auth-hackaton` (sin enlace al repo hasta limpiarlo) |
| ETL Pipeline: Dow Jones Sentiment | `https://mangel14.dev/en/projects/etl-parcial` |

## Coordenadas.co y Bikans: cómo vincularlas en LinkedIn

Lo que más visibilidad les da a ellas y a ti no es un enlace en el texto, sino que LinkedIn reconozca la relación:

- **Experiencia → Coordenadas.co:** al escribir la empresa, elígela de la lista desplegable (página `linkedin.com/company/coordenadas-co`), no la escribas a mano. Así aparece su logo, tu cargo enlaza a su página y figuras entre las personas que trabajan allí.
- **Sibartech:** si tiene página en LinkedIn, elígela igual; si no, queda como texto. Tipo de empleo: Freelance.
- **Proyecto Bikans (sección Projects):** asócialo a la experiencia de Coordenadas.co y, en la descripción, nombra a Bikans Asesores. Enlace del proyecto: la página del portafolio.
- **Posts:** el Content Engine menciona a la empresa (`@Coordenadas.co`, `@Bikans Asesores`) solo cuando el post dice que el trabajo o el aprendizaje fue allí, y una sola vez. La mención avisa a la página y la enlaza; mencionarla en cada post por cortesía resta, no suma.
- **Sitio web de la empresa:** el portafolio enlaza `https://coordenadas.co/` y `https://bikans.com/` sin `nofollow` (es un enlace editorial, no pagado) y sin `noreferrer`, para que ellas vean en su analítica las visitas que llegan desde tu sitio.

## Top 5 skills (fijadas)

1. Python
2. FastAPI
3. React
4. PostgreSQL
5. Large Language Models (LLM)

Las cinco tienen un proyecto o un trabajo que las respalda en el portafolio.

## Publicaciones

El blog es la fuente; LinkedIn adapta una idea, no copia el artículo. El Content Engine prepara el post y alterna estructuras:

- problema técnico → decisión → evidencia → implicación práctica;
- decisión y alternativa descartada → trade-off con un hecho → pregunta técnica concreta;
- resultado o cifra del material → cómo se llegó → limitación pendiente;
- error que no funcionó → causa y arreglo → qué puede revisar el lector en su sistema.

Reglas: sin "emocionado de compartir", "esto lo cambia todo", listas de "5 claves", hooks engañosos ni emojis decorativos; 0 a 3 hashtags específicos; el enlace al artículo en el primer comentario. El objetivo es la conversación con ingenieros y reclutadores técnicos, no las impresiones.

## Configuración del perfil

- [ ] Perfil en inglés como principal y en español como secundario.
- [ ] Open to Work visible **solo para recruiters**: "Full Stack Engineer", "Backend Engineer", "Software Engineer"; modalidad remota.
- [ ] Banner 1584×396 con el símbolo del sitio, el titular y la URL (puede partir de `public/brand/symbol-dark.svg`).
- [ ] 2 o 3 recomendaciones de compañeros de Coordenadas o Sibartech.
- [ ] 2 o 3 comentarios técnicos por semana en publicaciones del área.
