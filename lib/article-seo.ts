import type { Locale } from "../i18n/routing.ts";

/** Only advertise published translations; x-default resolves to a real article. */
export function articleLanguages(urls: Partial<Record<Locale, string>>, defaultLocale: Locale): Record<string, string> {
  const entries = Object.entries(urls).filter((entry): entry is [Locale, string] => Boolean(entry[1]));
  if (entries.length === 0) throw new Error("An article needs at least one published locale");
  const languages = Object.fromEntries(entries);
  languages["x-default"] = urls[defaultLocale] ?? entries[0][1];
  return languages;
}

type SitemapArticle = { slug: string; date: string; updated?: string; draft: boolean };

/** Build entries from published articles only, using their actual locale-specific dates. */
export function articleSitemapEntries(
  posts: Partial<Record<Locale, readonly SitemapArticle[]>>,
  locales: readonly Locale[],
  defaultLocale: Locale,
  urlFor: (locale: Locale, slug: string) => string,
) {
  const slugs = new Set(locales.flatMap((locale) => (posts[locale] ?? []).filter((post) => !post.draft).map((post) => post.slug)));
  return [...slugs].flatMap((slug) => {
    const published = locales.flatMap((locale) => {
      const post = posts[locale]?.find((candidate) => candidate.slug === slug && !candidate.draft);
      return post ? [{ locale, post }] : [];
    });
    const urls = Object.fromEntries(published.map(({ locale }) => [locale, urlFor(locale, slug)])) as Partial<Record<Locale, string>>;
    const languages = articleLanguages(urls, defaultLocale);
    return published.map(({ locale, post }) => ({
      url: languages[locale],
      lastModified: new Date(post.updated ?? post.date),
      alternates: { languages },
    }));
  });
}
