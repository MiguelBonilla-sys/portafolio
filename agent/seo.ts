// Revisión SEO/GEO determinista de un borrador: longitudes, estructura citable, enlaces internos
// y relación con los proyectos del portafolio. No promete posiciones: detecta problemas concretos.

import projectsEs from "../data/projects.es.json" with { type: "json" };
import type { BlogDraft } from "./state.ts";

export interface SeoReport {
  /** Impiden publicar */
  errors: string[];
  /** Se muestran en la vista previa */
  warnings: string[];
  /** ids de proyectos del portafolio relacionados (por etiquetas y tema) */
  relatedProjects: string[];
  words: number;
}

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Proyectos con al menos dos etiquetas o términos en común con el borrador (y sin los no verificados) */
export function relatedProjects(draft: Pick<BlogDraft, "tags" | "title" | "body">, max = 2): string[] {
  const text = norm(`${draft.title} ${draft.tags.join(" ")} ${draft.body}`);
  return projectsEs
    .filter((p) => p.status !== "unverified")
    .map((p) => {
      const terms = [...p.tags, p.title.split(":")[0]].map(norm);
      const score = terms.filter((t) => t.length > 2 && new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text)).length;
      return { id: p.id, score: score + (p.featured ? 0.5 : 0) };
    })
    .filter((p) => p.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((p) => p.id);
}

export function seoReport(draft: BlogDraft, locale: "es" | "en"): SeoReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const body = draft.body;
  const prose = body.replace(/```[\s\S]*?```/g, " ");
  const n = words(prose);
  const es = locale === "es";

  if (!draft.title.trim()) errors.push(es ? "falta el título" : "missing title");
  else if (draft.title.length > 60) warnings.push(`${es ? "título de" : "title is"} ${draft.title.length} ${es ? "caracteres (Google muestra ~60)" : "characters (Google shows ~60)"}`);
  if (draft.description.length < 50) errors.push(es ? "la meta description es demasiado corta" : "meta description too short");
  else if (draft.description.length < 110 || draft.description.length > 165) warnings.push(`meta description: ${draft.description.length} ${es ? "caracteres (ideal 120–160)" : "characters (ideal 120–160)"}`);
  const sw = words(draft.summary);
  if (sw < 25 || sw > 80) warnings.push(`${es ? "resumen de" : "summary is"} ${sw} ${es ? "palabras (ideal 40–60, la respuesta directa que citan los buscadores)" : "words (ideal 40–60)"}`);
  if (n < 250) errors.push(es ? `cuerpo de ${n} palabras: no alcanza para un artículo útil` : `body has ${n} words: too short`);
  if (/^#\s/m.test(body)) warnings.push(es ? "el cuerpo tiene un H1; el título ya es el H1" : "body contains an H1");
  const h2 = body.match(/^##\s+.+$/gm) ?? [];
  if (h2.length < 2 && n > 500) warnings.push(es ? "más de 500 palabras con menos de 2 secciones ##" : "500+ words with fewer than 2 ## sections");
  if (new Set(h2.map((h) => norm(h))).size !== h2.length) warnings.push(es ? "encabezados repetidos" : "duplicate headings");
  if ((body.match(/!\[\s*\]\(/g) ?? []).length) errors.push(es ? "imagen sin texto alternativo" : "image without alt text");
  if (draft.faq.length > 0 && draft.faq.length < 2) warnings.push(es ? "una FAQ de una sola pregunta no aporta: quítala o súmala al cuerpo" : "single-question FAQ");
  const internal = (body.match(/\]\(\/(es|en)\//g) ?? []).length;
  const related = relatedProjects(draft);
  if (internal === 0 && related.length) warnings.push(es ? `sin enlaces internos; relacionado con: ${related.join(", ")} (se enlaza al final)` : `no internal links; related to: ${related.join(", ")}`);
  if (draft.tags.length === 0) warnings.push(es ? "sin etiquetas" : "no tags");

  return { errors, warnings, relatedProjects: related, words: n };
}
