# Plan de contenido: QuadShip (5 artículos + 6 posts de LinkedIn)

Fuentes verificadas y contrastadas: [quadship-sources.md](quadship-sources.md).

Estado: propuesta para aprobar. Nada de esto está publicado ni en la bandeja del agente.
Fecha del plan: 2026-11-23. Reglas del sitio: [content-style-guide.md](../content-style-guide.md) (nada inventado, un hecho propio por pieza, `[DATO?]` bloquea la aprobación).

## 1. ¿Es buena idea promocionar QuadShip así?

Sí, con cuatro ajustes. Lo que dice la evidencia y lo que es criterio mío:

| Punto | Qué encontré | Confianza |
|---|---|---|
| Contenido que responde problemas es una de las tácticas de prelanzamiento que no necesita audiencia previa | Waitlister, guía de 12 estrategias (sep. 2026): "publicar respuestas a lo que buscan tus futuros usuarios" y "compartir el progreso en público" no requieren audiencia, tardan meses | Media (guía de un proveedor de waitlists) |
| Build in public llega sobre todo a otros builders | La misma guía: es "la audiencia correcta para una herramienta para desarrolladores" | Media |
| Hacker News no sirve todavía | Show HN solo acepta cosas que se pueden probar; sus reglas dejan las páginas de registro fuera de tema | Media (citado por la guía) |
| LinkedIn no es donde discute su público | Los self-hosters hablan en r/selfhosted, HN y dev.to. LinkedIn te sirve más para credibilidad y para el trabajo remoto que buscas | Criterio mío, no medido |
| LinkedIn no detecta texto de IA directamente | Mide dwell time, guardados y comentarios. Un proveedor reporta penalización acumulada si más del 40% de tus posts de 30 días tiene frases plantilla | Baja a media (datos de un proveedor, no de LinkedIn) |
| Formato | Carruseles/documentos: 7,00% de engagement frente a 2-3% de texto (Socialinsider vía SocialNexis, 2026) | Media |
| Cadencia | 2 a 5 posts por semana (Buffer, 2 M de posts); dos por semana es el piso | Media |
| Enlaces en el cuerpo | Se reporta hasta 60% menos alcance. El agente ya pone el enlace en el primer comentario | Media (varios proveedores, no oficial) |

Ajustes:
1. **No hay lista de espera, y no hace falta: QuadShip es una PaaS open source** (licencia Apache-2.0 en el repositorio). El destino de cada pieza es quadship.app y la página del proyecto en este sitio; cuando el repositorio sea público, el enlace al código pasa a ser el destino principal. Hoy el repositorio es privado: no se enlaza ni se promete una fecha de apertura.
2. **Prealfa dicho siempre, sin cifras de avance.** Cada pieza cierra con el estado real: nunca se desplegó una app en un host real, y las capacidades de v1 se describen como diseño. No se menciona el porcentaje de avance del desarrollo, ni en artículos, ni en posts, ni en widgets.
3. **Ninguna pieza nombra otras plataformas.** Ni en el texto, ni en los títulos, ni en los ganchos. Se escribe "algunas herramientas", "otras plataformas" o "un panel de código abierto muy usado". Cada dato se respalda con su identificador público (CVE, GHSA, número de issue) en la lista de fuentes, y el texto describe el problema, no al producto.
4. **Canales de la audiencia real.** Cuando esté el primer artículo, republicarlo (adaptado) en dev.to y responder preguntas en r/selfhosted sin promocionar. Va aparte de este plan.

El popup de la portada: no lo investigué. Mi criterio: tu portafolio lo leen reclutadores y QuadShip es prealfa, así que el popup puede distraer del objetivo de trabajo remoto. **Aplicado:** deja de aparecer solo el 1-ene-2027 (hora de Bogotá), sin tocar nada más.

## 2. Los 5 artículos

Cada uno parte de un problema documentado y lo conecta con una decisión de diseño de QuadShip (ADR/spec). Orden: de lo más entendible por cualquiera a lo más técnico.

| # | Problema | Evidencia (a verificar antes de escribir) | Diseño de QuadShip y estado real | Widget |
|---|---|---|---|---|
| 1 | Un agente de IA borró una base de producción en 9 segundos | Zenity, The Guardian y OWASP LLM06 Excessive Agency (todas abiertas). Los hechos vienen del relato del fundador afectado | Registro de operaciones MCP con aprobación humana (ADR 0009, F20/F21). **No implementado.** | Línea de tiempo del agente: aprobación activada o desactivada |
| 2 | Si entran al panel, ¿a cuántos servidores llegan? | NVD CVE-2026-34158 y CVE-2026-34599 (abiertas, ambas autenticadas), OWASP Docker Security Cheat Sheet y Docker Docs rootless (abiertas) | Podman rootless, un usuario Linux por proyecto (ADR 0003). **Diseño; el MVP corre un agente como root en el mismo host.** Rootless reduce el radio de explosión, no lo elimina | Comprometer el panel: modelo con root frente a un usuario por proyecto |
| 3 | Un secreto filtrado sigue vivo años después | GitGuardian 2026: 64% seguía activo cuatro años después (abierta); OWASP Secrets Management Cheat Sheet: automatizar la rotación (abierta) | Secretos cifrados que nunca se devuelven en claro (F15, ADR 0013). **Cifrado en reposo ya está en el MVP; rotación y credenciales por app no.** | Línea de tiempo de una filtración: sin rotación y con rotación |
| 4 | Un backup que nunca restauraste | Spiceworks Voice of IT 2026: 41% prueba restores rara vez o nunca (abierta); CISA #StopRansomware Guide: probar los backups con regularidad (abierta) | Backups con SHA-256 verificado antes de restaurar (F14). **No implementado.** | Fila de backups verdes, botón restaurar, verificación previa |
| 5 | Actualizar el panel sin que las apps se enteren | Docker Docs, live restore: por defecto el daemon apaga los contenedores al detenerse (abierta); Kubernetes Docs, rolling update: se espera a que lo nuevo esté listo antes de quitar lo viejo (abierta) | Deploy blue/green con sonda de salud antes de cambiar la ruta (**ya en el MVP**) y apps supervisadas por systemd/Quadlet (**diseño**, sin prueba en host real) | Línea de tiempo de una actualización con el panel acoplado y desacoplado |

Notas de evidencia (detalle y estado de cada fuente en [quadship-sources.md](quadship-sources.md)):
- Cada artículo tiene una fuente principal y al menos una de otro tipo que la contrasta. Las cifras y los pasajes se leyeron abriendo las páginas el 2026-11-23; hay que releerlos el día de publicar.
- Las dos CVE son autenticadas: no se presentan como ataques anónimos. Rootless reduce el radio de explosión, no lo elimina (el kernel es compartido): el artículo lo dice.
- Los hechos del incidente del artículo 1 vienen del relato del fundador afectado y se atribuyen así.
- La cifra de GitGuardian viene de una empresa que vende detección de secretos y se atribuye por nombre.
- La cifra de Sophos sobre backups fallidos no está en la página del informe: no se usa.
- Los comentarios anecdóticos de foros no se usan. El artículo 5 ya no se apoya en issues de una herramienta concreta, sino en documentación de Docker y Kubernetes.

## 3. Los 6 posts de LinkedIn (inglés)

Publica el cron de Vercel una vez al día, a las 8:00 de Bogotá. Calendario martes y jueves: **1, 3, 8, 10, 15 y 17 de diciembre de 2026**. Cada artículo tiene su post (carrusel PDF con `/carrusel`, enlace al artículo en el primer comentario). El sexto no tiene artículo: muestra QuadShip y enlaza a quadship.app y a la página del proyecto.

Los ganchos son borradores para que los reescribas con tus palabras (la guía del sitio lo pide: la estructura debe salir del autor). Cada uno lleva su dato verificable; el cuerpo lo redacta el agente con el material real.

| Fecha | Post | Gancho propuesto | Formato |
|---|---|---|---|
| Mar 1-dic | 1. Agente que borra | "In April an AI coding agent deleted a company's production database in nine seconds. It had a token with more power than the job needed, so it used it." | Carrusel de 6 láminas |
| Jue 3-dic | 2. Panel con root | "Command injection bugs keep showing up in deploy panels. The useful question is what an attacker can reach once they are inside." | Carrusel |
| Mar 8-dic | 3. Secretos vivos | "Of the secrets confirmed valid in 2022, 64% were still active four years later, according to GitGuardian. A leaked secret is a problem with a long tail." | Carrusel |
| Jue 10-dic | 4. Backups | "41% of IT pros test restores rarely, only when needed, or never. A green checkmark on a backup tells you the file moved." | Carrusel |
| Mar 15-dic | 5. Actualizar | "By default, when the Docker daemon stops, it stops your running containers. A setting called live restore changes that, and a lot of setups never turn it on." | Carrusel |
| Jue 17-dic | 6. QuadShip | "I'm building QuadShip, a self-hosted PaaS in Rust. It is pre-alpha and has never deployed an app on a real server. Here is what exists and what is still a plan." | Carrusel de 8 láminas con el estado real |

Cómo cuidar el alcance (sin trucos): sin frases plantilla ("it's not X, it's Y", "here's the thing"), sin rayas largas, un cierre que sea una pregunta real, a lo sumo 3 hashtags, un solo post por día. El linter del agente (`agent/lib/lint.ts`) ya bloquea P0/P1; además pasa cada texto por `humanizer-toolkit` y reescribe tú las tres primeras líneas y la pregunta final.

## 4. Imágenes interactivas con TypeScript

**Restricción encontrada:** el agente elimina todo JSX y toda expresión del MDX (`blogMdxSafety` y `sanitizeMdxBody`), porque el cuerpo lo escribe un modelo con material no confiable. Un widget no puede venir como etiqueta en el texto del agente.

**Solución:** una lista cerrada de widgets, llamados con un bloque de código que sí se conserva:

````
```widget
approval-gate
```
````

`components/blog/Prose.tsx` intercepta ese bloque y renderiza el componente desde un registro (`components/blog/widgets/index.ts`). Un id desconocido no renderiza nada. El modelo solo escribe un id; nunca código.

**Una sola fuente de verdad por widget:** un arreglo de pasos (`title`, `caption`, `state`). El componente React anima entre pasos (SVG, transiciones CSS, botones Siguiente/Anterior/Reiniciar, flechas del teclado, `prefers-reduced-motion` respetado, texto alternativo por paso). El mismo arreglo alimenta las láminas del carrusel de LinkedIn con el motor existente (`agent/visuals`, escenas en datos, paleta de DESIGN.md), así que sitio y LinkedIn nunca se contradicen.

Reglas de contenido: un concepto por widget, máximo 5 pasos, 12 palabras por leyenda, vocabulario sin jerga ("la llave del panel", no "daemon rootful").

**Estado (2026-11-23):** hechos `approval-gate` (artículo 1) y `blast-radius` (artículo 2) sobre un marco común (`WidgetFrame`, `Widget.module.css`, `Diagram.module.css`). Detalle del registro cerrado: (`components/blog/widgets/`), el bloque `widget` en `Prose.tsx` y el primer explicador, `approval-gate` (pasos en `lib/explainers/approval-gate.ts`, español e inglés). Verificado en un navegador real: pasos, compuerta activada y apagada, Aprobar y Rechazar, flechas del teclado, `prefers-reduced-motion`, celular de 380 px sin desborde y sin errores de consola. Tests: pasos y textos, lista cerrada (rechaza `constructor`, `__proto__`), cada id usado en `content/blog` existe, y el sanitizador del agente conserva el bloque y escapa el JSX. **Hecho también:** `secret-rotation` (3), `restore-check` (4) y `update-day` (5), con las mismas pruebas y verificación en navegador, y las láminas del carrusel (`explainerSlides`: portada, pasos comunes, "sin" y "con" la protección, estado real, firma; entran en la lámina de 1080×1350). El agente lee la pista `Widget: id` de la idea, deja el bloque en el artículo (español e inglés) y arma el carrusel con esos pasos; un id fuera de la lista se ignora.

## 5. Cómo se sube con el agente

1. `docs/content/quadship-ideas.json` tiene las 5 ideas con el formato exacto de `POST /api/agent/inbox` (título, resumen, tema, fuente HTTPS). Se suben con `AGENT_INBOX_TOKEN=... node scripts/queue-ideas.mjs docs/content/quadship-ideas.json` (el token sale del entorno y nunca se imprime; `--dry-run` valida sin enviar). El inbox es una ruta de esta misma app en Vercel y hoy responde 404 en producción: falta crear `AGENT_INBOX_TOKEN` en Vercel (`openssl rand -hex 24`) y redesplegar. Antes de desarrollar las ideas hay que desplegar los cambios del agente de este plan (pista `Widget:`, imágenes y sitemap), porque el agente corre en Vercel.
2. Cada idea llega a Telegram como pendiente. **El agente desarrolla una idea a la vez**: si hay un borrador abierto, pide terminarlo o cancelarlo antes de abrir otra. Así que se desarrollan en secuencia, una cada dos o tres días, no las cinco juntas.
3. Por pieza: investigar, redactar en español, post de LinkedIn en inglés, traducción al inglés, carrusel y portada, corrector anti-slop (dos pasadas), verificación de hechos, tu aprobación del blog y de LinkedIn por separado, y programarlo para su fecha.
4. El cron solo publica lo aprobado y programado, con el hash guardado. Si apruebas fuera de la franja, sale en la siguiente (el bot lo dice).
5. **Imágenes con alt y título, siempre.** Toda imagen del artículo se escribe `![alt](ruta "título")`. El agente completa el título con el alt si falta y **bloquea la aprobación** si falta el alt; los diagramas que genera salen con ambos; cada widget es una imagen (`role="img"`, alt y título) y la foto de la portada de la sección Sobre mí también lleva título. Tras el deploy, el agente revisa que ninguna `<img>` de la página publicada quede sin alt o sin título.
6. **Indexación automática por artículo.** Al publicarse, cada artículo entra solo en el sitemap, `llms.txt`, `llms-full.txt` (texto completo), el JSON-LD, la herramienta WebMCP `search_blog_articles` del índice y la nueva `get_blog_article` de su propia página. El sitemap se regenera con cada publicación (cada artículo es un commit, y cada commit un deploy), con `lastmod` y las dos versiones de idioma (hreflang). Tras el deploy, el agente abre `sitemap.xml`, `llms.txt` y `llms-full.txt`, revisa canonical, hreflang, JSON-LD e imágenes, y avisa por Telegram de lo que falte. Comprobado con un build real de un artículo de prueba (ya borrado).
7. Cada artículo debe tener `projects: ["quadship"]` para que el caso de estudio enlace los artículos y viceversa.

## 6. Lo que falta o no encaja

- **Skill para Astro lista.** `blog-post-generator` es de otra marca y genera para WordPress, así que armé una variante, `blog-post-generator-astro`, junto a la original (en `monthly-content-toolkit/.agents/skills/`). Escribe archivos de colección de contenido de Astro, aplica el método de `seo-geo-optimizer` por post (resumen que responde primero, FAQ visible y en JSON-LD, fuentes reales, hreflang, sitemap, reglas de crawlers) y trae dos validadores. Probada en Astro 7.4.11. Sirve para el sitio de QuadShip (Astro) cuando tenga blog; este portafolio es Next.js y publica con el agente.
- **Releer las fuentes** el día de publicar cada pieza (las páginas cambian). Todas están abiertas y verificadas una vez (2026-11-23); el registro está en `quadship-sources.md`.
- **El README de QuadShip puede estar atrasado** frente a los merges de RBAC, volúmenes y push-to-deploy; antes de afirmar qué no existe en cada artículo, confirmar con el código.

## 7. Orden de trabajo

1. Aprobar este plan y ajustar los ganchos.
2. ~~Construir el registro y los 5 widgets.~~ Hecho.
3. Subir las ideas a la bandeja y desarrollar la 1 con el agente.
4. Publicar 1-dic; seguir la secuencia con una pieza lista dos días antes de cada fecha.
