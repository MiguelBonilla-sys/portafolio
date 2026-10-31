import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { articleLanguages } from "../lib/article-seo.ts";

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
