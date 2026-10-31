# WebMCP en el portafolio

**Estado:** implementación experimental, verificada localmente en Chrome 156 con la API nativa habilitada. Es una mejora progresiva del navegador; no es un servidor MCP, no añade endpoints y no mejora por sí sola el ranking o la citación en buscadores.

## Arquitectura

`useWebMCP` de `use-webmcp-tool@0.3.0` registra cada herramienta en el ciclo de vida de un componente cliente. El paquete detecta `document.modelContext`, no lo consulta durante SSR, usa `AbortSignal` para desregistrar y no tiene dependencia de ejecución pesada (además de tipos WebMCP). `lib/webmcp/portfolio.ts` contiene búsqueda, validación y rutas puras; los componentes de `components/webmcp/` solo adaptan datos públicos y navegación. El formulario reutiliza su validación y controles visibles en `ContactSection.tsx`.

| Ruta | Herramientas registradas | Datos |
| --- | --- | --- |
| Home ES/EN | `search_portfolio_projects`, `get_professional_profile`, `navigate_to_portfolio_section`, `prepare_contact_message` | Proyectos visibles, perfil público y formulario visible |
| Caso de estudio ES/EN | `get_project_details` | Solo el caso abierto |
| Índice de blog ES/EN | `search_blog_articles` | Solo artículos con `draft: false` |
| CV y demás rutas | Ninguna | No se anuncian capacidades sin contexto |

Las seis herramientas tienen `inputSchema` y salida `{ok, data}` o `{ok: false, error}`. Las consultas de datos llevan `readOnlyHint`; navegación y preparación de formulario no. `prepare_contact_message` valida y rellena campos, pero **nunca envía**: la persona debe pulsar el botón de envío. No se incluyen credenciales, rutas administrativas ni contenido oculto. Los IDs de proyecto se validan contra la lista pública; la navegación utiliza rutas locales cerradas y nunca acepta una URL arbitraria. El texto de proyectos y artículos se devuelve como dato no privilegiado, no como instrucciones para el agente.

## Compatibilidad y prueba

Chrome documenta WebMCP como *Early Preview* desde Chromium 146 y exige `chrome://flags/#enable-webmcp-testing` para desarrollo local. El sitio funciona sin esa API: el hook degrada a no-op y el HTML, el formulario y la navegación ordinarios permanecen disponibles. El navegador debe visitar la página para descubrir sus herramientas; WebMCP no crea un catálogo indexable global.

Prueba reproducible desde la raíz del proyecto:

```sh
pnpm build
pnpm start
# En otra terminal, con Chrome 146+ instalado:
WEBMCP_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' pnpm test:e2e
```

`e2e/webmcp.test.mjs` arranca Chrome con `--enable-features=WebMCP --enable-webmcp-testing`, consulta `document.modelContext.getTools()` e invoca `executeTool()` de verdad. Comprueba seis nombres y rutas, búsqueda, perfil, caso de estudio, blog vacío, validación del contacto, ausencia de envío y limpieza al navegar. También abre el sitio en Chrome sin la bandera y comprueba que no hay errores de página. En un entorno sin `WEBMCP_CHROME_PATH`, la prueba nativa se omite explícitamente; las pruebas unitarias puras siguen corriendo con `pnpm test`.

Ejemplo para DevTools en una página de inicio compatible:

```js
const tools = await document.modelContext.getTools();
const search = tools.find((tool) => tool.name === "search_portfolio_projects");
const output = await document.modelContext.executeTool(search, { technology: "FastAPI" });
console.log(output);
```

`getTools()` y `executeTool()` son métodos de consumidor útiles para pruebas o asistentes dentro de la página. El portafolio solo necesita registrar herramientas para agentes del navegador. La API declarativa (`toolname`, `tooldescription`) no se aplica al formulario: su validación React, honeypot y envío externo exigen una separación inequívoca entre preparar y enviar; convertir el `<form>` completo en una herramienta podría sugerir envío automático.

## Fuentes y límites

- [Especificación WebMCP en borrador](https://webmachinelearning.github.io/webmcp/).
- [Introducción oficial de Chrome](https://developer.chrome.com/docs/ai/webmcp).
- [Guía de compatibilidad y React](https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/webmcp).
- [API imperativa, anotaciones, ciclo de vida y pruebas](https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/agentic-javascript-tools).
- [Hook mantenido por GoogleChromeLabs](https://github.com/GoogleChromeLabs/use-webmcp-tool/blob/main/README.md).

La especificación y las APIs aún pueden cambiar. No se ha probado el comportamiento con un agente de terceros ni con la origin trial en producción; solo descubrimiento e invocación nativos en el laboratorio local. No se extrapola compatibilidad a Safari, Firefox u otros navegadores.
