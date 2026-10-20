import matter from "gray-matter";
import type { BlogDraft } from "../state.ts";

interface MdxInput {
  draft: BlogDraft;
  slug: string;
  locale: "es" | "en";
  date: string;
  pillar: string;
  contentId: string;
  sources: { title: string; url: string }[];
}

/** Archivo MDX con el frontmatter que valida lib/blog.ts (zod). */
export function buildMdx({ draft, slug, locale, date, pillar, contentId, sources }: MdxInput): string {
  const description = draft.description.length > 170 ? `${draft.description.slice(0, 167).trimEnd()}…` : draft.description;
  return matter.stringify(`\n${draft.body.trim()}\n`, {
    title: draft.title.slice(0, 70),
    description: description.length >= 50 ? description : `${description} ${draft.summary}`.slice(0, 160),
    summary: draft.summary,
    date,
    slug,
    locale,
    pillar,
    tags: draft.tags.slice(0, 5),
    faq: draft.faq,
    sources,
    draft: false,
    contentId,
  });
}

export function blogPath(locale: "es" | "en", slug: string): string {
  return `content/blog/${locale}/${slug}.mdx`;
}
