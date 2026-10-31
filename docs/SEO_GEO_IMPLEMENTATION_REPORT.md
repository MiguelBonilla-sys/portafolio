# Informe de implementación SEO, GEO, AEO y WebMCP

**Corte:** 2026-10-30. **Destino:** rama local `feat/seo-geo-webmcp`; producción permanece sin cambios. “VERIFICADO” significa prueba ejecutada, no promesa de indexación, ranking o citación.

## Resultado por objetivo

| Estado | Resultado |
| --- | --- |
| **IMPLEMENTADO Y VERIFICADO** | Seis herramientas WebMCP contextuales, invocadas mediante `document.modelContext.executeTool()` en Chrome 156 local; fallback sin API; salida estructurada, validación y limpieza al navegar. |
| **IMPLEMENTADO Y VERIFICADO** | Corrección de cargo vigente a Frontend Developer desde septiembre de 2025 y, desde octubre de 2026, el cargo vigente Development Lead (ascenso de noviembre) en experiencia ES/EN, hero, About, JSON-LD Person/ProfilePage, `llms.txt`, `llms-full.txt` derivado, borrador de LinkedIn y PDFs ES/EN. El titular técnico Full Stack Engineer permanece. |
| **IMPLEMENTADO Y VERIFICADO** | `hreflang` de artículos basado en traducciones publicadas; sitemap sin fechas de modificación inventadas. Ningún borrador se publicó ni se incluyó en sitemap o herramienta de blog. |
| **IMPLEMENTADO Y VERIFICADO** | La promoción de noviembre de 2026 quedó publicada con autorización del propietario: Development Lead vigente y Frontend Developer septiembre 2025–octubre 2026 como historial en experiencia ES/EN, hero factual, About, JSON-LD Person/ProfilePage, `llms.txt`, `llms-full.txt` derivado, borrador de LinkedIn, WebMCP y PDFs ES/EN. El titular técnico Full Stack Engineer se conserva y las responsabilidades previstas no se declaran resultados ya obtenidos. |
| **PENDIENTE** | Despliegue y validación externa en producción, confirmación con el empleador de la vigencia, acceso a Search Console, mediciones de campo y backlinks reales. |
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
| `get_professional_profile` | Home | Perfil con Development Lead vigente desde noviembre de 2026 y el historial Frontend Developer septiembre 2025–octubre 2026; especialización Full Stack, enlaces y CV |
| `search_blog_articles` | Índice del blog | Devuelve lista vacía: no hay artículos publicados |
| `navigate_to_portfolio_section` | Home | Navega a `/en/cv`; las herramientas de home desaparecen tras desmontar |
| `prepare_contact_message` | Home | Valida, rellena el formulario visible y devuelve `sent: false`; ninguna solicitud a Web3Forms |

No se usó un servidor MCP ni se llamó a operaciones administrativas. El formulario declarativo de WebMCP se descartó por el riesgo de confundir preparación con envío; la integración imperativa por hook conserva el botón humano de envío.

## Pruebas y medidas

| Comando o medición | Resultado |
| --- | --- |
| Línea base `pnpm test` | 109/109 antes del cambio |
| RED de reglas nuevas | Fallos observados en `test/consistency.test.ts`, `test/article-seo.test.ts` y `test/webmcp-data.test.ts` antes de implementar |
| `pnpm test` final | 117/117 |
| `pnpm lint` | Aprobado |
| `pnpm exec tsc --noEmit` | Aprobado |
| `pnpm build` | Aprobado; rutas principales prerenderizadas |
| `pnpm test:e2e` con Chrome 156 | 11/11, incluidos WebMCP nativo y navegador sin API |
| Verificación independiente aislada | `pnpm test` 115 aprobadas y 1 omitida por falta de `.git` en la copia; lint, build, typecheck y E2E 11/11 aprobados. Hallazgo de navegación corregido y revalidado con unit 4/4 y E2E nativo 2/2 |
| `pnpm cv` y `test/cv.test.ts` | PDFs ES/EN regenerados y 2/2 pruebas de contenido aprobadas |
| Revisión nativa de candidatos | Los candidatos hasta `f1bfb40`, `3d02285` y `dc78037` recibieron consentimiento individual, revisión aprobada y reconocimiento exacto. El último incluyó el tramo pendiente de contacto/documentación y la prueba observable del sitemap. |
| HTTP local | `/es`, `/en`, `/en/blog`, caso Bikans, sitemap, robots y llms: 200; sitemap con 34 URLs y 0 fechas ficticias |
| Lighthouse 13.6.0 móvil `/en` | Producción previa: Performance/Accessibility/SEO 100/100/100, LCP 1,1 s, CLS 0,001. Build local: 100/100/92, LCP 0,8 s, CLS 0. **No son mediciones comparables**: HTTPS/red real frente a localhost; la única deducción SEO local es que canonical apunta a producción, como debe hacerlo. |
| PageSpeed Insights API | HTTP 429 por cuota; no se obtuvo medición |

## Riesgos, límites y siguientes acciones

1. **Promoción publicada con autorización del propietario (2026-10-30):** `content/experience/development-lead-2026.json` se materializó en dos entradas independientes de Coordenadas.co (Development Lead desde noviembre de 2026, Frontend Developer septiembre 2025–octubre 2026), con hero factual, About, Person/ProfilePage, `llms.txt`, texto de LinkedIn, CV, WebMCP y PDFs regenerados. Queda pendiente confirmar con el empleador que el nombramiento entró en vigencia; el titular técnico Full Stack Engineer se conserva y las responsabilidades declaradas son las previstas, sin presentarlas como resultados ya obtenidos.
2. **Producción:** no se hizo push ni deploy. Tras autorización, verificar HTML, canonical, hreflang, JSON-LD, sitemap, robots y las seis herramientas en un Chrome compatible sobre HTTPS. La origin trial o la bandera son necesarias según el navegador; no se afirma compatibilidad universal.
3. **Datos externos:** Search Console, Core Web Vitals de campo, CTR, dominios de referencia y citas de asistentes siguen no verificados. `docs/SEO_GEO_METRICS.md` define el seguimiento sin crear una “puntuación GEO”.
4. **Contenido:** publicar únicamente artículos aprobados por Content Engine, con fuentes primarias, ejemplos reproducibles, fechas y límites. El blog vacío no se rellenó con contenido ficticio. La estrategia externa de `docs/BACKLINK_STRATEGY.md` requiere trabajo editorial y autorización de cada cuenta.
5. **Seguridad histórica:** `docs/audit/CONTENT_VERIFICATION.md` y `docs/phase-2/SECURITY_REMEDIATION.md` registran un repositorio externo con credenciales expuestas. No se modificó ni enlazó de nuevo; requiere actuación separada del propietario.
6. **Pruebas del sitemap:** `test/article-seo.test.ts` verifica la salida de `articleSitemapEntries` para un artículo EN publicado y una traducción ES en borrador: URL, alternates, fecha de actualización y estabilidad entre invocaciones. El XML del sitemap local permaneció idéntico tras conectar esa función. Esta prueba no sustituye una verificación de producción tras desplegar.

El verificador detectó además que `toString` y `__proto__` podían pasar como secciones válidas por herencia del prototipo del objeto de rutas; se corrigió con `Object.hasOwn` y se añadieron regresiones unitarias y nativas. No se atribuye al navegador ni a la especificación WebMCP.
