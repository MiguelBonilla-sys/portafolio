# Investigación: cómo mejorar el Content Engine y el portafolio

> Fecha: 2026-10-26. Fuentes consultadas con Firecrawl y leídas directamente cuando Firecrawl no admitía el sitio (telegram.org).
> Cada recomendación se contrastó con nuestro código; las que ya cumplimos están en el §1.
> Implementado después de esta investigación: la recomendación 2, con las horas en formato de 12 horas (`git log -- agent/lib/text.ts`). El resto sigue pendiente.

## Resumen

| # | Mejora | Impacto | Esfuerzo | Tipo |
|---|---|---|---|---|
| 1 | Publicar el artículo en **un solo commit** | Alto: hoy cada publicación dispara varios deploys y la versión EN aparece después | Bajo-medio | Código |
| 2 | ✅ Corregir el mensaje de **publicación programada** (decía «esa mañana» y podía ser la siguiente) | Alto en confianza | Bajo | Hecho |
| 3 | `durability: "sync"` en el grafo | Medio: menos riesgo de repetir efectos externos tras una caída | Muy bajo | Código |
| 4 | Vista previa como **mensaje enriquecido** de Telegram (`sendRichMessage` con Markdown) | Alto en uso diario | Medio | Código |
| 5 | Cada afirmación con una **cita textual** comprobable de su fuente | Alto en veracidad | Medio | Código |
| 6 | Medir visibilidad en IA: Search Console y Bing | Medio | Ninguno | Dueño |
| 7 | Trazas del agente (Langfuse o LangSmith) | Medio para depurar producción | Bajo-medio | Código + cuenta |
| 8 | OCR de PDF escaneados con el modelo de visión | Bajo-medio (solo si llegan escaneos) | Medio | Código |
| 9 | Nota de cómo se hizo el artículo («asistido por IA, revisado por mí») | Bajo-medio | Muy bajo | Decisión del dueño |
| 10 | Vercel Workflows como motor durable | Incierto | Alto | Solo evaluar |

## 1. Lo que ya está alineado con la documentación (no hace falta tocar)

| Práctica | Fuente | Dónde lo cumplimos |
|---|---|---|
| Al reanudar un `interrupt()`, el nodo se vuelve a ejecutar desde el inicio: lo anterior al `interrupt()` debe ser idempotente | LangGraph JS, *Interrupts* | Los 4 nodos que pausan (`awaitProposal`, `humanReview`, `waitSchedule`, `hold`) solo llaman a `interrupt()` |
| Un `interrupt()` por invocación del nodo; para validar la respuesta, se vuelve con un arco condicional, no con un `while` | Ídem | `refuseApprove → humanReview`, `takeAnswer → investigate` |
| Responder rápido al webhook | Telegram Bot API | `app/api/telegram/route.ts` responde `{ok:true}` y procesa con `after()` |
| Posts de LinkedIn con documento (PDF) en publicaciones orgánicas | LinkedIn *Documents API* (PDF, PPT y DOC, hasta 100 MB y 300 páginas; `w_member_social`) | `uploadDocument` para el carrusel |
| Carruseles multimagen orgánicos: no existen en la API (solo patrocinados) | LinkedIn *Posts API* | No los usamos |
| Tokens de LinkedIn de 60 días; los *refresh tokens* solo para socios | LinkedIn *Refresh Tokens* | El cron avisa 10 días antes |
| Versiones de la API de LinkedIn con al menos un año de soporte; la 202511 se retira el 16-11-2026 | LinkedIn *Posts API* | Usamos `202608` (válida hasta ~ago-2027). Anotar para subirla |
| `dateModified` del perfil: «idealmente, solo cambios hechos por una persona» | Google *ProfilePage* (actualizada 2026-09-08) | `PROFILE_UPDATED` fijo desde el commit `b7d3eb1` |
| `llms.txt`, «chunking», markup especial: **Google no los usa** | Google *Optimizing for generative AI features* (2026-07-10) | Mantenemos `llms.txt` (es barato y otros agentes lo leen), sin tratarlo como factor de posicionamiento |
| Contenido con IA: permitido si es útil y revisado; lo penalizado es producir en escala sin valor | Google *Using gen AI content*, *Spam policies* | Aprobación humana obligatoria, linter anti-relleno, `[DATO?]`, sin volumen automático |
| Contenido externo con el nivel de confianza de un usuario anónimo; delimitar datos e instrucciones | OWASP LLM01:2025 y su hoja de prevención | `sourcesBlock` delimita las fuentes; confianza «externa»; aviso de inyección; el modelo no tiene herramientas |
| IndexNow no llega a Google | indexnow.org | Ya documentado |

## 2. Recomendaciones

### 1. Un solo commit por publicación

**Qué pasa hoy.** `publishBlog` llama a `putFile` (API de contenidos de GitHub) una vez por archivo: cada SVG, luego el MDX en ES y luego en EN. Cada llamada es un commit, y cada push a `main` dispara un deploy de Vercel. Consecuencias:

- varios builds por artículo (Hobby tiene un límite de 100 deploys por día);
- un rato con el artículo ES publicado y el EN todavía inexistente (el `hreflang` apunta a un 404);
- `waitDeploy` puede validar contra un deploy intermedio.

**Qué hacer.** Usar la Git Data API:

1. leer la ref de la rama;
2. crear un blob por archivo;
3. crear un árbol con `base_tree`;
4. crear el commit;
5. actualizar la ref.

Todo queda en un commit atómico. Si la ref cambió entremedias, el `update_ref` sin `force` falla y se reintenta.

**Esfuerzo.** Un método `putFiles(files[], message)` en `agent/lib/github.ts`, el cambio en `publishBlog` y pruebas con el GitHub falso de `helpers.ts`.

### 2. Bug: el mensaje de la publicación programada

`schedule` responde «Programado para {fecha y hora}… Lo publico en el cron de esa mañana». Pero:

- el cron de Vercel Hobby corre **una vez al día**, con precisión de **±59 minutos** (Vercel, *Cron Jobs usage & pricing*);
- `dueScheduled` solo toma piezas con `scheduled_for <= now`.

Por eso una pieza programada para las 6:30 p. m. salía **a la mañana siguiente** (entre las 8:00 y las 9:00 a. m.), no «esa mañana».

**Opciones:**
- **(a, implementada):** la pieza se guarda en la primera franja del cron que la va a ver vencida (`nextCronSlot`), y el bot dice el día y la franja («sale el miércoles, 4 de noviembre, entre las 8:00 a. m. y las 9:00 a. m.»). Las horas se piden y se muestran en formato de 12 horas.
- **(b):** disparar `/api/cron/daily` desde un programador externo, por ejemplo un workflow `schedule` de GitHub Actions con `CRON_SECRET` cada 30 minutos. Es gratis, pero GitHub también puede retrasar sus ejecuciones programadas.
- **(c):** Vercel Workflows con `sleep` hasta la hora exacta (ver la recomendación 10).

### 3. `durability: "sync"`

LangGraph JS guarda los checkpoints en modo `"async"` por defecto (`node_modules/@langchain/langgraph/dist/pregel/types.d.ts`: *Save checkpoint asynchronously while the next step executes (default)*). Si el proceso muere justo después de un efecto externo, el paso puede repetirse.

Ya tenemos defensas:
- `steps.commit` evita repetir el commit;
- el intento de LinkedIn queda registrado (`attemptKey`);
- el comentario solo se publica una vez.

`"sync"` cierra la ventana restante, a cambio de un poco de latencia. Es una línea en `run()`: `rt.graph.invoke(input, { ...config(contentId), durability: "sync" })`.

### 4. Vista previa como mensaje enriquecido de Telegram

La Bot API 10.1 (11-06-2026) agregó `sendRichMessage`. Su `InputRichMessage` acepta `markdown`, `html` o bloques: encabezados, tablas, código preformateado, citas, listas, fotos y documentos. La 10.3 (24-08-2026) agregó botones dentro del mensaje, citas expandibles y `DisabledButton`.

Hoy la vista previa es un resumen más un archivo `.md` adjunto, que hay que abrir aparte. Con mensajes enriquecidos el artículo se lee formateado dentro del chat.

**Plan:**
- intentar `sendRichMessage` con el Markdown del artículo y caer al formato actual si falla;
- usar `DisabledButton` para los botones de versiones viejas, en vez de quitarlos;
- `sendMessageDraft` con `can_stop` puede mostrar el progreso «Pensando…» mientras redacta, aunque el beneficio es menor que el de la vista previa.

**Pendiente de verificar en la documentación al implementarlo:** el límite de tamaño de un mensaje enriquecido y qué subconjunto de Markdown acepta (el MDX tiene frontmatter y figuras).

### 5. Citas textuales verificables por afirmación

Hoy `traceClaims` comprueba que la afirmación cite una fuente que existe y que **sus cifras** aparezcan en esa fuente. No comprueba que el pasaje respalde el texto. Lo que dice la literatura:

- *Cited but Not Verified* (arXiv 2605.06635, 2026): en los informes de agentes, la cita casi siempre lleva a una página relevante, pero la afirmación concreta **no está respaldada cerca de la mitad de las veces**;
- la recomendación repetida es verificar primero lo determinista (*¿qué parte se puede comprobar sin un LLM?*) y dejar la evaluación semántica (NLI o juez) como segunda capa.

**Qué hacer:**
1. El investigador devuelve, por cada afirmación, una **cita textual corta** de la fuente.
2. El código comprueba que esa cita aparece literalmente en el texto de la fuente (tras normalizar espacios).
3. Sin cita encontrada, la afirmación pasa a «sin fuente».

Es barato, determinista y también reduce el efecto de instrucciones inyectadas, porque el modelo no puede atribuirle a una fuente algo que no dice. La vista de `/fuentes` puede mostrar la cita.

### 6. Medir la visibilidad en búsquedas con IA (lo hace el dueño, sin código)

- **Search Console → informe de rendimiento de IA generativa** (anunciado el 03-06-2026, se está activando por partes): impresiones en AI Overviews, AI Mode y Discover, por página, país y dispositivo.
- Google pide que el sitio esté incluido en las funciones de IA generativa en Search Console. Hay un control de exclusión, así que conviene confirmar que siga activado.
- **Bing Webmaster Tools → AI Performance** (vista previa desde el 11-02-2026; intents, temas y *citation share* desde junio de 2026): qué páginas cita Copilot y con qué consultas internas («grounding queries»). Combina con IndexNow, que ya tenemos.

Anotarlo en `docs/remediation/PRODUCTION_CHECKLIST.md` §5.

### 7. Trazas del agente

Hoy, si algo falla en producción, solo tenemos los logs redactados. Opciones con plan gratuito:

| Opción | Plan gratuito | Comentario |
|---|---|---|
| LangSmith | 5.000 trazas al mes, 1 usuario | Integración nativa con LangGraph |
| Langfuse | 50.000 unidades al mes; o se aloja uno mismo | OpenTelemetry |

**Cuidado:** las trazas incluyen tus notas y borradores, y a veces material privado de clientes. Si se activan, redactar con el mismo `redact()` y no enviar el texto de las fuentes externas, o alojarlo uno mismo.

### 8. OCR para PDF escaneados

Hoy `unpdf` avisa que no hay OCR. Comparativas de 2026 (Towards Data Science y otras):
- **Gemini Flash** gana en documentos heterogéneos;
- **Mistral OCR** destaca en tablas y es barato.

Ya existe `LLM_VISION_MODEL`. Se podrían convertir a imagen las páginas sin texto y pasarlas por la visión con la misma advertencia de «verifícalo». Vale la pena solo si de verdad mandas escaneos.

### 9. Contexto sobre cómo se hizo el artículo

Google sugiere, cuando hay automatización, explicarle al lector cómo se creó el contenido (*Using gen AI content: give users context*). Es opcional. Podría ser una línea al pie: «Escrito a partir de mis notas con ayuda de un asistente de IA; lo revisé y aprobé». Es una decisión editorial del dueño.

### 10. Vercel Workflows (evaluar, no migrar ahora)

Vercel Workflows (`"use workflow"`, `"use step"`, `sleep`, `defineHook`) ofrece:
- ejecución durable que sobrevive a deploys;
- `sleep('7 days')` sin consumir recursos;
- *hooks* para aprobación humana.

Resolvería con precisión la programación (recomendación 2) y las esperas de deploy. Pero obliga a reescribir el grafo y su estado, y LangGraph con Postgres ya funciona. Una alternativa de la misma familia es el plugin de LangGraph para Temporal (16-07-2026). Ninguno compensa hoy.

## 3. Portafolio (SEO y GEO)

- **Sin cambios estructurales.** La guía de Google de 2026 dice que no hay requisitos técnicos ni schema especiales para las funciones de IA. Lo que pesa es el contenido no genérico y la base técnica (indexable, con snippet, buena experiencia de página), y eso ya está cubierto.
- **`ProfilePage` en la home.** Google acepta como página de perfil un «About Me» o la página de un autor, y no acepta la home de una tienda «con mucha información que no es del perfil». La home del portafolio trata sobre una sola persona, así que encaja, pero si algún día crece con mucho contenido ajeno, conviene mover el `ProfilePage` a una página «Sobre mí». No requiere acción hoy.
- **Sitio apto para agentes de navegador** (web.dev, *Build agent-friendly websites*, 2026-04-01): HTML semántico, contenido en el HTML inicial, sin muros ni modales. Ya está: SSG, 0 violaciones de axe y sin ventanas emergentes.

## 4. Fuentes

| Tema | URL | Fecha |
|---|---|---|
| LangGraph JS, interrupts | https://docs.langchain.com/oss/javascript/langgraph/interrupts | consultado 2026-10-26 |
| LangGraph JS, checkpointers y durabilidad | https://docs.langchain.com/oss/javascript/langgraph/checkpointers | ídem |
| Temporal + LangGraph | https://temporal.io/blog/temporal-langgraph-plugin-durable-execution | 2026-07-16 |
| Telegram Bot API (changelog 10.0–10.3) | https://core.telegram.org/bots/api-changelog | 2026-05-08 a 2026-08-24 |
| Telegram `sendRichMessage`, `sendMessageDraft` | https://core.telegram.org/bots/api | consultado 2026-10-26 |
| LinkedIn Posts API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10 | ídem |
| LinkedIn Documents API | https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api?view=li-lms-2026-10 | actualizada 2026-06-24 |
| LinkedIn refresh tokens | https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens | consultado 2026-10-26 |
| Vercel Workflows | https://vercel.com/docs/workflows/concepts | ídem |
| Vercel cron (Hobby) | https://vercel.com/docs/cron-jobs/usage-and-pricing | ídem |
| Vercel límites (300 s en Hobby) | https://vercel.com/docs/plans/hobby | ídem |
| GitHub, varios archivos en un commit | https://docs.github.com/en/rest/git/trees (ver también PyGithub #3545) | — |
| Google, optimizar para IA generativa | https://developers.google.com/search/docs/fundamentals/ai-optimization-guide | 2026-07-10 |
| Google, contenido con IA | https://developers.google.com/search/docs/fundamentals/using-gen-ai-content | 2026-10-01 |
| Google, políticas de spam | https://developers.google.com/search/docs/essentials/spam-policies | — |
| Google, ProfilePage | https://developers.google.com/search/docs/appearance/structured-data/profile-page | 2026-09-08 |
| Search Console, informe de IA generativa | https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports | 2026-06-03 |
| Bing AI Performance | https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/ | 2026-02 |
| OWASP LLM01:2025 | https://genai.owasp.org/llmrisk/llm01-prompt-injection/ | — |
| Verificación de citas | https://arxiv.org/html/2605.06635v1 | 2026 |
| web.dev, sitios aptos para agentes | https://web.dev/articles/ai-agent-site-ux | 2026-04-01 |

Las comparativas de OCR y de herramientas de observabilidad son de terceros con interés comercial; tómalas como punto de partida para una prueba propia, no como resultado.
