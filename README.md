# Miguel Bonilla: Portfolio

Portafolio bilingüe (español/inglés) de Miguel Bonilla, Full Stack Engineer (Python, React y sistemas con IA) en Bogotá. Incluye proyectos, blog, CV, una capa de SEO/GEO para buscadores y navegadores con IA, y el **Content Engine**: un agente en LangGraph.js que convierte notas enviadas por Telegram en artículos del blog y posts de LinkedIn, con aprobación humana.

## Stack

- **Framework:** Next.js 16 (App Router, generación estática), React 19, TypeScript
- **Idiomas:** next-intl (`/es`, `/en`)
- **Blog:** MDX en `content/blog/{es,en}` con frontmatter validado por zod
- **Estilos:** CSS Modules y tokens propios (brutalismo cyberpunk, ver `DESIGN.md`)
- **Tipografías:** Big Shoulders, Atkinson Hyperlegible Next, JetBrains Mono
- **Agente:** LangGraph.js + PostgresSaver, OpenCode Go (compatible con OpenAI), Telegram, LinkedIn Posts API, GitHub, IndexNow, Vercel Cron

## Contenido

- Proyectos: `data/projects.{es,en}.json`. Cada uno lleva un `status` verificable (`commercial`, `deployed`, `academic`, `prototype`, `archived`, `unverified`) y, si es destacado, un `caseStudy` cuyas secciones solo se muestran cuando tienen contenido (`components/project/CaseStudy.tsx`).
- Experiencia: `data/experience.{es,en}.json`; stack: `data/skills.json` (`core` = principales, `items` = secundarias).
- `pnpm test` falla si los dos idiomas no coinciden o si un proyecto declara producción sin URL.

## Inicio rápido

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000); redirige a `/es` o `/en` según el idioma del navegador.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo (muestra borradores del blog) |
| `pnpm build` | Build de producción |
| `pnpm start` | Servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm test` | Linter anti-slop, grafo del agente con un LLM simulado e integridad del contenido ES/EN (`test/`) |
| `pnpm test:e2e` | Recorrido con Playwright del sitio compilado: rutas, desbordamiento en 7 anchos, menú móvil, idioma, 404 y formulario (con `pnpm start` corriendo; `BASE_URL`, `CHROME_PATH`) |
| `pnpm cv` | Regenera `public/cv/*.pdf` desde `/[locale]/cv` (con el sitio corriendo) |
| `pnpm indexnow` | Avisa a Bing de todas las URLs del sitemap (`SITE_URL=https://dominio`) |

## Variables de entorno

Plantilla completa en [`.env.example`](.env.example). Guía paso a paso (cuentas, secretos y activación) en [`docs/setup.md`](docs/setup.md).

El sitio funciona solo con `NEXT_PUBLIC_SITE_URL` (y opcionalmente GA4 y Web3Forms). El agente se activa cuando están todas sus variables y se llama a `/api/agent/setup` con `Authorization: Bearer ADMIN_SECRET` (ver `docs/setup.md` §8).

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
- `docs/audit/`: auditoría de octubre 2026 (hallazgos, plan, cambios, verificación de contenido y reporte final)
- `PRODUCT.md`, `DESIGN.md`: producto e identidad visual
