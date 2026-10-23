# Fase 2 · Reporte final

> Fecha: 2026-10-23 · Rama: `ccr-82e185fe-xk2i5l` (incluye la fase 1, aún sin fusionar en `main`).
> Documentos: [estado inicial](INITIAL_STATE.md) · [seguridad](SECURITY_REMEDIATION.md) · [Content Engine](CONTENT_ENGINE.md) · [política editorial](EDITORIAL_POLICY.md) · [SEO/GEO](SEO_GEO.md) · [motor visual](VISUAL_ENGINE.md) · [Hyperframes](HYPERFRAMES.md) · [perfil de LinkedIn](../linkedin-profile.md)

## 1. Resumen

- **Seguridad P0**: el repositorio del hackatón sigue exponiendo 25 cuentas con 2 contraseñas compartidas y un secreto JWT por defecto en sus 4 ramas. Hecho: rama con la corrección en ese repo (sin fusionar), procedimiento de purga probado en una copia local y enlace retirado del portafolio. **Pendiente del dueño**: rotar cuentas y secreto, fusionar y aprobar la purga.
- **Content Engine**: las variables ya estaban configuradas en producción, pero nunca publicó nada. Ahora acepta texto, Markdown, PDF, imágenes (con visión opcional) y URLs. Propone un enfoque antes de redactar y rastrea cada afirmación hasta su fuente. Versiona cada borrador con hash y aprueba blog y LinkedIn por separado. Puede quedar "publicado en parte" y revisa la página publicada. Telegram funciona con comandos y con conversación natural.
- **Seguridad del agente**: SSRF, firma de archivos, saneo de MDX, autorización por chat privado, candado por pieza, rate limiting, redacción de secretos y errores sin detalles internos.
- **SEO/GEO**: Twitter/X cards por página (antes heredaban la home), imagen OG por artículo generada con código, JSON-LD de artículo completo, 6 categorías sin páginas vacías, artículos y proyectos relacionados por relevancia, y una prueba de consistencia entre 11 superficies.
- **Visuales**: portadas, flujos, secuencias, comparaciones, barras y código, generados con código, sin texto cortado y con contraste verificado.
- **Hyperframes**: contrato de storyboard y composición HTML probados. No se renderizó ningún video.

## 2. Cambios por área

| Área | Archivos principales |
|---|---|
| Seguridad del repo del hackatón | `API_AUTH_HACKATON@security/remove-exposed-credentials` (`0f27b6f`), `data/projects.*.json` (`repoWithheld`), `content/blog/*` |
| Endurecimiento | `app/api/telegram/route.ts`, `app/api/cron/daily/route.ts`, `app/api/linkedin/callback/route.ts`, `app/api/agent/setup/route.ts`, `agent/lib/{safe-fetch,html,redact,mdx}.ts` |
| Entradas | `agent/inputs.ts` (+ dependencia `unpdf@1.8.1`), `agent/lib/telegram.ts` (`downloadFile`, `editMessage`, `sendPhoto`) |
| Estados y persistencia | `agent/editorial.ts`, `agent/lib/db.ts` (migración aditiva: versión, hash, eventos, candados, rate limit) |
| Grafo | `agent/graph.ts`, `agent/state.ts`, `agent/prompts.ts`, `agent/seo.ts` |
| Telegram | `agent/handlers.ts` |
| Linter | `agent/lib/lint.ts`, `docs/content-style-guide.md` §8b |
| Visuales | `agent/visuals/{scene,svg,render}.ts` |
| Video (preparación) | `agent/video/storyboard.ts` |
| Sitio | `lib/{site,blog,jsonld,taxonomy,card}.ts`, `app/[locale]/blog/**`, `i18n/routing.ts`, `messages/*.json` |
| LinkedIn | `docs/linkedin-profile.md`, `agent/lib/linkedin.ts` (`uploadImage`, errores redactados) |
| Pruebas | `agent/test/{graph,handlers,security,visuals}.test.ts`, `agent/test/helpers.ts`, `test/consistency.test.ts`, `e2e/smoke.test.mjs` |

## 3. Pruebas ejecutadas

Todas en esta sesión, sobre el código final:

| Comando | Resultado |
|---|---|
| `pnpm lint` | ✅ 0 problemas |
| `npx tsc --noEmit` | ✅ |
| `pnpm test` | ✅ 68/68 (16 al empezar la fase) |
| `pnpm build` | ✅ 56 páginas |
| `pnpm test:e2e` (Playwright, build de producción) | ✅ 7/7: 12 rutas con h1, OG y tarjeta de X propias; 0 px de desbordamiento en 7 anchos; menú móvil; idioma; casos de estudio; 404; formulario |
| axe-core, 20 rutas | ✅ 0 violaciones |
| Enlaces internos | ✅ todos 200 (404 solo donde se prueba el 404) |
| Build con borradores visibles | ✅ imagen OG del artículo 200 `image/png`; `BlogPosting`, Twitter cards, proyecto relacionado y CTA presentes |
| Visuales | ✅ 4 formatos PNG con medidas exactas; SVG revisados como imagen |

Cobertura por tipo en `pnpm test`:

| Archivo | Qué prueba |
|---|---|
| `graph.test.ts` (22) | Flujo completo; aprobación vieja rechazada; edición que solo toca lo pedido y dice qué cambió; solo blog / solo LinkedIn / publicación parcial; `[DATO?]` bloquea; PDF con cifras sin fuente; inyección en una URL; imagen sin visión; cancelar la propuesta; diagrama SVG publicado; deploy lento; LinkedIn reconectar / error / intento cortado; programación; carrusel; funciones puras |
| `handlers.test.ts` (9) | Ejemplos A–D del encargo, botón de versión anterior, comandos, autorización, update repetido, reenvíos, rate limit, intención |
| `security.test.ts` (11) | SSRF, HTML, firma de archivos, inyección, MDX compilado, path traversal, redacción, errores públicos, transiciones |
| `visuals.test.ts` (8) | Contraste, ajuste de texto, validación de escenas, SVG accesible, PNG por formato, SEO, linter, storyboard |
| `test/content.test.ts` (8) y `test/consistency.test.ts` (5) | Paridad ES/EN, estados con evidencia, repo retenido, consistencia entre canales |
| Linter y auth existentes (5) | Sin cambios |

## 4. Lo que no se probó

- Contra servicios reales: Telegram, GitHub, LinkedIn (Posts e Images API), el LLM de producción, Postgres y el webhook de producción. Esta sesión no tiene esos secretos, y el conector de Vercel respondió "User not found".
- El render de video: no hubo render, por diseño.
- Rich Results Test y validator.schema.org: necesitan una URL pública con un artículo publicado.

## 5. Pendientes del dueño

1. **Rotar** las contraseñas de las 25 cuentas y el `JWT_SECRET_KEY` de cualquier despliegue de `API_AUTH_HACKATON`. Después, fusionar `security/remove-exposed-credentials` y aprobar (o no) la purga del historial (`SECURITY_REMEDIATION.md` §1).
2. Probar el bot en producción: `/new` con una nota corta → aceptar la propuesta → «Solo blog» → revisar la página → publicar LinkedIn.
3. Opcional: definir `LLM_VISION_MODEL` para leer imágenes.
4. Pegar el perfil de `docs/linkedin-profile.md` y confirmar los datos marcados con †.
5. Las preguntas abiertas de la fase 1 siguen vigentes (`docs/audit/CONTENT_VERIFICATION.md` §6).

## 6. Limitaciones conocidas

- El bot habla solo español; el idioma del post de LinkedIn sí se elige.
- `safeFetch` no ejecuta JavaScript: una página que solo se renderiza en el cliente llega casi vacía (el bot lo avisa).
- PDF escaneados: sin OCR; el bot lo informa.
- LinkedIn no tiene clave de idempotencia: un intento cortado a la mitad pide confirmación manual en vez de reintentarse solo.
- Las páginas de categoría aparecerán cuando una categoría tenga 3 artículos publicados en ambos idiomas.
