# Verificación de contenido

> Fecha: 2026-10-23. Fuentes: `PRODUCT.md` ("Product truth", CV de agosto 2026), los repositorios de GitHub de la cuenta `MiguelBonilla-sys` (lectura; los privados no se citan en el sitio), respuestas HTTP de las URLs públicas.
> Regla aplicada: lo verificable se publica con su fuente; lo no verificable se conserva sin cifras ni estados que no se puedan revisar, y queda aquí como pregunta.

## 1. Afirmaciones verificadas

| Afirmación publicada | Fuente | Cómo se verificó |
|---|---|---|
| Bikans está en producción en `app.bikans.com` | URL pública | `curl` → 200 (2026-10-23) |
| Frontend de Bikans en React + TypeScript, con módulos de nómina, retenciones y administración | repo privado `appbikans` (commit `7957330`) | `package.json` (React 19, TypeScript 5.9, Vite), `src/pages/{app/nomina,app/retenciones,admin}` |
| Detector IDN: tesis en coautoría con Juan Sebastián Fandiño Novoa | `backendTesis/README.md` (commit `9ab0767`) | Línea "Autores" del README |
| Arquitectura de 5 señales, θ = 0,30, BK-tree, TR#39, VirusTotal/URLScan/GSB/WhoisXML, caché de 1 h en Redis, gateway OpenAI-compatible, RAG con ChromaDB, clasificador ONNX, sondeo protegido contra SSRF | `backendTesis/README.md`, `core/llm_gateway.py`, `core/config.py` | Lectura de código y README |
| Razonamiento de θ = 0,30 frente al piso de degradación de 0,25 | `backendTesis/docs/EVAL-T4-T7.md` §4 | Documento de la tesis |
| Cifrado AES-256-GCM de IP, Message-ID y encabezados; `STORE_EMAIL_CONTENT=false` (Ley 1581) | `backendTesis/README.md` § Datos | README |
| 17 hallazgos de la revisión integral y rotación atómica de refresh tokens (5 concurrentes, 1 aceptada) | `backendTesis/docs/correcciones-revision-integral-2026-09-26.md` | Tabla H01–H17 y fila H02 |
| Marcadores de pytest y umbral de cobertura del 90 % | `backendTesis/pyproject.toml`, `verify.sh` | `addopts = --cov-fail-under=90` |
| Suite adversaria LLM01, LLM02, LLM04, LLM05 | `backendTesis/tests/security/` | Nombres de archivo `test_llm0{1,2,4,5}_*.py` |
| "972 pruebas aprobadas, 28 omitidas, 92,6 % de cobertura" | `correcciones-revision-integral-2026-09-26.md` § Verificación | Registro del repositorio, **no ejecutado en esta auditoría**; el sitio lo presenta como "última corrida documentada" con fecha |
| API Auth Gateway: JWT access/refresh con claim `type`, filtro por `dueno_de_activo`, superusuarios ven todo, SQLAlchemy async, httpx, Sentry, Railway | `API_AUTH_HACKATON` (commit `4bf20ca`): `src/auth/jwt_utils.py`, `src/routers/inventory.py`, `src/config/database.py`, `main.py`, `railway.toml` | Lectura de código |
| El gateway trae hasta 2.000 activos y filtra en memoria | `src/routers/inventory.py` (`limit: 2000`) | Lectura de código |
| El gateway no tiene pruebas automatizadas | Árbol del repo | Solo `scripts/test_*.py` manuales |
| Content Engine: nodos del grafo, `interrupt()`, PostgresSaver, `[DATO?]` para cifras desconocidas, linter determinista | Este repo: `agent/graph.ts`, `agent/lib/lint.ts`, `plan.md` §3 | Lectura de código |
| Content Engine no configurado en producción; primer artículo en borrador | `plan.md` §0, `content/blog/*/…mdx` (`draft: true`) | Lectura |
| ETL: 4.101 registros, < 60 s, pruebas unitarias e integración | `ETL_PARCIAL/README.md` y `tests/` | README y árbol |
| GEO Streamlit usa Folium y Plotly sobre `data/countries.csv` | `GEO_STREAMLIT/app.py` | Imports del archivo |
| Sockets TCP/UDP es proyecto de curso | Texto existente del portafolio | Sin contradicción en el repo |
| Tecnologías agregadas al stack: Java, Flask, SQLAlchemy, Railway, Vercel | Repos `PizzeriaDeLaCasaApp2`, `Redes_Sockets`, `FlaskAPI`, `API_AUTH_HACKATON`, este sitio | Ya figuraban en proyectos publicados; solo se listan |

## 2. Afirmaciones no verificadas que se conservaron (vienen del CV del dueño)

| Afirmación | Dónde aparece | Por qué no se pudo verificar | Pregunta |
|---|---|---|---|
| Bikans tiene 2FA (TOTP) en ambos dominios | Proyecto Bikans, experiencia Coordenadas | No aparece en el commit inspeccionado del frontend (abril 2026); el backend no se inspeccionó | ¿El 2FA está en `bikans-backend` o en una versión posterior del frontend? |
| Bikans "con usuarios reales" | `longDescription` de Bikans | Producto privado; no hay datos públicos | Confirmar que se puede seguir diciendo |
| Logros de Coordenadas.co (QuickBooks en 4 días, 5 fases, 17 tareas; 6 proyectos inmobiliarios; 3 industrias) | Experiencia | Trabajo de cliente, sin evidencia pública | Ninguna: es contenido del CV; se mantiene |
| Sibartech Technology SAS, feb 2024 – ago 2025, Junior Backend Engineer | Experiencia | Sin fuente pública | Confirmar fechas con LinkedIn |
| Cursos (U. Sergio Arboleda 2025, U. Nacional 2023–2024) | Experiencia | Sin certificado en el repo | — |
| AWS (EC2, S3, RDS), PHP, MySQL, Make, OWASP Top 10, Node.js, WordPress | Stack (secundarias) | Sin repositorio público que las use | ¿Hay un proyecto o trabajo que las respalde? Si no, conviene quitarlas |
| Pizzería: "seguimiento en tiempo real", "reportes de ventas" | `longDescription` | No se ejecutó la app | — |

## 3. Afirmaciones retiradas del sitio público

| Afirmación anterior | Motivo | Estado ahora |
|---|---|---|
| Sentinel RAG "Producción", destacado, "evaluado con un set de pruebas de precisión de recuperación" | No existe repositorio ni demo en la cuenta | `status: unverified` ("Sin código público"), en el archivo, sin la frase de evaluación |
| LedgerCore "Producción", "pruebas automatizadas", "recorta el tiempo de arranque de auth" | El repo `LedgerCore` (privado) solo tiene un `README.md` de una línea | `unverified`, sin esas frases |
| TaskFlow "Producción", "en tiempo real" | No existe repositorio | `unverified` |
| Los tres en "Proyectos seleccionados" del CV | Mismo motivo | Fuera de `CV_PROJECTS` (`app/[locale]/cv/page.tsx`); PDF regenerado |
| Detector IDN "validado con 359 pruebas automatizadas" | El número no aparece en el repo, que hoy tiene 1.094 funciones `test_*` | Reemplazado por la última corrida documentada (972/28/92,6 %) |
| Detector IDN "agentes sobre LlamaStack" | `core/llm_gateway.py` dice que reemplazó a LlamaStack/Ollama | Se describe el gateway; LlamaStack queda como tecnología secundaria |
| Detector IDN "mi tesis" sin coautor | README declara dos autores | Coautoría explícita en proyecto, About y experiencia |
| API Auth Gateway "Producción · Railway + Sentry" | Proyecto de hackatón de 2025 sin URL viva comprobable | `prototype`, "Hackatón · 2025" |
| ETL "Open source" | Etiqueta de licencia usada como estado | `prototype`, "Repositorio público · 2025" |
| GEO Streamlit "librerías como Folium o PyDeck" | Especulación: el código usa Folium y Plotly | Texto corregido |
| "Full Stack AI Engineer" como titular | Pedido de reposicionamiento | "Full Stack Engineer · Python, React & AI Systems" |
| "Explora más de 35 repositorios" | Número no verificado | "Explora el resto de mis repositorios públicos" |

## 4. Métricas que existen pero no se publican

- Precision/recall/F1 y McNemar de `backendTesis/docs/EVAL-T4-T7.md`: el propio documento lleva una nota (2026-09-26) que dice que la corrida no valida el detector corregido. Se publicarán cuando exista la corrida nueva.

## 5. Inconsistencias entre canales

| Canal | Diferencia | Acción sugerida |
|---|---|---|
| LinkedIn (`docs/linkedin-profile.md`) | Titular propuesto "Full Stack AI Engineer · I build AI agents and automations that run in production" | Alinearlo con "Full Stack Engineer · Python, React & AI Systems" (no se modificó: es texto para el perfil del dueño) |
| CV en PDF | Antes incluía TaskFlow, LedgerCore y Sentinel RAG como proyectos | Regenerado desde `/cv`; la versión anterior queda en el historial de git |
| GitHub `API_AUTH_HACKATON` | Contiene `scripts/user_credentials.json` con contraseñas en claro (hallazgo A-01) | Limpiar el repo antes de seguir enlazándolo en entrevistas |

## 6. Preguntas para el dueño

1. **Sentinel RAG, LedgerCore y TaskFlow:** ¿existen en otro lugar (repo privado, otra cuenta, trabajo de cliente)? Si hay código, se puede enlazar o describir como confidencial y volver a incluirlos en el CV. Si no, conviene quitarlos.
2. **API_AUTH_HACKATON:** ¿las 25 cuentas del archivo son reales? Rotar contraseñas, borrar el archivo y purgar el historial, o archivar el repo.
3. **Bikans:** ¿confirmas el 2FA y que se puede mencionar "usuarios reales"?
4. **Tesis:** ¿qué partes del backend son tuyas y cuáles de Juan Sebastián? Con eso el rol del caso de estudio puede ser más específico.
5. **Stack secundario sin evidencia** (AWS, PHP, MySQL, Make, OWASP Top 10): ¿mantener o quitar?
