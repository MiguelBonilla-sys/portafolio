import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPosts } from "@/lib/blog";
import { getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { articleLanguages, articleSitemapEntries } from "@/lib/article-seo";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Un <url> por idioma, cada uno con todas las versiones (formato hreflang de Google). */
function entries(href: Href, locales: readonly (typeof routing.locales)[number][] = routing.locales, modified?: Partial<Record<(typeof routing.locales)[number], string>>): MetadataRoute.Sitemap {
  const urls = Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`]));
  const languages = articleLanguages(urls, routing.defaultLocale);
  return locales.map((l) => ({
    url: languages[l],
    ...(modified?.[l] ? { lastModified: new Date(modified[l]) } : {}),
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const projectIds = getProjects(routing.defaultLocale).map((p) => p.id);
  const posts = Object.fromEntries(routing.locales.map((locale) => [locale, getPosts(locale)])) as Record<(typeof routing.locales)[number], ReturnType<typeof getPosts>>;

  // /tarjeta queda fuera: es noindex
  return [
    ...entries("/"),
    ...entries("/blog"),
    ...entries("/cv"),
    ...entries("/proyectos"),
    ...entries("/privacidad"),
    ...projectIds.flatMap((id) => entries({ pathname: "/proyectos/[id]", params: { id } })),
    ...articleSitemapEntries(posts, routing.locales, routing.defaultLocale, (locale, slug) =>
      `${SITE_URL}${getPathname({ locale, href: { pathname: "/blog/[slug]", params: { slug } } })}`),
  ];
}
