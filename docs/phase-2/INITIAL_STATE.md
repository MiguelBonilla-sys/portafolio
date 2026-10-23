# Fase 2 · Estado inicial

> Fecha: 2026-10-23 · Rama: `ccr-82e185fe-xk2i5l` (la fase 1 aún no está fusionada en `main`) · Base de código: `31c6762`
> Método: lectura de `PRODUCT.md`, `DESIGN.md`, `plan.md`, `docs/audit/*`, `agent/**`, `app/api/**`, `content/blog`, `docs/linkedin-profile.md`, `docs/setup.md`, `package.json`, `vercel.json`; ejecución de `pnpm test`; sondas HTTP sin credenciales contra `https://mangel14.dev`; lectura del repositorio `API_AUTH_HACKATON` (ramas `main`, `development`, `feature`, `release`).

## 1. Qué está realmente en producción

| Sonda (sin credenciales) | Respuesta | Qué demuestra |
|---|---|---|
| `POST /api/telegram` | 401 | `getEnv()` validó: **todas** las variables obligatorias del agente (LLM, Postgres, Telegram, GitHub, LinkedIn, cifrado) están definidas en producción. Si faltara una, respondería 503 |
| `GET /api/cron/daily` | 401 | Ídem; el cron está protegido |
| `GET /api/agent/setup` | 401 | Protegido con `ADMIN_SECRET` |
| `GET /api/linkedin/auth` | 401 | Exige token firmado |
| `GET /api/linkedin/callback` | 400 "Estado inválido" | Rechaza sin cookie de `state` |

- No hay commits `content:` del agente en `origin/main` ni archivos en `content/blog` fuera del borrador manual (`draft: true`): **el agente nunca publicó**.
- No pude saber si el webhook está registrado en Telegram ni si LinkedIn está conectado: el conector de Vercel devolvió `404 User not found` y esas comprobaciones requieren `ADMIN_SECRET`.
- `plan.md` §0 ("falta configurar las variables") y el caso de estudio de la fase 1 ("no está configurado en producción") quedaron **desactualizados**: las variables sí están. Se corrige en esta fase.

## 2. Matriz de funcionalidades

| Funcionalidad | Existe | Funciona | Evidencia | Problema | Acción |
|---|---|---|---|---|---|
| Webhook de Telegram con secreto | Sí | Sí (sonda 401) | `app/api/telegram/route.ts`, `safeEqual` | `req.json()` sin límite de tamaño ni manejo de error | Límite de cuerpo y respuesta 400 controlada |
| Autorización por chat | Sí | Sí (tests) | `handlers.ts` compara `chat.id` | No valida `from.id` ni tipo de chat; un grupo con el mismo id no aplica, pero un mensaje reenviado se trata como instrucción del autor | Exigir chat privado y `from.id`; contenido reenviado = fuente no confiable |
| Deduplicación de updates | Sí | Sí | `telegram_updates` + `claimUpdate` | — | Mantener |
| Entrada de texto | Sí | Sí (tests) | `startContent` | Mínimo 60 caracteres; sin plan previo ni preguntas | Paso de propuesta conversacional |
| Entrada Markdown / PDF / imagen / URL | **No** | — | Solo `msg.text`/`msg.caption`; documentos ignorados | — | Extractores con validación de MIME, tamaño y firma; SSRF |
| Investigación de fuentes | No | — | `extractFacts` solo resume las notas | No hay trazabilidad hecho → fuente | Hechos con fuente y nivel de confianza |
| Verificación de cifras | Sí | Sí (test) | `verifyFacts` → `[DATO?]` | Solo cifras; afirmaciones sin cifra no se marcan | Mantener + listar afirmaciones sin fuente en la propuesta |
| Linter anti-slop | Sí | Sí (3 tests) | `agent/lib/lint.ts` | P1 bloquea la aprobación (demasiado estricto para términos técnicos); faltan "innovador", "escalable", "de última generación", listas sin explicación, FAQ forzadas, experiencia simulada | Reglas nuevas, severidad contextual, excepciones técnicas |
| Estructura editorial | Parcial | — | Prompt fijo "El problema / Lo que hice / Resultados" | Plantilla rígida | Tipo de artículo elegido por contenido |
| Revisión humana con `interrupt()` | Sí | Sí (tests) | `humanReview` | La aprobación no está ligada a una versión: un botón viejo aprueba el texto editado | Versión + hash en cada vista previa y en cada botón |
| Aprobación por canal | No | — | Un solo "Aprobar" publica blog y LinkedIn | — | Blog y LinkedIn aprobables por separado |
| Comandos | Parcial | Sí | `/start /ayuda /estado /cancelar` | Faltan `/new /drafts /preview /revise /approve /publish /sources /help /status` | Implementar con alias en español |
| Conversación natural | No | — | Todo texto libre crea una pieza nueva | "El inicio está muy genérico" abriría otro borrador | Router de intención con contexto de borrador activo |
| Mensajes de progreso | Parcial | — | "⏳ Preparando borrador…" | Sin avance por etapas | Un mensaje editable por pieza |
| Errores al usuario | Sí | Mal | `run()` envía `e.message` crudo | Puede exponer respuestas de APIs internas | Mensaje humano + id de referencia; detalle redactado en logs |
| Persistencia | Sí | Sí | `PostgresSaver`, `content_log`, `agent_kv` | Sin versión ni historial de transiciones | Columnas `version`, `content_hash`, tabla `content_events` |
| Publicación en GitHub | Sí | No probado en real | `publishBlog`, `freeSlug`, `steps.commit` | MDX generado sin sanear (JSX/`import`) | Sanitizador de MDX + validación del slug |
| Espera de deploy y reintento | Sí | Sí (tests) | `waitDeploy`, `hold` | — | Mantener |
| Publicación en LinkedIn | Sí | No probado en real | `lib/linkedin.ts` (Posts API, comentarios, documentos) | Sin estado "publicación parcial"; LinkedIn exige blog | Estado parcial y LinkedIn independiente |
| OAuth de LinkedIn | Sí | Sí (sonda) | `state` en cookie, enlace firmado 24 h, token AES-256-GCM | `exchangeCode` lanza con el cuerpo de la respuesta → 500 sin manejar | Manejar error con página controlada |
| Validación post-publicación | Parcial | — | Solo `HEAD` 200 | No revisa título, canonical, JSON-LD ni `noindex` | Validador que lee la página publicada |
| IndexNow | Sí | No probado en real | `lib/indexnow.ts` | — | Mantener |
| Carrusel PDF | Sí | Sí (test) | `carousel.tsx` con `next/og` | — | Reutilizar el renderizador en `agent/visuals` |
| Imágenes de artículo / diagramas | No | — | — | — | `agent/visuals` (SVG + `next/og`) |
| Rate limiting | No | — | — | Bot de un solo usuario; el riesgo es el costo de LLM ante un bucle | Límite de piezas nuevas por hora |
| Taxonomía del blog | Parcial | — | `pillar` con 4 valores orientados a LinkedIn | No coincide con las categorías pedidas | 6 categorías, sin páginas vacías |
| Relacionados y enlaces a proyectos | No | — | — | — | Por etiquetas, categoría y proyecto declarado |
| Twitter/X cards por página | Parcial | Mal | Solo en el layout | Las páginas heredan el título de la home en `twitter:title` | Helper común OG + Twitter |
| JSON-LD del blog | Sí | Sí | `blogPostingSchema`, `faqSchema` | Autor sin URL, sin imagen; FAQ forzada por el prompt | Completar y dejar FAQ solo si el autor la aporta |
| Consistencia entre canales | Parcial | — | `test/content.test.ts` (ES/EN) | No compara CV, LinkedIn, JSON-LD, prompts | Test de consistencia |
| Perfil de LinkedIn | Sí (doc) | — | `docs/linkedin-profile.md` | Titular "Full Stack & AI Engineer", LlamaStack, 359 pruebas, enlaces a repo comprometido y a Sentinel RAG | Reescribir |
| Prompts del agente | Sí | — | `AUTHOR` en `prompts.ts` | Dice "AI Engineer", "LlamaStack, 359 pruebas" | Alinear con la fase 1 |
| Hyperframes | No | — | — | — | Solo documentación y contrato de storyboard |

## 3. Seguridad P0: `API_AUTH_HACKATON`

| Comprobación | Resultado |
|---|---|
| `scripts/user_credentials.json` presente | Sí, en las 4 ramas (`main`, `development`, `feature`, `release`) |
| Contenido (sin imprimir valores) | 25 cuentas, 1 superusuario, dominio `inventario.gov.co`, **solo 2 contraseñas distintas** compartidas |
| Secreto JWT por defecto | Sí, en las 4 ramas (`src/auth/jwt_utils.py`) |
| Acceso de escritura de esta sesión | Sí (`add_repo` con `push` concedido) |
| Despliegue vivo | Desconocido: no hay URL pública en el repo |

## 4. Plan de ejecución (por dependencia y riesgo)

| # | Bloque | Depende de | Riesgo |
|---|---|---|---|
| 1 | Seguridad del repo del hackatón: rama con el arreglo, procedimiento de purga probado en copia local, retiro del enlace en el portafolio | — | Bajo (sin force-push) |
| 2 | Endurecimiento: webhook, autorización, redacción de logs, errores al usuario, OAuth, sanitizador MDX, `safeFetch` | — | Bajo |
| 3 | Extractores de entrada (texto, Markdown, PDF, imagen, URL) con validaciones | 2 | Medio (dependencia nueva para PDF) |
| 4 | Estado editorial, versiones, hash y eventos en la base | — | Medio (migración aditiva) |
| 5 | Grafo: propuesta, fuentes, tipo de artículo, aprobación por versión y canal, publicación parcial, validación posterior | 3, 4 | Alto (núcleo) |
| 6 | Telegram conversacional: comandos, router de intención, progreso editable | 5 | Medio |
| 7 | Linter ampliado y revisión contextual | — | Bajo |
| 8 | `agent/visuals`: portadas, diagramas, tarjetas, alt text y validación de texto | — | Medio |
| 9 | SEO/GEO: categorías, relacionados, Twitter cards, JSON-LD, imagen OG por artículo, test de consistencia | 7 | Bajo |
| 10 | LinkedIn: perfil reescrito, adaptador de post, imagen opcional | 8 | Bajo |
| 11 | Hyperframes: documentación y contrato de storyboard | 8 | Bajo |
| 12 | Pruebas, build, E2E y documentación final | todo | — |
