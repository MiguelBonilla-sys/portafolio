"use client";

import { useWebMCP } from "use-webmcp-tool";
import { getArticleDetails, type PublicArticle } from "@/lib/webmcp/portfolio";
import type { Locale } from "@/i18n/routing";

export default function ArticleDetailsTool({ locale, post, siteUrl }: { locale: Locale; post: PublicArticle; siteUrl: string }) {
  useWebMCP({
    name: "get_blog_article",
    description: "Read the currently open blog article: summary, FAQ, sources, related projects and canonical URLs.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Slug of the open article" } },
      required: ["slug"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: (input: { slug?: unknown }) => getArticleDetails([post], input?.slug, locale, siteUrl),
  });
  return null;
}
