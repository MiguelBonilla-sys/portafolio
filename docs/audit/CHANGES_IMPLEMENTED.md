# Cambios implementados

> Rama `ccr-82e185fe-xk2i5l`, sobre `f519a52`. Cada fila referencia el hallazgo de `INITIAL_AUDIT.md`.

## Commits

| Commit | Contenido |
|---|---|
| `4eed53a` | Auditoría inicial y plan |
| `93b0dbc` | Modelo de proyecto con estado y caso de estudio, contenido reposicionado, UI de proyectos, stack y experiencia |
| `8f3dfbc` | SEO (Open Graph, 404, JSON-LD), reflow a 320 px |
| `59e0dac` | Pruebas de integridad de contenido y E2E |
| `67c64c6` | CV en PDF regenerado y README |

## Por área

### Veracidad y modelo de datos (A-02, A-03, A-04, A-05, A-07)

| Archivo | Cambio | Por qué |
|---|---|---|
| `types/index.ts` | `ProjectStatus` (6 valores), `contribution`, `caseStudy` (secciones opcionales), `SkillCategory.core`, `ExperienceItem.stack` | Estado y evidencia explícitos en los datos, no en texto libre |
| `data/projects.{es,en}.json` | Estado por proyecto; 4 destacados (Bikans, detector IDN, este sitio + Content Engine, API Auth Gateway); Sentinel RAG, LedgerCore y TaskFlow pasan a `unverified` sin frases de resultado; textos del detector IDN corregidos (coautoría, gateway LLM, pruebas); GEO Streamlit sin especulación | Ver `CONTENT_VERIFICATION.md` |
| `lib/content.ts` | `getFeaturedProjects`, `getSkills` con principales y secundarias, `skillNames` | Una sola fuente para home, CV, JSON-LD y llms.txt |

### Posicionamiento (A-06)

| Archivo | Cambio |
|---|---|
| `messages/{es,en}.json` | Titular "Full Stack Engineer · Python, React & AI Systems"; bajada con stack, tipo de trabajo y empleador actual; meta description; About con coautoría; intro de contacto; resumen del CV sin la lista de herramientas de IA que no se demuestran; textos nuevos de estados, caso de estudio y CTA |
| `app/[locale]/opengraph-image.tsx` | Imagen OG con el nuevo titular |
| `lib/jsonld.ts` | `jobTitle` y descripción de Person |
| `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` | Titular nuevo; estado de cada proyecto; casos de estudio en texto plano |
| `app/[locale]/cv/page.tsx` | Rol desde mensajes; proyectos del CV solo con evidencia |
| `public/cv/*.pdf` | Regenerados con `pnpm cv` desde el build final |

### Proyectos y casos de estudio (A-07, A-08, A-20)

| Archivo | Cambio |
|---|---|
| `components/ui/ProjectCard.tsx` + CSS | Variante destacada (estado, contexto, problema, aporte, 4 tecnologías, enlaces a repo y demo) y compacta (archivo). Patrón de enlace extendido: el título cubre la fila y repo/demo quedan encima, sin `<a>` anidados; foco visible en la fila con `:has(:focus-visible)` |
| `components/sections/ProjectsSection.tsx` + CSS | Destacados arriba; "Otros proyectos y archivo académico" debajo, con su encabezado; se conserva el enlace a GitHub |
| `components/project/CaseStudy.tsx` + CSS (nuevo) | Plantilla: Resumen, Problema, Rol, Arquitectura (diagrama de flujo numerado en HTML/CSS), Decisiones, Retos, Pruebas, Resultados, Limitaciones. Solo renderiza secciones con contenido; índice "En esta página" cuando hay más de dos |
| `components/ui/RichText.tsx` | Exporta `Inline` para código en línea dentro de listas |
| `app/[locale]/proyectos/[id]/page.tsx` + CSS | Estado, aporte, nota para proyectos sin código, plantilla, CTA de contacto y CV, "Otros proyectos" = destacados; el `<aside>` anidado pasó a `<div>` (A-12) |

### Stack y experiencia (A-09, A-10)

| Archivo | Cambio |
|---|---|
| `data/skills.json` | 6 áreas (antes 8) con principales y secundarias; sin niveles ni porcentajes; solo se agregaron tecnologías con repo público |
| `components/sections/SkillsSection.tsx` + CSS | Principales en chip, secundarias en texto; grilla de 3/2/1 columnas |
| `data/experience.{es,en}.json` | `stack` por cargo (tomado de los propios logros); tesis con coautor. Cargos, fechas y empleadores sin cambios |
| `components/sections/ExperienceSection.tsx` + CSS | Línea de tecnologías por cargo |

### SEO (A-15, A-16, A-17, A-18)

| Archivo | Cambio |
|---|---|
| `lib/site.ts` | `openGraphFor()`: imagen del idioma, `og:url` = canonical, tipo, sitio y locale |
| `layout.tsx`, `blog/page.tsx`, `blog/[slug]/page.tsx`, `cv/page.tsx`, `privacidad/page.tsx`, `tarjeta/page.tsx`, `proyectos/[id]/page.tsx` | Usan `openGraphFor` |
| `app/[locale]/not-found.tsx`, `app/[locale]/[...rest]/page.tsx` | Metadata del 404: título propio, `noindex, follow`, sin canonical. Va en la página catch-all porque, tras hidratar, Next aplicaba la metadata del segmento que lanza `notFound()` |
| `lib/jsonld.ts` | `SoftwareSourceCode` solo con repo público; `CreativeWork` en los demás; `sameAs` con la demo |

### Responsive y accesibilidad (A-11, A-12, A-19)

| Archivo | Cambio |
|---|---|
| `components/layout/Navbar.module.css` | Ajustes ≤ 360 px (gap, tamaño de marca, padding del menú) |
| `components/sections/SkillsSection.module.css` | `minmax(0, 1fr)` y chips que pueden partir línea a 320 px (el desborde existía también antes) |
| `app/globals.css` | `.chip-muted` (borde discontinuo) para "Sin código público" |
| `components/sections/ContactSection.tsx` | `maxLength` en nombre (120), correo (254) y mensaje (5000) |

### Pruebas (A-22)

| Archivo | Cambio |
|---|---|
| `test/content.test.ts` (nuevo) | 7 pruebas: paridad ES/EN de proyectos, estados con evidencia, casos de estudio con las mismas secciones, experiencia, stack sin duplicados, claves de mensajes, vocabulario de posicionamiento prohibido |
| `e2e/smoke.test.mjs` (nuevo) | 7 pruebas con `playwright-core` (ya en devDependencies): rutas, h1 y OG; overflow en 7 anchos; menú móvil; cambio de idioma; caso de estudio y ausencia de secciones vacías; 404 no indexable tras hidratar; validación del formulario |
| `package.json` | `test` incluye `test/`; nuevo `test:e2e` |

## Lo que no se cambió, a propósito

- Identidad visual (`DESIGN.md`): mismos tokens, tipografías, bordes y animaciones.
- Cargos, fechas, empleadores y logros de experiencia.
- El blog, el Content Engine y las rutas API.
- Sin dependencias nuevas en `package.json`. axe-core y Lighthouse se usaron desde el scratchpad, fuera del repo.
- Ningún proyecto se borró: los no verificados siguen con su página.
