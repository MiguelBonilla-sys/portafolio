# Auditoría inicial: mangel14.dev

> Fecha: 2026-10-23 · Commit auditado: `f519a52` · Rama: `ccr-82e185fe-xk2i5l`
> Método: lectura completa del repositorio, build de producción local (`pnpm build && pnpm start`), recorrido con Playwright (Chromium 1194) de 18 rutas × 7 anchos (320, 375, 390, 768, 1024, 1440, 1920 px), axe-core 4.10 (WCAG 2.0/2.1/2.2 A-AA + best practices) en tema oscuro y claro, verificación HTTP de todos los enlaces internos y lectura de los repositorios de GitHub enlazados desde los proyectos.
> Los repositorios privados se leyeron solo para verificar afirmaciones; nada de su contenido se publica en el sitio.

## 1. Inventario técnico

| Área | Estado encontrado |
|---|---|
| Framework | Next.js 16.3.8 (App Router, Turbopack), React 19.2.3, TypeScript 5.9 estricto |
| Arquitectura | Sitio estático (SSG) + rutas API del Content Engine (LangGraph.js) en el mismo deploy de Vercel |
| Rutas públicas | `/[locale]` (home con secciones About, Stack, Experiencia, Proyectos, Contacto), `/blog`, `/blog/[slug]`, `/cv`, `/privacidad` (`/privacy`), `/tarjeta` (`/card`, noindex), `/proyectos/[id]` (`/projects/[id]`), `feed.xml`, `opengraph-image`, `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml`, `contact.vcf`; 404 localizado y `global-not-found` |
| Rutas API | `/api/telegram`, `/api/cron/daily`, `/api/agent/setup`, `/api/linkedin/{auth,callback}`, `/api/wallet/google` (todas con secreto) |
| i18n | next-intl 4, `localePrefix: "always"`, `es` por defecto, rutas localizadas (`/proyectos` ↔ `/projects`) |
| Contenido | JSON en `data/` (proyectos, experiencia, skills), textos en `messages/{es,en}.json`, blog MDX con frontmatter validado por zod |
| Estilos | CSS Modules + tokens en `app/globals.css`; identidad documentada en `DESIGN.md` (brutalismo cyberpunk, azul + cian) |
| Fuentes | 3 woff2 locales recortadas (54 KB en total) |
| Imágenes | `next/image` solo para el avatar; OG generada con `next/og` |
| SEO | metadata por página, canonical + hreflang, sitemap con alternates, JSON-LD (ProfilePage/Person, WebSite, ItemList, SoftwareSourceCode, BlogPosting, BreadcrumbList, FAQPage) |
| Contacto | Formulario cliente → Web3Forms (clave pública `NEXT_PUBLIC_WEB3FORMS_KEY`), honeypot, validación propia; enlaces a correo, LinkedIn, GitHub, X; vCard |
| Analítica | Vercel Web Analytics + GA4 diferido a la primera interacción |
| Tests | `pnpm test`: 16 pruebas `node:test` del agente (linter, auth, grafo con LLM simulado). Sin pruebas del sitio ni E2E |
| Despliegue | Vercel; `vercel.json` con un cron diario; redirecciones 301 de hosts secundarios en `next.config.ts` |

## 2. Línea base de verificación

| Comando | Resultado |
|---|---|
| `pnpm lint` | ✅ 0 errores |
| `pnpm build` | ✅ 54 páginas estáticas |
| `npx tsc --noEmit` | ✅ tras el build (antes del build fallan los tipos generados `PageProps`/`LayoutProps`, que Next crea en `.next/types`: no es un error del código) |
| `pnpm test` | ✅ 16/16 |
| Enlaces internos (49 URLs) | ✅ todos 200; `/` → 307 a `/es`; `/foo.png` → 404 |

## 3. Hallazgos

Severidad: **Critical** (daño real a la credibilidad, seguridad o datos), **High** (afecta la decisión del reclutador o un criterio de aceptación), **Medium** (degrada calidad o SEO), **Low** (pulido).
Estado: **Confirmado** (reproducido con evidencia) o **Hipótesis** (requiere validación).

### Seguridad y veracidad

#### A-01 · Credenciales en texto plano en un repositorio público enlazado como destacado
- **Archivo:** `github.com/MiguelBonilla-sys/API_AUTH_HACKATON` → `scripts/user_credentials.json` (repo externo, enlazado desde `data/projects.*.json`, proyecto `api-auth-hackaton`)
- **Problema:** el archivo contiene 25 cuentas (1 superusuario) con usuario, correo, nombre completo y **contraseña en claro**. Además `src/auth/jwt_utils.py` cae a un secreto JWT por defecto si falta la variable de entorno.
- **Evidencia:** commit `4bf20ca` del repo; claves del JSON: `username, email, password, full_name, dueno_de_activo, is_superuser, role`. No se copió ningún valor.
- **Severidad:** Critical · **Estado:** Confirmado
- **Impacto:** un tech lead que abre el repo desde el portafolio ve contraseñas publicadas: anula el mensaje de "APIs seguras". Si las cuentas o correos son reales, es exposición de datos personales.
- **Solución propuesta:** (fuera del alcance de esta sesión, que no tiene permisos de escritura sobre ese repo) rotar las contraseñas si alguna cuenta sigue activa, borrar el archivo, purgar el historial (`git filter-repo`) o archivar el repo; quitar el valor por defecto del secreto JWT. Mientras tanto, el caso de estudio lo declara como proyecto de hackatón y no como producción.
- **Criterio de aceptación:** el archivo no existe en ningún commit alcanzable del repo público.

#### A-02 · Proyectos marcados "Producción" sin evidencia pública
- **Archivos:** `data/projects.{es,en}.json` (`sentinel-rag`, `ledgercore`, `taskflow`), `app/[locale]/cv/page.tsx` (`CV_PROJECTS`)
- **Problema:** los tres tienen `context: "Producción"`, sin repo ni demo. En la cuenta de GitHub no existe repo de Sentinel RAG ni de TaskFlow; `LedgerCore` existe pero es privado y solo contiene un `README.md` de una línea (commit del 2026-09-29). Sentinel RAG estaba además en "Destacados". LedgerCore afirma que "recorta el tiempo de arranque de autenticación" y Sentinel RAG que "se mide con un set de pruebas de precisión", sin datos.
- **Evidencia:** `list_repos` de la cuenta (112 repos) y clon de `LedgerCore` (1 archivo).
- **Severidad:** Critical · **Estado:** Confirmado
- **Impacto:** el visitante objetivo (tech lead) pide el código y no existe; contradice la regla de honestidad de `plan.md` §2 y de `PRODUCT.md`.
- **Solución propuesta:** quitar la etiqueta "Producción" y los resultados no demostrables, sacar los tres de los destacados, clasificarlos con un estado que diga solo lo comprobable ("sin código público") y pedir confirmación al dueño. No se borran.
- **Criterio de aceptación:** ningún proyecto se presenta como producción sin URL o repo que lo respalde; la pregunta queda registrada en `CONTENT_VERIFICATION.md`.

#### A-03 · Datos del detector IDN desactualizados respecto a su propio repositorio
- **Archivos:** `data/projects.*.json`, `messages/*.json` (`about.p3`), `data/experience.*.json`
- **Problema:** (1) se presenta como "mi tesis" sin mencionar que es en coautoría (README: "Autores: Juan Sebastián Fandiño Novoa y Miguel Ángel Bonilla Torres"); (2) dice "agentes sobre LlamaStack", pero `core/llm_gateway.py` declara que reemplazó a Ollama/LlamaStack por un gateway OpenAI-compatible; (3) "359 pruebas automatizadas" no aparece en el repo, que hoy tiene 1.094 funciones `test_*` y un umbral de cobertura del 90 % (`pyproject.toml`).
- **Severidad:** High · **Estado:** Confirmado (commit `9ab0767` de `backendTesis`)
- **Impacto:** un entrevistador que abre el repo encuentra otra arquitectura y otro autor; daña la confianza en el resto.
- **Solución propuesta:** declarar el trabajo en equipo, describir la arquitectura actual (5 señales, gateway LLM, RAG con ChromaDB), citar solo lo que el repo muestra y mover la cifra de 359 a verificación pendiente.
- **Criterio de aceptación:** cada afirmación del caso de estudio se puede rastrear a un archivo del repo.

#### A-04 · Métricas de evaluación de la tesis no publicables
- **Archivo:** `backendTesis/docs/EVAL-T4-T7.md`
- **Problema:** el repo contiene precision/recall/F1, pero el propio documento lleva una nota de revisión (2026-09-26) que dice que esa corrida "no valida el detector corregido".
- **Severidad:** Medium · **Estado:** Confirmado
- **Solución propuesta:** no publicar esas cifras; explicar en "Limitaciones" que la evaluación se está repitiendo con grupos independientes.
- **Criterio de aceptación:** el sitio no muestra métricas de modelo.

#### A-05 · Afirmaciones de Bikans parcialmente verificables
- **Archivo:** `data/projects.*.json` (`bikans`)
- **Problema:** `app.bikans.com` responde 200 y el repo privado del frontend confirma React 19 + TypeScript + Vite, con rutas de nómina, retenciones y administración. La autenticación de dos factores no aparece en el commit inspeccionado del frontend (`7957330`, abril 2026); el backend no se inspeccionó.
- **Severidad:** Medium · **Estado:** Hipótesis (2FA)
- **Solución propuesta:** mantener la afirmación (viene del CV del dueño) y registrarla como pendiente de confirmar; el caso de estudio se escribe en términos generales por ser un producto de cliente.

### Posicionamiento y contenido

#### A-06 · El hero no comunica el posicionamiento objetivo
- **Archivos:** `messages/*.json` (`hero`, `meta`), `lib/jsonld.ts`, `app/[locale]/opengraph-image.tsx`, `app/llms.txt/route.ts`
- **Problema:** el rol es "Full Stack AI Engineer" y la bajada lista "multiagente, RAG e integraciones con LLM" como si fueran producción. El posicionamiento pedido es "Full Stack Engineer | Python, React & AI Systems". La bajada no dice en qué tecnologías ni qué proyectos mirar.
- **Severidad:** High · **Estado:** Confirmado
- **Criterio de aceptación:** en el primer pantallazo se lee quién es, qué construye, con qué stack, qué experiencia tiene y cómo contactarlo; el mismo titular aparece en metadata, OG, JSON-LD y llms.txt.

#### A-07 · La lista de proyectos no tiene jerarquía ni estados comprobables
- **Archivos:** `components/sections/ProjectsSection.tsx`, `components/ui/ProjectCard.tsx`, `types/index.ts`
- **Problema:** 12 proyectos en una sola lista; 4 "destacados" por un booleano; la etiqueta `context` mezcla estado y lugar ("Producción", "Tesis", "Open source") sin criterio. Proyectos de curso (sockets, app Android) tienen el mismo peso que un SaaS en producción. La lede dice "Repositorios públicos" pero varios proyectos no tienen repo.
- **Severidad:** High · **Estado:** Confirmado
- **Criterio de aceptación:** destacados separados del archivo; cada proyecto tiene un estado de una lista cerrada (producción comercial, proyecto personal desplegado, investigación académica, prototipo, archivado) asignado con evidencia.

#### A-08 · Las páginas de proyecto son fichas, no casos de estudio
- **Archivo:** `app/[locale]/proyectos/[id]/page.tsx`
- **Problema:** muestran dos párrafos y los tags. No hay problema, rol, arquitectura, decisiones, validación ni limitaciones, que es lo que revisa un tech lead. Tampoco hay CTA de contacto al final.
- **Severidad:** High · **Estado:** Confirmado
- **Criterio de aceptación:** plantilla reutilizable que renderiza solo las secciones con contenido; los destacados la usan con contenido trazable a su repo.

#### A-09 · El stack se presenta plano, con 8 categorías del mismo peso
- **Archivos:** `data/skills.json`, `components/sections/SkillsSection.tsx`
- **Problema:** 45 chips con el mismo estilo; "Metodologías" tiene un solo elemento; no se distingue lo que respaldan los proyectos destacados de lo usado ocasionalmente. Algunos elementos no tienen evidencia en repos públicos (AWS, PHP, MySQL, Make, OWASP Top 10).
- **Severidad:** Medium · **Estado:** Confirmado (falta de evidencia pública = hipótesis de uso; vienen del CV)
- **Criterio de aceptación:** 5–6 áreas; tecnologías principales diferenciadas de las secundarias; nada agregado sin evidencia.

#### A-10 · La experiencia no muestra tecnologías por cargo
- **Archivos:** `data/experience.*.json`, `components/sections/ExperienceSection.tsx`
- **Problema:** los logros son buenos y concretos, pero las tecnologías de cada cargo quedan escondidas en el texto; la tesis no dice que es en equipo.
- **Severidad:** Low · **Estado:** Confirmado

### Accesibilidad y responsive

#### A-11 · Overflow horizontal de 8 px a 320 px en todas las páginas
- **Archivo:** `components/layout/Navbar.module.css`
- **Evidencia:** Playwright, `scrollWidth − clientWidth = 8` a 320 px en las 18 rutas; los elementos que se salen son `.actions` y `.menuBtn`. Sin overflow en 375–1920 px.
- **Severidad:** High (WCAG 2.2 · 1.4.10 Reflow) · **Estado:** Confirmado
- **Criterio de aceptación:** 0 px de overflow en los 7 anchos.

#### A-12 · `<aside>` anidado dentro de `<article>` en las páginas de proyecto
- **Archivo:** `app/[locale]/proyectos/[id]/page.tsx`
- **Evidencia:** axe `landmark-complementary-is-top-level` (moderate) en las 24 páginas de proyecto.
- **Severidad:** Low · **Estado:** Confirmado

#### A-13 · Contraste en tema claro
- **Evidencia:** axe marcó 1–3 nodos con `color-contrast` en tema claro, pero solo cuando se ejecutó durante la transición de 160 ms de `background-color`. Repetido con 600 ms de espera: 0 violaciones.
- **Severidad:** — · **Estado:** Descartado (falso positivo de la medición)

#### A-14 · Encabezados y semántica
- **Evidencia:** todas las rutas tienen un solo `h1`, jerarquía h1→h2→h3 sin saltos, `lang` correcto, 0 imágenes sin `alt`, skip link, foco visible definido en `globals.css`, `prefers-reduced-motion` respetado (revisado en CSS).
- **Estado:** Sin hallazgo.

### SEO técnico

#### A-15 · Las páginas de proyecto pierden la imagen Open Graph
- **Archivo:** `app/[locale]/proyectos/[id]/page.tsx` (`generateMetadata`)
- **Problema:** al redefinir `openGraph`, Next reemplaza el objeto del layout y desaparece `og:image`. Compartir un proyecto en LinkedIn sale sin imagen.
- **Evidencia:** `og:image` ausente en las 24 páginas de proyecto; presente en el resto.
- **Severidad:** Medium · **Estado:** Confirmado

#### A-16 · Falta `og:url` en todas las páginas
- **Severidad:** Low · **Estado:** Confirmado (Playwright: `meta[property="og:url"]` nulo en 18/18 rutas)

#### A-17 · El 404 se declara indexable y canónico de la home
- **Archivos:** `app/[locale]/not-found.tsx`, `app/[locale]/layout.tsx`
- **Problema:** la respuesta 404 lleva dos `meta robots` (`noindex` de Next e `index, follow` del layout), `canonical` a la home y el título de la home.
- **Severidad:** Medium · **Estado:** Confirmado (`curl /es/no-existe`)
- **Criterio de aceptación:** un solo `robots: noindex`, título "Página no encontrada", sin canonical a la home.

#### A-18 · JSON-LD `SoftwareSourceCode` para proyectos sin código fuente
- **Archivo:** `lib/jsonld.ts` (`projectSchema`)
- **Problema:** Bikans, Sentinel RAG, LedgerCore y TaskFlow se marcan como `SoftwareSourceCode` sin `codeRepository`.
- **Severidad:** Low · **Estado:** Confirmado
- **Solución propuesta:** `SoftwareSourceCode` solo con repo; `CreativeWork` en los demás.

### Contacto y conversión

#### A-19 · Formulario de contacto
- **Evidencia:** validación propia con mensajes por campo y `aria-describedby`, foco al primer error, honeypot, botón deshabilitado durante el envío (evita doble envío), región `aria-live`, estados de éxito y error. La clave de Web3Forms es pública por diseño del servicio.
- **Problema menor:** sin `maxLength` en los campos; el `access_key` vacío en local hace que el envío falle con el mensaje del servicio.
- **Severidad:** Low · **Estado:** Confirmado

#### A-20 · Sin camino de proyecto a contacto
- **Problema:** al terminar un proyecto solo hay "Otros proyectos" (los 3 primeros de la lista, sin criterio). No hay CTA de contacto ni de CV.
- **Severidad:** Medium · **Estado:** Confirmado

### Rendimiento

#### A-21 · Rendimiento
- **Evidencia:** CSS inline, fuentes recortadas, GA diferido, SSG en todas las páginas públicas. `plan.md` reporta Lighthouse móvil 97/100/100/100, medición previa que no repetí aquí. El único JS de terceros es Vercel Analytics y GA tras interacción.
- **Problema:** en local aparece un 404 en consola: el script `/_vercel/insights/script.js` solo existe en Vercel.
- **Severidad:** — · **Estado:** Hipótesis sin impacto (artefacto de entorno local). Medición Lighthouse en `FINAL_REPORT.md`.

### Mantenibilidad

#### A-22 · Sin pruebas del sitio
- **Problema:** nada valida la paridad ES/EN de los datos, los estados de proyecto ni las rutas principales. Un proyecto nuevo en un solo idioma rompería páginas sin aviso.
- **Severidad:** Medium · **Estado:** Confirmado
- **Criterio de aceptación:** prueba de integridad de contenido en `pnpm test` y prueba E2E con Playwright (`playwright-core` ya está en devDependencies).

#### A-23 · Código muerto e imports
- **Evidencia:** `pnpm lint` limpio, sin imports sin uso. No encontré componentes duplicados ni código muerto relevante. Sin secretos en el repo (`.env*` ignorado, solo `.env.example` con valores vacíos).
- **Estado:** Sin hallazgo.

## 4. Resumen

| Severidad | Confirmados | Hipótesis |
|---|---|---|
| Critical | 2 (A-01, A-02) | 0 |
| High | 5 (A-03, A-06, A-07, A-08, A-11) | 0 |
| Medium | 6 (A-04, A-09, A-15, A-17, A-20, A-22) | 1 (A-05) |
| Low | 5 (A-10, A-12, A-16, A-18, A-19) | 0 |

El sitio está bien construido técnicamente (build, lint, SSG, i18n, SEO y accesibilidad base sólidos). Los problemas de fondo son de **veracidad y jerarquía del contenido**: tres proyectos "en producción" sin código, un repo enlazado con credenciales publicadas y una tesis descrita con datos que su propio repositorio ya no respalda.
