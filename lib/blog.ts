import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Locale } from "@/i18n/routing";
import { ARTICLE_TYPES, CATEGORIES, LEGACY_PILLAR } from "@/lib/taxonomy";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "usa el formato YYYY-MM-DD");

// Contrato del frontmatter (docs/architecture.md › Data Model). Un artículo inválido rompe el build.
const frontmatterSchema = z.object({
  title: z.string().min(1).max(70),
  description: z.string().min(50).max(170),
  summary: z.string().min(1),
  date: isoDate,
  updated: isoDate.optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  locale: z.enum(["es", "en"]),
  category: z.enum(CATEGORIES).optional(),
  /** Campo anterior a la taxonomía actual; se convierte a category */
  pillar: z.enum(["agents", "automation", "backend", "career"]).optional(),
  articleType: z.enum(ARTICLE_TYPES).optional(),
  /** ids de proyectos del portafolio relacionados (data/projects.*.json) */
  projects: z.array(z.string()).default([]),
  version: z.number().int().positive().optional(),
  tags: z.array(z.string()).max(5).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
  draft: z.boolean().default(false),
  contentId: z.string().optional(),
  linkedinUrn: z.string().optional(),
});

export type Post = Omit<z.infer<typeof frontmatterSchema>, "category" | "pillar"> & {
  category: (typeof CATEGORIES)[number];
  body: string;
  readingMinutes: number;
};

const showDrafts = process.env.NODE_ENV === "development" || process.env.SHOW_DRAFTS === "true";

function readLocale(locale: Locale): Post[] {
  const dir = path.join(BLOG_DIR, locale);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const parsed = frontmatterSchema.safeParse(data);
      if (!parsed.success) {
        throw new Error(`Frontmatter inválido en content/blog/${locale}/${file}:\n${z.prettifyError(parsed.error)}`);
      }
      if (parsed.data.locale !== locale) {
        throw new Error(`content/blog/${locale}/${file} declara locale "${parsed.data.locale}"`);
      }
      if (`${parsed.data.slug}.mdx` !== file) {
        throw new Error(`content/blog/${locale}/${file}: el slug debe coincidir con el nombre del archivo`);
      }
      const category = parsed.data.category ?? (parsed.data.pillar ? LEGACY_PILLAR[parsed.data.pillar] : undefined);
      if (!category) throw new Error(`content/blog/${locale}/${file}: falta category`);
      const { pillar: _legacy, ...fields } = parsed.data;
      void _legacy;
      const words = content.split(/\s+/).filter(Boolean).length;
      return { ...fields, category, body: content, readingMinutes: Math.max(1, Math.round(words / 220)) };
    });
}

export function getPosts(locale: Locale): Post[] {
  return readLocale(locale)
    .filter((p) => showDrafts || !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(locale: Locale, slug: string): Post | undefined {
  return getPosts(locale).find((p) => p.slug === slug);
}

/**
 * Artículos relacionados por relevancia, no al azar: comparten proyecto (3), etiqueta (2 cada una)
 * o categoría (1). Sin coincidencias, no se muestra nada.
 */
export function relatedPosts(locale: Locale, post: Post, max = 3): Post[] {
  const tags = new Set(post.tags.map((t) => t.toLowerCase()));
  return getPosts(locale)
    .filter((p) => p.slug !== post.slug && !p.draft)
    .map((p) => ({
      p,
      score:
        p.projects.filter((id) => post.projects.includes(id)).length * 3 +
        p.tags.filter((t) => tags.has(t.toLowerCase())).length * 2 +
        (p.category === post.category ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, max)
    .map((x) => x.p);
}

/** Artículos publicados que tratan un proyecto del portafolio */
export function postsForProject(locale: Locale, projectId: string): Post[] {
  return getPosts(locale).filter((p) => !p.draft && p.projects.includes(projectId));
}

/** Categorías con artículos suficientes para tener página propia (sin páginas delgadas) */
export function categoriesWithPages(locale: Locale, min: number): string[] {
  const counts = new Map<string, number>();
  for (const p of getPosts(locale).filter((x) => !x.draft)) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  return [...counts].filter(([, n]) => n >= min).map(([c]) => c);
}
