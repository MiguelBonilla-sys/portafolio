# Hyperframes · preparación para videos explicativos

> Estado: **solo preparación**. No se instaló Hyperframes, no se renderizó ningún video y la publicación de artículos no depende de esto.
> Fuentes consultadas el 2026-10-23: el repositorio oficial (https://github.com/heygen-com/hyperframes) y la documentación (https://hyperframes.app/docs: introducción, rendering, GSAP).

## 1. Qué es (según su documentación)

- Framework de código abierto (licencia Apache 2.0) que convierte HTML en video renderizado fotograma a fotograma: MP4, MOV o WebM.
- Una composición es un documento HTML: el elemento raíz lleva `data-composition-id`, `data-width` y `data-height`; cada clip lleva `data-start`, `data-duration` y `data-track-index`.
- Las animaciones usan GSAP (o Lottie, CSS, cualquier runtime que pueda "saltar" a un instante): timelines creados con `{ paused: true }` y registrados en `window.__timelines[<composition-id>]`. La duración de la composición es la del timeline.
- CLI no interactivo: `npx hyperframes init`, `preview`, `render --output x.mp4`, `doctor`, `benchmark`. Opciones relevantes: `--fps 24|30|60`, `--quality draft|standard|high`, `--workers`, `--docker`.
- Requisitos: Node.js 22+ y FFmpeg. Modo local (Puppeteer con Chromium incluido) o modo Docker (`chrome-headless-shell` con BeginFrame, salida idéntica entre máquinas, recomendado para CI y agentes).
- Skills oficiales para agentes: `npx skills add heygen-com/hyperframes`; el grupo "Core Skills" basta. El repositorio expone las skills `hyperframes`, `hyperframes-cli`, `gsap`, `hyperframes-registry` y `website-to-hyperframes`. Verificar los nombres al instalarlas: la documentación cambia seguido.

No se usará ningún servicio de video de pago ni el camino de HeyGen que algunas skills ofrecen: todo se renderiza localmente.

## 2. Contrato de datos (implementado)

`agent/video/storyboard.ts`, validado con zod y probado en `agent/test/visuals.test.ts`:

```ts
Storyboard {
  version: 1
  slug, locale, title
  fps: 24 | 30
  format: "landscape" (1920×1080) | "vertical" (1080×1920) | "square" (1080×1080)
  scenes: Scene[]          // 3 a 12
  captions: { sceneId, text }[]   // el video se entiende sin audio
}
Scene =
  | { kind: "title",  id, duration 2–8 s,  title, subtitle }
  | { kind: "visual", id, duration 3–30 s, visual: VisualSpec }   // la misma escena del motor visual
  | { kind: "claim",  id, duration 3–10 s, text ≤ 220, source }   // source obligatorio: S1… o "artículo"
  | { kind: "outro",  id, duration 2–6 s,  url }
```

- `storyboardFromArticle()` lo deriva del artículo de forma determinista: título y primera frase del resumen; una escena por diagrama (duración según el número de pasos); la primera frase de hasta tres secciones como afirmaciones citadas; cierre con la URL.
- `compositionHtml()` produce una composición válida para Hyperframes: cada escena es un clip con `data-start`/`data-duration`, los pasos de un flujo aparecen en orden en un timeline GSAP pausado registrado en `window.__timelines["root"]`, y el timeline se extiende hasta la duración total. Es la animación del proceso real descrito en el artículo, no una diapositiva estática.

## 3. Reutilización de recursos

- Las escenas `visual` son exactamente las `VisualSpec` del artículo: el diagrama SVG del blog y la escena del video muestran lo mismo.
- Paleta y tipografías de `DESIGN.md` en la composición; los SVG del artículo se pueden usar como `<img>` dentro de escenas que no necesiten animación paso a paso.

## 4. Propuesta de renderizado local

```bash
# Una vez, en la máquina de render (no en Vercel)
npx hyperframes doctor          # Node 22+, FFmpeg, Chrome
# Por artículo
node scripts/storyboard.mjs <slug> > renders/<slug>/index.html   # a crear en la fase de video
npx hyperframes preview renders/<slug>
npx hyperframes render --docker --quality standard --fps 30 --output renders/<slug>.mp4
```

Dónde correrlo: la máquina del autor, un runner de GitHub Actions o el servidor propio con Coolify. Las funciones de Vercel no traen FFmpeg ni Chrome y tienen 300 s de límite: el render queda fuera del deploy.

## 5. Costos estimados (a medir)

La documentación muestra un ejemplo de 240 fotogramas (8 s a 30 fps) capturados en 8,2 s y codificados en 8,0 s, 4,2 MB a 1080p. Extrapolando linealmente **ese ejemplo, no una medición propia**:

| Duración | Fotogramas (30 fps) | Tiempo aproximado | Tamaño aproximado (calidad standard) |
|---|---|---|---|
| 60 s | 1.800 | ~2 min | ~30 MB |
| 90 s | 2.700 | ~3 min | ~45 MB |

Memoria: cada worker abre su propio Chrome (~256 MB según la documentación); por defecto usa la mitad de los núcleos con tope de 4. Hay que medir con `npx hyperframes benchmark` en la máquina real antes de decidir.

Almacenamiento: los MP4 no van al repositorio (cada video pesaría decenas de MB). Opciones: subirlos directamente a LinkedIn (Videos API) o a un almacenamiento de objetos, y enlazarlos desde el artículo.

## 6. Estrategia de publicación futura

1. El video se propone en Telegram solo para artículos con un flujo, una secuencia o datos con fuente (sin eso, no hay nada que animar).
2. El autor aprueba el storyboard (texto de cada escena y duración) antes del render, igual que aprueba el artículo.
3. Render local en Docker; el bot recibe el MP4 para revisión.
4. Publicación aparte del artículo y del post, con su propia aprobación por versión.
5. Subtítulos siempre; voz solo si el autor la graba (no se sintetiza su voz).
