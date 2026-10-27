import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { frontmatterSchema } from "../../lib/blog.ts";
import { linkOrgsMarkdown } from "../../lib/orgs.ts";
import { decodeEntities } from "./html.ts";
import { UserFacingError } from "./redact.ts";
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

interface BlogNode {
  type: string;
  children?: BlogNode[];
  identifier?: string;
  url?: string;
  value?: string;
  alt?: string;
}

function safeDestination(raw: string, image: boolean): boolean {
  if (raw !== raw.trim()) return false;
  let url: string;
  try {
    url = decodeURIComponent(decodeEntities(raw).replace(/&sol;/gi, "/")).replace(/\\/g, "/");
  } catch {
    return false;
  }
  if (/[\u0000-\u001f\u007f]/.test(url)) return false;
  if (/^\/(?!\/)/.test(url)) return true;
  if (image) return false;
  if (url.startsWith("#") || /^mailto:[^\s]+$/i.test(url)) return true;
  try {
    return /^https?:\/\//i.test(url) && ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function blogMdxSafety() {
  return (tree: unknown) => {
    const root = tree as BlogNode;
    const definitions = new Map<string, string>();
    const readDefinitions = (node: BlogNode): void => {
      if (node.type === "definition" && node.identifier && !definitions.has(node.identifier.toLowerCase())) {
        definitions.set(node.identifier.toLowerCase(), node.url ?? "");
      }
      node.children?.forEach(readDefinitions);
    };
    readDefinitions(root);
    const textOf = (node: BlogNode): string => node.value ?? node.alt ?? node.children?.map(textOf).join("") ?? "";
    const clean = (node: BlogNode): BlogNode | null => {
      if (["mdxJsxFlowElement", "mdxJsxTextElement", "mdxFlowExpression", "mdxTextExpression", "mdxjsEsm"].includes(node.type)) return null;
      if ((node.type === "image" || node.type === "link") && !safeDestination(node.url ?? "", node.type === "image")) {
        return { type: "text", value: textOf(node) };
      }
      if (node.type === "definition" && !safeDestination(node.url ?? "", false)) return null;
      if (node.type === "imageReference" || node.type === "linkReference") {
        const url = definitions.get(node.identifier?.toLowerCase() ?? "");
        if (!url || !safeDestination(url, node.type === "imageReference")) return { type: "text", value: textOf(node) };
      }
      if (node.children) node.children = node.children.map(clean).filter((child): child is BlogNode => child !== null);
      return node;
    };
    clean(root);
  };
}

export const blogMdxOptions = { remarkPlugins: [blogMdxSafety] };

export async function validateBlogMdx(mdx: string): Promise<void> {
  try {
    const { frontmatter } = await serialize(mdx, { mdxOptions: blogMdxOptions, parseFrontmatter: true });
    if (!frontmatterSchema.safeParse(frontmatter).success) throw new Error("frontmatter inválido");
  } catch {
    throw new UserFacingError("El artículo generado tiene MDX o frontmatter inválido. No lo publiqué.");
  }
}

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
  // Las empresas con las que trabajo enlazan a su sitio en su primera mención (lib/orgs.ts)
  const body = linkOrgsMarkdown(sanitizeMdxBody(draft.body).body);
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
