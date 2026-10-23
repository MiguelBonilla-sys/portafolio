# Content Engine · preparación para producción

> No se reconstruyó nada, no se activó la publicación automática y no se publicó ningún artículo ni post.
> Base: el código de las fases 1 y 2 en esta rama; la producción revisada solo en lectura.

## 1. Estado por punto

| Punto | Dónde | Estado |
|---|---|---|
| Documentación de variables | `.env.example`, `docs/setup.md` | Completa: 12 obligatorias (validadas con zod en `agent/config.ts`), las que tienen valor por defecto y las opcionales (`LLM_VISION_MODEL`, `AGENT_TIMEZONE`, `DEPLOY_WAIT_SECONDS`, `INDEXNOW_KEY`, `SHOW_DRAFTS`) |
| Verificación del webhook | `app/api/telegram/route.ts` | Header `x-telegram-bot-api-secret-token` comparado en tiempo constante; 401 si no coincide; 413 sobre 256 KB; 400 con JSON inválido; 503 si faltan variables |
| Autorización en Telegram | `isAuthorized` en `agent/handlers.ts` | Solo chat privado, con `chat.id` = `from.id` = `TELEGRAM_CHAT_ID` y sin bots. Los botones solo los acepta el mismo usuario |
| Cron y rutas de administración | `app/api/cron/daily`, `app/api/agent/setup` | `Bearer` con `CRON_SECRET` / `ADMIN_SECRET`; las respuestas no detallan qué variable falta |
| Persistencia | `agent/runtime.ts`, `agent/lib/db.ts` | `PostgresSaver` (checkpoints de LangGraph) y tablas propias; migración aditiva al arrancar (`CREATE ... IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) |
| Aprobación humana | `agent/graph.ts`, `agent/editorial.ts` | Cada aprobación lleva versión y `contentHash`; una aprobación de una versión vieja se rechaza. Blog y LinkedIn se aprueban por separado. `[DATO?]` bloquea |
| Publicación sin humano | `runDaily` | **No existe**. El cron solo publica lo que el autor aprobó y programó, y con el hash guardado; además reintenta deploys y vence propuestas de más de 48 h |
| Duplicados | `claimUpdate` (tabla `telegram_updates`), `tryLock`, `rateHit` | Un reintento de Telegram no se procesa dos veces; un candado por pieza; 10 piezas nuevas por hora |
| LinkedIn | `agent/lib/linkedin.ts` | Sin clave de idempotencia en la API: un intento cortado pide confirmación manual en vez de repetirse |
| Errores y logs | `agent/lib/redact.ts` | `logError` redacta tokens, claves y URLs con credenciales; el usuario ve un mensaje con una referencia, sin detalles internos |
| Pruebas | `agent/test/*` | 55 pruebas del agente con dobles de Telegram, GitHub, LinkedIn, LLM y base de datos. **Ninguna contra servicios reales** |

## 2. Bloqueos reales

| # | Bloqueo | Tipo | Qué lo resuelve |
|---|---|---|---|
| 1 | El código de las fases 1 y 2 no está en `main` ni en producción: hoy corre la versión anterior del agente | **Pendiente de autorización** | Fusionar la rama y desplegar |
| 2 | Después del deploy hay que volver a registrar el webhook y crear las tablas nuevas | Operativo | `GET /api/agent/setup` con `Authorization: Bearer $ADMIN_SECRET`: crea tablas y checkpointer, registra el webhook con su secreto, dice si LinkedIn está conectado y manda un mensaje de prueba (`docs/setup.md` §8) |
| 3 | La migración agrega columnas y tablas. Las piezas a medio aprobar del grafo anterior pueden no reanudarse con el grafo nuevo | Riesgo bajo | Antes del deploy, terminar o cancelar lo pendiente en el bot; no hay contenido publicado por el agente en el repo, así que lo más probable es que no haya nada pendiente |
| 4 | No se pudo comprobar que las variables de producción tengan los valores correctos: solo que existen (las rutas responden 401 y no 503) | **Pendiente de evidencia** | Prueba de humo del §3 |
| 5 | LinkedIn: no se sabe si hay un token vigente | **Pendiente de evidencia** | La respuesta de `/api/agent/setup` o `/estado` en el bot |
| 6 | `GITHUB_TOKEN` debe ser fine-grained con "Contents: Read and write" solo en este repositorio | **Pendiente de evidencia** | Revisarlo en GitHub (no está a la vista desde aquí) |

Ninguno es un defecto del código encontrado en esta fase.

## 3. Prueba de humo después del deploy (la hace el dueño)

1. `GET /api/agent/setup` con el `ADMIN_SECRET` → `ok: true`, webhook registrado y mensaje de prueba en Telegram.
2. En Telegram: `/estado` → muestra la configuración sin secretos.
3. `/nuevo` con una nota corta inventada para la prueba → llega una propuesta (todavía no hay borrador).
4. Aceptar → llega la vista previa con versión y hash.
5. **Cancelar** (no publicar). Comprobar que no aparece ningún commit en el repositorio.
6. Opcional, solo cuando quiera publicar de verdad: «Solo blog» con una pieza real; revisar la página; después LinkedIn por separado.

## 4. Fuera de alcance de esta fase

No hay video (Hyperframes es solo preparación, `docs/phase-2/HYPERFRAMES.md`) ni publicación automática, y no se cambió ningún secreto de producción.
