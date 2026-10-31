"use client";

import { useWebMCP } from "use-webmcp-tool";
import { searchBlogArticles, type PublicArticle } from "@/lib/webmcp/portfolio";
import type { Locale } from "@/i18n/routing";

export default function BlogTools({ locale, posts, siteUrl }: { locale: Locale; posts: PublicArticle[]; siteUrl: string }) {
  useWebMCP({
    name: "search_blog_articles",
    description: "Find approved, published blog articles by topic or technology; return no results when none are published.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", maxLength: 200, description: "Topic or keyword in an article" },
        technology: { type: "string", maxLength: 80, description: "Technology in the article tags" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: (input: Record<string, unknown>) => searchBlogArticles(posts, input, locale, siteUrl),
  });
  return null;
}
