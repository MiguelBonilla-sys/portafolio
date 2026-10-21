import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import type { Locale } from "@/i18n/routing";

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
  pillar: z.enum(["agents", "automation", "backend", "career"]),
  tags: z.array(z.string()).max(5).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.url() })).default([]),
  draft: z.boolean().default(false),
  contentId: z.string().optional(),
  linkedinUrn: z.string().optional(),
});

export type Post = z.infer<typeof frontmatterSchema> & {
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
      const words = content.split(/\s+/).filter(Boolean).length;
      return { ...parsed.data, body: content, readingMinutes: Math.max(1, Math.round(words / 220)) };
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
