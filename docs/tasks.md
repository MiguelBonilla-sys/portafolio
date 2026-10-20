# Tasks: Portafolio + Content Engine

> Status: 🔴 Not started | 🟡 In progress | 🟢 Done
> Presupuesto: 120 h (10 h/semana × 12). Suma estimada: ~122 h.

## Phase 0 — Línea base (semana 1) · 2 h

- [ ] T0: Registrar métricas actuales — *F7, F8* — est: 1h
  - Acceptance: `docs/baseline.md` contiene seguidores, impresiones de 7 días, search appearances, visitas al perfil, sesiones del sitio (GA4, 28 días), entrevistas del último mes y el resultado de preguntar "Miguel Bonilla AI engineer" en ChatGPT, Perplexity y Claude.
  - Depends on: —
- [ ] T1: Cerrar las Open Questions de `spec.md` (dominio, proveedor de LLM, email de contacto) — *F5, F9* — est: 1h
  - Acceptance: `spec.md` no tiene preguntas abiertas sin owner; `NEXT_PUBLIC_SITE_URL` está definido en Vercel.
  - Depends on: —

## Phase 1 — Cimientos (semanas 1–4) · 43 h

- [ ] T2: Eliminar dependencias sin uso — *F16* — est: 1h
  - Acceptance: `package.json` no contiene `@mantine/{carousel,charts,code-highlight,dates,dropzone,form,modals,notifications,nprogress,spotlight,tiptap}`, `@tiptap/*`, `recharts`, `embla-*` ni `dayjs`; `npm run build` y `npm run lint` pasan.
  - Depends on: —
- [ ] T3: Reposicionar el texto del sitio (hero, about, stats, skills) — *F1* — est: 3h
  - Acceptance: el hero dice "Full Stack AI Engineer"; no aparecen "100% Proyectos entregados" ni "5+ Stacks dominados"; cada tecnología del subtítulo aparece en ≥ 1 proyecto de `data/projects.json`. El texto pasa la guía anti-slop sin marcas P0/P1.
  - Depends on: T1
- [ ] T4: Reescribir y reordenar proyectos — *F1, F2* — est: 3h
  - Acceptance: los proyectos destacados van primero (API Auth Gateway, Seguimiento Bibliográfico con LLM, Content Engine como "en construcción"); Redes Sockets y Pizzería quedan al final; cada descripción incluye ≥ 1 resultado numérico real.
  - Depends on: T3
- [ ] T5: Migrar a `app/[locale]` con `next-intl` — *F3* — est: 6h
  - Acceptance: `/es` y `/en` renderizan el home; `/` redirige por `Accept-Language`; `<html lang>` coincide con la ruta; las anclas antiguas (`/#proyectos`) siguen funcionando; GA4 registra page views en ambas rutas.
  - Depends on: T2
- [ ] T6: Traducir textos y datos al inglés — *F3* — est: 3h
  - Acceptance: `messages/en.json`, `data/projects.en.json` y `data/experience.en.json` existen; no queda texto en español visible en `/en` (revisión manual de todas las secciones).
  - Depends on: T4, T5
- [ ] T7: Páginas de caso de estudio `/[locale]/proyectos/[id]` — *F2* — est: 4h
  - Acceptance: los 3 proyectos destacados tienen página propia con secciones Problema, Solución, Stack, Resultados y Enlaces; ≥ 1 enlace a demo pública; el modal enlaza a la página.
  - Depends on: T4, T5
- [ ] T8: Blog MDX (lectura, validación y páginas) — *F4* — est: 5h
  - Acceptance: un MDX de ejemplo en `content/blog/es` y `content/blog/en` genera `/es/blog/{slug}` y `/en/blog/{slug}` estáticos; el índice ordena por fecha; un frontmatter sin `summary` rompe el build con un error de zod legible; los artículos enlazan a su traducción.
  - Depends on: T5
- [ ] T9: Feed RSS por idioma — *F4* — est: 1h
  - Acceptance: `/feed.xml?lang=en` y `/feed.xml?lang=es` validan en validator.w3.org/feed.
  - Depends on: T8
- [ ] T10: `sitemap.ts`, `robots.ts`, hreflang y metadata por idioma — *F5* — est: 2h
  - Acceptance: `sitemap.xml` incluye home, casos y artículos en ambos idiomas con `alternates`; `robots.txt` permite Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot; cada página tiene `canonical` y hreflang `es`, `en`, `x-default`.
  - Depends on: T5, T8
- [ ] T11: JSON-LD (`lib/jsonld.ts`) — *F6* — est: 3h
  - Acceptance: el Rich Results Test no muestra errores en el home (Person + WebSite, con `sameAs` a LinkedIn, GitHub y X), en un artículo (BlogPosting + BreadcrumbList) y en un artículo con FAQ (FAQPage).
  - Depends on: T8
- [ ] T12: `/llms.txt` — *F6* — est: 1h
  - Acceptance: `/llms.txt` responde `text/plain` con nombre, titular, resumen de 3 líneas, proyectos con URL y los 20 artículos más recientes; se regenera en cada build.
  - Depends on: T8
- [ ] T13: Optimizar el perfil de LinkedIn (skill `linkedin-cv-optimizer` + guía anti-slop) — *F8* — est: 4h
  - Acceptance: headline, About, Featured, top 5 skills, experiencia en Coordenadas y Projects actualizados en EN y ES según `plan.md` §5; Open to Work activo solo para recruiters; banner con la URL del portafolio.
  - Depends on: T3, T7
- [ ] T14: CV descargable en EN y ES — *F15* — est: 2h
  - Acceptance: `/cv-en.pdf` y `/cv-es.pdf` existen, pesan < 300 KB, son texto seleccionable (legible por ATS) y están enlazados desde el hero y el contacto.
  - Depends on: T13
- [ ] T15: Search Console, Bing Webmaster Tools, IndexNow y segmento de IA en GA4 — *F7* — est: 2h
  - Acceptance: el dominio está verificado en ambas consolas con el sitemap enviado; `public/{key}.txt` existe; GA4 tiene un segmento con referrers chatgpt.com, perplexity.ai, claude.ai y gemini.google.com.
  - Depends on: T10
- [ ] T16: Auditoría de SEO y rendimiento — *F5, F6* — est: 3h
  - Acceptance: Lighthouse SEO = 100 y Accessibility ≥ 95 en `/en`, `/en/blog` y un artículo; LCP móvil < 2,5 s; la escena 3D se carga con `dynamic(..., { ssr: false })` debajo del contenido.
  - Depends on: T10, T11, T12

## Phase 2 — Content Engine v1 (semanas 5–8) · 35 h

- [ ] T18: VPS con Coolify: n8n, Langflow y PostgreSQL — *F9* — est: 4h
  - Acceptance: los tres servicios corren con HTTPS; Langflow exige `x-api-key`; n8n tiene autenticación; backup diario de PostgreSQL configurado.
  - Depends on: T1
- [ ] T19: Bot de Telegram + `wf-intake` — *F9* — est: 3h
  - Acceptance: un mensaje desde el chat ID de Miguel crea una fila `draft` en `content_log`; un mensaje desde otro chat se ignora; el cron del lunes 8:00 envía la solicitud de material.
  - Depends on: T18, T20
- [ ] T20: Esquema `content_log` — *F12* — est: 1h
  - Acceptance: la tabla existe con las columnas de `architecture.md`; hay una migración SQL versionada en el repo del pipeline.
  - Depends on: T18
- [ ] T21: Flujo de Langflow (extractor, redactor, editor, localizador, adaptador LinkedIn, verificador) — *F9, F10* — est: 8h
  - Acceptance: con 3 materiales de prueba reales, devuelve el JSON del contrato en ≤ 5 min; ninguna cifra de la salida falta en la lista del extractor; los textos faltantes aparecen como `[DATO?]`.
  - Depends on: T18
- [ ] T22: Linter determinista anti-slop (Code node de n8n) — *F10* — est: 3h
  - Acceptance: detecta todas las expresiones de las listas P0/P1 de `content-style-guide.md` en ES y EN con un set de 20 frases de prueba (≥ 95% de aciertos, 0 falsos positivos en 10 frases limpias).
  - Depends on: —
- [ ] T23: `wf-generate` + `wf-approve` — *F10, F11* — est: 3h
  - Acceptance: un borrador limpio llega a Telegram con los 4 botones; uno con P0 o `[DATO?]` llega marcado "bloqueado" sin Aprobar; sin respuesta en 48 h pasa a `expired`.
  - Depends on: T19, T21, T22
- [ ] T24: App de LinkedIn y OAuth — *F12* — est: 3h
  - Acceptance: el token con `openid profile w_member_social` está guardado como credencial de n8n; un post de prueba visible solo para conexiones se crea y se borra.
  - Depends on: T18
- [ ] T25: `wf-publish` — *F12* — est: 6h
  - Acceptance: al aprobar se crean los 2 MDX en `main`, la URL responde 200, se publica en LinkedIn, se agrega el comentario con el enlace, se envía IndexNow y llega la confirmación por Telegram; repetir la ejecución con el mismo `content_id` no publica dos veces.
  - Depends on: T8, T23, T24
- [ ] T26: `wf-token-check` + `wf-weekly-report` — *F12* — est: 2h
  - Acceptance: con un token simulado a 9 días de vencer llega el aviso; el domingo llega el resumen semanal.
  - Depends on: T24
- [ ] T27: Prueba de punta a punta con 2 piezas reales — *F9–F12* — est: 2h
  - Acceptance: 2 piezas publicadas de punta a punta; revisión humana ≤ 20 min cada una; 0 marcas P0/P1 en lo publicado.
  - Depends on: T25, T26

## Phase 3 — Carruseles, evals y caso de estudio (semanas 9–12) · 22 h

- [ ] T30: Spike: post de documento PDF en perfil personal vía API — *F13* — est: 2h
  - Acceptance: `docs/spike-linkedin-documents.md` documenta si funciona con `w_member_social`, con evidencia (request, respuesta, captura); decisión: API o plan B.
  - Depends on: T24
- [ ] T31: Plantilla de carrusel HTML + Gotenberg — *F13* — est: 5h
  - Acceptance: a partir de un JSON de 6–10 láminas genera un PDF 1080×1350 con los colores y tipografías del sitio, legible en móvil.
  - Depends on: T30
- [ ] T32: Nodo de carrusel en Langflow y ruta de publicación — *F13* — est: 3h
  - Acceptance: un borrador de tipo carrusel llega a Telegram con el PDF adjunto y, al aprobarse, se publica (o sigue el plan B de T30).
  - Depends on: T31, T25
- [ ] T33: Evals de contenido — *F14* — est: 4h
  - Acceptance: cada borrador tiene `eval_scores` (especificidad, densidad de hechos, marcas de IA, ajuste al pilar, 1–5) en `content_log`; el reporte semanal muestra el promedio.
  - Depends on: T21
- [ ] T34: Caso de estudio del Content Engine — *F2* — est: 5h
  - Acceptance: la página `/[locale]/proyectos/content-engine` tiene diagrama, decisiones, métricas reales del pipeline y un video de demo de ≤ 2 min; el repo del pipeline tiene un README con arquitectura y setup.
  - Depends on: T27, T33
- [ ] T35: Auditoría de citación en IA (quincenal) y ajuste de la guía — *F6* — est: 2h
  - Acceptance: `docs/baseline.md` tiene 6 registros quincenales de la consulta de marca en ChatGPT, Perplexity y Claude.
  - Depends on: T16
- [ ] T36: Retro de 12 semanas — *todas* — est: 1h
  - Acceptance: `docs/retro.md` compara la línea base con las métricas finales y decide qué sigue.
  - Depends on: T35

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
