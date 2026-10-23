# Motor visual (`agent/visuals/`)

> Primero se reutiliza lo que existe o se genera con código. No hay API generativa de imágenes. Dependencias: ninguna nueva (`next/og` ya se usaba para la imagen OG y el carrusel).

## Piezas

| Archivo | Qué hace |
|---|---|
| `scene.ts` | Tipos de escena, paleta de `DESIGN.md`, formatos, ajuste de texto, contraste WCAG, validación de contenido y texto alternativo |
| `svg.ts` | Diagramas para el cuerpo del artículo en SVG accesible: flujo, secuencia, comparación, barras, código |
| `render.ts` | PNG con `next/og` (Satori + resvg, funciona en Vercel sin navegador): portada y flujo, en cualquier formato |

## Escenas

| Tipo | Uso | Reglas de contenido |
|---|---|---|
| `cover` | Portada del artículo (OG) y tarjeta de LinkedIn | Motivo geométrico según la categoría (rejilla, capas, marcos, escudo, grafo de nodos, ciclo) con variación determinista por título: dos portadas no quedan iguales |
| `flow` | Diagrama de flujo | 3 a 8 pasos; con menos de 3 no se genera |
| `sequence` | Diagrama de secuencia | 2 a 5 participantes, 2 a 10 mensajes, sin participantes desconocidos |
| `comparison` | Tabla comparativa | 2 a 4 opciones, 2 a 8 criterios, un valor por opción |
| `bars` | Gráfico de datos | Exige la fuente; sin negativos ni valores no numéricos |
| `code` | Fragmento de código presentado | Máximo 24 líneas de 72 columnas |

## Formatos

| Preset | Medidas |
|---|---|
| `og` | 1200 × 630 |
| `linkedin` | 1200 × 627 |
| `square` | 1080 × 1080 |
| `vertical` | 1080 × 1350 |

## Validación

- **Texto**: `fitText` busca el tamaño más grande con el que el texto cabe en el número de líneas permitido y falla con `VisualFitError` si ni el mínimo alcanza. La estimación de ancho sobreestima a propósito. Nunca se publica una imagen con texto cortado: el agente avisa y pide simplificar o enviar un recurso.
- **Contraste**: todos los pares de texto/fondo que usan los renderizadores superan 4.5:1 (prueba en `visuals.test.ts`).
- **Medidas**: `pngSize` lee la cabecera del PNG; la prueba verifica los cuatro formatos.
- **Accesibilidad**: los SVG llevan `role="img"`, `<title>` y `<desc>` con el texto alternativo; en el artículo se insertan como `![alt](/blog/<slug>/<nombre>.svg)`.
- **Contenido**: un diagrama solo se genera si el material describe un flujo ordenado (lo detecta el investigador y queda trazado a la fuente). Un gráfico de barras sin fuente no se genera.

## Integración

- **Vista previa en Telegram**: portada y diagramas como fotos, con su texto alternativo.
- **Blog**: los diagramas se publican como SVG en `public/blog/<slug>/` en el mismo commit; la portada la genera la ruta `opengraph-image` del artículo (no se guarda en el repo).
- **LinkedIn**: si el autor pide «con imagen», la portada en 1200 × 627 se sube con la Images API y se adjunta al post.
- **Hyperframes (futuro)**: el storyboard reutiliza las mismas escenas (`agent/video/storyboard.ts`).

## Límites

- `next/og` no admite todo CSS (sin grid; solo flex). Por eso los PNG cubren portada y flujo; los demás tipos se publican como SVG en el artículo.
- La fuente display se descarga de Google Fonts en tiempo de ejecución; si falla, se usa la fuente por defecto y el ajuste de texto usa una estimación más conservadora.
- Si un concepto no se puede representar con estas escenas (una captura de pantalla, una foto), el agente no lo sustituye por un gráfico abstracto: lo dice y pide el recurso.
