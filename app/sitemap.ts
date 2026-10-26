import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPosts } from "@/lib/blog";
import { getProjects } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

type Href = Parameters<typeof getPathname>[0]["href"];

/** Un <url> por idioma, cada uno con todas las versiones (formato hreflang de Google). */
function entries(href: Href, lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${SITE_URL}${getPathname({ locale: l, href })}`])
  );
  return routing.locales.map((l) => ({
    url: languages[l],
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const projectIds = getProjects(routing.defaultLocale).map((p) => p.id);
  // Un artículo entra si existe publicado en el idioma por defecto
  const posts = getPosts(routing.defaultLocale).filter((p) => !p.draft);

  // /tarjeta queda fuera: es noindex
  return [
    ...entries("/"),
    ...entries("/blog"),
    ...entries("/cv"),
    ...entries("/proyectos"),
    ...entries("/privacidad"),
    ...projectIds.flatMap((id) => entries({ pathname: "/proyectos/[id]", params: { id } })),
    ...posts.flatMap((p) => entries({ pathname: "/blog/[slug]", params: { slug: p.slug } }, p.updated ?? p.date)),
  ];
}
