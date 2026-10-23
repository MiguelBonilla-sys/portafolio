import matter from "gray-matter";
import type { BlogDraft } from "../state.ts";

interface MdxInput {
  draft: BlogDraft;
  slug: string;
  locale: "es" | "en";
  date: string;
  category: string;
  contentId: string;
  sources: { title: string; url: string }[];
  projects?: string[];
  version?: number;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * El cuerpo lo escribe un modelo a partir de material no confiable, y MDX compila JSX y expresiones.
 * Fuera del código se neutraliza todo lo que no sea Markdown: import/export, etiquetas JSX o HTML,
 * llaves de expresión, enlaces javascript:/data: e imágenes externas (rastreo). El código se conserva.
 */
export function sanitizeMdxBody(body: string): { body: string; findings: string[] } {
  const findings = new Set<string>();
  const parts = body.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  const out = parts.map((part, i) => {
    if (i % 2 === 1) return part; // bloque o fragmento de código
    let text = part;
    text = text.replace(/^[ \t]*(import|export)\b.*$/gm, () => {
      findings.add("import/export eliminado");
      return "";
    });
    // Imágenes: solo rutas locales del sitio
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, alt: string, src: string) => {
      if (src.startsWith("/") && !src.startsWith("//")) return m;
      findings.add("imagen externa eliminada");
      return alt ? `(${alt})` : "";
    });
    // Enlaces: http(s), mailto, anclas y rutas del sitio
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (m, label: string, href: string) => {
      if (/^(https?:|mailto:|#|\/(?!\/))/i.test(href)) return m;
      findings.add(`enlace no permitido eliminado (${href.split(":")[0]})`);
      return label;
    });
    text = text.replace(/<(\/?[A-Za-z!?][^>]*)>/g, (_m, inner: string) => {
      findings.add("etiqueta HTML/JSX escapada");
      return `\\<${inner.replace(/[{}]/g, (c) => `\\${c}`)}\\>`;
    });
    text = text.replace(/(?<!\\)[{}]/g, (c) => {
      findings.add("llaves escapadas");
      return `\\${c}`;
    });
    return text;
  });
  return { body: out.join("").replace(/\n{3,}/g, "\n\n").trim(), findings: [...findings] };
}

/** Archivo MDX con el frontmatter que valida lib/blog.ts (zod). */
export function buildMdx({ draft, slug, locale, date, category, contentId, sources, projects = [], version }: MdxInput): string {
  if (!SLUG.test(slug)) throw new Error(`slug inválido: ${slug}`);
  const description = draft.description.length > 170 ? `${draft.description.slice(0, 167).trimEnd()}…` : draft.description;
  const { body } = sanitizeMdxBody(draft.body);
  const data: Record<string, unknown> = {
    title: draft.title.slice(0, 70),
    description: description.length >= 50 ? description : `${description} ${draft.summary}`.slice(0, 160),
    summary: draft.summary,
    date,
    slug,
    locale,
    category,
    articleType: draft.articleType,
    tags: draft.tags.slice(0, 5),
    projects,
    faq: draft.faq,
    sources: sources.filter((s) => /^https:\/\//.test(s.url)),
    draft: false,
    contentId,
    version,
  };
  // YAML no admite undefined: los campos opcionales vacíos no se escriben
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  return matter.stringify(`\n${body}\n`, data);
}

export function blogPath(locale: "es" | "en", slug: string): string {
  if (!SLUG.test(slug)) throw new Error(`slug inválido: ${slug}`);
  return `content/blog/${locale}/${slug}.mdx`;
}

/** Recursos visuales del artículo: public/blog/<slug>/<nombre>.svg */
export function assetPath(slug: string, name: string): { repoPath: string; publicPath: string } {
  if (!SLUG.test(slug) || !SLUG.test(name)) throw new Error(`ruta de recurso inválida: ${slug}/${name}`);
  return { repoPath: `public/blog/${slug}/${name}.svg`, publicPath: `/blog/${slug}/${name}.svg` };
}
