# Puesta en marcha

Todo el código está listo. Solo hay que crear las cuentas, poner las variables de entorno en Vercel y abrir una URL de configuración. Tiempo estimado: 45 minutos.

Plantilla de variables: [`.env.example`](../.env.example).

## 1. El sitio (10 min)

**Dominio.** En Vercel → proyecto `portafolio` → Settings → Domains:
- `mangel14.dev` es el dominio de producción.
- `www.mangel14.dev` y `portafolio.mangel14.dev` pueden quedar asignados al proyecto o redirigir a `mangel14.dev`: si llegan al sitio, `next.config.ts` los redirige con 301. Lo mismo pasa con `portafolio-inky-rho.vercel.app`.

**Variables** en Settings → Environment Variables (Production y Preview):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://mangel14.dev` (es el valor por defecto; ponla igual para dejarlo explícito) |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | La clave de web3forms.com (formulario de contacto) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Opcional, Google Analytics 4 |

Despliega (merge a `main`). Con eso el portafolio, el blog, el CV y el SEO quedan funcionando aunque el agente no esté configurado.

Después del primer deploy:

1. `pnpm indexnow` avisa a Bing y a Yandex de todas las URLs del sitemap.
2. [Google Search Console](https://search.google.com/search-console) → Agregar propiedad → **Dominio** → `mangel14.dev`. Te da un registro TXT: agrégalo en Vercel → Domains → `mangel14.dev` → DNS Records (tipo TXT, nombre `@`). La propiedad de dominio cubre también los subdominios. Luego Sitemaps → `https://mangel14.dev/sitemap.xml`.
3. [Bing Webmaster Tools](https://www.bing.com/webmasters) → "Import from Google Search Console". Bing es el índice que usan ChatGPT Search y Copilot.
4. Revisa en [Rich Results Test](https://search.google.com/test/rich-results) `https://mangel14.dev/es` y un artículo del blog.

## 2. Secretos propios (2 min)

Genera tres valores y guárdalos en Vercel:

```bash
openssl rand -hex 24   # TELEGRAM_WEBHOOK_SECRET
openssl rand -hex 24   # CRON_SECRET
openssl rand -hex 24   # ADMIN_SECRET
openssl rand -hex 32   # TOKEN_ENCRYPTION_KEY (exactamente 64 caracteres)
```

## 3. Modelo de lenguaje: OpenCode Go (5 min)

1. Entra a la consola de OpenCode, activa Go y crea una API key.
2. Revisa en sus términos que se permite usar la key fuera de OpenCode y los límites del plan.
3. Variables: `LLM_BASE_URL=https://opencode.ai/zen/go/v1`, `LLM_API_KEY`, `LLM_MODEL` (un modelo de la lista de tu plan).
4. Recomendado: un proveedor de respaldo compatible con OpenAI en `LLM_FALLBACK_*`. Si el principal falla, el agente usa el respaldo solo.

## 4. Base de datos: Supabase o Neon (5 min)

1. Crea un proyecto gratuito.
2. Copia la cadena de conexión con pooling (en Supabase: "Transaction pooler", puerto 6543) y agrega `?sslmode=require` si no lo trae.
3. Variable: `DATABASE_URL`.

Las tablas (`content_log`, `agent_kv`, `telegram_updates` y las del checkpointer de LangGraph) se crean solas en el paso 8.

## 5. Bot de Telegram (5 min)

1. Habla con [@BotFather](https://t.me/BotFather) → `/newbot` → copia el token → `TELEGRAM_BOT_TOKEN`.
2. Habla con [@userinfobot](https://t.me/userinfobot) → copia tu id → `TELEGRAM_CHAT_ID`.
3. Escríbele cualquier cosa a tu bot nuevo (Telegram no deja que un bot te escriba primero).

El bot solo responde a ese chat id: los mensajes de cualquier otra persona se ignoran.

## 6. GitHub (3 min)

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate.
2. Repository access: solo `MiguelBonilla-sys/portafolio`. Permissions: **Contents: Read and write**.
3. Variable: `GITHUB_TOKEN`. (`GITHUB_REPO` y `GITHUB_BRANCH` ya tienen valores por defecto.)

El agente publica cada artículo con un commit a `main`, y Vercel redespliega solo.

## 7. LinkedIn (10 min)

1. En [developer.linkedin.com](https://developer.linkedin.com/) crea una app (te pide asociarla a una página de empresa: puedes crear una página mínima con tu nombre).
2. En **Products** agrega **Share on LinkedIn** y **Sign In with LinkedIn using OpenID Connect**. Ambos se aprueban al instante.
3. En **Auth** → Authorized redirect URLs agrega: `https://mangel14.dev/api/linkedin/callback`.
4. Variables: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`. `LINKEDIN_API_VERSION` trae `202608`; si LinkedIn lo rechaza por antiguo, súbelo a un mes de los últimos 12.

## 8. Activar (2 min)

Despliega con todas las variables y corre:

```
curl -H "Authorization: Bearer TU_ADMIN_SECRET" https://mangel14.dev/api/agent/setup
```

El secreto va en el header y no en la URL, para que no quede en los logs de Vercel ni en el historial. Ese endpoint crea las tablas, registra el webhook de Telegram, te manda un mensaje de prueba y te dice qué falta. Si alguna variable falta o es inválida, la respuesta lo indica por nombre.

Luego conecta LinkedIn con el enlace que devuelve ese mismo comando en el campo `linkedin`. Es un enlace firmado que vence en 24 horas y no contiene `ADMIN_SECRET`; si vence, vuelve a correr el comando.

El token de LinkedIn dura 60 días. El cron diario te avisa por Telegram 10 días antes con un enlace nuevo.

## 9. Usarlo

Escríbele al bot lo que construiste, con cifras y decisiones. Por ejemplo:

> Integré QuickBooks Online con un agente en n8n. Fueron 4 días, 5 fases y 17 tareas. A mitad de camino el OAuth 2.0 fallaba porque el refresh token se guardaba antes de confirmar el intercambio; lo arreglé guardándolo después de la respuesta 200.

El bot te devuelve:
- el artículo en español e inglés (archivo adjunto)
- el post de LinkedIn
- la evaluación (especificidad, hechos, marcas de IA, pilar)
- los datos que faltan y lo que encontró el linter
- botones: ✅ Aprobar · ✏️ Editar · 🗓 Reprogramar · ❌ Rechazar

Al aprobar: commit del artículo → espera el deploy → post en LinkedIn → comentario con el enlace al blog → IndexNow → confirmación con las URLs.

Opciones al inicio del mensaje: `/es` (post en español) y `/carrusel` (además, un carrusel PDF). Comandos: `/estado`, `/cancelar`, `/ayuda`.

### Varios archivos para un solo artículo

Telegram manda cada archivo como un mensaje aparte. Para que imágenes, Markdown, PDF, notas y enlaces terminen en **un** borrador:

1. `/nuevo` (sin texto): el bot empieza a juntar.
2. Manda lo que quieras, en uno o varios mensajes. Cada uno se confirma («Llevo 3 archivos (1 imagen, 1 PDF, 1 documento) y 1 nota»). `/es` y `/carrusel` valen en cualquier momento.
3. `listo` (o `/listo`): arranca la investigación con todo junto.

- Un **álbum** cuenta como un solo borrador aunque no uses `/nuevo`; igual hay que escribir `listo` cuando terminen de llegar los archivos (Telegram no avisa cuándo termina un álbum).
- **Sumar material a una propuesta**: respóndele al mensaje de la propuesta con el archivo (o con un álbum y luego `listo`). El bot vuelve a revisar las fuentes y te manda una propuesta nueva. Después de redactado, el material nuevo ya no se suma.
- Límites por borrador: 10 archivos, 10 MB por archivo, 90.000 caracteres de texto en total. `/estado` muestra lo que llevas; `/cancelar` lo descarta; si pasan 6 horas sin `listo`, se descarta con aviso.
- Si algo del material es un mensaje reenviado, todo el texto del borrador se trata como externo (menos confianza en sus afirmaciones).

## 10. Tarjeta de contacto y Wallet (opcional)

La tarjeta ya funciona sin configurar nada:
- `https://mangel14.dev/es/tarjeta` (o `/en/card`): tu tarjeta con QR, para mostrarla o compartir el enlace.
- `https://mangel14.dev/contact.vcf`: el contacto con foto. El QR apunta aquí: quien lo escanee con la cámara lo guarda en un toque, en iPhone o Android.

El botón "Agregar a Google Wallet" aparece solo cuando sus variables están en Vercel y vuelves a desplegar. Apple Wallet no está soportado: firmar pases exige el Apple Developer Program (99 USD/año). En iPhone, el QR de la vCard cumple la misma función. El pase lleva el mismo QR, así que lo muestras desde el Wallet del celular sin abrir el navegador.

### Google Wallet (gratis)

1. [Google Pay & Wallet Console](https://pay.google.com/business/console) → Google Wallet API → crea la cuenta de emisor y copia el **Issuer ID**.
2. [Google Cloud Console](https://console.cloud.google.com): crea un proyecto, habilita **Google Wallet API**, crea una **cuenta de servicio** y descarga su llave JSON.
3. En Pay & Wallet Console → **Users**, invita el correo de la cuenta de servicio con rol Developer.
4. Variables:

   | Variable | Valor |
   |---|---|
   | `GOOGLE_WALLET_ISSUER_ID` | el Issuer ID |
   | `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL` | `client_email` del JSON |
   | `GOOGLE_WALLET_PRIVATE_KEY` | `private_key` del JSON, tal cual (con los `\n`) |

5. Redespliega y abre `https://mangel14.dev/api/wallet/google` en Android.

Mientras la cuenta de emisor está en modo demo, solo pueden guardar el pase los correos que agregues como usuarios de prueba en la consola (el tuyo incluido). Para que cualquiera pueda guardarlo: Google Wallet API → **Request publishing access** (Google lo revisa en unos días).

Si cambias la foto o el símbolo: `pnpm wallet-assets` regenera las imágenes de `wallet/` y `public/wallet/`.

## Qué hace el cron diario (entre las 8:00 y las 9:00 a. m., hora de Bogotá)

- Publica lo programado cuya hora ya pasó. Como corre una vez al día (plan Hobby de Vercel), algo programado para las 6:30 p. m. sale a la mañana siguiente; al programar, el bot te dice el día exacto. Las horas se escriben en formato de 12 horas: `2026-11-03 6:30 pm` o `2026-11-03 8 am` (sin «am» o «pm», el bot pregunta).
- Reintenta los artículos cuyo deploy no respondió.
- Marca como expirado lo que lleva más de 48 h sin respuesta.
- Avisa si el token de LinkedIn vence en 10 días o menos.
- Los lunes te pide material; los domingos te manda el resumen semanal.

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El bot no responde | Corre el `curl` a `/api/agent/setup` del paso 8: muestra variables faltantes y el estado del webhook |
| "LinkedIn necesita reconectarse" | Abre el enlace del mensaje y luego toca 🔁 Reintentar |
| "El deploy aún no responde" | Revisa el build en Vercel; el cron reintenta cada mañana |
| El carrusel no se publica | LinkedIn puede rechazar documentos en perfiles personales: el agente publica el post como texto y te avisa |
| Error del modelo | Revisa los límites de OpenCode Go o configura `LLM_FALLBACK_*` |

## Desarrollo local

```bash
cp .env.example .env.local   # completa lo que necesites
pnpm dev                  # muestra también los borradores del blog
pnpm test                     # linter anti-slop y grafo completo con un LLM simulado
pnpm cv                   # regenera public/cv/*.pdf (con el sitio corriendo; ver scripts/build-cv.mjs)
```

## Opcional: imágenes en Telegram

`LLM_VISION_MODEL` (mismo proveedor y llave que `LLM_*`) permite describir imágenes que envíes al bot. Sin esa variable, el bot recibe la imagen, avisa que no puede leerla y te pide describirla: nunca inventa su contenido.
