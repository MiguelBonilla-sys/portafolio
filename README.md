# Miguel Bonilla: Portfolio

Portafolio bilingüe (español/inglés) de Miguel Bonilla, Full Stack AI Engineer en Bogotá. Incluye proyectos, blog y una capa de SEO/GEO pensada para buscadores y navegadores con IA.

## Stack

- **Framework:** Next.js 16 (App Router, generación estática), React 19, TypeScript
- **Idiomas:** next-intl (`/es`, `/en`)
- **Blog:** MDX en `content/blog/{es,en}` con frontmatter validado por zod
- **Estilos:** CSS Modules y tokens propios (brutalismo cyberpunk, ver `DESIGN.md`)
- **Tipografías:** Big Shoulders, Atkinson Hyperlegible Next, JetBrains Mono

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
| `npm run indexnow` | Avisa a Bing de todas las URLs del sitemap (`SITE_URL=https://dominio`) |

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Dominio de producción para canonical, hreflang, sitemap y JSON-LD |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | Formulario de contacto |
| `SHOW_DRAFTS` | `true` para incluir borradores del blog en un build |

## SEO y buscadores con IA

- `sitemap.xml` con alternates por idioma, `robots.txt` que permite los bots de búsqueda e IA
- `llms.txt` (resumen) y `llms-full.txt` (contenido completo) para agentes
- JSON-LD: ProfilePage/Person, WebSite, ItemList, SoftwareSourceCode, BlogPosting, BreadcrumbList, FAQPage
- RSS por idioma en `/{locale}/feed.xml`

## Documentación

- `plan.md`: plan general y estado
- `docs/spec.md`, `docs/architecture.md`, `docs/tasks.md`: spec, arquitectura y tareas
- `docs/content-style-guide.md`: guía de escritura anti-slop
- `PRODUCT.md`, `DESIGN.md`: producto e identidad visual
