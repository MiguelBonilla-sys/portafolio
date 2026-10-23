// Taxonomía editorial compartida por el blog y el Content Engine. Pocas categorías, todas con un
// proyecto del portafolio detrás. Las páginas de categoría solo existen cuando tienen artículos suficientes.

export const CATEGORIES = ["software", "backend", "frontend", "security", "ai", "automation"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, { es: string; en: string }> = {
  software: { es: "Ingeniería de software", en: "Software engineering" },
  backend: { es: "Python y backend", en: "Python & backend" },
  frontend: { es: "React y frontend", en: "React & frontend" },
  security: { es: "Ciberseguridad", en: "Cybersecurity" },
  ai: { es: "Sistemas de IA", en: "AI systems" },
  automation: { es: "Automatización", en: "Automation" },
};

/** Mínimo de artículos publicados para generar la página de una categoría (sin páginas vacías o delgadas) */
export const CATEGORY_PAGE_MIN_POSTS = 3;

/** Categorías anteriores (pilares de LinkedIn) */
export const LEGACY_PILLAR: Record<string, Category> = {
  agents: "ai",
  automation: "automation",
  backend: "backend",
  career: "software",
};

export const ARTICLE_TYPES = [
  "case-study",
  "tutorial",
  "architecture",
  "research",
  "comparison",
  "lessons",
  "postmortem",
  "explainer",
] as const;
export type ArticleType = (typeof ARTICLE_TYPES)[number];

export const ARTICLE_TYPE_LABEL: Record<ArticleType, { es: string; en: string }> = {
  "case-study": { es: "Caso de estudio", en: "Case study" },
  tutorial: { es: "Tutorial", en: "Tutorial" },
  architecture: { es: "Análisis de arquitectura", en: "Architecture analysis" },
  research: { es: "Investigación", en: "Research" },
  comparison: { es: "Comparación", en: "Comparison" },
  lessons: { es: "Lecciones aprendidas", en: "Lessons learned" },
  postmortem: { es: "Postmortem", en: "Postmortem" },
  explainer: { es: "Explicación", en: "Explainer" },
};

/**
 * Estructura sugerida por tipo. Es una guía para el redactor, no una plantilla: solo se escriben
 * las secciones que el material respalda.
 */
export const ARTICLE_STRUCTURE: Record<ArticleType, string> = {
  "case-study": "problema y contexto, alternativas consideradas, decisión, implementación, pruebas, limitaciones, aprendizaje",
  tutorial: "qué se construye y requisitos, pasos con código completo y ejecutable, cómo verificar que funciona, errores comunes",
  architecture: "requisitos y restricciones, componentes y flujo de datos, decisiones y trade-offs, riesgos, qué cambiaría",
  research: "pregunta, metodología, evidencia, resultados, limitaciones y validez, trabajo pendiente",
  comparison: "criterios explícitos, cómo se evaluó, tabla comparativa, cuándo elegir cada opción",
  lessons: "contexto, qué salió distinto de lo esperado, qué se cambió, qué se haría distinto",
  postmortem: "impacto, línea de tiempo, causa raíz, detección, corrección, acciones para que no se repita",
  explainer: "definición directa, cómo funciona, ejemplo concreto, límites y malentendidos comunes",
};
