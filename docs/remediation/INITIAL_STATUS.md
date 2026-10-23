# Fase 1.5 · Estado inicial

> Fecha: 2026-10-23. Registro de cómo estaba todo antes de los cambios de esta fase.

## Repositorio del portafolio

| Punto | Estado |
|---|---|
| Rama de partida | `ccr-82e185fe-xk2i5l` en `3b4675e` (fases 1 y 2, 10 commits sobre `main`) |
| `origin/main` | `f519a52`, sin las fases 1 ni 2 |
| Cambios sin commit | Ninguno |
| Rama de trabajo | `fix/security-content-production-readiness`, creada desde `3b4675e` (el nombre no existía) |
| Documentos revisados | `docs/audit/*`, `docs/phase-2/*`, `PRODUCT.md`, `DESIGN.md`, `plan.md`, `package.json`, `vercel.json`, `next.config.ts`, `.env.example` |
| CI | No había `.github/workflows/` |

## Producción (`mangel14.dev`, revisada solo en lectura)

La producción sirve el código de `main` (`f519a52`). Las fases 1 y 2 nunca se desplegaron:

| Superficie | En producción hoy |
|---|---|
| `/es`, `/es/proyectos/api-auth-hackaton`, `/llms.txt`, `/llms-full.txt` | Enlazan al repositorio de `API_AUTH_HACKATON`, que tiene credenciales expuestas |
| `/es/proyectos/ledgercore` | 200, descrito como un sistema construido |
| CV en PDF | TaskFlow, LedgerCore y Sentinel RAG aparecen con la etiqueta "Producción" |
| Titular | "Full Stack AI Engineer" (el anterior) |
| `/api/telegram`, `/api/cron/daily`, `/api/agent/setup`, `/api/linkedin/auth` | 401 sin credenciales: el Content Engine tiene sus variables configuradas |

## API_AUTH_HACKATON

| Rama | Archivo de credenciales | Secreto JWT por defecto |
|---|---|---|
| `main` (`4bf20ca`), `development` (`e436929`), `feature` (`a1371cc`), `release` (`4bf20ca`) | Presente | Presente |
| `security/remove-exposed-credentials` (`0f27b6f`, de la fase 2) | Eliminado | Eliminado de `jwt_utils.py` |

Lo que la fase 2 no había detectado y aparece en esta fase (detalle en [API_AUTH_SECURITY.md](API_AUTH_SECURITY.md)):

1. `start.py`, el punto de entrada de Procfile, `railway.toml` y el Dockerfile, ponía un secreto temporal fijo cuando faltaba `JWT_SECRET_KEY`. Eso anulaba la validación de la fase 2.
2. `POST /auth/register` es público y aceptaba `is_superuser` y `dueno_de_activo`: cualquiera podía crearse una cuenta de administrador.
3. Los scripts de alta de usuarios tenían escritas las dos contraseñas compartidas, y la documentación también.
4. Con PyJWT 2.10.1, ningún token emitido por `/auth/login` pasaba la verificación (el `sub` era un número).
5. No había pruebas automatizadas ni CI, y `.gitignore` ignoraba `.github/`.
