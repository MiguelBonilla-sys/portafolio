# Plan de implementación

> Base: `docs/audit/INITIAL_AUDIT.md` (2026-10-23). Orden: primero lo que corrige veracidad y criterios de aceptación, después lo que mejora presentación.
> Regla transversal: no se agrega ningún dato que no esté en el repositorio, en `PRODUCT.md` (CV de agosto 2026) o en un repositorio verificable. Lo que no se puede verificar se conserva sin adornos y se registra en `CONTENT_VERIFICATION.md`.

| # | Cambio | Hallazgos | Depende de | Riesgo | Criterio de aceptación |
|---|---|---|---|---|---|
| 1 | Modelo de datos de proyecto: `status` (lista cerrada), `role`, `period` y `caseStudy` opcional; tipos en `types/index.ts` | A-02, A-07, A-08 | — | Bajo | `tsc` limpio; cada proyecto tiene un `status` válido en ambos idiomas |
| 2 | Corregir veracidad de proyectos: quitar "Producción" sin evidencia, sacar Sentinel RAG de destacados, actualizar el detector IDN (coautoría, gateway LLM, pruebas), declarar API Auth Gateway como hackatón | A-02, A-03, A-04 | 1 | Medio (toca hechos) | Ninguna etiqueta de producción sin URL/repo; cambios listados en `CONTENT_VERIFICATION.md` |
| 3 | Agregar el propio portafolio + Content Engine como proyecto destacado (repo público, tests verificables) | A-07 | 1 | Bajo | Ficha con repo, demo y tests reales |
| 4 | Hero y metadata con el posicionamiento "Full Stack Engineer · Python, React & AI Systems"; mismo titular en OG, JSON-LD, llms.txt y CV web | A-06 | — | Bajo | Titular idéntico en las 6 superficies; sin "Senior", "expert" ni "production-ready AI" |
| 5 | Sección de proyectos en dos niveles: destacados (tarjetas con problema, aporte, 4 tecnologías, estado) y "Otros proyectos y archivo académico" (lista compacta) | A-07 | 1, 2 | Bajo | Todos los proyectos siguen enlazados; destacados primero |
| 6 | Plantilla de caso de estudio (`components/project/CaseStudy.tsx`): Overview, Problem, Role, Architecture (diagrama de flujo en HTML/CSS), Decisions, Challenges, Testing, Results, Limitations; solo se renderizan secciones con contenido | A-08 | 1 | Bajo | Un proyecto sin `caseStudy` sigue mostrando la ficha actual sin secciones vacías |
| 7 | Contenido de casos de estudio de los 4 destacados, trazable a su repo; Bikans en términos generales (cliente) | A-03, A-05, A-08 | 6 | Medio | Cada afirmación técnica tiene fuente en `CONTENT_VERIFICATION.md` |
| 8 | CTA de contacto y CV al final de cada proyecto; "Otros proyectos" muestra los destacados | A-20 | 6 | Bajo | Desde cualquier proyecto se llega a contacto en 1 clic |
| 9 | Stack en 6 áreas con tecnologías principales y secundarias; sin barras ni niveles | A-09 | — | Bajo | Ninguna tecnología nueva; las principales tienen proyecto que las respalde |
| 10 | Experiencia: tecnologías por cargo; tesis declarada en equipo | A-10, A-03 | — | Bajo | Sin cambios de cargos, fechas ni empleadores |
| 11 | Overflow a 320 px en la barra | A-11 | — | Bajo | 0 px en 320–1920 |
| 12 | `<aside>` → contenedor sin landmark | A-12 | 6 | Bajo | axe sin `landmark-complementary-is-top-level` |
| 13 | SEO: `og:image` y `og:url` en todas las páginas, 404 con `noindex` y título propio, JSON-LD de proyecto según tenga repo | A-15, A-16, A-17, A-18 | — | Bajo | Playwright: og:image/og:url en 18/18 rutas; 404 con un solo robots `noindex` |
| 14 | Formulario: `maxLength` en campos | A-19 | — | Bajo | Validación sin regresiones |
| 15 | Pruebas: integridad de contenido ES/EN en `pnpm test`; E2E con `playwright-core` (`pnpm test:e2e`) para rutas, overflow, menú móvil, cambio de idioma y 404 | A-22 | 1–14 | Bajo | Ambas suites pasan localmente |
| 16 | Regenerar los PDF del CV para que coincidan con la página `/cv` | A-02, A-06 | 2, 4 | Medio (documento oficial) | PDF generado desde el build final |
| 17 | Documentación final (`CHANGES_IMPLEMENTED`, `CONTENT_VERIFICATION`, `FINAL_REPORT`) | — | todo | — | Pruebas ejecutadas y resultados registrados |

## Fuera de alcance (decisiones del dueño)

- Limpiar el repo `API_AUTH_HACKATON` (A-01): esta sesión no tiene permiso de escritura sobre él y requiere reescribir historial.
- Confirmar o retirar Sentinel RAG, LedgerCore y TaskFlow (A-02).
- Confirmar el número de pruebas de la tesis y el 2FA de Bikans (A-03, A-05).
- Despliegue a producción y reindexación (IndexNow, Search Console).
