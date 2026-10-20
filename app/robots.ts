import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Buscadores clásicos y de IA con acceso explícito (spec F5). El resto sigue la regla general.
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_AND_SEARCH_BOTS, allow: "/" },
      { userAgent: "*", allow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
