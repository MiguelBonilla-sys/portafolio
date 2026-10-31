# Informe de implementación SEO, GEO, AEO y WebMCP

**Corte:** 2026-10-30. **Destino:** rama local `feat/seo-geo-webmcp`; producción permanece sin cambios. “VERIFICADO” significa prueba ejecutada, no promesa de indexación, ranking o citación.

## Resultado por objetivo

| Estado | Resultado |
| --- | --- |
| **IMPLEMENTADO Y VERIFICADO** | Seis herramientas WebMCP contextuales, invocadas mediante `document.modelContext.executeTool()` en Chrome 156 local; fallback sin API; salida estructurada, validación y limpieza al navegar. |
| **IMPLEMENTADO Y VERIFICADO** | Corrección de cargo vigente a Frontend Developer desde septiembre de 2025 en experiencia ES/EN, hero, About, JSON-LD Person/ProfilePage, `llms.txt`, `llms-full.txt` derivado, borrador de LinkedIn y PDFs ES/EN. El titular técnico Full Stack Engineer permanece. |
| **IMPLEMENTADO Y VERIFICADO** | `hreflang` de artículos basado en traducciones publicadas; sitemap sin fechas de modificación inventadas. Ningún borrador se publicó ni se incluyó en sitemap o herramienta de blog. |
| **PARCIAL** | La promoción de noviembre de 2026 se preparó en `content/experience/development-lead-2026.json`, pero no se muestra aún en páginas, CV, metadata, JSON-LD, llms ni WebMCP por ser futura. |
| **PENDIENTE** | Publicación autorizada tras la fecha efectiva, validación externa en producción, acceso a Search Console, mediciones de campo y backlinks reales. |
| **NO APLICA** | Servidor MCP, endpoints SSE/stdio, artículos ficticios, compra de enlaces, despliegue o publicación automática. |

## Cambios y archivos

- **SEO/GEO:** `lib/article-seo.ts`, `app/sitemap.ts`, `app/[locale]/blog/[slug]/page.tsx`, `lib/jsonld.ts`, `lib/dates.ts`, `messages/{es,en}.json`, `data/{experience,projects}.{es,en}.json`, `app/llms.txt/route.ts`, `docs/linkedin-profile.md`.
- **WebMCP:** `lib/webmcp/portfolio.ts`, `components/webmcp/{HomeTools,ProjectDetailsTool,BlogTools}.tsx`, `components/sections/ContactSection.tsx`, `app/[locale]/{page,blog/page,proyectos/[id]/page}.tsx`, `package.json`, `pnpm-lock.yaml`.
- **CV:** `public/cv/miguel-bonilla-cv-{es,en}.pdf`; se regeneraron desde las páginas locales ya corregidas.
- **Pruebas:** `test/{article-seo,webmcp-data,consistency}.test.ts`, `e2e/webmcp.test.mjs`.
- **Trazabilidad:** `docs/SEO_GEO_WEBMCP_AUDIT.md`, `docs/WEBMCP.md`, `docs/BACKLINK_STRATEGY.md`, `docs/SEO_GEO_METRICS.md`, este informe y `odd/tasks/seo-geo-webmcp.md`. Los informes históricos en `docs/audit/` no se sustituyeron.

## Herramientas y prueba real

| Herramienta | Contexto | Prueba observada |
| --- | --- | --- |
| `search_portfolio_projects` | Home | Descubrimiento e invocación con FastAPI; resultados con IDs, stack, estado, URL y evidencia pública |
| `get_project_details` | Caso de estudio | Caso IDN y error estructurado para ID desconocido |
| `get_professional_profile` | Home | Perfil con cargo vigente, especialización Full Stack, experiencia pública, enlaces y CV; sin ascenso futuro |
| `search_blog_articles` | Índice del blog | Devuelve lista vacía: no hay artículos publicados |
| `navigate_to_portfolio_section` | Home | Navega a `/en/cv`; las herramientas de home desaparecen tras desmontar |
| `prepare_contact_message` | Home | Valida, rellena el formulario visible y devuelve `sent: false`; ninguna solicitud a Web3Forms |

No se usó un servidor MCP ni se llamó a operaciones administrativas. El formulario declarativo de WebMCP se descartó por el riesgo de confundir preparación con envío; la integración imperativa por hook conserva el botón humano de envío.

## Pruebas y medidas

| Comando o medición | Resultado |
| --- | --- |
| Línea base `pnpm test` | 109/109 antes del cambio |
| RED de reglas nuevas | Fallos observados en `test/consistency.test.ts`, `test/article-seo.test.ts` y `test/webmcp-data.test.ts` antes de implementar |
| `pnpm test` final | 116/116 |
| `pnpm lint` | Aprobado |
| `pnpm exec tsc --noEmit` | Aprobado |
| `pnpm build` | Aprobado; rutas principales prerenderizadas |
| `pnpm test:e2e` con Chrome 156 | 11/11, incluidos WebMCP nativo y navegador sin API |
| Verificación independiente aislada | `pnpm test` 115 aprobadas y 1 omitida por falta de `.git` en la copia; lint, build, typecheck y E2E 11/11 aprobados. Hallazgo de navegación corregido y revalidado con unit 4/4 y E2E nativo 2/2 |
| `pnpm cv` y `test/cv.test.ts` | PDFs ES/EN regenerados y 2/2 pruebas de contenido aprobadas |
| Revisión nativa de commits | `f1bfb40` y `3d02285`: consentimiento individual, revisión aprobada y reconocimiento exacto. La primera revisión dejó una advertencia no bloqueante sobre ampliar las pruebas observables del sitemap. |
| HTTP local | `/es`, `/en`, `/en/blog`, caso Bikans, sitemap, robots y llms: 200; sitemap con 34 URLs y 0 fechas ficticias |
| Lighthouse 13.6.0 móvil `/en` | Producción previa: Performance/Accessibility/SEO 100/100/100, LCP 1,1 s, CLS 0,001. Build local: 100/100/92, LCP 0,8 s, CLS 0. **No son mediciones comparables**: HTTPS/red real frente a localhost; la única deducción SEO local es que canonical apunta a producción, como debe hacerlo. |
| PageSpeed Insights API | HTTP 429 por cuota; no se obtuvo medición |

## Riesgos, límites y siguientes acciones

1. **Promoción:** a partir del 1 de noviembre de 2026 y tras confirmar que el nombramiento entró en vigor, mover el borrador `content/experience/development-lead-2026.json` a dos entradas independientes de Coordenadas.co (Development Lead/Líder de Desarrollo desde noviembre; Frontend Developer septiembre 2025–octubre 2026). Actualizar hero factual, About, Person/ProfilePage, `llms.txt`, texto de LinkedIn, CV y `get_professional_profile`; regenerar PDFs, repetir pruebas y desplegar solo con autorización. El titular técnico Full Stack Engineer se conserva. Las responsabilidades previstas no son resultados ya obtenidos.
2. **Producción:** no se hizo push ni deploy. Tras autorización, verificar HTML, canonical, hreflang, JSON-LD, sitemap, robots y las seis herramientas en un Chrome compatible sobre HTTPS. La origin trial o la bandera son necesarias según el navegador; no se afirma compatibilidad universal.
3. **Datos externos:** Search Console, Core Web Vitals de campo, CTR, dominios de referencia y citas de asistentes siguen no verificados. `docs/SEO_GEO_METRICS.md` define el seguimiento sin crear una “puntuación GEO”.
4. **Contenido:** publicar únicamente artículos aprobados por Content Engine, con fuentes primarias, ejemplos reproducibles, fechas y límites. El blog vacío no se rellenó con contenido ficticio. La estrategia externa de `docs/BACKLINK_STRATEGY.md` requiere trabajo editorial y autorización de cada cuenta.
5. **Seguridad histórica:** `docs/audit/CONTENT_VERIFICATION.md` y `docs/phase-2/SECURITY_REMEDIATION.md` registran un repositorio externo con credenciales expuestas. No se modificó ni enlazó de nuevo; requiere actuación separada del propietario.
6. **Pruebas del sitemap:** la revisión recomendó agregar un caso reproducible de artículo publicado en un idioma y traducción borrador en otro, con aserciones sobre URLs, alternates, fechas y estabilidad entre invocaciones. No se presenta la prueba actual basada en código fuente como prueba completa de ese caso.

El verificador detectó además que `toString` y `__proto__` podían pasar como secciones válidas por herencia del prototipo del objeto de rutas; se corrigió con `Object.hasOwn` y se añadieron regresiones unitarias y nativas. No se atribuye al navegador ni a la especificación WebMCP.
