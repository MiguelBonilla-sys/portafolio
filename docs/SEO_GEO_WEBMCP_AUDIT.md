# Auditoría SEO, GEO, AEO y WebMCP

**Fecha:** 2026-10-30. **Alcance:** repositorio local y respuestas públicas de `https://mangel14.dev`; no se modificó producción ni se usaron credenciales externas. **Prioridad:** P0 = veracidad o seguridad; P1 = funcionalidad/rastreo importante; P2 = mejora incremental. El impacto es cualitativo, no una puntuación de Google.

## Estado inicial verificable

| Área | Evidencia | Estado |
| --- | --- | --- |
| Plataforma | `package.json`: Next.js 16.4.3, React 19.2.3, TypeScript; App Router bajo `app/[locale]` | EXISTENTE |
| Rutas públicas | `curl -L` del 2026-10-30: `/` → `/es` (200), `/en` 200, `/es` 200, `/sitemap.xml` 200, `/robots.txt` 200, `/llms.txt` 200, `/llms-full.txt` 200 | VERIFICADO por HTTP |
| Metadata bilingüe | `lib/site.ts`, `app/[locale]/layout.tsx`, metadata por página; canonical absoluto, `hreflang` ES/EN y `x-default`, Open Graph y Twitter | EXISTENTE; revisar excepciones |
| Datos estructurados | `lib/jsonld.ts`: Person/ProfilePage, WebSite, ItemList, proyecto, BlogPosting, BreadcrumbList y FAQPage | EXISTENTE |
| Blog | Un par MDX ES/EN en `content/blog`, ambos en borrador; `lib/blog.ts` filtra borradores fuera de desarrollo | SIN ARTÍCULOS PUBLICADOS |
| Content Engine | `agent/` genera y valida; el flujo de aprobación ya existe. Ver `docs/phase-2/CONTENT_ENGINE.md` | NO MODIFICAR APROBACIÓN |
| Casos de estudio | `data/projects.*.json` contiene contexto, arquitectura, decisiones, validación y limitaciones; `components/project/CaseStudy.tsx` los muestra | EXISTENTE |
| CV | `/[locale]/cv`, PDFs ES/EN en `public/cv`, generador `scripts/build-cv.mjs` | EXISTENTE |
| Pruebas/CI | `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`; `.github/workflows/ci.yml` ejecuta checks | EXISTENTE |
| WebMCP | Sin referencias en `app`, `components` ni `lib` | AUSENTE |

Las auditorías anteriores se conservan en `docs/audit/{INITIAL_AUDIT,IMPLEMENTATION_PLAN,CHANGES_IMPLEMENTED,CONTENT_VERIFICATION}.md` y `docs/phase-2/SEO_GEO.md`. Sus mediciones pertenecen a sus fechas y versiones; no se tratan como resultados actuales.

## Hallazgos priorizados

| ID | Prioridad e impacto estimado | Evidencia y archivos | Solución | Estado |
| --- | --- | --- | --- | --- |
| A1 | P1 · agentes compatibles no podían invocar funciones del sitio | No había WebMCP en `app/`, `components/`, `lib/`; especificación experimental de Chrome | Integración React aislada, datos públicos, validación, ciclo de vida y pruebas con/sin API | **IMPLEMENTADO Y VERIFICADO LOCALMENTE** |
| A2 | P0 · trayectoria pública contradice la corrección del propietario | `data/experience.*.json`, `messages/*.json`, `app/llms.txt/route.ts`, `docs/linkedin-profile.md` decían Full Stack Developer desde agosto de 2025; el propietario aclara Frontend Developer desde septiembre de 2025 | Corregir el puesto vigente y preparar, sin publicar antes de noviembre, el ascenso independiente | **ACTUAL CORREGIDO; ASCENSO PENDIENTE DE FECHA Y PUBLICACIÓN** |
| A3 | P1 · `hreflang` de un futuro artículo monolingüe podía apuntar a una traducción inexistente | `app/[locale]/blog/[slug]/page.tsx` usaba `alternatesFor` sin comprobar traducción, aunque calculaba `hasTranslation` para el enlace visible | Emitir alternates solo de idiomas publicados para cada artículo | **IMPLEMENTADO; PRUEBA UNITARIA DE ARTÍCULO PUBLICADO Y TRADUCCIÓN BORRADOR** |
| A4 | P2 · fechas de sitemap de páginas inalteradas parecían nuevas en cada generación | `app/sitemap.ts` usaba `new Date()` cuando no recibía fecha | Omitir `lastModified` cuando se desconoce; conservar fecha de artículos publicados | **IMPLEMENTADO; SITEMAP LOCAL 200 E IDÉNTICO A LA VERSIÓN ANTERIOR** |
| A5 | P1 · el CV público debe seguir mostrando el puesto actual antes de noviembre | `public/cv/*`, `/[locale]/cv`; PDFs estáticos no cambian solos en la fecha | Regenerar PDFs vigentes tras corregir puesto; preparar material del nuevo cargo para publicación posterior | **PDFs ACTUALES REGENERADOS; ASCENSO PENDIENTE** |
| A6 | P2 · backlinks, CWV de campo y menciones/citas en IA no son verificables desde este repo | No se aportó Search Console, CrUX ni índice de backlinks | Documentar línea base desconocida, medición y estrategia editorial legítima; no atribuir ganancias | **DOCUMENTADO; MÉTRICAS EXTERNAS PENDIENTES** |

## Afirmaciones IDN y límites

`docs/audit/CONTENT_VERIFICATION.md` ya documenta el retiro de “359 pruebas automatizadas” y de “agentes sobre LlamaStack” como arquitectura vigente. `data/projects.*.json` atribuye la tesis en coautoría, describe el gateway compatible con OpenAI y etiqueta la corrida de 972 aprobadas/28 omitidas/92,6 % como **documentada en el repositorio**, no ejecutada en esta auditoría. `test/consistency.test.ts` protege contra las dos afirmaciones retiradas. No se cambiará esa evidencia sin revisar el repositorio de la tesis.

## Límites de la auditoría

- HTTP 200, HTML rastreable y metadata de producción pueden verificarse sin deploy; el código nuevo solo podrá probarse localmente hasta que el propietario autorice publicar.
- No hay acceso autorizado a Search Console, PageSpeed Insights con datos privados, paneles analíticos ni cuentas externas. Indexación, CTR, backlinks y citas en asistentes quedan **no verificados**.
- WebMCP no es un servidor MCP ni un factor de ranking demostrado. La prueba real de descubrimiento exige Chromium compatible con la bandera experimental.

## Verificación final local

`pnpm test` pasó 117/117; `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build` pasaron; `pnpm test:e2e` pasó 11/11 con Chrome 156, incluidas invocaciones WebMCP nativas y la degradación sin API. Una prueba de resultados verifica que el artículo publicado EN y su traducción borrador ES generan solo la URL EN, `x-default` válido, fecha de actualización correcta y resultado estable. El sitemap local respondió 200 con 34 URLs; su XML fue idéntico antes y después del refactor y no añadió `<lastmod>` ficticios porque actualmente no hay artículos publicados. La API pública de PageSpeed devolvió 429; Lighthouse 13.6.0 sí corrió en producción y localhost, con condiciones no comparables, detalladas en `docs/SEO_GEO_METRICS.md`.

La verificación independiente encontró que claves heredadas del prototipo, como `toString`, atravesaban la lista cerrada de navegación WebMCP. Se reprodujo el fallo, se exigió propiedad propia con `Object.hasOwn` y la prueba nativa confirmó `not_found` sin navegar. La verificación en copia aislada aprobó el resto de S1–S6; una prueba que depende del historial Git se omitió solo allí porque la copia no incluía `.git` (en el repositorio real pasó).
