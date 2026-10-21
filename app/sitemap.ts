import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPosts } from "@/lib/blog";
import { getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

type Href = Parameters<typeof getPathname>[0]["href"];

function entry(href: Href, lastModified?: string): MetadataRoute.Sitemap[number] {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`])
  );
  return {
    url: `${SITE_URL}${getPathname({ locale: routing.defaultLocale, href })}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    alternates: { languages },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const projectIds = getProjects(routing.defaultLocale).map((p) => p.id);
  // Un artículo entra si existe publicado en el idioma por defecto
  const posts = getPosts(routing.defaultLocale).filter((p) => !p.draft);

  return [
    entry("/"),
    entry("/blog"),
    ...projectIds.map((id) => entry({ pathname: "/proyectos/[id]", params: { id } })),
    ...posts.map((p) => entry({ pathname: "/blog/[slug]", params: { slug: p.slug } }, p.updated ?? p.date)),
  ];
}
