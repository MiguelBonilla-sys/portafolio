# Architecture: Portafolio + Content Engine

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Sitio | Next.js 16 (App Router, SSG), React 19, TypeScript | Stack actual. SSG deja todo el texto en el HTML, que es lo que leen los crawlers de IA |
| UI | Mantine v8 (`core`, `hooks`), Tailwind v4, CSS Modules, Motion, R3F | Stack actual. Se eliminan los paquetes de Mantine, TipTap, Recharts, Embla y Dayjs que no se usan |
| i18n | `next-intl` con segmento `app/[locale]` | Soporte nativo de App Router, rutas estáticas por idioma, middleware de detección |
| Blog | Archivos MDX en `content/blog/{locale}/` + `next-mdx-remote/rsc` + `gray-matter` + `zod` | Sin CMS: el pipeline publica con un commit. `zod` valida el frontmatter en build |
| SEO/GEO | `sitemap.ts`, `robots.ts`, JSON-LD (schema.org), `llms.txt`, RSS, IndexNow | APIs nativas de Next.js y estándares abiertos |
| Hosting del sitio | Vercel | Actual. Redeploy automático en cada push a `main` |
| Orquestador | n8n (self-hosted) | Cron, Telegram con espera de respuesta, HTTP, GitHub y Code nodes nativos. Miguel ya lo domina |
| Cerebro LLM | Langflow (self-hosted), flujo expuesto como API | Agente redactor, editor y traductor con prompts versionados. Demuestra un segundo framework agéntico |
| LLM | Por decidir (Open Question): API de Claude o Ollama local | El flujo de Langflow abstrae el proveedor |
| Infra del pipeline | VPS con Coolify (n8n + Langflow + PostgreSQL + Gotenberg) | Un solo servidor, despliegue por Docker Compose |
| Registro | PostgreSQL (tabla `content_log`) | Idempotencia y métricas del pipeline |
| PDF de carruseles | Plantilla HTML + Gotenberg (Chromium) | HTML → PDF sin dependencias del sitio |
| Mensajería | Bot de Telegram | Aprobación desde el teléfono |
| Analítica | GA4 (actual), Google Search Console, Bing Webmaster Tools | Bing alimenta la búsqueda de ChatGPT |

## Estructura del repo (después de la fase 1)

```
app/
  [locale]/
    layout.tsx            # <html lang>, metadata y hreflang por idioma
    page.tsx              # home
    blog/
      page.tsx            # índice del blog
      [slug]/page.tsx     # artículo (generateStaticParams)
    proyectos/[id]/page.tsx  # caso de estudio
  sitemap.ts
  robots.ts
  llms.txt/route.ts       # texto plano generado desde data/ y content/
  feed.xml/route.ts       # RSS (por idioma: /feed.xml?lang=en)
  opengraph-image.tsx
content/
  blog/
    es/{slug}.mdx
    en/{slug}.mdx
data/
  projects.{es,en}.json
  experience.{es,en}.json
  skills.json
lib/
  blog.ts                 # lectura, validación zod, orden por fecha
  jsonld.ts               # builders: person(), website(), blogPosting(), faq(), breadcrumbs()
messages/
  es.json
  en.json
middleware.ts             # next-intl: detección de idioma
```

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
sources:                 # fuentes primarias citadas
  - title: string
    url: string
contentId: string        # id del pipeline; vacío si se escribió a mano
linkedinUrn: string      # se completa después de publicar
```

Relaciones: un `contentId` → dos artículos (es, en) + un post de LinkedIn (+ un carrusel opcional). Los artículos de ambos idiomas comparten `slug`.

### `content_log` (PostgreSQL)

| Columna | Tipo | Notas |
|---|---|---|
| content_id | uuid PK | |
| created_at | timestamptz | |
| source_type | text | telegram_note, telegram_voice, github_commits, backlog |
| source_payload | jsonb | Material original (para auditar que no se inventó nada) |
| pillar | text | |
| status | text | draft, blocked, awaiting_approval, approved, rejected, expired, published, failed |
| drafts | jsonb | blog_es, blog_en, linkedin_post, carousel_slides |
| lint_report | jsonb | Marcas detectadas por pasada |
| eval_scores | jsonb | Especificidad, densidad de hechos, marcas de IA, ajuste al pilar |
| steps | jsonb | {commit: ok/sha, deploy: ok, linkedin: ok/urn, comment: ok, indexnow: ok} |
| scheduled_for | timestamptz | |
| published_urls | jsonb | blog_es, blog_en, linkedin |

## API Contracts

### Langflow: generación (`POST /api/v1/run/{flow_id}`)

Headers: `x-api-key`.

Request:
```json
{
  "input_value": "<material del usuario>",
  "tweaks": {
    "pillar": "agents",
    "format": "text | carousel",
    "linkedin_lang": "en | es",
    "style_guide_version": "1.0"
  }
}
```

Response (salida del último nodo, JSON):
```json
{
  "blog_es": { "frontmatter": {}, "body_mdx": "..." },
  "blog_en": { "frontmatter": {}, "body_mdx": "..." },
  "linkedin_post": "...",
  "carousel_slides": [{ "title": "...", "body": "..." }],
  "missing_facts": ["[DATO?] horas ahorradas por semana"],
  "lint_report": { "p0": [], "p1": [], "p2": [] }
}
```

Errores: 401 (API key), 422 (material vacío o < 50 palabras), 500 (fallo del LLM: n8n reintenta 1 vez y avisa por Telegram).

### Flujo de Langflow (nodos)

1. **Extractor de hechos**: lista los hechos verificables del material (cifras, herramientas, decisiones). Es la única fuente permitida para los nodos siguientes.
2. **Redactor ES**: artículo de blog con `content-style-guide.md` como system prompt.
3. **Editor anti-slop**: audita con la guía (P0/P1/P2) y reescribe sin agregar hechos.
4. **Localizador EN**: adapta (no traduce literal) al inglés con las reglas en inglés de la guía.
5. **Adaptador LinkedIn**: post nativo de 150–300 palabras en el idioma pedido, sin enlaces.
6. **Generador de carrusel** (fase 3): 6–10 láminas.
7. **Verificador**: compara cada cifra del texto contra la lista del paso 1; lo que no coincida se marca `[DATO?]`.

### n8n: workflows

| Workflow | Disparador | Pasos |
|---|---|---|
| `wf-intake` | Mensaje de Telegram (filtrado por chat ID) o cron lunes 8:00 (pide material) | Guarda en `content_log` (draft) → llama a `wf-generate` |
| `wf-generate` | Llamada de `wf-intake` | Langflow → linter determinista (Code node con las regex de la guía) → si hay P0/P1 o `[DATO?]`: 1 reescritura → `wf-approve` |
| `wf-approve` | Llamada de `wf-generate` | Telegram "Send and wait for response" con vista previa y botones; timeout 48 h → expired |
| `wf-publish` | Aprobación o fecha de `scheduled_for` | GitHub commit de 2 MDX → poll de la URL hasta 200 (máx. 10 min) → LinkedIn post → comentario con enlace → IndexNow → Telegram confirmación |
| `wf-token-check` | Cron diario | Si al token de LinkedIn le quedan ≤ 10 días → aviso por Telegram con enlace de reautorización |
| `wf-weekly-report` | Cron domingo | Resumen por Telegram: publicados, rechazados, eval promedio, métricas que Miguel debe registrar a mano |

### LinkedIn

- Auth: OAuth 2.0, producto "Share on LinkedIn" + "Sign In with LinkedIn using OpenID Connect". Scopes: `openid profile w_member_social`. Token de 60 días sin refresh.
- Post: `POST https://api.linkedin.com/rest/posts`, headers `Linkedin-Version: YYYYMM`, `X-Restli-Protocol-Version: 2.0.0`. `author: urn:li:person:{id}`, `visibility: PUBLIC`, `lifecycleState: PUBLISHED`.
- Comentario con enlace: `POST /rest/socialActions/{postUrn}/comments`.
- Documento (fase 3, sujeto a spike): `POST /rest/documents?action=initializeUpload` → PUT del PDF → post con `content.media.id = urn:li:document:...`. Se publica de forma asíncrona: el 201 no garantiza visibilidad inmediata.

### GitHub

- `PUT /repos/MiguelBonilla-sys/portafolio/contents/content/blog/{locale}/{slug}.mdx` (uno por idioma), rama `main`, mensaje `content: {slug}`.
- Alternativa más segura: una rama `content/{slug}` + PR con auto-merge, si se quiere CI antes del deploy.

### IndexNow

- `POST https://api.indexnow.org/indexnow` con `host`, `key`, `keyLocation` (`/{key}.txt` en `public/`) y `urlList`.

## Integration Map

| Servicio | Uso | Modo de fallo | Respuesta |
|---|---|---|---|
| Telegram Bot API | Entrada de ideas, aprobación, alertas | Bot caído o webhook roto | n8n reintenta; el cron semanal detecta la falta de actividad |
| Langflow | Generación | Timeout o error del LLM | 1 reintento, luego alerta. El borrador queda en `draft` |
| LLM (proveedor) | Texto | Rate limit, costo | Límite de 4 generaciones por pieza; alerta si el gasto mensual supera el presupuesto |
| GitHub API | Commit de MDX | 409 (sha desactualizado), 401 | Reobtener sha y reintentar; 401 → alerta de token |
| Vercel | Deploy | Build roto por MDX inválido | El poll de la URL expira → alerta con el log; no se publica en LinkedIn |
| LinkedIn API | Post y comentario | Token vencido (401), 429, documento asíncrono | 401 → bloquear y avisar; 429 → reintentar en 1 h; idempotencia por `content_id` |
| IndexNow / Bing | Indexación | Error 4xx | Solo se registra; no bloquea |
| Gotenberg | PDF | Contenedor caído | El carrusel pasa a post de texto y se avisa |

## Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| La API no permite documentos PDF en perfiles personales | M | M | Spike T30 antes de construir F13; plan B: multi-imagen o subida manual |
| El LLM inventa datos o experiencias | H | H | Extractor de hechos como única fuente + verificador + `[DATO?]` bloqueante + aprobación humana |
| Contenido que suena a IA aunque pase el linter | M | H | Evals con rúbrica, ejemplos propios de Miguel como few-shot, revisión humana; ajustar la guía con cada rechazo |
| Migrar a `app/[locale]` rompe rutas, OG o analítica | M | M | Migración en una rama con checklist de URLs; redirecciones 308 desde las anclas antiguas |
| Publicación duplicada en LinkedIn por reintentos | M | H | `steps.linkedin` en `content_log` se revisa antes de publicar |
| Token de LinkedIn vence sin aviso | M | M | `wf-token-check` diario |
| Costo del VPS + LLM por encima del presupuesto | L | M | Coolify en un VPS pequeño; LLM local para borradores si hace falta |
| El sitio nuevo no gana citas en consultas genéricas | H | L | Metas de GEO limitadas a consultas de marca y nicho; autoridad vía LinkedIn y GitHub |
