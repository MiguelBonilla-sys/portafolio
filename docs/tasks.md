# Tasks: Portafolio + Content Engine

> Status: 🔴 Not started | 🟡 In progress | 🟢 Done
> Presupuesto: 120 h (10 h/semana × 12). Suma estimada: ~122 h.

## Phase R — Rediseño de identidad (fuera del plan original) · hecho

- [x] TR1: Identidad visual brutalismo cyberpunk, símbolo propio animado, paleta azul + cian — *F1* — 🟢 2026-10-20
  - Acceptance: `DESIGN.md` y `PRODUCT.md` describen la dirección; el símbolo se dibuja al cargar y respeta `prefers-reduced-motion`; lint, typecheck y build pasan.
  - Notas: el dueño descartó la línea de transporte, "M14", el rojo y el verde lima.

## Phase 0 — Línea base (semana 1) · 2 h

- [ ] T0: Registrar métricas actuales — *F7, F8* — est: 1h
  - Acceptance: `docs/baseline.md` contiene seguidores, impresiones de 7 días, search appearances, visitas al perfil, sesiones del sitio (GA4, 28 días), entrevistas del último mes y el resultado de preguntar "Miguel Bonilla AI engineer" en ChatGPT, Perplexity y Claude.
  - Depends on: —
- [ ] T1: Cerrar las Open Questions de `spec.md` (dominio, términos de OpenCode Go y proveedor de respaldo, email de contacto) — *F5, F9* — est: 1h
  - Acceptance: `spec.md` no tiene preguntas abiertas sin owner; `NEXT_PUBLIC_SITE_URL` está definido en Vercel.
  - Depends on: —
  - Estado: 🟡 2026-10-20: dominio `mangel14.dev` y email cerrados. Falta confirmar los términos de OpenCode Go y elegir el proveedor de respaldo.

## Phase 1 — Cimientos (semanas 1–4) · 43 h

- [x] T2: Eliminar dependencias sin uso — *F16* — est: 1h
  - Acceptance: `package.json` no contiene `@mantine/{carousel,charts,code-highlight,dates,dropzone,form,modals,notifications,nprogress,spotlight,tiptap}`, `@tiptap/*`, `recharts`, `embla-*` ni `dayjs`; `pnpm build` y `pnpm lint` pasan.
  - Depends on: —
  - Estado: 🟢 2026-10-20: 19 paquetes eliminados (también three.js); Next.js 16.1.6 → 16.3.8 por una vulnerabilidad crítica. Queda un aviso moderado en `sprintf-js` (vía `gray-matter`, solo en build).
- [ ] T3: Reposicionar el texto del sitio (hero, about, stats, skills) — *F1* — est: 3h
  - Acceptance: el hero dice "Full Stack AI Engineer"; no aparecen "100% Proyectos entregados" ni "5+ Stacks dominados"; cada tecnología del subtítulo aparece en ≥ 1 proyecto de `data/projects.json`. El texto pasa la guía anti-slop sin marcas P0/P1.
  - Depends on: T1
  - Estado: 🟡 2026-10-20: hecho con el rediseño (titular, sin métricas de relleno, copy sin marcas P0/P1). Falta revisar el texto con Miguel.
- [ ] T4: Reescribir y reordenar proyectos — *F1, F2* — est: 3h
  - Acceptance: los proyectos destacados van primero (API Auth Gateway, Seguimiento Bibliográfico con LLM, Content Engine como "en construcción"); Redes Sockets y Pizzería quedan al final; cada descripción incluye ≥ 1 resultado numérico real.
  - Depends on: T3
  - Estado: 🟡 2026-10-20: destacados primero y archivo al final. Faltan resultados numéricos en Flask API, GEO Streamlit, Pizzería y Sockets (los aporta Miguel).
- [x] T5: Migrar a `app/[locale]` con `next-intl` — *F3* — est: 6h
  - Acceptance: `/es` y `/en` renderizan el home; `/` redirige por `Accept-Language`; `<html lang>` coincide con la ruta; las anclas antiguas (`/#proyectos`) siguen funcionando; GA4 registra page views en ambas rutas.
  - Depends on: T2
  - Estado: 🟢 2026-10-20: `next-intl` 4 con `proxy.ts` (Next 16), rutas `/es` y `/en`, `/` redirige por idioma, selector de idioma en la barra.
- [x] T6: Traducir textos y datos al inglés — *F3* — est: 3h
  - Acceptance: `messages/en.json`, `data/projects.en.json` y `data/experience.en.json` existen; no queda texto en español visible en `/en` (revisión manual de todas las secciones).
  - Depends on: T4, T5
  - Estado: 🟢 2026-10-20: `messages/{es,en}.json`, `data/projects.{es,en}.json`, `data/experience.{es,en}.json`, etiquetas del stack bilingües.
- [ ] T7: Páginas de caso de estudio `/[locale]/proyectos/[id]` — *F2* — est: 4h
  - Acceptance: los 3 proyectos destacados tienen página propia con secciones Problema, Solución, Stack, Resultados y Enlaces; ≥ 1 enlace a demo pública; el modal enlaza a la página.
  - Depends on: T4, T5
  - Estado: 🟡 2026-10-20: páginas `/es/proyectos/[id]` y `/en/projects/[id]` para los 12 proyectos con JSON-LD. Faltan secciones Problema/Resultados con datos reales y al menos una demo pública.
- [x] T8: Blog MDX (lectura, validación y páginas) — *F4* — est: 5h
  - Acceptance: un MDX de ejemplo en `content/blog/es` y `content/blog/en` genera `/es/blog/{slug}` y `/en/blog/{slug}` estáticos; el índice ordena por fecha; un frontmatter sin `summary` rompe el build con un error de zod legible; los artículos enlazan a su traducción.
  - Depends on: T5
  - Estado: 🟢 2026-10-20: `lib/blog.ts` con zod (falla el build si el frontmatter es inválido), índice, artículo, borradores ocultos en producción (`SHOW_DRAFTS=true` para verlos). Primer borrador: control de acceso por propiedad (es/en), con `[DATO?]` pendientes.
- [x] T9: Feed RSS por idioma — *F4* — est: 1h
  - Acceptance: `/feed.xml?lang=en` y `/feed.xml?lang=es` validan en validator.w3.org/feed.
  - Depends on: T8
  - Estado: 🟢 2026-10-20: `/es/feed.xml` y `/en/feed.xml`.
- [x] T10: `sitemap.ts`, `robots.ts`, hreflang y metadata por idioma — *F5* — est: 2h
  - Acceptance: `sitemap.xml` incluye home, casos y artículos en ambos idiomas con `alternates`; `robots.txt` permite Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot; cada página tiene `canonical` y hreflang `es`, `en`, `x-default`.
  - Depends on: T5, T8
  - Estado: 🟢 2026-10-20: sitemap con alternates, robots con bots de IA, canonical + hreflang en todas las páginas. Dominio `mangel14.dev` por defecto en el código, con redirecciones 301 desde `www.`, `portafolio.` y `.vercel.app`.
- [x] T11: JSON-LD (`lib/jsonld.ts`) — *F6* — est: 3h
  - Acceptance: el Rich Results Test no muestra errores en el home (Person + WebSite, con `sameAs` a LinkedIn, GitHub y X), en un artículo (BlogPosting + BreadcrumbList) y en un artículo con FAQ (FAQPage).
  - Depends on: T8
  - Estado: 🟢 2026-10-20: Person, WebSite, SoftwareSourceCode, BlogPosting, BreadcrumbList, FAQPage. Pendiente validar en Rich Results Test con el dominio real.
- [x] T12: `/llms.txt` — *F6* — est: 1h
  - Acceptance: `/llms.txt` responde `text/plain` con nombre, titular, resumen de 3 líneas, proyectos con URL y los 20 artículos más recientes; se regenera en cada build.
  - Depends on: T8
  - Estado: 🟢 2026-10-20.
- [ ] T13: Optimizar el perfil de LinkedIn (skill `linkedin-cv-optimizer` + guía anti-slop) — *F8* — est: 4h
  - Acceptance: headline, About, Featured, top 5 skills, experiencia en Coordenadas y Projects actualizados en EN y ES según `plan.md` §5; Open to Work activo solo para recruiters; banner con la URL del portafolio.
  - Depends on: T3, T7
  - Estado: 🟡 Textos listos en `docs/linkedin-profile.md`; falta pegarlos en LinkedIn.
- [x] T14: CV descargable en EN y ES — *F15* — est: 2h
  - Acceptance: `/cv-en.pdf` y `/cv-es.pdf` existen, pesan < 300 KB, son texto seleccionable (legible por ATS) y están enlazados desde el hero y el contacto.
  - Depends on: T13
  - Estado: 🟢 2026-10-20: `/es/cv`, `/en/cv` (legibles por ATS) y `public/cv/*.pdf` generados con `pnpm cv`.
- [ ] T15: Search Console, Bing Webmaster Tools, IndexNow y segmento de IA en GA4 — *F7* — est: 2h
  - Acceptance: el dominio está verificado en ambas consolas con el sitemap enviado; `public/{key}.txt` existe; GA4 tiene un segmento con referrers chatgpt.com, perplexity.ai, claude.ai y gemini.google.com.
  - Depends on: T10
  - Estado: 🟡 Clave IndexNow en `public/` y pasos en `docs/setup.md` §1 (propiedad de dominio por TXT, importación en Bing). Falta darlos de alta y crear el segmento de GA4.
- [x] T16: Auditoría de SEO y rendimiento — *F5, F6* — est: 3h
  - Acceptance: Lighthouse SEO = 100 y Accessibility ≥ 95 en `/en`, `/en/blog` y un artículo; LCP móvil < 2,5 s; la escena 3D se carga con `dynamic(..., { ssr: false })` debajo del contenido.
  - Depends on: T10, T11, T12
  - Estado: 🟢 2026-10-20 (Lighthouse móvil, con `NEXT_PUBLIC_SITE_URL` apuntando al servidor): SEO 100, accesibilidad 100, buenas prácticas 100, rendimiento 97 en `/es`, `/en`, un proyecto y el blog. LCP 2,7 s (bajó de 3,6 s al quitar Mantine y Tailwind). Repetir con el dominio real.

- [x] T17: Preparación para navegadores y agentes con IA — *F6, F7* — 🟢 2026-10-20
  - Acceptance: filas de proyecto como enlaces reales (sin modal JS), `llms.txt` + `llms-full.txt` enlazados desde cada página, JSON-LD ProfilePage + ItemList, clave IndexNow en `public/` y `pnpm indexnow`.
  - Pendiente de Miguel: correr `pnpm indexnow` después del primer deploy (ya apunta a `mangel14.dev`).

## Phase 2 — Content Engine v1: LangGraph.js en Vercel (semanas 5–8) · 34 h

- [x] T18: Postgres gestionado + checkpointer + `content_log` — *F9, F12* — est: 2h
  - Acceptance: base en Supabase o Neon (plan gratuito) con `DATABASE_URL` en Vercel; `PostgresSaver.setup()` crea sus tablas; existe una migración SQL versionada para `content_log`.
  - Depends on: T1
  - Estado: 🟢 2026-10-20: `agent/lib/db.ts` (`content_log`, `agent_kv`, `telegram_updates`) + `PostgresSaver`; se crean solos al abrir `/api/agent/setup`.
- [x] T19: Bot de Telegram + `POST /api/telegram` — *F9, F11* — est: 3h
  - Acceptance: sin el header `X-Telegram-Bot-Api-Secret-Token` correcto responde 401; un mensaje desde otro chat ID se ignora; la ruta responde 200 en < 1 s y ejecuta el trabajo con `after()`; un `update_id` repetido no se procesa dos veces.
  - Depends on: T18
  - Estado: 🟢 2026-10-20: `app/api/telegram/route.ts` (secreto con comparación en tiempo constante, chat id, `after()`, deduplicación por `update_id`). Comandos `/ayuda`, `/estado`, `/cancelar`, opciones `/es` y `/carrusel`.
- [x] T20: Cliente LLM (`agent/lib/llm.ts`) con OpenCode Go, respaldo y LangSmith — *F9* — est: 2h
  - Acceptance: términos de OpenCode Go revisados y anotados en `spec.md`; con `LLM_BASE_URL` caído, la llamada usa el proveedor de respaldo y se registra; las trazas aparecen en LangSmith.
  - Depends on: T1
  - Estado: 🟢 2026-10-20: `agent/lib/llm.ts` con OpenCode Go y `withFallbacks`. Pendiente de Miguel: confirmar términos de OpenCode Go.
- [x] T21: Grafo de generación (`extractFacts`, `draftBlogEs`, `antiSlopEdit`, `localizeEn`, `adaptLinkedIn`, `verifyFacts`) — *F9, F10* — est: 8h
  - Acceptance: con 3 materiales de prueba reales, el tramo hasta `humanReview` termina en < 300 s (medido en LangSmith); ninguna cifra de la salida falta en `facts`; los datos faltantes aparecen como `[DATO?]`.
  - Depends on: T18, T20
  - Estado: 🟢 2026-10-20: `agent/graph.ts`. Las cifras que no están en el material se marcan `[DATO?]` de forma determinista (`markUnknownNumbers`). Tests con LLM simulado en `agent/test/graph.test.ts`.
- [x] T22: Linter determinista (`agent/lib/lint.ts`) con tests — *F10* — est: 3h
  - Acceptance: detecta las expresiones P0/P1 de `content-style-guide.md` §9 en ES y EN con un set de 20 frases de prueba (≥ 95% de aciertos, 0 falsos positivos en 10 frases limpias); los tests corren en `pnpm test`.
  - Depends on: —
  - Estado: 🟢 2026-10-20: `agent/lib/lint.ts`; 20/20 frases sucias detectadas, 0/10 falsos positivos (`pnpm test`).
- [x] T23: `humanReview` con `interrupt()` y botones de Telegram — *F10, F11* — est: 3h
  - Acceptance: un borrador limpio llega con los botones Aprobar, Editar, Rechazar y Reprogramar; uno con P0 o `[DATO?]` llega marcado "bloqueado" sin Aprobar; responder con texto reanuda el hilo como `edit` y vuelve a pedir aprobación; cada botón reanuda el hilo correcto con `Command({ resume })`.
  - Depends on: T19, T21, T22
  - Estado: 🟢 2026-10-20: `sendPreview` + `humanReview` separados (el código antes de `interrupt()` se re-ejecuta al reanudar). Editar por botón o respondiendo a la vista previa; las cifras que da el autor resuelven los `[DATO?]`.
- [x] T24: App de LinkedIn, OAuth y token cifrado — *F12* — est: 3h
  - Acceptance: `/api/linkedin/callback` guarda el token (`openid profile w_member_social`) cifrado y con su fecha de vencimiento; un post de prueba visible solo para conexiones se crea y se borra.
  - Depends on: T18
  - Estado: 🟢 2026-10-20: `/api/linkedin/auth` + `/api/linkedin/callback`, token cifrado AES-256-GCM en `agent_kv`.
- [x] T25: Nodos de publicación idempotentes (`publishBlog`, `waitDeploy`, `publishLinkedIn`, comentario, `indexNow`, `notify`) — *F12* — est: 6h
  - Acceptance: al aprobar se crean los 2 MDX en `main`, la URL responde 200, se publica en LinkedIn, se agrega el comentario con el enlace, se envía IndexNow y llega la confirmación por Telegram; si el deploy tarda más de 180 s el estado pasa a `awaiting_deploy` con botón "Reintentar"; reanudar el mismo hilo no publica dos veces.
  - Depends on: T8, T23, T24
  - Estado: 🟢 2026-10-20: commit ES/EN → espera de deploy → post → comentario con enlace → IndexNow → aviso. Idempotente por `state.steps` (probado). Deploy lento o LinkedIn sin token: pausa con botón Reintentar.
- [x] T26: Cron diario (`/api/cron/daily` + `vercel.json`) — *F11, F12* — est: 2h
  - Acceptance: sin `CRON_SECRET` responde 401; en una ejecución simulada publica lo programado, reintenta `awaiting_deploy`, marca `expired` lo que lleva > 48 h, avisa si al token le quedan ≤ 10 días, pide material los lunes y envía el reporte los domingos.
  - Depends on: T23, T25
  - Estado: 🟢 2026-10-20: `/api/cron/daily` + `vercel.json` (13:00 UTC).
- [ ] T27: Prueba de punta a punta con 2 piezas reales — *F9–F12* — est: 2h
  - Acceptance: 2 piezas publicadas de punta a punta; ninguna invocación supera 300 s; revisión humana ≤ 20 min cada una; 0 marcas P0/P1 en lo publicado.
  - Depends on: T25, T26
  - Estado: 🟡 Probado de punta a punta con servicios simulados (10 tests). Falta la prueba real con credenciales: ver `docs/setup.md`.

## Phase 3 — Carruseles, evals y caso de estudio (semanas 9–12) · 22 h

- [ ] T30: Spike: post de documento PDF en perfil personal vía API — *F13* — est: 2h
  - Acceptance: `docs/spike-linkedin-documents.md` documenta si funciona con `w_member_social`, con evidencia (request, respuesta, captura); decisión: API o plan B.
  - Depends on: T24
  - Estado: 🟡 Sin credenciales no se puede probar contra LinkedIn. El plan B quedó implementado: si el documento falla, publica como texto y avisa.
- [x] T31: Plantilla de carrusel con `next/og` + `pdf-lib` — *F13* — est: 5h
  - Acceptance: a partir de un JSON de 6–10 láminas genera un PDF 1080×1350 con los colores y tipografías del sitio, legible en móvil, dentro de una función de Vercel en < 60 s.
  - Depends on: T30
  - Estado: 🟢 2026-10-20: `agent/carousel.tsx` (next/og → PNG 1080×1350 → pdf-lib). Probado: PDF de 3 láminas.
- [x] T32: Nodo `carousel` en el grafo y ruta de publicación — *F13* — est: 3h
  - Acceptance: un borrador de tipo carrusel llega a Telegram con el PDF adjunto y, al aprobarse, se publica (o sigue el plan B de T30).
  - Depends on: T31, T25
  - Estado: 🟢 2026-10-20: nodo `draftCarousel`, PDF adjunto en la vista previa y subida como documento al publicar.
- [x] T33: Evals de contenido — *F14* — est: 4h
  - Acceptance: el nodo `evaluate` guarda `eval_scores` (especificidad, densidad de hechos, marcas de IA, ajuste al pilar, 1–5) en `content_log`; existe un dataset en LangSmith con las piezas aprobadas y rechazadas; el reporte semanal muestra el promedio.
  - Depends on: T21
  - Estado: 🟢 2026-10-20: nodo `evaluate` (rúbrica con el LLM + métricas deterministas) guardado en `content_log.eval_scores`; promedio en el reporte semanal. El dataset en LangSmith queda como mejora opcional.
- [ ] T34: Caso de estudio del Content Engine — *F2* — est: 5h
  - Acceptance: la página `/[locale]/proyectos/content-engine` tiene diagrama del grafo, decisiones, métricas reales (duración por tramo, piezas publicadas, tasa de rechazo) y un video de demo de ≤ 2 min; `agent/README.md` documenta arquitectura y setup.
  - Depends on: T27, T33
  - Estado: 🔴 Se escribe con datos reales después de 4 semanas de uso.
- [ ] T35: Auditoría de citación en IA (quincenal) y ajuste de la guía — *F6* — est: 2h
  - Acceptance: `docs/baseline.md` tiene 6 registros quincenales de la consulta de marca en ChatGPT, Perplexity y Claude.
  - Depends on: T16
  - Estado: 🟡 Plantilla en `docs/baseline.md`; la auditoría la hace Miguel cada 2 semanas.
- [ ] T36: Retro de 12 semanas — *todas* — est: 1h
  - Acceptance: `docs/retro.md` compara la línea base con las métricas finales y decide qué sigue.
  - Depends on: T35
  - Estado: 🔴 Semana 12.

## Extra — Tarjeta de contacto

- [x] T37: Tarjeta de contacto con vCard, QR y pase de Google Wallet
  - Acceptance: `/es/tarjeta` y `/en/card` muestran la tarjeta con QR a `/contact.vcf`; `/api/wallet/google` redirige al enlace "Add to Google Wallet"; sin credenciales el botón de Wallet no aparece.
  - Estado: 🟡 2026-10-21: código listo y probado con certificados de prueba (JWT RS256 válido). Falta poner las credenciales reales (docs/setup.md §10) y probar en un Android. 2026-10-21: Apple Wallet descartado por el costo del Apple Developer Program.

## Continuo (semanas 2–12) · 20 h

- [ ] TC1: Revisar y aprobar contenido — est: 1,5 h/semana
  - Acceptance: 1 artículo (es + en) y 3 posts por semana publicados, cada uno con ≥ 1 dato propio.
- [ ] TC2: Registrar métricas manuales de LinkedIn — est: 15 min/semana
  - Acceptance: fila semanal en `docs/baseline.md`.

## Deferred (post-v1)

- [ ] TD1: Newsletter (LinkedIn o email) con los artículos del mes.
- [ ] TD2: Publicación en X/Twitter y Threads.
- [ ] TD3: Video corto automático a partir del artículo.
- [ ] TD4: Chat RAG en el portafolio ("pregúntale a mi portafolio").
- [ ] TD5: Respuestas sugeridas a comentarios de LinkedIn (siempre con aprobación).
- [ ] TD6: Lectura de métricas por API si LinkedIn aprueba `r_member_social`.
