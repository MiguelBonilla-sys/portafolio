# Decisiones de contenido · fase 1.5

> Una afirmación solo queda publicada si hay evidencia que la respalde. Si falta evidencia, se reescribe o se oculta, y la pregunta queda para el dueño.
> El código privado se leyó para verificar, pero no se copió ni se cita más allá de nombres de archivos y conteos.

## 1. Clasificación de proyectos

| Proyecto | Clase | Evidencia | Decisión |
|---|---|---|---|
| Bikans | Cliente, confidencial, en producción | `app.bikans.com` responde; `bikans.com` es el sitio de una firma contable (el cliente); repos privados `appbikans` y `bikans-backend` | Se mantiene destacado y en el CV; dos frases reescritas (§2) |
| Detector IDN (tesis) | Académico, público, en coautoría | Repo público `backendtesis` | Sin cambios de texto (§3) |
| mangel14.dev y Content Engine | Personal, público, desplegado | Este repositorio | Sin cambios |
| API Auth Gateway | Prototipo de hackatón, público pero sin enlace | Repo público con credenciales expuestas | Sigue sin enlace (`repoWithheld`) hasta la rotación y la purga |
| Sentinel RAG | Sin evidencia (puede ser idea o trabajo privado) | No hay repositorio con ese nombre. `auth-sentinel` es una librería TOTP, no un RAG | Sigue publicado como "Sin código público", fuera del CV y de destacados |
| TaskFlow | Sin evidencia | No hay repositorio | Igual que Sentinel RAG |
| LedgerCore | Idea o trabajo sin empezar, según la evidencia | Repo privado `ledgercore` con un README de una línea y nada más | **Oculto** (`hidden: true`): el texto decía "Está construido con FastAPI, PostgreSQL y Redis" y el repositorio no lo respalda. Fuera de la lista, la página, el sitemap, `llms.txt` y el JSON-LD. Se reactiva quitando el campo |

No se asumió que ninguno fuera falso. Ocultar LedgerCore es reversible y no borra su texto de `data/projects.*.json`.

## 2. Bikans

| Afirmación | Evidencia | Decisión |
|---|---|---|
| Autenticación de dos factores (TOTP) | `bikans-backend` (`5bcdef5`): modelo `MFADevice` con secreto cifrado y códigos de recuperación; el login nunca entrega un JWT sin pasar por la configuración o la verificación del segundo factor; 21 pruebas en `apps/auth_api/tests/test_mfa.py`; los commits del módulo son de Miguel (2026-04-16). El bundle público de `app.bikans.com` incluye el flujo (QR `otpauth_uri`, configuración y verificación) | **Verificado**. Se mantiene en proyecto, experiencia, CV y LinkedIn |
| "Para los dos dominios" | Hay un solo login, compartido por las dos herramientas (`product_slug` opcional) | Reescrito: "el inicio de sesión que comparten las dos herramientas" |
| "En producción con usuarios reales" | Un HTTP 200 prueba que el sitio existe, no que lo usen; no hay datos públicos de uso | **Retirado** "con usuarios reales"; queda "en producción" |
| "Para un cliente" | `bikans.com` es el sitio de la firma contable Bikans, distinta de Coordenadas.co | Se mantiene |
| Frontend en React | `appbikans`: 22 de 27 commits de Miguel (los demás son de Claude y de un bot de Railway). La versión con 2FA que está en producción no está en las ramas accesibles de `appbikans`; puede estar en otro repositorio | Se mantiene. La autoría del frontend del 2FA queda como pregunta |

No se ejecutó la suite de `bikans-backend`: necesita PostgreSQL y su configuración privada. "21 pruebas" es un conteo del archivo, no un resultado.

## 3. Tesis (detector de phishing por homógrafos IDN)

| Nivel | Qué hay | Cómo se presenta |
|---|---|---|
| Código implementado | Repositorio `backendtesis` (`9ab0767`): orquestador de 5 señales, agentes, gateway LLM, RAG con ChromaDB | Caso de estudio, con rutas de archivo |
| Pruebas existentes | 1.094 funciones `def test_` (conteo estático) | No se publica la cifra |
| Última corrida documentada | 972 aprobadas, 28 omitidas, 92,6 % de cobertura, 2026-09-26, según el propio repositorio | Se publica con la fecha y la aclaración "documentada en el repositorio". En esta fase **no se volvió a ejecutar** |
| Evaluación validada | `docs/EVAL-T4-T7.md` quedó invalidado por su propia nota de revisión (URLs duplicadas y fuga entre calibración y evaluación) | Ninguna cifra de precision, recall ni F1; la limitación se dice en la página |

Autoría: el caso de estudio dice "proyecto de grado en equipo de dos personas" y nombra al coautor en todas las superficies. Los 97 commits del backend están en la cuenta de Miguel. Eso no muestra el reparto de trabajo (pudo haber trabajo en pareja, o el coautor pudo hacer otras partes: extensión, complemento de Outlook, dashboard, documento), así que **no se publica ninguna contribución individual**.

## 4. Coherencia entre superficies

| Superficie | Estado |
|---|---|
| Hero, About, proyectos, experiencia, CV web, CV PDF, imagen OG, JSON-LD, `llms.txt`, `llms-full.txt`, tarjeta de contacto, `docs/linkedin-profile.md`, prompt del agente | Mismo titular y mismos años; lo comprueba `test/consistency.test.ts` |
| CV PDF | **Estaba desactualizado**: describía el Content Engine antes de la fase 2. Se regeneró y `test/cv.test.ts` compara su texto con los datos del sitio. La prueba falla con los PDF anteriores |
| Tecnologías | Sin cambios. Las secundarias sin repositorio (AWS, PHP, MySQL, Make, LlamaStack) siguen en la lista secundaria: se usaron en el trabajo o en versiones anteriores de la tesis. Las principales (`core`) son las que respaldan los proyectos destacados |
| Empleos, fechas y logros | Sin cambios: no hay evidencia nueva en contra |

## 5. Preguntas para el dueño

1. **LedgerCore**: ¿hay código fuera del repositorio `ledgercore`? Si no, ¿se publica como idea, con otro texto, o se retira?
2. **Sentinel RAG y TaskFlow**: ¿son trabajo privado, de cliente o idea? Si hay código privado verificable, se puede describir sin enlazarlo, como Bikans.
3. **Bikans**: ¿en qué repositorio está el frontend del 2FA que corre en producción? ¿Se puede decir algo sobre su uso real (sin cifras privadas)?
4. **Tesis**: ¿qué partes hizo cada coautor? Con eso el rol puede ser específico.
5. **API Auth Gateway**: la rotación y la purga (ver [API_AUTH_SECURITY.md](API_AUTH_SECURITY.md)).
6. Siguen abiertas las preguntas de la fase 1 sobre la experiencia (fechas de Sibartech y cursos): `docs/audit/CONTENT_VERIFICATION.md` §6.
