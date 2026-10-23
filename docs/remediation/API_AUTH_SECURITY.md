# API_AUTH_HACKATON · remediación de seguridad (P0)

> Repositorio: `MiguelBonilla-sys/api_auth_hackaton` (público). Rama: `security/remove-exposed-credentials`, sin fusionar.
> Commits: `0f27b6f` (fase 2), `d080ac0`, `5c82ffa`, `dff7eca`, `f520aea` (esta fase). No hubo force-push ni reescritura de historial.
> No se escriben aquí contraseñas, tokens ni datos personales.

## 1. Hallazgos y estado

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | `scripts/user_credentials.json` con 25 cuentas y 2 contraseñas compartidas, versionado en las 4 ramas | Crítica | **Mitigado temporalmente**: eliminado en la rama de seguridad. Sigue en `main`, en las otras ramas y en todo el historial |
| 2 | Secreto JWT por defecto en `jwt_utils.py` | Crítica | **Resuelto y verificado** en la rama: la app no arranca sin una clave de 32+ caracteres que no sea de ejemplo (pruebas 1–5) |
| 3 | `start.py` ponía un secreto temporal fijo si faltaba `JWT_SECRET_KEY` (anulaba el punto 2 en Railway, Docker y Procfile) | Crítica | **Resuelto y verificado**: sale con código 1 y un mensaje (prueba `test_start_script_exits_without_key...`) |
| 4 | Escalada de privilegios: `POST /auth/register` público aceptaba `is_superuser: true` y `dueno_de_activo` | Crítica | **Resuelto y verificado**: sin token de superusuario devuelve 403; un token de usuario normal no alcanza; un token inválido da 401 (7 pruebas) |
| 5 | Contraseñas compartidas escritas en `create_users.py`, `generate_credentials.py`, `upload_users_via_api.py` y en `docs/SISTEMA_PERMISOS.md` | Alta | **Resuelto y verificado**: contraseña aleatoria por cuenta (`scripts/seed_passwords.py`), escrita solo en archivos ignorados por git; ningún script la imprime |
| 6 | `start.py` imprimía los primeros 50 caracteres de `DATABASE_URL`, usuario y contraseña incluidos | Media | **Resuelto**: solo informa que está configurada |
| 7 | `docker-compose.yml` traía un secreto JWT fijo | Media | **Resuelto**: exige `JWT_SECRET_KEY` del entorno |
| 8 | Tokens de `/auth/login` siempre inválidos con PyJWT 2.10.1 (`sub` numérico): todos los endpoints protegidos daban 401 | Funcional (falla cerrada) | **Resuelto y verificado**: login → `/auth/me` → `/auth/refresh` en una prueba |
| 9 | Sin pruebas ni CI; `.gitignore` ignoraba `.github/` | Media | **Resuelto**: `tests/` (21 pruebas) y `.github/workflows/security.yml` |
| 10 | Credenciales en el historial de git | Crítica | **Pendiente de autorización**: purga con `git filter-repo` y force-push |
| 11 | Cuentas y secreto JWT de cualquier despliegue existente | Crítica | **Pendiente de autorización**: rotación (solo el dueño puede hacerla) |
| 12 | `/debug` es público y devolvía los primeros 20 caracteres de `DATABASE_URL` (pueden incluir el usuario) | Media | **Resuelto y verificado**: solo dice si hay base de datos configurada (la prueba falla con la versión anterior) |
| 13 | CORS `allow_origins=["*"]` con `allow_credentials=True` | Baja (los tokens van en un header, no en cookies) | Sin cambios; anotado |

La eliminación del archivo en HEAD **no limpia el historial**. Cualquiera puede leer las contraseñas en los commits anteriores. Mientras no se roten, la exposición sigue activa.

## 2. Cambios en la rama de seguridad

| Archivo | Cambio |
|---|---|
| `src/auth/jwt_utils.py` | `_load_secret_key()`: falla sin clave, con menos de 32 caracteres o con valores de ejemplo (fase 2) |
| `start.py`, `main.py` | Sin secreto por defecto; sale con error. Ni el arranque ni `/debug` muestran parte de `DATABASE_URL` |
| `src/auth/dependencies.py`, `src/routers/auth.py` | `get_optional_superuser`; el registro con rol, dueño de activos o cuenta inactiva exige un superusuario. `sub` como texto |
| `scripts/seed_passwords.py` + 3 scripts | Contraseñas aleatorias por cuenta; `SEED_ADMIN_PASSWORD` para el admin; la carga por API inicia sesión como un admin existente |
| `docker-compose.yml`, `README.md`, `docs/*.md` | Sin secretos ni contraseñas de ejemplo reutilizables |
| `.gitignore` | Ignora `scripts/user_credentials*.json` y `credentials/`; deja de ignorar `.github/` |
| `.env.example` | `JWT_SECRET_KEY=` vacío, con el comando para generarla |
| `tests/`, `pytest.ini`, `requirements-dev.txt` | Pruebas de configuración de seguridad |
| `.gitleaks.toml`, `.github/workflows/security.yml` | Detección de secretos y pruebas en cada PR |

## 3. Verificación

| Comprobación | Resultado |
|---|---|
| `pytest` en Python 3.11 (la versión de `runtime.txt` y del Dockerfile); 3.13 hasta el commit `dff7eca` | ✅ 21/21 |
| Las mismas pruebas contra `main` | ❌ 11 de 12 fallan (las de configuración); las de registro fallan 5 de 7 con el router anterior; la de login falla sin el arreglo de `sub` |
| gitleaks con las reglas por defecto sobre el historial de `main` | Solo 1 hallazgo (un falso positivo en el README): **las reglas por defecto no detectan contraseñas en texto plano** |
| gitleaks con `.gitleaks.toml` sobre el historial de `main` | 33 hallazgos: el archivo de credenciales (26), los 3 scripts y la documentación |
| gitleaks sobre `main..security/remove-exposed-credentials` y sobre el árbol final | ✅ Sin hallazgos |
| Workflow `security.yml` | YAML válido; los pasos se reprodujeron localmente. **No se ejecutó en GitHub Actions** (la rama no tiene PR) |

El CI de ese repo escanea solo los commits nuevos, porque el historial todavía contiene las credenciales. Después de la purga hay que cambiarlo para que escanee todo el historial (el comentario está en el workflow).

## 4. Pendiente del dueño, en este orden

1. **Rotar** las contraseñas de las cuentas que existan en cualquier base de datos desplegada (Railway u otra) y el `JWT_SECRET_KEY` de esos despliegues. Si no hay despliegues activos, confirmarlo.
2. Opcional e inmediato: **hacer privado** el repositorio. Es reversible y corta el acceso público al historial mientras se decide la purga.
3. Revisar y fusionar `security/remove-exposed-credentials` en `main` (o abrir un PR para que corra el CI).
4. Aprobar o no la **purga del historial**: procedimiento probado en una copia local en `docs/phase-2/SECURITY_REMEDIATION.md` §1. Exige force-push en las 4 ramas y avisar a quien tenga clones.
5. Después de la purga: cambiar el escaneo de gitleaks a todo el historial y volver a enlazar el repositorio desde el portafolio (`links.repo` y quitar `repoWithheld`).
