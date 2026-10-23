# Reporte final: auditoría y mejora de mangel14.dev

> Fecha: 2026-10-23 · Rama: `ccr-82e185fe-xk2i5l` · Base: `f519a52`
> Documentos: [auditoría inicial](INITIAL_AUDIT.md) · [plan](IMPLEMENTATION_PLAN.md) · [cambios](CHANGES_IMPLEMENTED.md) · [verificación de contenido](CONTENT_VERIFICATION.md)

## 1. Resumen ejecutivo

La base técnica del sitio ya era buena: Next.js 16 estático, bilingüe, con SEO, accesibilidad y rendimiento altos. El problema estaba en el contenido. Tres proyectos se presentaban "en producción" sin código, un proyecto destacado enlaza a un repositorio con contraseñas publicadas, y la tesis se describía con datos que su propio repositorio ya no respalda.

Qué cambió:

1. **Cada proyecto tiene un estado verificable** (producción comercial, proyecto desplegado, investigación académica, prototipo, archivado, sin código público), y una prueba automática impide declarar producción sin URL.
2. **Cuatro destacados con caso de estudio** trazable a su repositorio: Bikans, el detector IDN, este sitio + Content Engine y API Auth Gateway. Los demás pasan a un archivo con su estado.
3. **Posicionamiento:** "Full Stack Engineer · Python, React & AI Systems", el mismo en hero, metadata, imagen OG, JSON-LD, llms.txt y CV.
4. **Stack** en 6 áreas con principales y secundarias, y **experiencia** con tecnologías por cargo.
5. **Correcciones:** desbordamiento a 320 px, 404 indexable, imagen OG perdida en 24 páginas de proyecto, `og:url` ausente, landmark mal anidado, JSON-LD incorrecto.
6. **Pruebas nuevas:** 7 de integridad de contenido en `pnpm test` y 7 E2E con Playwright en `pnpm test:e2e`.

## 2. Problemas encontrados y estado

| ID | Severidad | Problema | Estado |
|---|---|---|---|
| A-01 | Critical | Credenciales en claro en `API_AUTH_HACKATON` (repo externo) | **Pendiente del dueño** (sin permiso de escritura en ese repo) |
| A-02 | Critical | Sentinel RAG, LedgerCore y TaskFlow "en producción" sin evidencia | ✅ Estado `unverified`, fuera de destacados y del CV; pregunta abierta |
| A-03 | High | Detector IDN: coautoría omitida, LlamaStack obsoleto, "359 pruebas" | ✅ Corregido con fuentes |
| A-04 | Medium | Métricas de evaluación invalidadas por su propia revisión | ✅ No se publican; explicado en Limitaciones |
| A-05 | Medium (hipótesis) | 2FA de Bikans no visible en el frontend | Pendiente de confirmar; se conserva |
| A-06 | High | Hero sin el posicionamiento objetivo | ✅ |
| A-07 | High | Proyectos sin jerarquía ni estado | ✅ |
| A-08 | High | Fichas en lugar de casos de estudio | ✅ Plantilla + 4 casos |
| A-09 | Medium | Stack plano de 45 chips en 8 categorías | ✅ 6 áreas, principales/secundarias |
| A-10 | Low | Experiencia sin tecnologías por cargo | ✅ |
| A-11 | High | Overflow de 8 px a 320 px | ✅ 0 px en 7 anchos |
| A-12 | Low | `<aside>` dentro de `<article>` | ✅ |
| A-13 | — | Contraste en tema claro | Descartado (falso positivo durante la transición CSS) |
| A-15 | Medium | Sin `og:image` en páginas de proyecto | ✅ |
| A-16 | Low | Sin `og:url` | ✅ en todas las páginas |
| A-17 | Medium | 404 indexable con canonical a la home | ✅ |
| A-18 | Low | `SoftwareSourceCode` sin código | ✅ |
| A-19 | Low | Formulario sin `maxLength` | ✅ |
| A-20 | Medium | Sin camino de proyecto a contacto | ✅ CTA de contacto y CV en cada proyecto |
| A-22 | Medium | Sin pruebas del sitio | ✅ |

## 3. Mejoras visuales

- Tarjetas destacadas con estado, contexto, problema, "Mi aporte", 4 tecnologías y enlaces directos a repo y demo; el archivo usa filas compactas con títulos `h4` bajo su propio `h3`.
- Casos de estudio con índice fijo en escritorio, diagrama de flujo numerado unido por una pista vertical (coherente con el símbolo de circuito) y CTA al final.
- "Sin código público" con chip de borde discontinuo para que no se confunda con un estado real.
- Stack con dos niveles visuales en lugar de 45 chips iguales.
- Se mantuvieron los tokens, tipografías y animaciones de `DESIGN.md`.

Capturas revisadas a 1440, 375 y 320 px (home, proyectos, stack, caso de estudio).

## 4. Resultados de pruebas

Todas ejecutadas en esta sesión sobre el build final (`rm -rf .next && pnpm build`).

| Verificación | Antes | Después |
|---|---|---|
| `pnpm build` | ✅ 54 páginas | ✅ 56 páginas (2 proyectos nuevos: ES/EN) |
| `npx tsc --noEmit` | ✅ | ✅ |
| `pnpm lint` | ✅ 0 problemas | ✅ 0 problemas |
| `pnpm test` | ✅ 16/16 | ✅ 23/23 (16 del agente + 7 de contenido) |
| `pnpm test:e2e` | no existía | ✅ 7/7 |
| Overflow horizontal (Playwright, 20 rutas × 7 anchos) | 8 px a 320 px en las 18 rutas | 0 px en todas |
| axe-core WCAG 2.0/2.1/2.2 A-AA + best practices, tema oscuro | 1 regla moderada en 24 páginas de proyecto | 0 violaciones en 20 rutas |
| axe-core contraste, tema claro (con espera de 600 ms) | 0 | 0 |
| `og:image` / `og:url` presentes | 12 de 18 rutas (faltaba en las 6 de proyecto auditadas; 24 en total) / 0 de 18 | 20 de 20 / 20 de 20 |
| Enlaces internos | 49 URLs: 200 | todas 200 (404 solo en las rutas de prueba de 404) |
| Metadata del 404 tras hidratar | título de la home, `index`, canonical a la home | "Página no encontrada", `noindex`, sin canonical |

## 5. Métricas antes/después (laboratorio)

Lighthouse 12.8.2, Chromium 1194 headless, mismo contenedor y mismas condiciones; el "antes" es `f519a52` compilado en un worktree aparte. Son **datos de laboratorio, no de usuarios reales** (el campo vendría de Vercel Speed Insights o CrUX, no disponibles aquí).

Puntuaciones (1 corrida):

| Página | Perfil | Antes P / A / BP / SEO | Después P / A / BP / SEO |
|---|---|---|---|
| `/es` | móvil | 97 / 100 / 96 / 92 | 97 / 100 / 96 / 92 |
| `/es` | escritorio | 100 / 100 / 96 / 92 | 100 / 100 / 96 / 92 |
| `/es/proyectos/idn-phishing-detector` | móvil | 97 / 100 / 96 / 92 | 97 / 100 / 96 / 92 |
| `/es/proyectos/idn-phishing-detector` | escritorio | 100 / 100 / 96 / 92 | 100 / 100 / 96 / 92 |

Rendimiento móvil, mediana de 3 corridas adicionales:

| Página | LCP antes | LCP después | TBT antes / después | CLS |
|---|---|---|---|---|
| `/es` | 2,66 s | 2,67 s | 51 / 55 ms | 0 / 0 |
| `/es/proyectos/idn-phishing-detector` | 2,11 s | 2,51 s | 49 / 52 ms | 0 / 0 |

Lectura:

- **SEO 92 y Best Practices 96 son artefactos del entorno local**, iguales antes y después: el canonical apunta a `https://mangel14.dev` mientras se mide en `localhost` (auditoría `canonical`), y `/_vercel/insights/script.js` da 404 fuera de Vercel (`errors-in-console`). `plan.md` registra 100/100 en producción.
- **La página de proyecto subió 0,4 s de LCP simulado** porque el HTML pasó de 20 a 28 KB comprimidos: el caso de estudio y su copia en el payload RSC del App Router. El elemento LCP es el párrafo de bajada y su retraso de render observado sigue en ~60 ms. Queda en el límite de 2,5 s en el perfil móvil simulado (4G lento). Se aceptó el costo porque el contenido es el objetivo de la página; si la medición de campo lo confirma, la opción es mover el caso de estudio a un Server Component que no se serialice dos veces o plegar secciones largas.
- INP no se midió: requiere interacción real de usuarios.

## 6. Problemas pendientes

1. **A-01 (Critical):** limpiar `API_AUTH_HACKATON` (rotar contraseñas si son reales, borrar `scripts/user_credentials.json`, purgar el historial o archivar el repo; quitar el secreto JWT por defecto). Hasta entonces, el caso de estudio sigue enlazando al repo.
2. Decidir qué hacer con Sentinel RAG, LedgerCore y TaskFlow (`CONTENT_VERIFICATION.md` §6).
3. Confirmar el 2FA de Bikans y el reparto de trabajo de la tesis.
4. Alinear el titular de LinkedIn (`docs/linkedin-profile.md`) con el nuevo posicionamiento.
5. Medir en producción tras el deploy (Lighthouse y datos de campo) y reenviar el sitemap (`pnpm indexnow`, Search Console).

## 7. Limitaciones de esta auditoría

- No se desplegó a producción ni se midió el sitio publicado (fuera de alcance).
- Las pruebas de los repositorios externos no se ejecutaron; el sitio cita la última corrida documentada en cada repo, con su fecha.
- Los repositorios privados (`appbikans`, `LedgerCore`, `auth-sentinel`) se leyeron solo para verificar; nada de su contenido se publicó. `bikans-backend` no se inspeccionó.
- LinkedIn no se pudo consultar (responde 999 a clientes automáticos).
- La auditoría de accesibilidad es automatizada (axe) más revisión de código y capturas; no incluye pruebas con lectores de pantalla.

## 8. Próximos pasos sugeridos

1. Resolver A-01 y las preguntas de `CONTENT_VERIFICATION.md`.
2. Publicar el primer artículo del blog (ya redactado sobre API Auth Gateway) y activar el Content Engine.
3. Cuando exista la corrida nueva de evaluación de la tesis, agregar una sección "Resultados" con las métricas y el protocolo.
4. Agregar `pnpm test` y `pnpm test:e2e` a un workflow de CI (GitHub Actions) para que corran en cada PR.
5. Cuando Bikans o el trabajo de Coordenadas permitan publicar datos, añadir resultados medibles al caso de estudio.
