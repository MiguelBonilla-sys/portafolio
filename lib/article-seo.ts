import type { Locale } from "../i18n/routing.ts";

/** Only advertise published translations; x-default resolves to a real article. */
export function articleLanguages(urls: Partial<Record<Locale, string>>, defaultLocale: Locale): Record<string, string> {
  const entries = Object.entries(urls).filter((entry): entry is [Locale, string] => Boolean(entry[1]));
  if (entries.length === 0) throw new Error("An article needs at least one published locale");
  const languages = Object.fromEntries(entries);
  languages["x-default"] = urls[defaultLocale] ?? entries[0][1];
  return languages;
}
