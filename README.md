# Miguel Bonilla: Portfolio

Portafolio bilingüe (español/inglés) de Miguel Bonilla, Full Stack AI Engineer en Bogotá. Incluye proyectos, blog, CV, una capa de SEO/GEO para buscadores y navegadores con IA, y el **Content Engine**: un agente en LangGraph.js que convierte notas enviadas por Telegram en artículos del blog y posts de LinkedIn, con aprobación humana.

## Stack

- **Framework:** Next.js 16 (App Router, generación estática), React 19, TypeScript
- **Idiomas:** next-intl (`/es`, `/en`)
- **Blog:** MDX en `content/blog/{es,en}` con frontmatter validado por zod
- **Estilos:** CSS Modules y tokens propios (brutalismo cyberpunk, ver `DESIGN.md`)
- **Tipografías:** Big Shoulders, Atkinson Hyperlegible Next, JetBrains Mono
- **Agente:** LangGraph.js + PostgresSaver, OpenCode Go (compatible con OpenAI), Telegram, LinkedIn Posts API, GitHub, IndexNow, Vercel Cron

## Inicio rápido

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000); redirige a `/es` o `/en` según el idioma del navegador.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (muestra borradores del blog) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm test` | Linter anti-slop y grafo del agente con un LLM simulado |
| `npm run cv` | Regenera `public/cv/*.pdf` desde `/[locale]/cv` (con el sitio corriendo) |
| `npm run indexnow` | Avisa a Bing de todas las URLs del sitemap (`SITE_URL=https://dominio`) |

## Variables de entorno

Plantilla completa en [`.env.example`](.env.example). Guía paso a paso (cuentas, secretos y activación) en [`docs/setup.md`](docs/setup.md).

El sitio funciona solo con `NEXT_PUBLIC_SITE_URL` (y opcionalmente GA4 y Web3Forms). El agente se activa cuando están todas sus variables y se abre `/api/agent/setup?key=ADMIN_SECRET`.

## SEO y buscadores con IA

- `sitemap.xml` con alternates por idioma, `robots.txt` que permite los bots de búsqueda e IA
- `llms.txt` (resumen) y `llms-full.txt` (contenido completo) para agentes
- JSON-LD: ProfilePage/Person, WebSite, ItemList, SoftwareSourceCode, BlogPosting, BreadcrumbList, FAQPage
- RSS por idioma en `/{locale}/feed.xml`

## Documentación

- `plan.md`: plan general y estado
- `docs/spec.md`, `docs/architecture.md`, `docs/tasks.md`: spec, arquitectura y tareas
- `docs/content-style-guide.md`: guía de escritura anti-slop
- `docs/setup.md`: puesta en marcha del agente
- `docs/linkedin-profile.md`: textos del perfil de LinkedIn (EN/ES)
- `docs/baseline.md`: métricas semanales
- `PRODUCT.md`, `DESIGN.md`: producto e identidad visual
