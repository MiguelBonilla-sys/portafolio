# SEO técnico, editorial y GEO · fase 2

> No hay promesa de posiciones ni de citas en ChatGPT, Gemini o Perplexity: lo que sigue mejora la claridad, la verificabilidad y la rastreabilidad del contenido.

## 1. Auditoría previa (qué ya existía)

| Elemento | Antes de la fase 2 |
|---|---|
| Title y description por página | Sí |
| Canonical + hreflang ES/EN + x-default | Sí (`alternatesFor`) |
| Open Graph con imagen y url | Sí desde la fase 1 (`openGraphFor`) |
| Twitter/X cards | **Solo en el layout**: todas las páginas heredaban el `twitter:title` de la home |
| Sitemap con alternates, robots, RSS por idioma | Sí; borradores excluidos |
| JSON-LD | ProfilePage/Person, WebSite, ItemList, SoftwareSourceCode/CreativeWork, BlogPosting, BreadcrumbList, FAQPage |
| Imagen OG por artículo | No: los artículos usaban la del sitio |
| Taxonomía | 4 "pilares" pensados para LinkedIn |
| Artículos relacionados y enlaces a proyectos | No |
| Consistencia entre canales | Solo paridad ES/EN de los datos |

## 2. Implementado

| Cambio | Archivos |
|---|---|
| `socialFor()`: Open Graph **y** Twitter/X por página (título, descripción, imagen, url, autor) | `lib/site.ts` y todas las páginas con metadata |
| Imagen OG por artículo generada con el motor visual (categoría y tipo cambian la composición; texto sin recortes) | `app/[locale]/blog/[slug]/opengraph-image.tsx` |
| `BlogPosting` con `image`, `articleSection`, `wordCount`, autor con `url` y `about` → proyectos del portafolio | `lib/jsonld.ts` |
| Metadata de artículo: `authors`, `section`, `publishedTime`, `modifiedTime` | `app/[locale]/blog/[slug]/page.tsx` |
| Taxonomía de 6 categorías (Ingeniería de software, Python y backend, React y frontend, Ciberseguridad, Sistemas de IA, Automatización) con conversión de los pilares anteriores | `lib/taxonomy.ts`, `lib/blog.ts` |
| Páginas de categoría **solo** con 3+ artículos publicados en ambos idiomas (hoy: ninguna) | `app/[locale]/blog/categoria/[category]/page.tsx` |
| Relacionados por relevancia: proyecto compartido (3), etiqueta (2), categoría (1); sin coincidencias no se muestra nada | `relatedPosts` |
| Bloque "Proyecto relacionado" y CTA discreto a contacto/proyectos en cada artículo; firma de autor con `rel="author"` | página del artículo |
| Frontmatter `projects`, `articleType`, `version`, `category` | `lib/blog.ts`, `agent/lib/mdx.ts` |
| Revisión SEO de cada borrador: longitudes, H1 en el cuerpo, secciones, encabezados repetidos, imágenes sin alt, FAQ de una pregunta, enlaces internos | `agent/seo.ts` |
| Validador posterior a la publicación: estado, título, canonical, hreflang, JSON-LD, indexable | `validatePublished` |

## 3. GEO

| Práctica | Cómo se aplica |
|---|---|
| Respuesta directa | `summary` de 40 a 60 palabras arriba del artículo; la primera frase de cada sección responde su pregunta |
| Definiciones y explicaciones originales | El tipo "explicación" empieza por una definición; el redactor solo usa hechos del material |
| Fuentes primarias identificables | Jerarquía de fuentes y trazabilidad (`EDITORIAL_POLICY.md`); las fuentes del artículo son las URLs que se leyeron |
| Código reproducible | Prohibido el código decorativo; el linter marca bloques sin lenguaje |
| Tablas y diagramas | Solo con criterios explícitos; diagramas SVG con `<title>`, `<desc>` y texto real |
| Fechas y versiones | Fecha de publicación y modificación en la página, OG y JSON-LD; `version` en el frontmatter |
| Autoría coherente | Mismo `@id` de Person en todo el sitio; autor con url en cada artículo |
| Enlaces verificables | Repositorios y documentación; el repo comprometido no se enlaza |
| FAQ | Solo si el material trae preguntas reales; ya no se genera por defecto |
| `llms.txt` y `llms-full.txt` | Se conservan, con estado de cada proyecto y casos de estudio; no se tratan como factor de posicionamiento |

### Consistencia entre canales

`test/consistency.test.ts` falla si:

- el titular difiere entre hero, metadata, CV, JSON-LD, imagen OG, `llms.txt`, tarjeta de contacto (vCard/Wallet), perfil de LinkedIn y el prompt del agente;
- reaparece una afirmación retirada (titular anterior, la cifra de pruebas de la tesis, "agentes sobre LlamaStack", el enlace al repositorio comprometido);
- los años de experiencia difieren entre superficies;
- un cargo o sus fechas no coinciden entre `data/experience` y el perfil de LinkedIn;
- un proyecto sin código público aparece en LinkedIn o en el CV;
- un artículo enlaza un proyecto inexistente, usa una categoría inválida o una fuente que no es https.

Esta prueba encontró una inconsistencia real que la fase 1 no detectó: la tarjeta de contacto (vCard, Google Wallet y `/tarjeta`) seguía con "Full Stack Developer / AI Engineer". Corregido.

## 4. Validación y sus límites

| Qué | Resultado | Límite |
|---|---|---|
| Playwright (`pnpm test:e2e`) | 12 rutas: 200, un `h1`, `og:image`, `og:url` = canonical, `twitter:title` = `og:title`; 404 `noindex` tras hidratar | Laboratorio local |
| axe-core | 0 violaciones en 20 rutas | Automatizado; no reemplaza una prueba con lector de pantalla |
| Build con borradores visibles | Artículo con imagen OG (200, `image/png`), Twitter cards propias, `BlogPosting` completo, proyecto relacionado y CTA | No hay artículos publicados en producción |
| JSON-LD | Estructura revisada con pruebas y lectura del HTML | No se pasó por el Rich Results Test de Google ni por validator.schema.org (requieren red pública hacia la página); hacerlo tras el primer artículo publicado |
| Sitemap y robots | Sin cambios de comportamiento: borradores y `/tarjeta` fuera | — |
