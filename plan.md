# Plan: Portafolio, SEO/GEO, LinkedIn y Content Engine

> Fecha: 2026-10-20 · Horizonte: 12 semanas · Capacidad: 10 h/semana (120 h)
> Documentos de detalle: [spec](docs/spec.md) · [arquitectura](docs/architecture.md) · [tareas](docs/tasks.md) · [guía de estilo anti-slop](docs/content-style-guide.md)

## 1. Objetivo

Conseguir empleo remoto como **Full Stack / AI Engineer** (prioridad) y abrir un canal secundario de clientes freelance de automatización con IA. El portafolio, el blog y LinkedIn trabajan como un solo sistema: el blog es la fuente, LinkedIn distribuye y los buscadores (Google, Bing, ChatGPT, Perplexity, Claude) encuentran y citan.

Punto de partida (análisis del 2026-10-20): **6/10**. Buena ejecución técnica, posicionamiento débil. El hero promete WordPress, Next.js y automatización, pero ninguno de los 7 proyectos lo demuestra y ninguno tiene demo.

## 2. Posicionamiento

**Titular:** Full Stack AI Engineer. Agentes de IA y automatización en producción.

Por qué este ángulo (investigación de mercado, octubre 2026):

| Señal | Dato | Fuente |
|---|---|---|
| Demanda de frameworks agénticos | ~2.000 vacantes con LangGraph en Indeed, ~1.470 remotas con LangChain en Dice | indeed.com, dice.com |
| Rol en crecimiento | "Forward Deployed AI Engineer": full stack que integra IA en procesos del cliente | agentic-engineering-jobs.com |
| Vacantes que encajan con el perfil | "Junior Full Stack/AI Engineer, LatAm remoto, USD 3.500–5.000/mes" | LinkedIn Jobs |
| Skills más pedidas | Python, RAG, agentes (tool calling, MCP), LLMOps, seguridad en IA | TripleTen, HeroHunt, 365 Data Science |

Tus tres activos se convierten en una sola historia:

1. **Backend sólido**: FastAPI, JWT, PostgreSQL, Docker, despliegue.
2. **IA aplicada**: LLM local con Ollama, y desde ahora agentes con Langflow, RAG y evals.
3. **Procesos de negocio reales**: n8n, CRMs y GoHighLevel en Coordenadas.co.

Regla de honestidad: una tecnología solo aparece en el titular, las skills o el hero cuando hay un proyecto público que la use.

## 3. Proyecto estrella: Content Engine

El sistema que publica tu contenido es, a la vez, tu mejor proyecto de portafolio.

```
Ideas (Telegram, commits de GitHub, notas)
   │
   ▼
n8n (orquestador) ──► Langflow (agente redactor + editor anti-slop + traductor)
   │
   ▼
Telegram: vista previa + [Aprobar] [Editar] [Rechazar] [Reprogramar]
   │  (sin aprobación no se publica nada)
   ▼
GitHub commit (MDX es/en) ──► Vercel deploy ──► LinkedIn Posts API ──► IndexNow
                                                   └─ enlace al blog en el primer comentario
```

Decisiones tomadas tras el devil's advocate:

| Supuesto original | Problema | Decisión |
|---|---|---|
| La IA genera y publica todo sola | Contenido genérico, riesgo de errores técnicos publicados, inventa datos | La IA redacta solo desde material real tuyo. Aprobación por Telegram obligatoria |
| Langflow orquesta todo | Sin cron nativo; el Human-in-the-Loop aún es reciente; OAuth y botones a medida | n8n orquesta, Langflow es el cerebro expuesto como API. El proyecto demuestra ambos |
| Todo en la v1 | Estimación ≈150 h frente a 120 h disponibles | Todo entra, por fases. Los carruseles PDF van en la fase 3, tras un spike |
| Publicar enlace en el post | Los posts con enlace externo pierden 50–70% de alcance | Post nativo + enlace en el primer comentario |

## 4. Fases

| Fase | Semanas | Entregable | Horas |
|---|---|---|---|
| 0. Línea base | 1 | Métricas actuales registradas, dominio confirmado | 2 |
| 1. Cimientos | 1–4 | Sitio bilingüe, blog MDX, SEO/GEO técnico, contenido reposicionado, LinkedIn optimizado | 42 |
| 2. Content Engine v1 | 5–8 | Pipeline texto + imagen en producción con aprobación por Telegram | 34 |
| 3. Carruseles y evals | 9–12 | Carruseles PDF automáticos, evals de calidad, caso de estudio publicado | 22 |
| Contenido continuo | 2–12 | Revisión y aprobación semanal | 20 |
| **Total** | | | **120** |

Desde la semana 2 publicas a mano con borradores asistidos. Si el pipeline se retrasa, el contenido no se detiene.

## 5. Perfil de LinkedIn

Se trabaja con el skill `linkedin-cv-optimizer` sobre tu perfil actual (tarea T13). Propuesta base:

**Headline (EN, máx. ~220 caracteres):**
> Full Stack AI Engineer · I build AI agents and automations that run in production · Python, FastAPI, Next.js, n8n, Langflow · Open to remote roles

**Headline (ES, perfil secundario):**
> Full Stack AI Engineer · Construyo agentes de IA y automatizaciones en producción · Python, FastAPI, Next.js, n8n, Langflow · Abierto a remoto

**Estructura del About** (en primera persona, sin adjetivos vacíos):
1. Qué haces, en una frase con resultado concreto.
2. Dos o tres casos con número real (horas ahorradas, flujos en producción, tiempos de respuesta).
3. Stack, agrupado por uso, no como lista de 30 palabras.
4. Qué buscas y cómo contactarte.

**Checklist del perfil:**
- [ ] Perfil en dos idiomas (función nativa de LinkedIn: EN principal, ES secundario).
- [ ] Open to Work visible solo para recruiters (triplica la tasa de respuesta: 4,6% → 14,5%, BridgeView 2026).
- [ ] Top 5 skills alineadas al titular y respaldadas por proyectos.
- [ ] Featured: portafolio, caso de estudio del Content Engine, mejor post del mes.
- [ ] Experiencia en Coordenadas.co reescrita con logros medibles.
- [ ] Sección Projects con enlaces al portafolio (no solo a GitHub).
- [ ] Banner con titular y URL del portafolio.

## 6. Plan de contenido

### Pilares

| Pilar | Peso | Ejemplos |
|---|---|---|
| Agentes en producción (build in public) | 35% | Cómo construí X, qué falló, qué medí |
| Automatización de negocio con IA | 25% | Casos n8n + CRM anonimizados, con números |
| Backend y full stack para IA | 25% | Auth, RAG, evals, despliegue, costos |
| Carrera desde LatAm | 15% | De estudiante a AI engineer, aprendizajes con datos |

### Cadencia

| Canal | Frecuencia | Formato |
|---|---|---|
| Blog (es + en) | 1 artículo/semana | 800–1.500 palabras, bloque de respuesta inicial, FAQ, fuentes |
| LinkedIn | 3 posts/semana (mar, mié, jue, en la mañana de Bogotá) | 1 build log de texto, 1 derivado del blog, 1 carrusel o pregunta técnica |
| Carrusel PDF | 1 cada 2 semanas (manual hasta la fase 3) | 6–10 láminas |

Formatos por rendimiento en 2026: carrusel PDF ≈6,6% de engagement (el más alto); texto de 150–300 palabras para alcance; video nativo para demos. Publicar 3 veces por semana con calidad rinde más que a diario sin ella (Dataslayer, Teract, Hootsuite 2026).

Idioma: LinkedIn en **inglés** por defecto (mercado remoto); 1 de cada 3 posts en español para la red LatAm. El blog sale siempre en ambos idiomas.

### Calendario de 12 semanas (artículo ancla del blog)

Cada artículo sale de un proyecto o de una experiencia real tuya. Los temas siguen el avance del propio plan, así el contenido nunca se queda sin material.

| Sem. | Artículo ancla | Pilar | Material real que necesitas aportar |
|---|---|---|---|
| 1 | Control de acceso por propiedad en un gateway FastAPI con JWT | Backend | Repo API_AUTH_HACKATON, decisiones de diseño |
| 2 | LLM local con Ollama: tiempos reales en GPU frente a CPU | IA aplicada | Mediciones (30–90 s/doc en GPU), modelos probados |
| 3 | Un flujo n8n + CRM en producción: antes y después | Automatización | Caso de Coordenadas anonimizado, horas ahorradas |
| 4 | Cómo preparé mi portafolio para que lo citen ChatGPT y Perplexity | Full stack | Cambios de SEO/GEO, resultados de la auditoría |
| 5 | n8n orquesta, Langflow piensa: por qué separé las dos capas | Agentes | Diagrama, alternativas descartadas |
| 6 | Human-in-the-loop por Telegram para un agente que publica | Agentes | Flujo de aprobación, casos de rechazo |
| 7 | Un linter anti-slop para texto generado con IA | Agentes | Reglas, ejemplos antes/después propios |
| 8 | LinkedIn Posts API: lo que la documentación no te dice | Backend | Errores reales encontrados, token de 60 días |
| 9 | RAG sobre mi propio portafolio: chunking y fuentes | Agentes | Métricas de recuperación |
| 10 | Evals para contenido generado: cómo mido si un post sirve | Agentes | Rúbrica, resultados de N posts |
| 11 | MCP para conectar un agente a GitHub | Agentes | Implementación y límites |
| 12 | Tres meses construyendo en público: números reales | Carrera | Métricas de la línea base frente a las finales |

### Reglas de escritura

Todo el contenido pasa por la [guía de estilo anti-slop](docs/content-style-guide.md). Resumen:
- La IA nunca inventa cifras, experiencias, clientes ni opiniones. Si falta un dato, deja `[DATO?]` y el post no se puede aprobar.
- Prohibidas las marcas P0/P1 (clichés, "no es X, es Y", tripletes forzados, emojis como viñetas, hashtags en exceso, cierres tipo "¿y tú qué opinas?").
- Cada artículo abre con una respuesta directa de 40–60 palabras e incluye al menos un dato propio y una fuente primaria.

## 7. Métricas de éxito (3 meses)

La línea base se mide en la semana 0 (T0). Las metas son relativas hasta tener esos números.

| Métrica | Meta | Cómo se mide |
|---|---|---|
| Entrevistas | ≥ 4 en 12 semanas | Registro manual |
| Mensajes de recruiters | ≥ 2/mes desde el mes 2 | Bandeja de LinkedIn |
| Search appearances (LinkedIn) | ×2 frente a la línea base | Panel de LinkedIn |
| Impresiones semanales (LinkedIn) | ×3 frente a la línea base | Analytics de LinkedIn |
| Seguidores (LinkedIn) | +50% frente a la línea base | Perfil |
| Sesiones orgánicas del sitio | ≥ 300/mes en el mes 3 | GA4 + Search Console |
| Referencias desde IA | ≥ 1 sesión/semana desde chatgpt.com, perplexity.ai o claude.ai | GA4, segmento de referrers de IA |
| Citación en IA | El sitio aparece al preguntar "Miguel Bonilla AI engineer" en ChatGPT, Perplexity y Claude | Auditoría manual quincenal |
| Artículos publicados | 12 (×2 idiomas) | Repo |
| Clientes freelance | ≥ 1 conversación calificada | Registro manual |
