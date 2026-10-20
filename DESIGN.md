# DESIGN.md: Transmutación

## Direction
**Brutalismo cyberpunk con un símbolo alquímico.** El dueño fijó el estilo (brutalismo cyberpunk), el color (azul) y las referencias (Fullmetal Alchemist y The Legend of Zelda). Estas decisiones mandan sobre las preferencias de diseño por defecto.

La idea que une todo: **intercambio equivalente**. Entra un proceso de negocio y sale un sistema que funciona. El símbolo es un círculo de transmutación convertido en circuito.

- **Modo (Impeccable):** Persuade. El visitante decide si escribe.
- **Patrón (UI UX Pro Max, Portfolio/Personal):** storytelling, casos de estudio como requisito, sin plantillas genéricas. Para mundos brutalistas: bordes crudos, sombras duras, tipografía expresiva.
- **Tema:** oscuro por defecto, porque es la identidad cyberpunk. El tema claro ("concreto de día") está disponible desde el botón de la barra.
- **Lo que este diseño rechaza:** brillos neón difusos, ruido de fondo, terminal de adorno, grilla con resplandor, etiquetas `// 01.` sobre los títulos, tarjetas de métricas, apariciones animadas iguales en cada sección, y cualquier copia de símbolos con marca registrada (Trifuerza, cruz de Flamel, círculos de la serie). Las referencias son de espíritu, no de forma.

## Symbol
Archivos: `public/brand/symbol-dark.svg`, `public/brand/symbol-light.svg`, `public/brand/mark.svg` (íconos pequeños), `app/icon.svg`, `app/apple-icon.png`. Componente: `components/brand/Sigil.tsx`.

| Parte | Significado |
|---|---|
| Anillo exterior grueso + anillo interior con 12 marcas | El ciclo del intercambio equivalente; las marcas son pines de un chip |
| Triángulo hacia arriba | Signo alquímico de transformación |
| "M" trazada como pista de circuito, apoyada en la base del triángulo | Miguel; el código dentro del proceso |
| Rombo lima en el vértice | La piedra: el resultado que vale la pena |
| Copia desplazada 3 px en lima (oscuro) o tinta (claro) | Sombra dura brutalista, error de registro de impresión |

Reglas: no girar, no cambiar colores fuera de la paleta, zona de respeto igual a un cuarto del diámetro. Por debajo de 48 px se usa `mark.svg` (anillo + M + rombo, sin triángulo ni marcas).

## Color
Estrategia: **comprometida**. Azul eléctrico como color dominante de acción, lima como acento de impacto, sobre negro o concreto. Sin rojo en la marca; el rojo solo indica errores.

| Token | Oscuro (defecto) | Claro | Uso |
|---|---|---|---|
| `--ground` | `#0A0B10` | `#E9EAEC` | Fondo |
| `--surface` | `#12141C` | `#F7F7F8` | Paneles, formulario, modal |
| `--ink` | `#EDEFF5` | `#0B0C10` | Texto y bordes estructurales (17,1:1 / 16,2:1) |
| `--ink-2` | `#9AA3B5` | `#454B57` | Texto secundario (7,8:1 / 7,3:1) |
| `--hair` | `#2A2E3A` | `#C4C7CE` | Divisiones menores |
| `--blue` | `#3D7BFF` | `#1D4FBF` | Marca, acción principal, enlaces (5,1:1 / 6,0:1) |
| `--on-blue` | `#0A0B10` | `#FFFFFF` | Texto sobre azul (5,1:1 / 7,2:1) |
| `--acid` | `#D4FF3A` | `#C8F000` | Acento, estado activo, sombras duras en oscuro. Siempre con `--ink-on-acid` encima |
| `--ink-on-acid` | `#0A0B10` | `#0B0C10` | 17:1 / 14,8:1 |
| `--shadow-hard` | `--acid` | `--ink` | Sombra desplazada sin difuminado |
| `--danger` | `#FF8A7E` | `#B42318` | Errores de formulario |

## Typography
- **Display: Big Shoulders** (800–900), mayúsculas, interlineado 0,85–0,95. Grotesca condensada de señalética industrial: el peso del brutalismo.
- **Texto: Atkinson Hyperlegible Next** (400, 700). Legibilidad máxima para que el estilo no cueste lectura. Medida 60–70ch.
- **Datos: JetBrains Mono** (400, 700). Solo fechas, etiquetas de tecnología, campos de datos y código. Números tabulares.
- Escala: 0,8125 · 0,9375 · 1,0625 · 1,25 · 1,75 · clamp(2,5–5rem) para h2 · clamp(4–11rem) para el nombre.

## Shape and material
- Radio 0 en todo.
- Bordes estructurales de 2 px en `--ink`. Divisiones menores de 1 px en `--hair`.
- Sombra dura: `6px 6px 0 var(--shadow-hard)` en paneles y botones. Hover: se desplaza −2 px y la sombra crece a 8 px. Active: vuelve a 0 y la sombra a 2 px.
- La foto se muestra en duotono azul (escala de grises + multiplicación por `--blue`).

## Layout
- Contenedor de 1280 px, gutter 16 px en móvil y 32 px desde 640 px.
- Secciones separadas por una regla de 2 px a todo el ancho y 96–144 px de aire.
- Proyectos y trayectoria son filas de tabla con reglas, no rejillas de tarjetas iguales.

## Motion
- **El momento firmado:** al cargar, el símbolo del hero se dibuja (anillo, triángulo, M), aparece la piedra lima y la copia desplazada se separa 3 px: la transmutación. 1,6 s en total, ease-out exponencial.
- Interacción: filas y botones con desplazamiento duro de sombra (160 ms).
- `prefers-reduced-motion`: el símbolo aparece completo, sin desplazamientos.

## Browser surfaces
`::selection` lima con texto tinta, `caret-color` azul, foco con contorno de 3 px `--acid` en oscuro y `--blue` en claro con separación de 3 px, scrollbar fina en `--hair`, subrayado con `text-underline-offset: 0.2em`.
