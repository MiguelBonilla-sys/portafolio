# Spec: Portafolio + Content Engine

## Problem

Miguel Bonilla, estudiante de noveno semestre de Ingeniería de Sistemas y Full Stack Developer en Coordenadas.co, busca empleo remoto como Full Stack / AI Engineer. Hoy su portafolio está bien construido técnicamente, pero no demuestra lo que promete. El hero menciona WordPress, Next.js y automatización; los proyectos son académicos en Python y Java, sin demos ni resultados medibles. LinkedIn no tiene una estrategia de contenido y el sitio no está preparado para que lo encuentren ni lo citen los buscadores de IA. Con 10 horas a la semana, no puede sostener a mano un blog bilingüe más tres posts semanales.

## Success Metrics (v1)

| Metric | Target | How measured |
|--------|--------|--------------|
| Entrevistas | ≥ 4 en 12 semanas | Registro manual |
| Mensajes de recruiters | ≥ 2/mes desde el mes 2 | Bandeja de LinkedIn |
| Search appearances | ×2 frente a la línea base T0 | Panel de LinkedIn |
| Impresiones semanales | ×3 frente a T0 | Analytics de LinkedIn |
| Sesiones orgánicas | ≥ 300/mes en el mes 3 | GA4 + Search Console |
| Referencias desde IA | ≥ 1 sesión/semana | GA4, segmento chatgpt.com, perplexity.ai, claude.ai, gemini.google.com |
| Artículos publicados | 12 × 2 idiomas | Repo `content/blog` |
| Tiempo por pieza publicada | ≤ 20 min de revisión humana | Registro del pipeline (`content_log`) |
| Posts publicados sin aprobación | 0 | `content_log` |

## Users

- **Primary**: recruiter técnico o hiring manager de empresa remota (EE. UU./LatAm). Revisa un perfil en menos de 60 s, busca por skills en LinkedIn Recruiter y abre el portafolio solo si el titular encaja.
- **Secondary**: dueño de agencia o negocio que usa CRM (GoHighLevel, HubSpot) y n8n y necesita automatizar con IA.
- **Tertiary (máquinas)**: Googlebot, Bingbot, OAI-SearchBot, PerplexityBot y Claude-SearchBot, que deciden si el sitio entra en una respuesta generada.
- **Operador**: Miguel, que aprueba contenido desde el teléfono.

## Core Features (v1)

| ID | Feature | Priority | Acceptance Criteria |
|----|---------|----------|---------------------|
| F1 | Reposicionamiento del portafolio | P0 | Cuando un visitante carga `/`, el hero muestra el titular "Full Stack AI Engineer" y cada tecnología del subtítulo está respaldada por al menos un proyecto listado. Las métricas de relleno ("100% proyectos entregados") no existen. |
| F2 | Casos de estudio | P0 | Cuando un visitante abre un proyecto destacado, ve problema, solución, stack y al menos un resultado numérico. Hay ≥ 3 casos, ≥ 1 con demo pública. |
| F3 | Sitio bilingüe | P0 | Cuando se solicita `/es/...` o `/en/...`, todo el texto visible está en ese idioma, `<html lang>` coincide y cada página declara `hreflang` es, en y x-default. `/` redirige según `Accept-Language`. |
| F4 | Blog MDX | P0 | Cuando existe `content/blog/{locale}/{slug}.mdx` con frontmatter válido, el build genera `/{locale}/blog/{slug}` estático, el índice lo lista por fecha y el RSS lo incluye. Un frontmatter inválido rompe el build. |
| F5 | SEO técnico | P0 | `sitemap.xml` lista todas las URLs de ambos idiomas; `robots.txt` permite Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot y Claude-SearchBot; Lighthouse SEO = 100 en `/`, `/en/blog` y un artículo. |
| F6 | GEO / datos estructurados | P0 | Cada página emite JSON-LD válido (Rich Results Test sin errores): Person + WebSite en el home, BlogPosting + BreadcrumbList en artículos, FAQPage cuando el artículo tiene FAQ. Existe `/llms.txt` con resumen, proyectos y artículos. Todo el texto está en el HTML del servidor. |
| F7 | Indexación y medición | P0 | El sitio está verificado en Google Search Console y Bing Webmaster Tools. Al publicar un artículo se envía un ping a IndexNow. GA4 tiene un segmento de referrers de IA. |
| F8 | Perfil de LinkedIn optimizado | P0 | Headline, About, Featured, Skills y experiencia actualizados según `plan.md` §5, en EN y ES. Cada skill del top 5 tiene un proyecto que la respalda. |
| F9 | Content Engine: generación | P0 | Cuando llega una idea por Telegram o el cron semanal se dispara, el sistema produce en ≤ 5 min: artículo es, artículo en, post de LinkedIn y metadatos SEO, usando solo hechos del material de entrada. |
| F10 | Content Engine: filtro anti-slop | P0 | Cuando un borrador contiene una marca P0/P1 de `content-style-guide.md` o un marcador `[DATO?]`, el sistema lo reescribe (máx. 2 pasadas). Si persiste, lo envía a Telegram marcado como "bloqueado" y sin el botón Aprobar. |
| F11 | Content Engine: aprobación | P0 | Cuando un borrador está listo, Telegram recibe la vista previa con los botones Aprobar, Editar, Rechazar y Reprogramar. Nada se publica sin Aprobar. Sin respuesta en 48 h, el borrador expira. |
| F12 | Content Engine: publicación | P0 | Cuando se aprueba, el sistema hace commit de los MDX, espera a que la URL del artículo responda 200, publica en LinkedIn, comenta con el enlace al blog, envía el ping a IndexNow y confirma por Telegram con ambas URLs. Si un paso falla, avisa por Telegram con el paso y el error, y no repite publicaciones ya hechas. |
| F13 | Carruseles PDF | P1 | Cuando el post es de tipo carrusel, el sistema genera un PDF de 6–10 láminas con la plantilla de marca y lo publica como documento en LinkedIn. Depende del spike T30. |
| F14 | Evals de contenido | P1 | Cada borrador recibe una puntuación (especificidad, densidad de hechos, marcas de IA, ajuste al pilar) guardada en `content_log`. El panel semanal muestra la tendencia. |
| F15 | CV descargable | P1 | Existe `/cv-en.pdf` y `/cv-es.pdf`, enlazados desde el hero y el contacto. |
| F16 | Higiene del repo | P1 | `package.json` contiene solo dependencias importadas; `npm run build` y `npm run lint` pasan. |

## Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | LCP < 2,5 s y CLS < 0,1 en móvil (PageSpeed). La escena 3D se carga diferida y no bloquea el contenido. |
| SEO | Todo el texto relevante se renderiza en el servidor (SSG). Ningún contenido indexable depende de JS del cliente. |
| Security | Tokens (LinkedIn, GitHub, Telegram, LLM) solo en variables de entorno de n8n y Langflow, nunca en el repo. El bot de Telegram solo acepta mensajes del chat ID de Miguel. El webhook de Langflow exige `x-api-key`. |
| Reliability | La publicación es idempotente: cada pieza tiene un `content_id` y cada paso registra su resultado; un reintento salta los pasos completados. |
| Availability | Si el pipeline cae, el sitio sigue funcionando (es estático). Los borradores pendientes se conservan. |
| Cost | Infraestructura del pipeline ≤ USD 15/mes (VPS + API de LLM). |
| Accesibilidad | Se mantienen las prácticas actuales (`aria-live`, `aria-hidden`, labels). Contraste AA en ambos temas. |
| Contenido | 0 cifras, clientes o experiencias inventadas. Cada dato numérico tiene origen en el material de entrada o en una fuente citada. |

## Out of Scope (v1)

- Newsletter, X/Twitter, Threads y otras redes sociales.
- CMS con panel web (el editor es el repo + Telegram).
- Comentarios en el blog.
- Publicación en páginas de empresa de LinkedIn (`w_organization_social`).
- Lectura de métricas de LinkedIn por API (`r_member_social` está restringido): las métricas se registran a mano cada semana.
- Video automático. Los videos nativos se graban y suben a mano.
- Más de dos idiomas.
- Respuesta automática a comentarios de LinkedIn.

## Assumptions

| Assumption | Risk (H/M/L) | Mitigation |
|------------|--------------|-----------|
| La API de LinkedIn permite posts de documento (PDF) en perfiles personales con `w_member_social` | H | La doc oficial indica "Documents: organic yes", pero hay proveedores que lo niegan. Spike T30 antes de construir F13. Plan B: carrusel como post multi-imagen o subida manual. |
| Miguel aporta material real cada semana (notas, audios, commits) | H | El cron semanal pide material por Telegram el lunes. Sin material no hay generación: se publica un post de la reserva (`backlog`). |
| El token de LinkedIn (60 días) se renueva a tiempo | M | Recordatorio por Telegram el día 50 y bloqueo de la publicación si el token venció. |
| Un sitio personal nuevo puede aparecer en respuestas de IA | M | Las consultas de marca ("Miguel Bonilla AI engineer") son alcanzables; las genéricas no, sin autoridad de dominio. Las metas de GEO se limitan a marca y nicho. |
| 10 h/semana son sostenibles junto con trabajo y universidad | M | Fases independientes; la fase 3 se puede recortar sin afectar las fases 1 y 2. |
| Las reglas anti-slop en inglés sirven para el español | M | Guía con lista propia para español (`content-style-guide.md` §3). |
| Publicar por API no penaliza el alcance frente a publicar nativo | L | Se usa la API oficial (contenido nativo, no enlaces). Se compara el alcance de 4 posts manuales frente a 4 por API en la fase 2. |

## Open Questions

- [ ] Dominio de producción y valor de `NEXT_PUBLIC_SITE_URL`. Owner: Miguel. Antes de T5.
- [ ] Proveedor de LLM para el redactor (API de Claude, otra API u Ollama local) y presupuesto mensual. Owner: Miguel. Antes de T20.
- [ ] Confirmar el email de contacto público (el sitio muestra `miguelangelboto14@gmail.com`). Owner: Miguel. Antes de T3.
