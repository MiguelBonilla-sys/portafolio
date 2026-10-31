# Autoridad externa: enlaces que otros quieran citar

**Decisión:** no crear backlinks artificiales. Un cambio en el repositorio puede mejorar destinos enlazables y navegación interna, pero los enlaces entrantes requieren que un editor externo decida citar el trabajo. No hay acceso autorizado a cuentas externas ni a un índice de backlinks; cantidad y dominios actuales: **no verificados**.

## Destinos internos existentes

La home enlaza proyectos destacados, experiencia y contacto; cada caso de estudio enlaza el CV y contacto; los artículos publicados enlazan proyectos relacionados, otros artículos y fuentes. El blog vacío ofrece navegación a proyectos. No se añadieron anclas repetitivas ni enlaces a borradores. Tras publicar el primer artículo aprobado, comprobar que `/es/blog` y `/en/blog` lo enlazan y que el sitemap incluye únicamente el idioma publicado.

## Publicación externa sin spam

| Canal | Pieza útil y enlace editorial propuesto | Condición previa |
| --- | --- | --- |
| GitHub | README de cada repositorio público: problema, instalación, pruebas, límites y enlace al caso de estudio pertinente | No enlazar el repositorio de API Auth Gateway hasta resolver la exposición documentada en `docs/phase-2/SECURITY_REMEDIATION.md` |
| Dev.to | Adaptación técnica de un artículo aprobado con ejemplo reproducible y referencia canónica al original | Evitar copia masiva; revisar soporte de canonical y publicación manual |
| Medium | Ensayo técnico ampliado o relato de decisiones, con enlace contextual a código/caso | Publicación manual; no asumir que el enlace transfiera autoridad |
| LinkedIn | Resumen útil que responda una pregunta concreta y enlace al artículo o demo cuando sea relevante | Respetar la aprobación separada de Content Engine para blog y LinkedIn |
| Comunidades Python/FastAPI | Respuesta a una pregunta real con prueba y código, citando el artículo solo si agrega detalle | Seguir reglas de la comunidad; no autopromoción repetitiva |
| Ciberseguridad | Análisis reproducible de detección IDN, amenazas y limitaciones, con el repositorio y tesis en coautoría | No publicar métricas de evaluación que el propio informe de la tesis considera desactualizadas |
| Referencias académicas | Ficha de tesis con autores, método, fecha y documentación de evaluación válida | Confirmar permiso de coautor y formato institucional antes de difundir material |
| Colaboraciones | Revisiones, ejemplos o contribuciones open source que enlacen una herramienta o investigación porque la usan | Acuerdo editorial explícito; nunca intercambio masivo de enlaces |

## Activos enlazables, en orden

1. Documentar un ejemplo mínimo reproducible del detector IDN con entrada, salida y límites, usando el código público existente.
2. Publicar, tras revisión humana, un artículo de arquitectura LangGraph que distinga el grafo, el estado, la aprobación y las garantías de publicación del Content Engine.
3. Convertir decisiones de FastAPI/Redis/PostgreSQL y Django/React en diagramas SVG accesibles y ejemplos ejecutables; no presentar configuraciones de clientes privados como código abierto.
4. Cuando haya pruebas válidas, compartir la metodología académica y los resultados con fecha, versión y coautoría. Sin corrida nueva, publicar solo método y limitaciones.

La secuencia editorial sugerida —no artículos existentes— es: IDN homograph con Python; agentes con LangGraph; Telegram → blog → LinkedIn con aprobación; FastAPI/Redis/PostgreSQL; Django y React full stack. Cada pieza debe responder una pregunta, enlazar documentación primaria, mostrar un ejemplo real y declarar sus límites.

## Medición y relaciones de enlace

- **Entrante:** otro dominio enlaza una URL del portafolio; medir dominios de referencia y páginas de destino con una herramienta autorizada, no con una estimación inventada.
- **Saliente:** el portafolio enlaza código, documentación o demos; revisar que el destino responda y que el texto del enlace describa su función.
- `nofollow` comunica que no se respalda editorialmente un enlace; `ugc` identifica contenido generado por usuarios y `sponsored` una relación pagada. No añadirlos indiscriminadamente a enlaces editoriales legítimos; usar `sponsored` cuando corresponda a una colocación pagada.
- Revisar trimestralmente enlaces rotos, menciones sin enlace y tráfico referido si el propietario autoriza Search Console o analítica. No prometer posiciones, CTR ni citas de IA por conseguir un enlace.
