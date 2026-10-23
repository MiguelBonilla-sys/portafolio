# Checklist de producción

> Nada de esto se desplegó: todo deploy necesita autorización explícita del dueño.
> ✅ verificado en esta fase · ⏳ lo hace o lo confirma el dueño · ⚠️ riesgo conocido

## 1. Antes de desplegar

| | Punto | Evidencia o acción |
|---|---|---|
| ✅ | Lint, pruebas unitarias, build, typecheck y E2E | En un clon limpio de `6841c9b`: lint sin problemas, 71/71, build, `tsc --noEmit`, E2E 7/7 con el Chromium de playwright-core |
| ✅ | Accesibilidad | axe-core (WCAG 2.1 A/AA): 0 violaciones en 20 rutas, en tema claro y oscuro |
| ✅ | Enlaces internos | 40 enlaces; todos 200, salvo el cambio de idioma de la página 404 (`/en/no-existe`), que debe dar 404 |
| ✅ | Secretos | gitleaks sobre todo el historial: sin hallazgos (los 9 falsos positivos revisados están en `.gitleaks.toml`) |
| ✅ | CV en PDF | Regenerado y comparado con los datos (`test/cv.test.ts`) |
| ⏳ | CI en GitHub | `.github/workflows/ci.yml` está escrito y sus pasos se reprodujeron localmente. **No se ha ejecutado en GitHub Actions**: corre al abrir el PR |
| ⏳ | Fusionar en `main` | `fix/security-content-production-readiness`, que contiene las fases 1, 2 y 1.5 |
| ⏳ | Content Engine | Terminar o cancelar piezas pendientes en el bot antes del deploy (`CONTENT_ENGINE_READINESS.md` §2) |

## 2. Configuración revisada

| Archivo | Estado |
|---|---|
| `next.config.ts` | `globalNotFound` e `inlineCss` (experimentales en Next 16); 301 de `www.mangel14.dev`, `portafolio.mangel14.dev` y `portafolio-inky-rho.vercel.app` al dominio canónico; las previews no se redirigen |
| `vercel.json` | Un cron diario, `/api/cron/daily` a las 13:00 UTC, protegido con `CRON_SECRET` |
| Variables del sitio | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_WEB3FORMS_KEY` (las tres son públicas por diseño: van al navegador) |
| Variables del agente | 12 obligatorias; `envReport()` dice cuáles faltan sin mostrar valores. No se modificó ninguna en producción |
| Metadata | Title, description, canonical, hreflang ES/EN/x-default, Open Graph y tarjeta de X propios por página (E2E) |
| `robots.txt` | Permite todo, con bloques explícitos para buscadores y agentes de IA; apunta al sitemap |
| `sitemap.xml` | 32 URLs con alternates; sin borradores, `/tarjeta` ni proyectos ocultos |
| Rutas localizadas | `/es/proyectos/...` y `/en/projects/...`; una ruta del otro idioma redirige con 307 |
| 404 | Código 404 y `noindex`, también después de hidratar |
| Analítica | Vercel Web Analytics y Google Analytics (gtag cargado tarde a propósito, `components/GoogleAnalytics.tsx`) |

## 3. Después de desplegar (solo lectura, sin cambiar nada)

1. `/es`, `/en/projects/api-auth-hackaton`, `/llms.txt` y `/llms-full.txt`: **no** deben contener `github.com/MiguelBonilla-sys/api_auth_hackaton`. Hoy sí lo contienen.
2. `/es/proyectos/ledgercore` → 404. Hoy da 200.
3. `/cv/miguel-bonilla-cv-es.pdf`: sin TaskFlow, LedgerCore ni Sentinel RAG. Hoy los marca como "Producción".
4. Titular "Full Stack Engineer · Python, React y sistemas con IA". Hoy dice "Full Stack AI Engineer".
5. `GET /api/agent/setup` con `ADMIN_SECRET`, y la prueba de humo del bot (`CONTENT_ENGINE_READINESS.md` §3).
6. Enviar el sitemap a IndexNow: `pnpm indexnow`.

## 4. Métricas: laboratorio y campo

| Tipo | Qué hay | Qué no se puede afirmar |
|---|---|---|
| Laboratorio (Lighthouse 12.8.2, móvil simulado, build local) | Caso de estudio: LCP mediano 2.509 ms frente a 2.508 ms en `main`, en 5 corridas intercaladas cada uno. Rendimiento 0,97; TBT 50 ms. El elemento LCP es el párrafo `lede` | No representa usuarios reales |
| Campo (CrUX, Vercel Speed Insights) | No se consultó: no hay acceso desde esta sesión | **INP no está validado.** Lighthouse no mide INP; solo los datos de campo lo hacen |

Detalle del análisis de rendimiento en `FINAL_REPORT.md` §4.

## 5. Indexación

- **No se afirma que ninguna página esté indexada.** Comprobarlo exige Search Console.
- **Google Search Console** (lo hace el dueño): verificar la propiedad de dominio `mangel14.dev` por DNS, enviar `https://mangel14.dev/sitemap.xml`, revisar "Páginas" y usar "Inspección de URLs" en las páginas que cambiaron. Para quitar del índice las URLs retiradas (`/es/proyectos/ledgercore`, `/en/projects/ledgercore`), la 404 basta; "Retirada temporal" las oculta antes.
- **Bing Webmaster Tools**: se puede importar la propiedad desde Search Console.
- **IndexNow** (`scripts/indexnow.mjs`, clave pública en `public/3a142bdab1da687057cc12b488c8e24c.txt`, envío a `api.indexnow.org`). Según `indexnow.org/searchengines.json` (consultado el 2026-10-23) lo usan Bing, Yandex, Seznam, Naver, Yep, Internet Archive y Amazonbot. **Google no participa**: para Google solo cuentan el sitemap y Search Console.
- Rich Results Test y validator.schema.org: necesitan la URL pública desplegada.

## 6. Bloqueos para llamar a esto "listo para producción"

| Bloqueo | Por qué |
|---|---|
| ⚠️ Las credenciales de `API_AUTH_HACKATON` siguen públicas en GitHub (en `main` y en el historial) y no se han rotado | Riesgo crítico sin mitigar; no depende del portafolio |
| ⚠️ La producción del portafolio todavía enlaza a ese repositorio y publica afirmaciones sin evidencia (CV en PDF, LedgerCore) | Se corrige solo con el deploy autorizado |

Mientras sigan los dos, **el proyecto no se declara listo para producción**.
