# Fase 1.5 · Reporte final

> Fecha: 2026-10-23 · Rama: `fix/security-content-production-readiness` (incluye las fases 1 y 2, sin fusionar en `main`).
> Documentos: [estado inicial](INITIAL_STATUS.md) · [API_AUTH_HACKATON](API_AUTH_SECURITY.md) · [decisiones de contenido](CONTENT_DECISIONS.md) · [Content Engine](CONTENT_ENGINE_READINESS.md) · [checklist de producción](PRODUCTION_CHECKLIST.md)

## 1. Resumen ejecutivo

- **API_AUTH_HACKATON**: aparecieron tres fallas críticas que la fase 2 no vio.
  - `start.py` anulaba la exigencia del secreto JWT.
  - `/auth/register`, que es público, permitía crearse una cuenta de administrador.
  - Los scripts tenían escritas las contraseñas compartidas.
  Las tres están corregidas y probadas en la rama de seguridad, con 21 pruebas y gitleaks en CI. Pero las credenciales siguen públicas en `main` y en el historial, y no se han rotado. **El riesgo crítico sigue abierto hasta que el dueño actúe.**
- **Producción del portafolio**: sigue con el código anterior a la fase 1. Enlaza al repositorio comprometido y publica en el CV en PDF tres proyectos marcados como "Producción" sin evidencia. Todo está corregido en la rama, pero **solo un deploy autorizado lo arregla**.
- **Veracidad**:
  - El 2FA de Bikans está verificado en código y en el bundle de producción.
  - "Con usuarios reales" se retiró por falta de evidencia.
  - LedgerCore queda oculto: su repositorio solo tiene un README.
  - La tesis ya separa el código implementado, las pruebas, la corrida documentada y la evaluación, y no publica contribuciones individuales.
- **CV en PDF**: estaba desactualizado. Se regeneró, y una prueba nueva impide que vuelva a pasar.
- **Rendimiento**: la "regresión" de LCP del caso de estudio (2,11 → 2,51 s) **no se reproduce** en condiciones equivalentes (2.508 ms en `main` frente a 2.509 ms en la rama). Se mantiene la implementación.
- **CI**: hay workflows para el portafolio (lint, pruebas, build, typecheck, E2E y gitleaks) y para el repo del hackatón. Se reprodujeron localmente; todavía no se han ejecutado en GitHub.

**El proyecto no está listo para producción** mientras sigan abiertos los dos bloqueos del §7.

## 2. Hallazgos y clasificación

| # | Hallazgo | Clasificación |
|---|---|---|
| 1 | Hackatón: archivo de credenciales en las 4 ramas y en el historial | **Mitigado temporalmente** (eliminado en la rama de seguridad) · purga y rotación **pendientes de autorización** |
| 2 | Hackatón: `start.py` ponía un secreto JWT fijo si faltaba | **Resuelto y verificado** (en la rama) |
| 3 | Hackatón: registro público con `is_superuser` y `dueno_de_activo` | **Resuelto y verificado** (en la rama) |
| 4 | Hackatón: contraseñas compartidas en scripts y documentación | **Resuelto y verificado** (en la rama; siguen en el historial) |
| 5 | Hackatón: `DATABASE_URL` parcial en `start.py` y en `/debug` | **Resuelto y verificado** (en la rama) |
| 6 | Hackatón: tokens de login siempre inválidos (PyJWT 2.10) | **Resuelto y verificado** (en la rama) |
| 7 | Hackatón: sin pruebas ni CI; `.github/` ignorado | **Resuelto** (el workflow no se ha ejecutado en GitHub) |
| 8 | Portafolio en producción enlaza al repo comprometido (`/es`, `/es/proyectos/api-auth-hackaton`, `llms.txt`, `llms-full.txt`) | **Resuelto y verificado en la rama** · en producción **pendiente de autorización** (deploy) |
| 9 | CV en PDF desactualizado (Content Engine de antes de la fase 2); en producción, el de antes de la fase 1 | **Resuelto y verificado** en la rama · producción pendiente del deploy |
| 10 | Bikans "con usuarios reales" | **Pendiente de evidencia**: retirado hasta que el dueño lo confirme |
| 11 | Bikans 2FA | **Resuelto y verificado** (evidencia en código y en producción) |
| 12 | LedgerCore descrito como construido, con un repo vacío | **Mitigado temporalmente** (oculto) · **pendiente de evidencia** |
| 13 | Sentinel RAG y TaskFlow sin repositorio | **Pendiente de evidencia** (siguen como "Sin código público") |
| 14 | Contribuciones individuales en la tesis | **Pendiente de evidencia**: no se publica ninguna |
| 15 | Regresión de LCP del caso de estudio | **No reproducible** |
| 16 | Sin CI en el portafolio | **Resuelto** (reproducido localmente; falta la primera ejecución en GitHub) |
| 17 | E2E dependía de Chrome del sistema (`channel: "chrome"`) | **Resuelto y verificado** (Chromium de playwright-core) |
| 18 | Content Engine nuevo sin desplegar; webhook por re-registrar | **Pendiente de autorización** |

## 3. Cambios

### Portafolio (`fix/security-content-production-readiness`)

| Commit | Contenido |
|---|---|
| `06e4a37` | Bikans reescrito según la evidencia; campo `hidden` y LedgerCore oculto; CV en PDF regenerado; `test/cv.test.ts`; prueba de proyectos ocultos |
| `6841c9b` | `.github/workflows/ci.yml`, `.gitleaks.toml`; E2E y CV con el Chromium de playwright-core; E2E del 404 de LedgerCore |
| (este commit) | `docs/remediation/*` |

Archivos: `data/projects.{es,en}.json`, `types/index.ts`, `lib/content.ts`, `public/cv/*.pdf`, `test/content.test.ts`, `test/cv.test.ts`, `e2e/smoke.test.mjs`, `scripts/build-cv.mjs`, `.github/workflows/ci.yml`, `.gitleaks.toml`, `docs/remediation/*`.

### API_AUTH_HACKATON (`security/remove-exposed-credentials`, sin fusionar)

`d080ac0`, `5c82ffa`, `dff7eca`, `f520aea` sobre `0f27b6f`. El detalle está en [API_AUTH_SECURITY.md](API_AUTH_SECURITY.md) §2.

### Repositorios solo leídos

`bikans-backend`, `appbikans`, `backendtesis`, `ledgercore` y `auth-sentinel`. No se escribió en ellos ni se copió su código.

## 4. Rendimiento del caso de estudio

**Método**:
- Lighthouse 12.8.2, móvil simulado (la configuración por defecto), Chromium 141, build de producción local.
- Se midió `/es/proyectos/idn-phishing-detector` en `main` (`f519a52`, sin caso de estudio) y en la rama.
- Fueron 5 corridas de cada una, **intercaladas** para que las dos versiones compartan condiciones.

| | `main` | rama |
|---|---|---|
| LCP (ms, 5 corridas) | 2521, 2110, 2515, 2109, 2508 | 2513, 2509, 2514, 2004, 2108 |
| LCP mediano | **2.508** | **2.509** |
| FCP mediano | 803 | 829 |
| TBT mediano | 50 | 50 |
| Puntaje | 0,97 | 0,97 |
| HTML transferido (gzip) | 20,8 KB | 28,0 KB |
| HTML sin comprimir: RSC en línea / CSS en línea / marcado / JSON-LD | 55,1 / 33,1 / 11,5 / 1,1 KB | 73,9 / 38,1 / 20,4 / 1,1 KB |

**Diagnóstico**:
- **Elemento LCP**: en la rama es el párrafo `lede` del encabezado del caso de estudio; en `main`, un párrafo del cuerpo. En los dos casos es texto: no hay imagen que optimizar.
- **Fases**: TTFB de ~460 ms y "render delay" de ~2.050 ms, en ambas versiones.
- **Medición observada sin throttling**: el LCP es igual al FCP, entre 68 y 244 ms. Los 2,5 s salen de la simulación, que cuenta el HTML y las tres fuentes precargadas (~55 KB, prioridad alta) con red móvil lenta.
- **Distribución**: los valores son bimodales (~2,1 s o ~2,5 s) en las dos versiones. El "2,11 → 2,51 s" de la fase 1 comparaba una corrida de cada modo: era ruido de la simulación, no una regresión.
- **Server Components y serialización**: el payload RSC en línea es ~55 % del HTML y duplica el contenido del caso de estudio. Es propio del App Router. Reducirlo exigiría pasar el contenido a componentes cliente, lo que suma JavaScript; está excluido y además no hay ganancia que medir.
- **CSS y fuentes**: el CSS va en línea (`inlineCss`) y no bloquea con solicitudes. Las fuentes ya son locales, con preload y `display: swap`. Quitar el preload de alguna sería una optimización especulativa sin una regresión que corregir.

**Decisión: se mantiene la implementación actual.** Los +7 KB gzip del HTML no cambian el LCP medido.

**Límite**: es laboratorio. No hay datos de campo y **INP no está validado**.

## 5. Pruebas ejecutadas en esta fase

| Comando | Dónde | Resultado |
|---|---|---|
| `pnpm install --frozen-lockfile` | clon limpio de `6841c9b` | ✅ (desde el store local; en CI baja de la red) |
| `pnpm lint` | clon limpio | ✅ 0 problemas |
| `pnpm test` | clon limpio | ✅ 71/71 (68 de la fase 2 + 3 nuevas: 2 del CV en PDF y 1 de proyectos ocultos) |
| `pnpm build` | clon limpio | ✅ |
| `pnpm exec tsc --noEmit` (después del build) | clon limpio | ✅ |
| `pnpm test:e2e` sin `CHROME_PATH` | clon limpio, `next start` | ✅ 7/7: 12 rutas, 7 anchos, menú, idioma, casos de estudio, 404 (incluye LedgerCore), formulario |
| axe-core WCAG 2.1 A/AA | 20 rutas × tema claro y oscuro | ✅ 0 violaciones |
| Enlaces internos | 40 | ✅ (1 esperado en 404) |
| JSON-LD, hreflang, sitemap, robots | 5 páginas, sitemap de 32 URLs | ✅ tipos esperados; ningún rastro de LedgerCore ni del repo del hackatón |
| `test/cv.test.ts` contra los PDF anteriores | — | ❌ falla, como debe |
| gitleaks, historial completo del portafolio | — | ✅ sin hallazgos con `.gitleaks.toml`; un token canario sí se detecta |
| `pytest` del hackatón | Python 3.11 | ✅ 21/21; contra `main` fallan |
| Lighthouse | §4 | Sin diferencia |

No se ejecutó:
- Ninguna prueba contra servicios reales (Telegram, LinkedIn, GitHub, LLM, Postgres).
- Los workflows de CI en GitHub Actions.
- La suite de `bikans-backend` ni la de la tesis.
- Lighthouse contra producción.

## 6. Acciones que necesitan autorización

1. **Rotar** las contraseñas y el `JWT_SECRET_KEY` de cualquier despliegue de `API_AUTH_HACKATON`.
2. **Hacer privado** ese repositorio mientras tanto. Es reversible y lo recomiendo como primer paso.
3. Fusionar `security/remove-exposed-credentials` y aprobar o no la **purga del historial** (force-push).
4. Fusionar esta rama en `main` y **desplegar** el portafolio. Después: `GET /api/agent/setup`, la prueba de humo del bot y `pnpm indexnow`.
5. Abrir un PR para que el CI corra por primera vez en GitHub.

## 7. Riesgos abiertos y bloqueos humanos

| Riesgo | Estado |
|---|---|
| Credenciales de 25 cuentas y un secreto JWT por defecto, públicos en GitHub y sin rotar | **Crítico, sin mitigar** en lo que importa: la rotación y la visibilidad del repositorio dependen del dueño |
| Producción del portafolio con el enlace al repo y afirmaciones sin evidencia | **Alto**: depende del deploy |
| CI sin ejecutar en GitHub | Medio: se reprodujo localmente paso a paso |
| Variables del agente en producción sin validar más allá de su existencia | Medio: prueba de humo |
| Datos de campo (INP, LCP real) | Sin medir |

Preguntas para el dueño: [CONTENT_DECISIONS.md](CONTENT_DECISIONS.md) §5.

## 8. Preparación para la fase 2

- **El código de la fase 2 está listo para desplegarse** una vez autorizado: pruebas en verde, sin defectos nuevos en el Content Engine y con la seguridad del agente revisada (`CONTENT_ENGINE_READINESS.md`).
- **No es posible operarlo en producción todavía**, porque no está desplegado.
- Para que el Content Engine pueda escribir sobre `API_AUTH_HACKATON`, primero hay que rotar las credenciales y purgar el historial: el artículo de ejemplo enlaza ese proyecto.
