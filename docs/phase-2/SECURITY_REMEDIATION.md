# Remediación de seguridad · fase 2

> Fecha: 2026-10-23. Ningún secreto se copió, imprimió ni registró durante esta revisión: los conteos se obtuvieron leyendo solo las claves del JSON.

## 1. Repositorio `API_AUTH_HACKATON`

### Estado verificado

| Comprobación | Resultado | Cómo |
|---|---|---|
| `scripts/user_credentials.json` en el árbol actual | Sí, en `main`, `development`, `feature` y `release` | `git ls-tree` por rama tras un fetch de todas las ramas |
| Contenido | 25 cuentas (1 superusuario), dominio `inventario.gov.co`, **2 contraseñas distintas** compartidas por todas | Conteo de claves y longitudes, sin leer valores |
| Commits del historial con el archivo | 2 (de 14 commits en total) | `git log --all -- scripts/user_credentials.json` |
| Secreto JWT por defecto en `src/auth/jwt_utils.py` | Sí, en las 4 ramas | `git show` por rama |
| Despliegue vivo que use esas cuentas | **Desconocido** (no hay URL pública en el repo) | — |
| Acceso de escritura de esta sesión | Sí (`add_repo` con `push`) | — |

### Medidas

| # | Medida | Estado | Detalle |
|---|---|---|---|
| 1 | Retirar el enlace público al repositorio desde el portafolio | ✅ Hecho | `links.repo = null` + `repoWithheld: true` en `data/projects.*.json`; la ficha dice "Repositorio no enlazado temporalmente; el código está disponible a pedido". También fuera de los borradores del blog, `llms.txt`, `llms-full.txt` y `docs/linkedin-profile.md`. `test/content.test.ts` y `test/consistency.test.ts` fallan si el enlace vuelve antes de tiempo |
| 2 | Borrar el archivo del árbol y exigir `JWT_SECRET_KEY` | ✅ En una rama, **sin fusionar** | Rama `security/remove-exposed-credentials` (commit `0f27b6f`) en `API_AUTH_HACKATON`: borra el archivo, lo agrega a `.gitignore`, el arranque falla si `JWT_SECRET_KEY` falta, mide menos de 32 caracteres o es un valor de ejemplo conocido, y `.env.example` ya no trae un secreto con apariencia válida. Probado: vacío → rechazado, valor por defecto → rechazado, 40 caracteres aleatorios → aceptado |
| 3 | Rotar o desactivar las 25 cuentas | ⛔ **Pendiente del dueño** | Si existe cualquier despliegue (Railway u otro) con esas cuentas, están comprometidas: cualquiera con el enlace del repo vio las contraseñas. El incidente no está resuelto hasta esto |
| 4 | Cambiar `JWT_SECRET_KEY` en cualquier despliegue | ⛔ **Pendiente del dueño** | Un despliegue que nunca definió la variable firmó tokens con el valor público: cualquiera puede falsificar un token de superusuario |
| 5 | Purgar el historial | ⛔ **Pendiente de aprobación explícita** | Procedimiento abajo, probado en una copia local desechable; no se hizo force-push |
| 6 | Volver a enlazar el repositorio | Después de 3, 4 y 5 | Quitar `repoWithheld` y restaurar `links.repo`; actualizar los tests |

Borrar el archivo del último commit **no** elimina la exposición: sigue en el historial de las 4 ramas, en los forks y en cualquier clon existente. Por eso la rotación (3 y 4) va primero.

### Procedimiento de purga del historial (requiere aprobación del dueño)

Probado el 2026-10-23 sobre un `git clone --mirror` local que después se borró: el archivo pasó de estar en 2 commits a 0 en las 5 ramas, y el valor por defecto del secreto quedó reemplazado en el código. No se envió nada.

```bash
# 0. Rotar las contraseñas y el JWT_SECRET_KEY de cualquier despliegue ANTES de esto.
# 1. Fusionar (o descartar) la rama security/remove-exposed-credentials.
pip install git-filter-repo==2.47.0
git clone --mirror https://github.com/MiguelBonilla-sys/API_AUTH_HACKATON.git
cd API_AUTH_HACKATON.git
printf 'your-super-secret-jwt-key-here-change-this-in-production==>REMOVED-DEFAULT-SECRET\nyour-super-secret-jwt-key-change-this-in-production==>REMOVED-DEFAULT-SECRET\n' > ../replacements.txt
git filter-repo --invert-paths --path scripts/user_credentials.json --replace-text ../replacements.txt
# Verificar antes de enviar: debe imprimir 0
git log --all --format=%h -- scripts/user_credentials.json | wc -l
# 2. Reescribe TODAS las ramas del repositorio público: es irreversible para quien tenga clones
git push --force --mirror
```

Después: pedir a GitHub Support que purgue las vistas en caché de los commits antiguos ("Removing sensitive data from a repository") y revisar si hay forks. Alternativa más simple si el proyecto ya no importa: archivar o hacer privado el repositorio después de rotar.

## 2. Content Engine y Telegram

| Riesgo | Estado anterior | Ahora | Evidencia |
|---|---|---|---|
| Webhook sin autenticar | Secreto `x-telegram-bot-api-secret-token` con comparación constante | Igual, más límite de 256 KB y 400 controlado ante JSON inválido | `app/api/telegram/route.ts` |
| Identidad del remitente | Solo `chat.id` | Chat privado, `chat.id` = `from.id` = `TELEGRAM_CHAT_ID`, sin bots | `isAuthorized` · `handlers.test.ts` |
| Replay y duplicados | `claimUpdate(update_id)` | Igual, más candado atómico por pieza (5 min) para que dos botones no reanuden el grafo a la vez | `tryLock` · test "update repetido" |
| Mensajes reenviados | Se trataban como instrucciones del autor | Son material externo: nunca ejecutan comandos y se citan como fuente no confiable | test "un mensaje reenviado es material externo" |
| Archivos adjuntos | No se aceptaban | Tipo por firma de bytes (no por MIME ni extensión), 10 MB por archivo, 1 MB de texto, 60 páginas de PDF, límites totales de caracteres | `agent/inputs.ts` · `security.test.ts` |
| URLs (SSRF) | No se leían | `safeFetch`: solo http(s) en 80/443, sin credenciales en la URL, IPs privadas, loopback, link-local, metadatos y CGNAT bloqueadas **en el momento de conectar** (sin ventana de DNS rebinding), redirecciones revalidadas, 10 s, 2 MB, tipos de contenido acotados | `agent/lib/safe-fetch.ts` · `security.test.ts` |
| Prompt injection | Las notas se metían en el prompt | Fuentes delimitadas con `<fuente confianza="externa">`, regla explícita de "dato, no instrucción" en el sistema, aviso al autor si el material trae frases de inyección; el modelo no tiene herramientas: lo único que produce es texto que el autor revisa | `sourcesBlock`, `injectionWarning`, `FACT_RULES` |
| MDX generado | Se escribía tal cual; MDX compila JSX | `sanitizeMdxBody` escapa etiquetas, llaves e `import/export`, quita enlaces `javascript:`/`data:` e imágenes externas; el código se conserva. Verificado compilando con `next-mdx-remote`: todo queda como texto literal | `agent/lib/mdx.ts` · `security.test.ts` |
| Path traversal | Slug derivado del título | Además, `blogPath`/`assetPath` rechazan cualquier slug fuera de `^[a-z0-9-]+$` | `security.test.ts` |
| Fuga de detalles en errores | `e.message` crudo al chat | Mensaje humano + referencia; el detalle va redactado a los logs | `toPublicError`, `redact` |
| Secretos en logs | URL de Telegram con token posible en errores | `redact` elimina tokens de bot, Bearer, llaves de GitHub/OpenAI, contraseñas en cadenas de conexión y parámetros `code`/`token` | `security.test.ts` |
| Cron sin configurar | Respondía la lista de variables faltantes a cualquiera | Solo "sin configurar"; el detalle exige `ADMIN_SECRET` | `app/api/cron/daily/route.ts` |
| OAuth de LinkedIn | `state` en cookie, enlace firmado de 24 h, token cifrado AES-256-GCM | Igual; el error del intercambio ya no rompe con 500 ni muestra la respuesta de LinkedIn | `app/api/linkedin/callback/route.ts` |
| Scopes de LinkedIn | `openid profile w_member_social` | Sin cambios: mínimos para publicar, comentar y subir imágenes o documentos | `agent/lib/linkedin.ts` |
| Rate limiting | No había | 10 piezas nuevas por hora (protege el costo de LLM ante un bucle) | `rateHit` · test "límite de borradores" |
| Idempotencia de publicación | Pasos en `state.steps` | Igual, más versión + hash por aprobación; marcador antes de `createPost` para no duplicar un post si la ejecución se corta (LinkedIn no tiene clave de idempotencia) | tests de versión anterior e intento cortado |
| Secretos de Vercel | Validados con zod al usarse | Sin cambios; `fetchPage` del validador solo lee el propio sitio | `agent/runtime.ts` |

### Riesgos que quedan

- La descripción de imágenes depende del proveedor del LLM; su política de retención aplica a lo que se envía.
- `safeFetch` no ejecuta JavaScript: páginas que solo renderizan en el cliente llegan casi vacías (el bot lo avisa).
- El candado por pieza vence a los 5 minutos; una ejecución de más de 5 minutos (fuera del límite de 300 s de Vercel) no debería ocurrir.
- No se probó contra la cuenta real de LinkedIn ni contra el webhook real de producción: esta sesión no tiene esos secretos.
