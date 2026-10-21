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

1. `npm run indexnow` avisa a Bing y a Yandex de todas las URLs del sitemap.
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

Despliega con todas las variables y abre:

```
https://mangel14.dev/api/agent/setup?key=TU_ADMIN_SECRET
```

Esa URL crea las tablas, registra el webhook de Telegram, te manda un mensaje de prueba y te dice qué falta. Si alguna variable falta o es inválida, la respuesta lo indica por nombre.

Luego conecta LinkedIn abriendo:

```
https://mangel14.dev/api/linkedin/auth?key=TU_ADMIN_SECRET
```

El token dura 60 días. El cron diario te avisa por Telegram 10 días antes con el mismo enlace.

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

## 10. Tarjeta de contacto y Wallet (opcional)

La tarjeta ya funciona sin configurar nada:
- `https://mangel14.dev/es/tarjeta` (o `/en/card`): tu tarjeta con QR, para mostrarla o compartir el enlace.
- `https://mangel14.dev/contact.vcf`: el contacto con foto. El QR apunta aquí: quien lo escanee con la cámara lo guarda en un toque, en iPhone o Android.

Los botones "Agregar a Apple Wallet" y "Agregar a Google Wallet" aparecen solos cuando sus variables están en Vercel y vuelves a desplegar. El pase lleva el mismo QR, así que lo muestras desde el Wallet del celular sin abrir el navegador.

### Apple Wallet (requiere Apple Developer Program, 99 USD/año)

1. [developer.apple.com/account](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Identifiers → **+** → **Pass Type IDs** → `pass.dev.mangel14.card`.
2. Genera la llave y la solicitud de certificado:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout pass.key -out pass.csr -subj "/CN=Mangel14 Pass"
   ```
3. En el Pass Type ID → **Create Certificate** → sube `pass.csr` → descarga `pass.cer` y conviértelo:
   ```bash
   openssl x509 -inform DER -in pass.cer -out pass.pem
   ```
4. Descarga el intermedio de Apple [WWDR G4](https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer) y conviértelo:
   ```bash
   openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
   ```
5. Variables (en macOS usa `base64 -i archivo`; en Linux `base64 -w0 archivo`):

   | Variable | Valor |
   |---|---|
   | `APPLE_WALLET_PASS_TYPE_ID` | `pass.dev.mangel14.card` |
   | `APPLE_WALLET_TEAM_ID` | Membership → Team ID (10 caracteres) |
   | `APPLE_WALLET_SIGNER_CERT` | `base64` de `pass.pem` |
   | `APPLE_WALLET_SIGNER_KEY` | `base64` de `pass.key` |
   | `APPLE_WALLET_WWDR_CERT` | `base64` de `wwdr.pem` |

6. Redespliega y abre `https://mangel14.dev/api/wallet/apple` en Safari del iPhone.

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

Si cambias la foto o el símbolo: `npm run wallet-assets` regenera las imágenes de `wallet/` y `public/wallet/`.

## Qué hace el cron diario (8:00 Bogotá)

- Publica lo programado para ese día.
- Reintenta los artículos cuyo deploy no respondió.
- Marca como expirado lo que lleva más de 48 h sin respuesta.
- Avisa si el token de LinkedIn vence en 10 días o menos.
- Los lunes te pide material; los domingos te manda el resumen semanal.

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El bot no responde | Abre `/api/agent/setup?key=…`: muestra variables faltantes y el estado del webhook |
| "LinkedIn necesita reconectarse" | Abre el enlace del mensaje y luego toca 🔁 Reintentar |
| "El deploy aún no responde" | Revisa el build en Vercel; el cron reintenta cada mañana |
| El carrusel no se publica | LinkedIn puede rechazar documentos en perfiles personales: el agente publica el post como texto y te avisa |
| Error del modelo | Revisa los límites de OpenCode Go o configura `LLM_FALLBACK_*` |

## Desarrollo local

```bash
cp .env.example .env.local   # completa lo que necesites
npm run dev                  # muestra también los borradores del blog
npm test                     # linter anti-slop y grafo completo con un LLM simulado
npm run cv                   # regenera public/cv/*.pdf (con el sitio corriendo; ver scripts/build-cv.mjs)
```
