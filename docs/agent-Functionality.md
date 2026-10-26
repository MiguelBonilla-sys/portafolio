# Content Engine · cómo funciona

> El agente convierte material que le mandas por Telegram en un artículo del blog (ES y EN) y un post de LinkedIn. **No publica nada sin tu confirmación.**
> Código: `agent/` · rutas: `app/api/{telegram,cron,agent,linkedin}` · instalación: [setup.md](setup.md) · diseño detallado: [phase-2/CONTENT_ENGINE.md](phase-2/CONTENT_ENGINE.md).
> Describe la rama `fix/security-content-production-readiness`. Producción corre una versión anterior hasta el próximo deploy.

## 1. Vista general

```
Tú (Telegram, chat privado)
   │  notas · Markdown · PDF · imágenes · enlaces · reenvíos · comandos · botones
   ▼
/api/telegram ── secreto del webhook ── handlers.ts (autorización, comandos, conversación, recolección)
                                             │
                                             ▼
                                   graph.ts (LangGraph.js, estado en Postgres)
                                             │
        ┌──────────────┬─────────────────────┼──────────────────┬───────────────┐
        ▼              ▼                     ▼                  ▼               ▼
   LLM (compatible  Postgres            GitHub (commit     LinkedIn         IndexNow
   con OpenAI,      (checkpoints,       de MDX y SVG →     (post + primer   (Bing, Yandex…;
   respaldo y       piezas, eventos,    deploy de Vercel)  comentario con   Google no)
   visión opc.)     candados, kv)                          el enlace)
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| Webhook | `app/api/telegram/route.ts` | Valida el header `x-telegram-bot-api-secret-token` en tiempo constante; 401, 413 (más de 256 KB), 400 (JSON inválido), 503 (sin configurar) |
| Mesa de edición | `agent/handlers.ts` | Quién puede hablar, comandos, texto libre, botones, recolección en varios mensajes |
| Flujo editorial | `agent/graph.ts`, `agent/state.ts` | Extraer → investigar → proponer → redactar → validar → revisar → publicar |
| Estados | `agent/editorial.ts` | Máquina de estados, transiciones válidas, hash de versión |
| Entradas | `agent/inputs.ts`, `agent/lib/safe-fetch.ts`, `agent/lib/html.ts` | Lee archivos y URLs con límites y protección SSRF |
| Calidad | `agent/lib/lint.ts`, `agent/seo.ts`, `agent/prompts.ts` | Linter anti-relleno, revisión SEO, instrucciones del redactor |
| Visuales | `agent/visuals/` | Diagramas SVG para el artículo y PNG (portada, flujo) |
| Persistencia | `agent/lib/db.ts`, `agent/runtime.ts` | Tablas propias y checkpoints de LangGraph en Postgres |
| Configuración | `agent/config.ts` | Variables validadas con zod |

## 2. Quién puede usarlo

`isAuthorized` acepta solo:

- mensajes de un **chat privado** cuyo `chat.id` y `from.id` sean ambos `TELEGRAM_CHAT_ID`, y que no vengan de un bot;
- botones pulsados por ese mismo usuario.

Todo lo demás se ignora en silencio.

Antes de procesar, cada update pasa por tres controles:

| Control | Mecanismo |
|---|---|
| Reintento de Telegram | `claimUpdate` sobre la tabla `telegram_updates`: no se procesa dos veces |
| Una operación a la vez por pieza | `tryLock` por pieza |
| Ritmo | Como máximo **10 borradores nuevos por hora** (`rateHit`) |

## 3. Cómo darle material

### Un mensaje

Basta un mensaje con notas, con un archivo y su pie de foto, o con hasta 3 enlaces. Si es solo texto, necesita al menos 8 palabras.

### Varios mensajes para un solo borrador

Telegram manda cada archivo como un mensaje aparte. Para juntarlos:

```
/nuevo                 → «Junto el material para un solo borrador…»
(imagen)               → «Agregado. Llevo 1 archivo (1 imagen).»
(arquitectura.md)      → «Agregado. Llevo 2 archivos (1 imagen, 1 documento).»
(pruebas.pdf + nota)   → «… 3 archivos (1 imagen, 1 PDF, 1 documento) y 1 nota.»
listo                  → arranca la investigación con todo junto
```

- `/es` y `/carrusel` valen en cualquier mensaje de la recolección.
- `/estado` dice lo que llevas y `/cancelar` lo descarta.
- La recolección vence a las 6 horas sin «listo», con aviso.
- Un **álbum** cuenta como un solo borrador aunque no uses `/nuevo`, y el bot lo confirma una vez. Igual hay que escribir «listo», porque Telegram no avisa cuándo termina un álbum.
- **Sumar material a una propuesta:** responde al mensaje de la propuesta con el archivo, o con un álbum y después «listo». El bot lo agrega como fuente y vuelve a proponer. Mandar un archivo no cuenta como aceptar. Una vez redactado el borrador, el material nuevo ya no se suma.
- Si mandas un archivo suelto, sin `/nuevo` y sin responder a nada, empieza un borrador nuevo.

La recolección vive en `agent_kv`, con la clave `collecting`. Dos operaciones atómicas evitan choques:

- `collect` suma cada parte; los mensajes de un álbum llegan en paralelo y ninguno se pierde.
- `kvTake` lee y borra en un solo paso; si escribes «listo» dos veces, solo arranca un borrador.

### Qué sabe leer

| Tipo | Cómo se lee | Notas |
|---|---|---|
| Texto, Markdown | UTF-8 | Máximo 1 MB de texto |
| PDF | `unpdf` | Hasta 60 páginas. Si parece escaneado, avisa: no hay OCR |
| Imagen PNG, JPEG o WebP | Modelo de visión (`LLM_VISION_MODEL`) | Sin ese modelo no inventa: avisa y pide que describas la imagen. Si la describe, marca que hay que verificar la descripción |
| URL | `safeFetch` | Solo direcciones públicas: bloquea IPs privadas y locales y revisa cada redirección. Sin JavaScript |
| Reenvío | Como texto | Se trata como **material externo**: menos confianza y aviso si parece una inyección de instrucciones |

El tipo se decide por la **firma del archivo**, no por la extensión.

Límites por borrador:

- 10 archivos;
- 10 MB por archivo;
- 30.000 caracteres por fuente;
- 90.000 caracteres en total, contando también lo que se agrega después;
- 3 enlaces por mensaje.

Lo que se recorta se avisa.

## 4. El recorrido de una pieza

```
extract ─(sin texto usable)─► nothingToUse → fin
   │
investigate ◄──────────────┐
   │                        │ respuesta con datos o archivos nuevos
propose → awaitProposal ⏸ ──┤
   │ aceptar      cancelar ─┴─► close → fin
   ▼
draftBlogEs → draftLinkedIn → antiSlop ◄───────────── applyEdit (ediciones)
   → localizeEn → [draftCarousel] → buildVisuals → verifyFacts → validate → evaluate
   → sendPreview → humanReview ⏸
        │ publicar (versión + hash)       │ programar
        ▼                                 ▼
   checkApproval ─(versión vieja o pendientes)─► refuseApprove → humanReview
        │                              schedule → waitSchedule ⏸ (lo retoma el cron)
        ▼
   publishBlog → waitDeploy ─(tarda)─► deployPending → hold ⏸
        │
   validatePublished → publishLinkedIn ─(error o intento cortado)─► hold ⏸
        │
   indexNow → notifyPublished ─(falta un canal)─► sendPreview
```

⏸ marca una pausa (`interrupt()`): el grafo espera tu respuesta en Telegram. El estado queda en Postgres (`PostgresSaver`), así que sobrevive entre invocaciones y deploys.

### Etapa por etapa

1. **Extraer** (`extract`): convierte tus notas, archivos y enlaces en fuentes numeradas `S1`, `S2`… Tus notas tienen confianza de **autor**; documentos, páginas y reenvíos, de **externo**.
2. **Investigar** (`investigate`):
   - El modelo propone tema, categoría, tipo de artículo, ángulo y las afirmaciones con las fuentes que las respaldan.
   - `traceClaims` decide **sin el modelo** si cada afirmación tiene fuente real: lo que dijiste tú es tuyo, lo de un documento necesita citar una fuente existente, y sus cifras tienen que aparecer en esa fuente.
3. **Proponer** (`propose`): antes de redactar te cuenta:
   - qué leyó, por ejemplo «Leí «a.md», «b.pdf» y tus notas»;
   - qué temas encontró y qué recomienda;
   - qué cifras no tienen fuente;
   - qué le falta saber.
   Botones: aceptar marcando las cifras sin fuente, aceptar eliminándolas, o cancelar.
4. **Tu respuesta** (`takeAnswer`):
   - «Sí, pero enfatiza las pruebas» acepta, con esa indicación para el redactor.
   - Una respuesta sustancial cuando faltaban datos se vuelve fuente tuya, y el agente vuelve a investigar.
   - Un archivo como respuesta se suma como fuente, y el agente vuelve a investigar.
5. **Redactar**: artículo en español, post de LinkedIn (en inglés por defecto, en español con `/es`), traducción al inglés del artículo y carrusel si lo pediste. El redactor no puede inventar experiencia ni agregar enlaces.
6. **Anti-relleno** (`antiSlop`):
   - El linter determinista marca patrones de texto genérico.
   - Las marcas P0 y P1 se corrigen con el editor, hasta 2 pasadas.
   - P2 solo se informa.
7. **Visuales** (`buildVisuals`): diagramas SVG accesibles, pero solo si el material describe un flujo, una secuencia o datos con fuente. Nada decorativo.
8. **Verificar hechos** (`verifyFacts`): toda cifra de la prosa que no esté en el material verificable queda como `[DATO?: cifra]`. El código se deja intacto.
9. **Validar y evaluar**:
   - `validate` corre el linter y la revisión SEO (longitudes, H1, secciones vacías, imágenes sin alt, enlaces internos).
   - `evaluate` da una opinión del modelo sobre especificidad, densidad de hechos y relleno. Se muestra pero no bloquea.
10. **Vista previa** (`sendPreview`): el artículo, el post, la evaluación, lo pendiente y botones con la **versión y el hash** (12 caracteres hexadecimales) de lo que estás viendo.
11. **Revisión** (`humanReview`):
    - Pides cambios en lenguaje natural («el inicio está muy genérico»): solo cambia lo pedido, y el bot dice qué cambió.
    - Cada cambio es una versión nueva, con hash nuevo.
12. **Publicar**, solo con confirmación:
    - `checkApproval` rechaza una aprobación de una versión vieja, o si hay `[DATO?]`, marcas P0/P1 o errores SEO pendientes.
    - Blog y LinkedIn se aprueban por separado.
    - `publishBlog` sube los SVG y el MDX en ES y EN a GitHub, un commit por archivo (API de contenidos). Eso dispara el deploy de Vercel.
    - `waitDeploy` espera a que la página responda, hasta `DEPLOY_WAIT_SECONDS`.
    - `validatePublished` revisa estado, título, canonical, hreflang, JSON-LD e indexabilidad.
    - `publishLinkedIn` publica el post y pone el enlace al artículo en el **primer comentario**. LinkedIn no tiene clave de idempotencia, así que un intento cortado pide confirmación manual en vez de repetirse solo.
    - Después vienen IndexNow y el aviso con las URLs.
    - Si solo se publicó un canal, la pieza queda en `partially_published` y vuelve a la vista previa.

## 5. Estados editoriales

Definidos en `agent/editorial.ts`. Toda transición pasa por `assertTransition` y queda registrada en `content_events`.

```
received → extracting → researching → awaiting_input → drafting → validating → awaiting_review
         → approved → publishing → (awaiting_deploy) → published
```

| Estado | Significa | Sale hacia |
|---|---|---|
| `received` | Llegó el material | `extracting` |
| `extracting` | Leyendo archivos y enlaces | `researching`, `awaiting_input` |
| `researching` | Investigando las fuentes | `awaiting_input`, `drafting` |
| `awaiting_input` | **Espera tu respuesta a la propuesta** | `drafting`, `researching`, `expired` |
| `drafting` | Redactando | `validating` |
| `validating` | Linter, hechos, SEO y evaluación | `awaiting_review`, `blocked`, `partially_published` |
| `awaiting_review` | **Espera tu revisión** | `approved`, `revising`, `scheduled`, `expired` |
| `blocked` | **Hay pendientes que impiden publicar** (`[DATO?]`, P0/P1, SEO) | `revising`, `expired` |
| `revising` | Aplicando un cambio | `validating` |
| `approved` | Confirmaste una versión | `publishing`, `awaiting_review`, `blocked` |
| `scheduled` | Programada para una fecha | `approved`, `revising` |
| `publishing` | Publicando | `awaiting_deploy`, `published`, `partially_published` |
| `awaiting_deploy` | El deploy tarda | `publishing`, `partially_published` |
| `partially_published` | **Un canal sí y otro no** | `approved`, `publishing`, `revising`, `published` |
| `published` | Terminado | — |
| `failed` | Error; se puede reintentar | `publishing`, `approved`, `awaiting_review`, `partially_published`, `published` |
| `cancelled`, `expired` | Terminados sin publicar | — |

`failed` y `cancelled` se alcanzan desde cualquier estado no terminal. Los estados en **negrita** esperan algo de ti (`WAITING_FOR_AUTHOR`).

## 6. Comandos y conversación

| Comando | Alias | Qué hace |
|---|---|---|
| `/help`, `/start` | `/ayuda` | Ayuda |
| `/new [texto]` | `/nuevo` | Con texto o archivo, empieza un borrador; sin nada, abre la recolección |
| `/done` | `/listo`, «listo» | Cierra la recolección y arranca el borrador |
| `/drafts` | `/borradores` | Últimos 8 borradores |
| `/status [id]` | `/estado` | Estado, versión, hash y pendientes (o lo que llevas en la recolección) |
| `/preview [id]` | `/vista` | Repite la vista previa |
| `/revise texto` | `/revisar` | Pide un cambio |
| `/approve`, `/publish [blog\|linkedin]` | `/aprobar`, `/publicar` | Muestra la confirmación de publicación (no publica todavía) |
| `/sources [id]` | `/fuentes` | Fuentes y afirmaciones sin respaldo |
| `/cancel` | `/cancelar` | Descarta la recolección, lo pendiente o el borrador activo |

Opciones al empezar: `/es` (LinkedIn en español), `/carrusel` (además, un carrusel PDF), «con imagen» (el post lleva la portada).

El texto libre se interpreta con reglas deterministas (`detectIntent`), según el estado de la pieza activa:

| Situación | Ejemplo | Resultado |
|---|---|---|
| Juntando material | cualquier mensaje | Se suma; «listo» arranca |
| Esperando la propuesta | «Sí, pero enfatiza las pruebas» | Acepta con esa indicación |
| Esperando la propuesta | responder con un archivo | Se suma y se vuelve a proponer |
| En revisión | «el inicio está muy genérico» | Edición puntual |
| En revisión | «publica el blog y LinkedIn» | Tarjeta de confirmación con versión, hash y enlaces previstos |
| En revisión | «gracias», «ok» | No cambia nada |
| En revisión | texto de 400 caracteres o más | Pregunta si es un cambio o material nuevo |
| Responder a una vista previa | texto | Edición de esa pieza |
| Cualquiera | archivo, enlace o reenvío suelto | Borrador nuevo |

Los botones llevan `callback_data` de menos de 64 bytes con la forma `<acción>:<id>[:<hash>]`. Las acciones posibles están en `agent/lib/telegram.ts`.

## 7. Tareas automáticas (cron)

`/api/cron/daily` corre a las 13:00 UTC (8:00 en Bogotá) y se protege con `Bearer CRON_SECRET`. Hace cuatro cosas:

- publica **solo** lo que aprobaste y programaste, con el hash guardado;
- reintenta los deploys pendientes;
- vence las propuestas con más de 48 horas sin respuesta;
- avisa si el token de LinkedIn vence en 10 días o menos.

**No existe publicación automática sin aprobación.**

`/api/agent/setup` (con `Bearer ADMIN_SECRET`) crea las tablas, registra el webhook con su secreto, informa el estado de LinkedIn y manda un mensaje de prueba. Hay que correrlo después de cada deploy que cambie el agente.

## 8. Seguridad y errores

| Riesgo | Defensa |
|---|---|
| Alguien más le escribe al bot | Secreto del webhook + `isAuthorized` |
| Una URL apunta a la red interna | `safeFetch`: valida el DNS y cada redirección, bloquea direcciones privadas |
| Un archivo disfrazado | Firma del archivo, límites de tamaño y de páginas |
| Instrucciones escondidas en el material | Las fuentes van delimitadas como datos; aviso de posible inyección en reenvíos, PDF y páginas |
| MDX con código ejecutable | `sanitizeMdxBody` y slug validado (sin path traversal) |
| Publicar una versión que no viste | Aprobación atada a versión y hash |
| Publicar cifras inventadas | `[DATO?]` bloquea; las fuentes del artículo son solo las URLs que mandaste |
| Secretos en los logs | `logError` redacta tokens, claves y URLs con credenciales; tú ves un mensaje con una referencia, sin detalles internos |
| Token de LinkedIn | Cifrado con `TOKEN_ENCRYPTION_KEY` |

## 9. Persistencia

| Tabla | Para qué |
|---|---|
| Checkpoints de LangGraph | El estado completo de cada pieza, para reanudar tras una pausa |
| `content_log` | Resumen consultable: estado, título, versión, hash, ids de mensajes, canales publicados |
| `content_events` | Historial de transiciones |
| `agent_kv` | Pieza activa, ediciones o fechas pendientes, recolección, candados, token de LinkedIn |
| `telegram_updates` | Deduplicación de updates |
| `rate_events` | Límite de borradores por hora |

La migración es aditiva (`IF NOT EXISTS`) y corre al arrancar.

## 10. Configuración

En `agent/config.ts` hay 12 variables obligatorias:

- **LLM:** `LLM_API_KEY`, `LLM_MODEL`
- **Base de datos:** `DATABASE_URL`
- **Telegram:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_CHAT_ID`
- **Secretos propios:** `CRON_SECRET`, `ADMIN_SECRET`, `TOKEN_ENCRYPTION_KEY`
- **GitHub:** `GITHUB_TOKEN`
- **LinkedIn:** `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`

Las opcionales son el modelo de respaldo, `LLM_VISION_MODEL`, `AGENT_TIMEZONE`, `DEPLOY_WAIT_SECONDS` e `INDEXNOW_KEY`, entre otras. La guía paso a paso está en [setup.md](setup.md).

## 11. Pruebas

`pnpm test` incluye el agente completo con LLM, Telegram, GitHub, LinkedIn y base de datos simulados:

| Archivo | Cubre |
|---|---|
| `agent/test/graph.test.ts` | El flujo completo, aprobaciones viejas rechazadas, ediciones, canales por separado, `[DATO?]`, PDF, inyección, deploy lento, LinkedIn |
| `agent/test/handlers.test.ts` | Conversación, comandos, autorización, updates repetidos, límite por hora |
| `agent/test/collect.test.ts` | Material en varios mensajes, álbumes, archivos sumados a la propuesta, límites y vencimiento |
| `agent/test/security.test.ts` | SSRF, firma de archivos, MDX, redacción de secretos, transiciones |
| `agent/test/visuals.test.ts` | Contraste, ajuste de texto, SVG, PNG, SEO, linter |

**No se ha probado contra los servicios reales** (Telegram, GitHub, LinkedIn, el LLM, Postgres de producción). Las consultas de la recolección sí se probaron contra un PostgreSQL 16 local.

## 12. Limitaciones conocidas

- El bot habla solo español; el idioma del post de LinkedIn sí se elige.
- No transcribe audio ni hace OCR de PDF escaneados.
- `safeFetch` no ejecuta JavaScript, así que una página que solo se renderiza en el cliente llega casi vacía. El bot lo avisa.
- Un álbum necesita «listo», porque Telegram no avisa cuándo terminó.
- Si algo del material de una recolección es un reenvío, todo el texto del borrador se trata como externo.
- El video (Hyperframes) está solo preparado: [phase-2/HYPERFRAMES.md](phase-2/HYPERFRAMES.md).
