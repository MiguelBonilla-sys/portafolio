import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { getPosts } from "@/lib/blog";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET(_req: Request, { params }: RouteContext<"/[locale]/feed.xml">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = getPosts(locale).filter((p) => !p.draft);
  const blogUrl = absoluteUrl(locale, "/blog");

  const items = posts
    .map((p) => {
      const url = absoluteUrl(locale, { pathname: "/blog/[slug]", params: { slug: p.slug } });
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(p.summary)}</description>
      <category>${escape(t(`pillars.${p.pillar}`))}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Miguel Bonilla · ${escape(t("title"))}</title>
    <link>${blogUrl}</link>
    <description>${escape(t("lede"))}</description>
    <language>${locale}</language>
    <atom:link href="${SITE_URL}/${locale}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
