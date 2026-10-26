> Actualización 2026-10-23: el grafo, los estados editoriales y la conversación de Telegram cambiaron en la fase 2. La referencia vigente es [`docs/phase-2/CONTENT_ENGINE.md`](phase-2/CONTENT_ENGINE.md); este documento describe el diseño original.

# Architecture: Portafolio + Content Engine

> Cómo funciona el agente, de punta a punta: [agent-Functionality.md](agent-Functionality.md).

Todo vive en un solo proyecto de Vercel: el sitio estático y el agente de contenido. El agente funciona por eventos (webhook de Telegram y cron diario); no hay servidores aparte.

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Sitio | Next.js 16.3 (App Router, SSG), React 19, TypeScript | Stack actual. SSG deja todo el texto en el HTML, que es lo que leen los crawlers de IA |
| UI | CSS Modules + tokens en `app/globals.css` (ver `DESIGN.md`), tema claro/oscuro con un script propio (`lib/theme.ts`) | Mantine, Tailwind, Motion y Three.js se quitaron: el CSS bajó de 245 KB a 37 KB y el LCP móvil de 3,6 s a 2,7 s |
| i18n | `next-intl` 4 con segmento `app/[locale]` y `proxy.ts` | Soporte nativo de App Router, rutas estáticas por idioma, detección por `Accept-Language` |
| Blog | Archivos MDX en `content/blog/{locale}/` + `next-mdx-remote/rsc` + `gray-matter` + `zod` | Sin CMS: el agente publica con un commit. `zod` valida el frontmatter en build |
| SEO/GEO | `sitemap.ts`, `robots.ts`, JSON-LD (schema.org), `llms.txt`, RSS, IndexNow | APIs nativas de Next.js y estándares abiertos |
| Hosting | Vercel (Hobby), fluid compute | Sitio y agente en el mismo deploy. Redeploy automático en cada push a `main` |
| Agente | LangGraph.js (`@langchain/langgraph`) en Route Handlers | Grafo con estado, `interrupt()` para aprobación humana. Es el framework agéntico con más demanda en vacantes |
| Estado del agente | `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`) sobre Postgres gestionado (Supabase o Neon, plan gratuito) | Las funciones no guardan estado entre invocaciones; el checkpointer permite pausar días |
| LLM | OpenCode Go vía `ChatOpenAI` con `baseURL` `https://opencode.ai/zen/go/v1` | Endpoint compatible con OpenAI. Proveedor de respaldo configurable por variables de entorno |
| Observabilidad | LangSmith (plan gratuito) | Trazas por nodo y datasets para evals |
| PDF de carruseles | `next/og` (`ImageResponse`, ya usado en el sitio) → PNG por lámina + `pdf-lib` | Sin Chromium ni servidor de PDF |
| Mensajería | Bot de Telegram (webhook) | Entrada de ideas y aprobación desde el teléfono |
| Analítica | GA4 (actual), Google Search Console, Bing Webmaster Tools | Bing alimenta la búsqueda de ChatGPT |

## Límites de Vercel Hobby (documentación de octubre de 2026)

| Límite | Valor | Cómo se respeta |
|---|---|---|
| Duración por invocación | 300 s (máximo en Hobby) | `export const maxDuration = 300`. Cada tramo del grafo hasta un `interrupt()` o hasta el final debe caber en ese tiempo; si no cabe, se corta en dos tramos con un estado intermedio |
| Cron | Mínimo una vez al día, precisión de ±59 min, en UTC | Un solo cron diario hace todas las tareas programadas (ver más abajo) |
| Memoria | 2 GB / 1 vCPU | Suficiente: el trabajo pesado lo hace el LLM externo |
| Uso | Personal, no comercial | Si el agente se usa para clientes, pasar a Pro |

## Estructura del repo

Estado al 2026-10-20: todo lo marcado con ✓ existe en el repo.

```
app/
  [locale]/                 ✓ raíz con <html lang>, metadata, hreflang y la barra/pie compartidos
    layout.tsx              ✓
    page.tsx                ✓ inicio (JSON-LD Person + WebSite)
    not-found.tsx           ✓ 404 traducido
    [...rest]/page.tsx      ✓ rutas desconocidas → 404
    opengraph-image.tsx     ✓ imagen OG por idioma
    feed.xml/route.ts       ✓ RSS por idioma
    blog/
      page.tsx              ✓ índice
      [slug]/page.tsx       ✓ artículo (BlogPosting, BreadcrumbList, FAQPage)
    proyectos/[id]/page.tsx ✓ /es/proyectos/[id] y /en/projects/[id]
  api/
    telegram/route.ts       ✓ webhook: mensajes y botones (callback_query)
    cron/daily/route.ts     ✓ cron diario protegido con CRON_SECRET
    linkedin/auth/route.ts  ✓ inicia OAuth (?t=token firmado que vence en 24 h)
    linkedin/callback/route.ts ✓
    agent/setup/route.ts    ✓ crea tablas, registra el webhook, diagnóstico (Authorization: Bearer ADMIN_SECRET)
  sitemap.ts                ✓
  robots.ts                 ✓
  llms.txt/route.ts         ✓
  icon.svg, apple-icon.png  ✓
  globals.css               ✓ tokens (DESIGN.md)
agent/                      ✓ Content Engine
  config.ts                 variables (zod), validadas al usarlas
  state.ts                  estado del grafo (Annotation)
  graph.ts                  nodos y enrutamiento
  prompts.ts                prompts con las reglas de la guía anti-slop
  deps.ts                   interfaz de servicios externos (inyectables en tests)
  runtime.ts                servicios reales + PostgresSaver
  handlers.ts               Telegram, cron diario, reporte semanal
  carousel.tsx              láminas next/og → PDF (pdf-lib)
  lib/                      lint, llm, json, telegram, github, linkedin, indexnow, db, crypto, mdx, text, auth
  test/                     node --test: linter y grafo completo con LLM simulado
components/
  brand/Sigil.tsx           ✓ símbolo animado
  blog/Prose.tsx            ✓ render MDX
  seo/JsonLd.tsx            ✓
  layout/, sections/, ui/   ✓
content/blog/{es,en}/*.mdx  ✓
data/
  projects.{es,en}.json     ✓
  experience.{es,en}.json   ✓
  skills.json               ✓ etiquetas bilingües
i18n/
  routing.ts                ✓ locales y rutas localizadas (pathnames)
  navigation.ts             ✓ Link, usePathname, getPathname
  request.ts                ✓ carga de mensajes
lib/
  blog.ts                   ✓ lectura y validación zod
  content.ts                ✓ datos por idioma y enlaces
  jsonld.ts                 ✓ builders schema.org
  site.ts                   ✓ SITE_URL, absoluteUrl, alternates
messages/{es,en}.json       ✓
proxy.ts                    ✓ next-intl (en Next 16, middleware.ts pasó a llamarse proxy.ts)
vercel.json                 ✓ cron diario 13:00 UTC
```

## Grafo del agente

```
START → extractFacts ─┬─ (< 2 hechos) → needMaterial → END
                      └─ draftBlogEs → draftLinkedIn → antiSlop (≤ 2 pasadas) → localizeEn ─┬─ draftCarousel ─┐
                                                                                            └────────────────┴→ verifyFacts → evaluate → sendPreview → humanReview ⏸
humanReview ─┬─ approve ────► publishBlog → waitDeploy ─┬─ publishLinkedIn ─┬─ indexNow → notifyPublished → END
             │                                          └─ deployPending → hold ⏸ ─(retry)→ waitDeploy
             │                                                              publishLinkedIn sin token → hold ⏸ ─(retry)→ publishLinkedIn
             ├─ edit ───────► applyEdit → verifyFacts → … → humanReview
             ├─ reschedule ─► schedule → waitSchedule ⏸ ─(approve del cron)→ publishBlog
             ├─ approve/reschedule con bloqueo → refuseApprove → humanReview
             └─ reject/expire → close → END
```

⏸ = `interrupt()`. Lo que hay antes de un `interrupt()` se vuelve a ejecutar al reanudar, por eso los mensajes de Telegram viven en nodos separados de las pausas (`sendPreview` / `humanReview`, `deployPending` / `hold`, `schedule` / `waitSchedule`).

Reglas del grafo:
- `extractFacts` produce la lista de hechos permitidos. Ningún nodo posterior puede introducir cifras, nombres ni experiencias fuera de esa lista.
- `verifyFacts` marca con `[DATO?]` toda cifra que no esté en la lista. Si queda alguno, `humanReview` muestra el borrador como "bloqueado" y sin el botón Aprobar.
- `thread_id` = `content_id`. Reanudar el mismo hilo nunca repite pasos completados: cada nodo de publicación revisa `state.steps` antes de actuar.

### Estado (`agent/state.ts`)

| Campo | Tipo | Descripción |
|---|---|---|
| contentId | string | También es el `thread_id` |
| source | { type, text, createdAt } | Material original de Miguel |
| pillar | agents · automation · backend · career | |
| format | text · carousel | |
| linkedinLang | en · es | |
| facts | string[] | Hechos permitidos |
| drafts | { blogEs, blogEn, linkedin, carousel? } | Frontmatter + cuerpo MDX |
| lint | { pass: number, p0: string[], p1: string[], p2: string[] } | |
| missingFacts | string[] | |
| evalScores | { specificity, factDensity, aiMarkers, pillarFit } | 1–5 |
| review | { action, instructions?, scheduledFor? } | Respuesta de Telegram |
| steps | { commit?, deploy?, linkedin?, comment?, indexNow? } | Resultado de cada paso de publicación |

## Flujos de ejecución

| Evento | Ruta | Qué hace |
|---|---|---|
| Mensaje de Telegram | `POST /api/telegram` | Valida el secreto y el chat ID → crea `content_id` → `graph.invoke` hasta `humanReview` → envía la vista previa con botones |
| Botón de Telegram | `POST /api/telegram` (`callback_query`) | Valida → `graph.invoke(new Command({ resume: { action, ... } }), { thread_id })` |
| Respuesta de texto a un borrador | `POST /api/telegram` | Se toma como `edit` con esas instrucciones |
| Cron diario 13:00 UTC (8:00 Bogotá) | `GET /api/cron/daily` | Valida `CRON_SECRET` y luego: (1) publica los hilos con `scheduled_for` vencido; (2) reintenta los que quedaron en `awaiting_deploy`; (3) marca como `expired` los borradores con más de 48 h sin respuesta; (4) avisa si al token de LinkedIn le quedan ≤ 10 días; (5) los lunes pide material; (6) los domingos envía el reporte semanal |

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/daily", "schedule": "0 13 * * *" }]
}
```

### Espera del deploy

Al aprobar, `publishBlog` hace commit de los MDX y Vercel redespliega. `waitDeploy` consulta la URL del artículo cada 10 s durante un máximo de 180 s. Si no responde 200 a tiempo, el estado pasa a `awaiting_deploy`, la invocación termina y avisa por Telegram con un botón "Reintentar". El cron diario también reintenta. Así ninguna invocación supera los 300 s.

## Data Model

### Artículo (frontmatter MDX)

```yaml
title: string            # ≤ 60 caracteres
description: string      # 140–160 caracteres; meta description
summary: string          # bloque de respuesta de 40–60 palabras, se muestra arriba
date: YYYY-MM-DD
updated: YYYY-MM-DD      # opcional
slug: string             # igual en ambos idiomas para enlazar traducciones
locale: es | en
pillar: agents | automation | backend | career
tags: string[]           # ≤ 5
faq:                     # opcional, genera FAQPage
  - q: string
    a: string
sources:
  - title: string
    url: string
contentId: string        # vacío si se escribió a mano
linkedinUrn: string      # se completa después de publicar
```

### Postgres

- Tablas del checkpointer: las crea `PostgresSaver.setup()`.
- `content_log`: índice consultable de cada pieza (el detalle vive en el checkpoint).

| Columna | Tipo | Notas |
|---|---|---|
| content_id | uuid PK | = `thread_id` |
| created_at | timestamptz | |
| source_type | text | telegram_note, telegram_voice, github_commits, backlog |
| pillar | text | |
| status | text | draft, blocked, awaiting_approval, approved, scheduled, awaiting_deploy, published, rejected, expired, failed |
| scheduled_for | timestamptz | |
| eval_scores | jsonb | |
| published_urls | jsonb | blog_es, blog_en, linkedin |
| updated_at | timestamptz | |

## API Contracts

### `POST /api/telegram`

- Header obligatorio: `X-Telegram-Bot-Api-Secret-Token` = `TELEGRAM_WEBHOOK_SECRET` (configurado con `setWebhook`). Sin él: 401.
- Solo se procesan updates cuyo `chat.id` = `TELEGRAM_CHAT_ID`. Los demás reciben 200 y se ignoran.
- Botones (`callback_data`, ≤ 64 bytes): `a:{contentId}` aprobar, `e:{contentId}` editar, `r:{contentId}` rechazar, `s:{contentId}` reprogramar, `t:{contentId}` reintentar publicación.
- Responde 200 a Telegram de inmediato y ejecuta el grafo con `after()` de `next/server` (en Vercel usa `waitUntil`, con el mismo límite de 300 s). Así Telegram no reenvía el update por timeout. Se guarda el `update_id` procesado para ignorar duplicados.

### `GET /api/cron/daily`

- Header `Authorization: Bearer ${CRON_SECRET}` (Vercel lo envía solo). Sin él: 401.

### LLM (`agent/lib/llm.ts`)

```ts
new ChatOpenAI({
  model: process.env.LLM_MODEL,
  apiKey: process.env.LLM_API_KEY,
  configuration: { baseURL: process.env.LLM_BASE_URL }, // https://opencode.ai/zen/go/v1
}).withFallbacks([fallbackModel]) // LLM_FALLBACK_* si está definido
```

### LinkedIn

- Auth: OAuth 2.0, productos "Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect". Scopes: `openid profile w_member_social`. Token de 60 días sin refresh. Se guarda cifrado en Postgres junto con su fecha de vencimiento; la ruta de callback de OAuth está en `/api/linkedin/callback`.
- Post: `POST https://api.linkedin.com/rest/posts`, headers `Linkedin-Version: YYYYMM`, `X-Restli-Protocol-Version: 2.0.0`. `author: urn:li:person:{id}`, `visibility: PUBLIC`, `lifecycleState: PUBLISHED`.
- Comentario con enlace: `POST /rest/socialActions/{postUrn}/comments`.
- Documento (fase 3, sujeto a spike): `POST /rest/documents?action=initializeUpload` → PUT del PDF → post con `content.media.id = urn:li:document:...`. Se publica de forma asíncrona.

### GitHub

- Token fine-grained con permiso `contents:write` solo sobre `MiguelBonilla-sys/portafolio`.
- `PUT /repos/MiguelBonilla-sys/portafolio/contents/content/blog/{locale}/{slug}.mdx` (uno por idioma), rama `main`, mensaje `content: {slug}`.

### IndexNow

- `POST https://api.indexnow.org/indexnow` con `host`, `key`, `keyLocation` (`/{key}.txt` en `public/`) y `urlList`.

### Variables de entorno

`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_FALLBACK_BASE_URL`, `LLM_FALLBACK_API_KEY`, `LLM_FALLBACK_MODEL`, `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHAT_ID`, `CRON_SECRET`, `GITHUB_TOKEN`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `INDEXNOW_KEY`, `LANGSMITH_API_KEY`, `LANGSMITH_TRACING`.

## Integration Map

| Servicio | Uso | Modo de fallo | Respuesta |
|---|---|---|---|
| Telegram Bot API | Entrada, aprobación, alertas | Webhook caído o mal configurado | El cron del lunes detecta que no hubo actividad y avisa; `getWebhookInfo` en el checklist de despliegue |
| OpenCode Go | Generación | Límite de uso, cambio de condiciones, caída | `withFallbacks` al proveedor de respaldo; alerta por Telegram si se usó el respaldo |
| Postgres (Supabase/Neon) | Checkpoints y `content_log` | Base pausada por inactividad (planes gratuitos) | El cron diario hace una consulta, lo que la mantiene activa |
| GitHub API | Commit de MDX | 409 (sha desactualizado), 401 | Reobtener sha y reintentar; 401 → alerta de token |
| Vercel build | Deploy del artículo | Build roto por MDX inválido | `waitDeploy` agota el tiempo → `awaiting_deploy` → alerta; LinkedIn no se publica |
| LinkedIn API | Post y comentario | 401 (token vencido), 429, documento asíncrono | 401 → bloquear y avisar; 429 → el cron reintenta; idempotencia por `state.steps` |
| IndexNow / Bing | Indexación | Error 4xx | Solo se registra |
| LangSmith | Trazas | Caída | No bloquea; el tracing es opcional |

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Las condiciones de OpenCode Go no permiten este uso o sus límites no alcanzan | M | H | Revisar los términos antes de T21; proveedor de respaldo por variables de entorno desde el día 1 |
| Un tramo del grafo supera los 300 s | M | M | Medir con LangSmith en T27; modelos rápidos para nodos simples; cortar el grafo con un estado intermedio si hace falta |
| La API no permite documentos PDF en perfiles personales | M | M | Spike T30 antes de construir F13; plan B: multi-imagen o subida manual |
| El LLM inventa datos o experiencias | H | H | `extractFacts` como única fuente + `verifyFacts` + `[DATO?]` bloqueante + aprobación humana |
| Contenido que suena a IA aunque pase el linter | M | H | Evals con rúbrica, ejemplos aprobados como few-shot, revisión humana; ajustar la guía con cada rechazo |
| Webhook público abusado | L | H | Secreto de Telegram + filtro por chat ID + `CRON_SECRET`; las rutas del agente no hacen nada sin ellos |
| Publicación duplicada en LinkedIn | M | H | `state.steps.linkedin` se revisa antes de publicar; `thread_id` único por pieza |
| Precisión del cron de Hobby (±59 min) | H | L | Se publica "en la mañana", no a una hora exacta. Si hace falta precisión, un cron externo gratuito llama a `/api/cron/daily` |
| Migrar a `app/[locale]` rompe rutas, OG o analítica | M | M | Migración en una rama con checklist de URLs; redirecciones 308 desde las anclas antiguas |
| El sitio nuevo no gana citas en consultas genéricas | H | L | Metas de GEO limitadas a consultas de marca y nicho |
