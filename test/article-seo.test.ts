import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { articleLanguages, articleSitemapEntries } from "../lib/article-seo.ts";

test("article hreflang only names translations that exist", () => {
  assert.deepEqual(articleLanguages({ en: "https://mangel14.dev/en/blog/example" }, "es"), {
    en: "https://mangel14.dev/en/blog/example",
    "x-default": "https://mangel14.dev/en/blog/example",
  });
  assert.deepEqual(articleLanguages({
    es: "https://mangel14.dev/es/blog/example",
    en: "https://mangel14.dev/en/blog/example",
  }, "es"), {
    es: "https://mangel14.dev/es/blog/example",
    en: "https://mangel14.dev/en/blog/example",
    "x-default": "https://mangel14.dev/es/blog/example",
  });
});

test("sitemap does not claim every unchanged URL was modified at build time", () => {
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sitemap, /lastModified: lastModified \? new Date\(lastModified\) : new Date\(\)/);
});

test("article sitemap excludes draft translations and stays deterministic", () => {
  const posts = {
    es: [{ slug: "published-only-in-english", date: "2026-10-01", draft: true }],
    en: [{ slug: "published-only-in-english", date: "2026-10-02", updated: "2026-10-03", draft: false }],
  };
  const build = () => articleSitemapEntries(posts, ["es", "en"], "es", (locale, slug) =>
    `https://mangel14.dev/${locale}/blog/${slug}`);
  const expected = [{
    url: "https://mangel14.dev/en/blog/published-only-in-english",
    lastModified: new Date("2026-10-03"),
    alternates: { languages: {
      en: "https://mangel14.dev/en/blog/published-only-in-english",
      "x-default": "https://mangel14.dev/en/blog/published-only-in-english",
    } },
  }];
  assert.deepEqual(build(), expected);
  assert.deepEqual(build(), expected);
});
