# Medición SEO, GEO, AEO y WebMCP

**Corte:** 2026-10-30. Solo se registran datos observados. La versión final es una build local, **no producción**; no hay serie temporal ni una puntuación inventada de autoridad o visibilidad en IA.

| Métrica | Estado inicial | Estado final local | Método y límite |
| --- | --- | --- | --- |
| Rutas EN/ES, sitemap, robots, llms | HTTP 200 en producción; `/` termina en `/es` | `/es`, `/en`, `/en/blog`, caso Bikans, sitemap, robots y llms: HTTP 200 local; sitemap con 34 URLs | `curl -L`, build y E2E; no implica indexación ni verifica el nuevo código en producción |
| Canonical, `hreflang`, OG y JSON-LD | Ya presentes en el código anterior | Corrección de artículos monolingües y fechas de sitemap | Pruebas unitarias/E2E; JSON-LD semántico requiere revisión externa adicional |
| Artículos publicados | 0 (un borrador por idioma) | 0; ningún borrador publicado | Frontmatter `draft` y catálogo del blog |
| Herramientas WebMCP | 0 | 6 registrables en tres contextos; 6 invocadas o verificadas en Chrome 156 local | `e2e/webmcp.test.mjs`, API nativa con bandera; no representa otros navegadores |
| Éxito de invocaciones WebMCP | No aplica | Pruebas locales exitosas, sin tasa de uso real | E2E; una muestra de laboratorio no es una tasa de producción |
| Errores de validación | No aplica | Rechazo de entradas inválidas comprobado en tests | No hay telemetría de invocaciones reales |
| Rendimiento de WebMCP | No aplica | Sin medición comparable antes/después | Hook ligero, pero no se afirma mejora de CWV; medir tras deploy |
| Indexación, impresiones, CTR, posición por consulta y errores de rastreo | No verificado | No verificado | Requiere Search Console/Bing Webmaster Tools autorizados |
| Lighthouse móvil `/en` (laboratorio) | Producción: Performance 100, Accessibility 100, SEO 100; LCP 1,1 s, CLS 0,001, TBT 10 ms | Build local: Performance 100, Accessibility 100, SEO 92; LCP 0,8 s, CLS 0, TBT 0 ms | Lighthouse 13.6.0, Chrome 156, 2026-10-30. **No comparar como mejora:** producción HTTPS/red real frente a localhost; el 92 local es únicamente canonical de producción apuntado desde localhost, correcto para el deploy. INP no aparece en este laboratorio |
| LCP, CLS, INP de campo | No verificado | No verificado | Requiere CrUX/PageSpeed con muestra suficiente o RUM autorizado. La API pública de PageSpeed respondió HTTP 429 (cuota diaria), sin medición |
| Dominios de referencia | No verificado | No verificado | Requiere índice de backlinks autorizado; no se infiere desde el código |
| Menciones y citas de asistentes a URLs concretas | No verificado | No verificado | Evaluación manual fechada por asistente/consulta; distinguir respuesta correcta de enlace citado |
| Exactitud del perfil público | Cargo/fecha de Coordenadas contradichos por corrección del propietario | Development Lead vigente y Frontend Developer septiembre 2025–octubre 2026; sin resultados ni responsabilidades ya cumplidas | Pruebas de consistencia, CV PDF y `get_professional_profile`; confirmar de nuevo con el empleador tras el 1 de noviembre |

## Seguimiento recomendado

1. Tras un deploy autorizado, comprobar HTTP 200, canonical y JSON-LD en producción; repetir Rich Results Test y `validator.schema.org` para páginas relevantes.
2. Con acceso autorizado a Search Console, registrar una línea base mensual por URL y consulta: indexación, impresiones, CTR y errores. Comparar periodos equivalentes; no atribuir causalidad automáticamente.
3. Medir Core Web Vitals de campo (LCP, INP, CLS) y Lighthouse móvil con misma URL, dispositivo y condiciones antes/después. Sin línea base comparable, informar solo el valor observado.
4. Registrar de forma voluntaria una pequeña matriz de consultas profesionales ES/EN: asistente, fecha, pregunta, respuesta, cita URL y exactitud. No convertirla en un “AI visibility score”.
5. Cuando WebMCP esté en un navegador compatible de usuarios reales, medir descubrimiento, invocación, error y duración con consentimiento y sin guardar contenido del formulario.
