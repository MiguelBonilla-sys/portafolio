# Registro de fuentes de los 5 artículos

Estado a 2026-11-23. "Abierta" significa que se abrió la página y se leyó el pasaje citado; "extracto" que solo se leyó el fragmento de un buscador y hay que abrirla antes de publicar. Cada artículo se apoya en una fuente principal y al menos una que la contrasta, de otro tipo y otro autor. El texto público no nombra productos de otras plataformas: describe el problema y cita por identificador o por la entidad que publica.

## 1. Un agente de IA borró una base de producción en 9 segundos

| Fuente | Estado | Qué respalda |
|---|---|---|
| Zenity, "AI Agent Destroys Production Database in 9 Seconds" (28-abr-2026) | Abierta | El 25-abr un agente de código borró el volumen de producción de una empresa en 9 segundos usando un token creado solo para administrar dominios, con permisos sobre toda la API; no había roles ni alcance por operación; las copias estaban en el mismo volumen, la más reciente recuperable tenía tres meses |
| The Guardian, "Claude-powered AI agent's confession after deleting a firm's entire database" (29-abr-2026) | Abierta | Cobertura de prensa independiente del mismo hecho: borró la base de datos de producción de una empresa y sus copias en nueve segundos, "según su fundador". Confirma el relato; no lo verifica por su cuenta |
| OWASP Gen AI Security Project, LLM06:2025 Excessive Agency | Abierta | Define el riesgo (funcionalidad, permisos o autonomía excesivos) y recomienda limitar permisos al mínimo necesario, con el ejemplo de un agente que solo necesita leer una tabla |

Cuidado de redacción: los datos del incidente vienen del relato del fundador de la empresa afectada, no de una verificación independiente. Se escribe "según su fundador". El texto no nombra la plataforma de alojamiento.

## 2. Si entran al panel, ¿a cuántos servidores llegan?

| Fuente | Estado | Qué respalda |
|---|---|---|
| NVD, CVE-2026-34158 | Abierta | Inyección de comandos (CWE-78) en un panel de despliegue de código abierto; quien puede editar la configuración de una aplicación ejecuta comandos en el servidor administrado durante los deploys; afectadas las versiones anteriores a 4.0.0-beta.469, corregido en esa; CVSS 8.8 (CNA: GitHub). NVD aún no la enriquece |
| NVD, CVE-2026-34599 | Abierta | Otra inyección de comandos autenticada en el mismo tipo de panel: un miembro de equipo con el rol más bajo ejecuta comandos como root en los servidores administrados; afectadas las anteriores a 4.0.0-beta.471; CVSS 8.8 |
| OWASP Docker Security Cheat Sheet, regla 1 y regla 11 | Abierta | El socket del daemon pertenece a root y darle acceso a alguien "equivale a darle acceso root sin restricciones al host"; el modo rootless reduce el impacto de un compromiso del daemon o del runtime |
| Docker Docs, Rootless mode | Abierta | Ejecuta el daemon y los contenedores como usuario sin privilegios para mitigar vulnerabilidades del daemon y del runtime |
| Cyera Research, CVE-2026-34040 (bypass de autorización de Docker) | Abierta | Solicitudes de más de 1 MB se descartan en silencio antes de llegar a los plugins de autorización de Docker, que aun así las ejecuta; afecta a quien depende de esos plugins; corregido en Docker Engine 29.3.1; CVSS 8.8; entre las mitigaciones recomienda rootless o userns-remap. Es una página de un proveedor de seguridad: no se usa su cifra "92%" (es la adopción de Docker, no la proporción afectada) |

Matices que el artículo debe respetar: ambas CVE requieren un usuario autenticado, no son ataques anónimos. Rootless reduce el radio de explosión pero no lo elimina: OWASP aclara que no protege ante vulnerabilidades del kernel compartido, y que userns-remap deja el daemon corriendo como root. Es consistente con un diseño de un usuario por proyecto, y no con prometer aislamiento total.

## 3. Un secreto filtrado sigue vivo años después

| Fuente | Estado | Qué respalda |
|---|---|---|
| GitGuardian, State of Secrets Sprawl 2026 | Abierta | De los secretos válidos detectados en 2022, el 64% seguía activo y explotable cuatro años después, en repositorios públicos; el equipo no rota porque teme tumbar producción ("Teams can't rotate secrets without risking production outages"); el 60% de las infracciones de política son secretos de larga vida |
| OWASP Secrets Management Cheat Sheet | Abierta | La rotación manual es propensa a errores y es mejor automatizarla; menciona rotación programada y gradual y credenciales de corta vida |

Nota: el informe y su resumen salen de una empresa que vende detección de secretos; la cifra se atribuye por nombre y no se presenta como porcentaje de toda la industria. No se usa "enero de 2026": la página dice "cuatro años después".

## 4. Un backup que nunca restauraste

| Fuente | Estado | Qué respalda |
|---|---|---|
| Spiceworks, Voice of IT 2026 (artículo del 23-mar-2026) | Abierta | El 41% de los profesionales de TI prueba restauraciones solo de forma rara o puntual, solo cuando las necesita, o nunca; solo el 6% tiene pruebas continuas o automatizadas; el 12% no tiene un RTO formal |
| CISA, #StopRansomware Guide | Abierta | Mantener copias cifradas y fuera de línea, y probar con regularidad la disponibilidad e integridad de los backups; probar los procedimientos de backup periódicamente |

Descartada: la cifra de Sophos (38% de víctimas que pagaron de más porque fallaron sus backups) aparece citada por Spiceworks, pero no está en la página del informe de Sophos; no se usa.

## 5. Actualizar el panel sin que las apps se enteren

| Fuente | Estado | Qué respalda |
|---|---|---|
| Docker Docs, Live restore | Abierta | Por defecto, cuando el daemon se detiene apaga los contenedores en ejecución; `live-restore` los mantiene vivos ante caídas, interrupciones planificadas o upgrades; solo se admite en versiones de parche, no al saltar versiones mayores |
| Kubernetes Docs, Performing a Rolling Update | Abierta | Un rolling update espera a que los Pods nuevos arranquen antes de quitar los viejos y el Service envía tráfico solo a los Pods que pueden atender solicitudes |

Esto reemplaza a los issues públicos de una herramienta concreta: se sustituyó evidencia de fallas puntuales por documentación de diseño de fuentes neutrales. El artículo dice qué pasa por defecto, qué mecanismo lo evita y qué se verifica antes de mover el tráfico. QuadShip lo conecta con su deploy blue/green (sonda de salud antes de cambiar la ruta de Caddy, ya en el MVP) y con la supervisión por systemd/Quadlet (diseño).

## Pendiente antes de publicar

- Releer cada cifra el día de la publicación: las páginas pueden cambiar. Todas las fuentes de este registro se abrieron una vez el 2026-11-23.
- Cada artículo cita sus fuentes en el frontmatter (`sources`) con https y el título de la publicación, sin nombres de productos de otras plataformas.
- Los textos públicos no mencionan el porcentaje de avance del desarrollo de QuadShip ni una fecha de lanzamiento.
