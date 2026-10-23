# Perfil de LinkedIn (EN y ES)

> Actualizado: 2026-10-23 (fase 2). Base: `PRODUCT.md`, `data/experience.*.json`, `data/projects.*.json` y `docs/audit/CONTENT_VERIFICATION.md`.
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

I'm a Full Stack Developer at Coordenadas.co, working remotely with clients in Colombia and the U.S. Before that I was a Junior Backend Engineer at Sibartech, working with Django, FastAPI and PostgreSQL in production.

Some of what I've built:
- Bikans, a payroll and tax withholding SaaS that replaced two tools with duplicate data entry. I built the React frontend, the admin panel and two-factor authentication.†
- An n8n agent that integrates QuickBooks Online over OAuth 2.0, delivered in 4 days across 5 phases and 17 tasks.
- My co-authored thesis: an API that flags IDN homograph phishing by combining five signals (Unicode confusables, threat intelligence, an LLM with RAG, a URL classifier and a page probe), with integration and adversarial test suites.
- This portfolio and its content agent (LangGraph.js): it drafts from my notes, checks every number against its source and publishes nothing without my approval.

I also run project infrastructure on Linux with Docker, Coolify and Traefik, and I care about the parts that keep software honest: authentication, tests and clear handoffs.

Open to remote Full Stack roles. Portfolio, case studies and resume: mangel14.dev

### Español

Construyo aplicaciones web de punta a punta: APIs en FastAPI y Django, interfaces en React y Next.js, e integraciones con LLM y RAG cuando resuelven un problema real.

Soy Full Stack Developer en Coordenadas.co y trabajo de forma remota con clientes de Colombia y EE. UU. Antes fui Junior Backend Engineer en Sibartech, con Django, FastAPI y PostgreSQL en producción.

Algunas cosas que he construido:
- Bikans, un SaaS de nómina y retención en la fuente que reemplazó dos herramientas que obligaban a digitar los datos dos veces. Hice el frontend en React, el panel de administración y la autenticación de dos factores.†
- Un agente en n8n que integra QuickBooks Online por OAuth 2.0, entregado en 4 días, en 5 fases y 17 tareas.
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

### Coordenadas.co · Full Stack Developer · Aug 2025 – Present · Bogotá (Remote)

**EN**
- Merged two tools that forced duplicate payroll and tax withholding data entry into Bikans, now in production with two-factor authentication.†
- Delivered an n8n automation agent integrating QuickBooks Online (OAuth 2.0) in 4 days across 5 phases and 17 tasks, fixing an authentication bug without missing the deadline.
- Automated content distribution for 6 real estate projects into 1 reusable system that personalizes data per contact.
- Built custom plugins and API integrations for U.S. clients in 3 industries; deploy and maintain project infrastructure on a self-hosted Linux server with Docker, Coolify and Traefik.

Skills: React · Django · n8n · OAuth 2.0 · Docker · Coolify · Traefik · Linux

**ES**
- Uní en Bikans dos herramientas que obligaban a digitar dos veces los datos de nómina y retención; hoy está en producción con autenticación de dos factores.†
- Entregué en 4 días un agente de automatización en n8n que integra QuickBooks Online (OAuth 2.0), en 5 fases y 17 tareas, y corregí un error de autenticación sin mover la fecha de entrega.
- Automaticé la distribución de contenido de 6 proyectos inmobiliarios en 1 sistema reutilizable que personaliza los datos por contacto.
- Construí plugins e integraciones de APIs para clientes de EE. UU. en 3 industrias; despliego y mantengo la infraestructura en un servidor Linux propio con Docker, Coolify y Traefik.

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
