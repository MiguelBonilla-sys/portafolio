# Política editorial del Content Engine

> Complementa `docs/content-style-guide.md`. Lo que aquí se describe está implementado en `agent/prompts.ts`, `agent/graph.ts`, `agent/lib/lint.ts`, `agent/seo.ts` y `lib/taxonomy.ts`.

## 1. Jerarquía de fuentes

1. Código y pruebas del proyecto.
2. Documentación oficial.
3. Papers y fuentes primarias.
4. Documentación técnica de proveedores.
5. Fuentes secundarias confiables.

Cómo se aplica:

- Cada afirmación que extrae el investigador lleva los ids de las fuentes (`S1`, `S2`…) y el tipo de respaldo dentro de ellas (`code`, `test`, `doc`, `citation`, `none`).
- `traceClaims` decide el estado sin el modelo: lo que escribió Miguel en el chat es **suyo**; lo de un documento o página es **con fuente** solo si cita una fuente real y, si tiene cifras, la cifra está en esa fuente con algún respaldo. Lo demás queda **sin fuente**.
- Las cifras sin fuente se muestran en la propuesta y el autor decide: conservarlas como `[DATO?]` (bloquean la publicación hasta confirmarlas) o eliminarlas. La recomendación por defecto es no publicarlas.
- `verifyFacts` marca como `[DATO?]` cualquier cifra del borrador que no esté en el material verificable, aunque la haya escrito el modelo con seguridad.
- Las fuentes que se citan al final del artículo son solo las URLs que el autor envió y se leyeron; el modelo no puede agregar enlaces.
- Material que parezca privado de un cliente se señala en la propuesta y no se usa salvo que el autor diga que es público.

## 2. Estructura según el tipo de artículo

No hay plantilla única. El investigador propone un tipo y el redactor recibe las secciones posibles; escribe solo las que el material respalda (un encabezado vacío es una marca P1 del linter).

| Tipo | Secciones posibles |
|---|---|
| Caso de estudio | problema y contexto, alternativas, decisión, implementación, pruebas, limitaciones, aprendizaje |
| Tutorial | qué se construye y requisitos, pasos con código completo, cómo verificar, errores comunes |
| Arquitectura | requisitos y restricciones, componentes y flujo, decisiones y trade-offs, riesgos |
| Investigación | pregunta, metodología, evidencia, resultados, limitaciones |
| Comparación | criterios explícitos, cómo se evaluó, tabla, cuándo elegir cada opción |
| Lecciones | contexto, qué salió distinto, qué se cambió, qué se haría distinto |
| Postmortem | impacto, línea de tiempo, causa raíz, detección, corrección, acciones |
| Explicación | definición directa, cómo funciona, ejemplo concreto, límites |

## 3. Anti-AI-slop

Dos capas, con responsabilidades distintas:

- **Linter determinista** (`lib/lint.ts`): patrones objetivos. P0 y P1 bloquean la aprobación; P2 se informa. El grafo intenta corregir P0/P1 hasta dos veces con el editor antes de mostrar el borrador. Detalle de reglas en `docs/content-style-guide.md` §8b.
- **Revisión contextual** (`evaluate`): especificidad, densidad de hechos, relleno y encaje de categoría, con una nota de la mayor debilidad. Es una opinión del modelo: se muestra y no bloquea.

No hay detector de "texto escrito por IA": el sistema no afirma ni puede afirmar quién escribió un texto. Juzga problemas visibles.

## 4. Diferenciación

Antes de redactar, la propuesta responde con el material: qué problema se aborda, qué decisión merece explicarse (el «ángulo») y qué evidencia la respalda. Si falta información esencial (qué decidió, por qué, qué resultado tuvo, qué parte hizo el autor), el bot pregunta por Telegram; la respuesta se agrega como fuente del autor y se vuelve a investigar. El redactor tiene prohibido simular experiencia personal no documentada.

## 5. LinkedIn

El post adapta una idea del artículo para ingenieros y reclutadores técnicos; no lo resume entero. Alterna cuatro estructuras (`LINKEDIN_SHAPES`) para no repetir la misma, sin fórmulas de enganche, con 0 a 3 hashtags y el enlace en el primer comentario. El post se aprueba aparte del blog.
