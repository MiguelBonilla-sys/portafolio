import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://portafolio-inky-rho.vercel.app").replace(/\/$/, "");

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
