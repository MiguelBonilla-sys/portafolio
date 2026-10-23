import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mangel14.dev").replace(/\/$/, "");

type Href = Parameters<typeof getPathname>[0]["href"];

/** URL absoluta de una ruta localizada. */
export function absoluteUrl(locale: Locale, href: Href): string {
  return `${SITE_URL}${getPathname({ locale, href })}`;
}

/** canonical + hreflang (es, en, x-default) + feeds para la metadata de Next. */
export function alternatesFor(locale: Locale, href: Href) {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = absoluteUrl(l, href);
  languages["x-default"] = absoluteUrl(routing.defaultLocale, href);
  return {
    canonical: absoluteUrl(locale, href),
    languages,
    // Descubribles desde cualquier página: feed del blog y resumen para agentes de IA
    types: {
      "application/rss+xml": `${SITE_URL}/${locale}/feed.xml`,
      "text/plain": `${SITE_URL}/llms.txt`,
    },
  };
}

/**
 * Open Graph y Twitter/X de una página. Next reemplaza (no mezcla) los objetos openGraph y twitter del
 * layout, así que cada página que los redefine repite imagen, url, sitio y autor. Sin esto, twitter:title
 * quedaba con el título de la home en todas las páginas.
 */
export function socialFor(
  locale: Locale,
  href: Href,
  og: { title: string; description: string; type?: "website" | "article"; image?: string; imageAlt?: string } & Record<string, unknown>
) {
  const { image, imageAlt, ...rest } = og;
  const img = image ?? `${SITE_URL}/${locale}/opengraph-image`;
  return {
    openGraph: {
      type: "website" as const,
      siteName: "Miguel Bonilla",
      locale: locale === "es" ? "es_CO" : "en_US",
      url: absoluteUrl(locale, href),
      images: [{ url: img, width: 1200, height: 630, alt: imageAlt ?? og.title }],
      ...rest,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: og.title,
      description: og.description,
      creator: "@_mangel14_",
      images: [img],
    },
  };
}
