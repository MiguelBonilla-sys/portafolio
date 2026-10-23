# Content Engine · arquitectura y operación (fase 2)

> Código: `agent/`. Rutas: `app/api/telegram`, `app/api/cron/daily`, `app/api/agent/setup`, `app/api/linkedin/*`.
> Sigue siendo un solo grafo de LangGraph.js con `PostgresSaver` e `interrupt()`, dentro del deploy de Vercel. No se reemplazó nada que funcionara.

## 1. Responsabilidades y dónde viven

Los nombres del encargo son responsabilidades lógicas. Solo cinco usan un modelo; el resto es TypeScript determinista.

| Responsabilidad | Implementación | ¿LLM? |
|---|---|---|
| Input Parser | `handlers.ts` (`parseCommand`, `parseOptions`, `attachmentsOf`, `detectIntent`) | No |
| Source Extractor | `inputs.ts` (texto, Markdown, PDF con `unpdf`, imágenes, URLs con `safeFetch` + `lib/html.ts`) | Solo visión, si `LLM_VISION_MODEL` existe |
| Research Agent | nodo `investigate` (`researchPrompt`) | Sí (1 llamada) |
| Fact Checker | `traceClaims`, `knownNumbers`, nodo `verifyFacts` (`[DATO?]`) | No |
| Content Strategist | nodo `propose`: temas, tipo de artículo, datos faltantes, cifras sin fuente, material privado | No (usa la salida del investigador) |
| Technical Writer | nodos `draftBlogEs`, `localizeEn`, `draftCarousel` | Sí |
| SEO/GEO Optimizer | `seo.ts` (`seoReport`, `relatedProjects`) | No |
| Editorial Quality Reviewer | `lib/lint.ts` (determinista) + `antiSlop` (edición) + `evaluate` (opinión contextual, nunca bloquea) | Sí (edición y evaluación) |
| Visual Asset Generator | `visuals/` (escenas, SVG, PNG con `next/og`) | No |
| LinkedIn Adapter | `draftLinkedIn` (estructura rotativa) + `lib/linkedin.ts` | Sí |
| Human Approval | `propose`/`awaitProposal`, `sendPreview`/`humanReview`, `checkApproval` (versión + hash + canales) | No |
| Publisher | `publishBlog` (GitHub), `waitDeploy`, `publishLinkedIn`, `indexNow` | No |
| Post-publication Validator | `validatePublished`: estado HTTP, título, canonical, hreflang, JSON-LD `BlogPosting`, sin `noindex` | No |

Llamadas al modelo por pieza: investigación (1) + artículo (1) + post (1) + inglés (1) + evaluación (1) + 0 a 4 ediciones del linter (+1 carrusel opcional). Una edición del autor suma 1 a 3.

## 2. Estados editoriales

Definidos en `agent/editorial.ts`; cada cambio pasa por `assertTransition` y queda en la tabla `content_events` (de, a, versión, detalle).

```
received → extracting → researching → awaiting_input → drafting → validating → awaiting_review
   → approved → publishing → (awaiting_deploy) → published
                                  ↘ partially_published (un canal sí, otro no)
validating → blocked (faltan datos, marcas P0/P1 o errores SEO)
awaiting_review/blocked → revising → validating
awaiting_review → scheduled → approved
cualquiera no terminal → failed | cancelled;  awaiting_* → expired (48 h sin respuesta, cron)
```

Terminales: `published`, `cancelled`, `expired`. Las filas con estados del esquema anterior (`generating`, `awaiting_approval`, `rejected`) se migran al arrancar (`SCHEMA_SQL`, migración aditiva e idempotente).

## 3. Versiones, aprobación y canales

- Cada vez que el borrador pasa por validación recibe `version + 1` y un `contentHash` (sha256 de artículo ES/EN, post, láminas y visuales, 12 caracteres).
- La vista previa muestra `Borrador abcd1234 · versión 2 <hash>`; los botones de publicar llevan el hash en `callback_data`.
- `checkApproval` rechaza un hash distinto del actual ("Ese botón era de una versión anterior") y cualquier bloqueo pendiente.
- Blog y LinkedIn se aprueban por separado (`Publicar blog + LinkedIn`, `Solo blog`, `Solo LinkedIn`). Si solo uno queda publicado, el estado es `partially_published`, el grafo vuelve a la revisión y el otro canal se puede aprobar después (el comentario con el enlace al artículo se agrega si el blog ya está en línea).
- "Publicado" solo se anuncia con confirmación real: commit + 200 del sitio para el blog, URN devuelto por LinkedIn para el post.

## 4. Recuperación ante fallos

| Situación | Comportamiento |
|---|---|
| Reinicio de la función | El estado vive en el checkpoint de Postgres; el siguiente mensaje o botón reanuda donde quedó |
| Update de Telegram repetido | `telegram_updates` lo descarta |
| Dos botones casi simultáneos | `tryLock` por pieza: el segundo recibe "Ya estoy trabajando en ese borrador" |
| Commit hecho, deploy lento | `awaiting_deploy`; reintento manual o en el cron; el commit no se repite (`steps.commit`) |
| LinkedIn caído o token vencido | Blog publicado, pieza `partially_published`, botón Reintentar; el post se publica una sola vez |
| Ejecución cortada justo al publicar en LinkedIn | Marcador `linkedin_attempt:<id>:<hash>`: al reanudar, el bot no repite a ciegas; pide revisar el perfil y confirmar |
| Error inesperado | Mensaje humano con referencia (`toPublicError`), estado `failed`, detalle redactado en los logs |

## 5. Telegram

### Comandos

| Comando | Alias | Qué hace |
|---|---|---|
| `/start`, `/help` | `/ayuda` | Ayuda breve |
| `/new [texto]` | `/nuevo` | Empieza un borrador nuevo (con el texto o archivo adjunto) |
| `/drafts` | `/borradores` | Últimos 8 borradores con id corto, estado y versión |
| `/status [id]` | `/estado` | Estado, versión, hash, canales publicados, datos pendientes |
| `/preview [id]` | `/vista` | Vuelve a enviar la vista previa (solo en revisión) |
| `/revise texto` | `/revisar` | Pide un cambio |
| `/approve`, `/publish [blog\|linkedin]` | `/aprobar`, `/publicar` | Muestra la confirmación de publicación (no publica) |
| `/sources [id]` | `/fuentes` | Fuentes, confianza y afirmaciones sin respaldo |
| `/cancel` | `/cancelar` | Cancela lo pendiente o descarta el borrador activo |

Opciones al empezar: `/es` (post de LinkedIn en español), `/carrusel`, «con imagen» (el post lleva la portada).

### Conversación natural

El texto libre se interpreta según el estado del borrador activo (reglas deterministas en `detectIntent`, probadas):

| Estado | Texto | Acción |
|---|---|---|
| Esperando la propuesta | "Sí, pero enfatiza las pruebas" | Acepta con esa indicación (llega al redactor como `[autor]`) |
| Esperando la propuesta | Respuesta larga con datos | Se agrega como fuente del autor y se vuelve a investigar |
| En revisión | "El inicio está muy genérico" | Edición; solo cambia lo pedido y el bot dice qué cambió |
| En revisión | "Publica el blog y LinkedIn" | Tarjeta de confirmación con versión, hash, canales y enlaces previstos |
| En revisión | "gracias", "ok" | No edita nada |
| En revisión | Texto de 400+ caracteres | Pregunta si es un cambio o material para un borrador nuevo |
| Cualquiera | Archivo, enlace o reenvío | Borrador nuevo |

Tono: español por defecto, sin emojis decorativos, sin JSON ni trazas. Los mensajes distinguen lo verificado, lo propuesto, lo pendiente y lo que necesita aprobación. Limitación: la interfaz del bot está solo en español; el idioma del post de LinkedIn sí se elige (`/es`, inglés por defecto).

### Progreso

Un solo mensaje por pieza que se edita: "Material recibido · Contenido extraído · Fuentes revisadas · Borrador disponible. Validación completada." No se manda un mensaje por nodo.

## 6. Datos

| Tabla | Uso |
|---|---|
| Checkpoints de LangGraph | Estado completo de cada pieza (fuentes, borradores, versión) |
| `content_log` | Resumen consultable: estado, título, versión, hash, mensajes de vista previa y progreso, URLs publicadas, canales |
| `content_events` | Historial de transiciones |
| `agent_kv` | Pieza activa, interacciones pendientes, token de LinkedIn cifrado, candados, marcadores de intento |
| `telegram_updates` | Deduplicación |
| `rate_events` | Límite de piezas nuevas por hora |

## 7. Pruebas

`pnpm test` (68 pruebas) incluye el grafo completo con LLM y servicios simulados (`agent/test/graph.test.ts`), la conversación de Telegram con los ejemplos A–D del encargo (`handlers.test.ts`), seguridad (`security.test.ts`), visuales, SEO, linter y storyboard (`visuals.test.ts`), e integridad y consistencia del contenido del sitio (`test/`).

No probado contra servicios reales: Telegram, GitHub, LinkedIn, el LLM de producción y Postgres de producción. Primera prueba real sugerida: enviar `/new` con una nota corta al bot y seguir el flujo hasta "Solo blog".
