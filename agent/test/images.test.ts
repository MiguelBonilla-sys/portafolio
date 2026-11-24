import { test } from "node:test";
import assert from "node:assert/strict";
import { figureMarkdown, imgTagsOk } from "../graph.ts";
import { ensureImageTitles, imageProblems, imagesIn } from "../lib/images.ts";
import { seoReport } from "../seo.ts";
import type { BlogDraft } from "../state.ts";

test("imagesIn reads alt, src and title and ignores code", () => {
  const body = '![Flow chart](/a.svg "Flow chart")\n\n```md\n![](/code.png)\n```\n\n`![](/inline.png)` ![No title](/b.png)';
  assert.deepEqual(imagesIn(body), [
    { alt: "Flow chart", src: "/a.svg", title: "Flow chart" },
    { alt: "No title", src: "/b.png", title: "" },
  ]);
});

test("ensureImageTitles uses the alt as title, keeps existing titles, never invents an alt", () => {
  const out = ensureImageTitles('![Diagram of a flow](/a.svg) ![Has](/b.svg "Own title") ![](/c.svg) ![Say "hi"](/d.svg)');
  assert.match(out, /!\[Diagram of a flow\]\(\/a\.svg "Diagram of a flow"\)/);
  assert.match(out, /!\[Has\]\(\/b\.svg "Own title"\)/);
  assert.match(out, /!\[\]\(\/c\.svg\)/, "no alt: left as it is so the SEO check blocks it");
  assert.match(out, /!\[Say "hi"\]\(\/d\.svg "Say ”hi”"\)/);
  assert.equal(ensureImageTitles("```\n![x](/y.png)\n```"), "```\n![x](/y.png)\n```");
});

test("figureMarkdown always carries alt and title", () => {
  assert.equal(figureMarkdown("Cover for the article", "/blog/x/flujo.svg"), '![Cover for the article](/blog/x/flujo.svg "Cover for the article")');
  assert.deepEqual(imageProblems(figureMarkdown("Alt text", "/x.svg")), { missingAlt: 0, missingTitle: 0 });
});

const draft = (body: string): BlogDraft => ({
  title: "Title",
  description: "d".repeat(120),
  summary: "word ".repeat(45).trim(),
  tags: ["a"],
  faq: [],
  body: `## One\n\n${"palabra ".repeat(300)}\n\n## Two\n\n${body}`,
  articleType: "explainer",
} as BlogDraft);

test("the SEO report blocks an image without alt text or without a title", () => {
  assert.deepEqual(imageProblems("![](/a.png)"), { missingAlt: 1, missingTitle: 1 });
  assert.ok(seoReport(draft("![](/a.png)"), "en").errors.includes("image without alt text"));
  assert.ok(seoReport(draft("![Alt only](/a.png)"), "en").errors.includes("image without title"));
  assert.ok(seoReport(draft("![Alt only](/a.png)"), "es").errors.includes("imagen sin título"));
  assert.deepEqual(seoReport(draft('![Alt](/a.png "Alt")'), "en").errors, []);
});

test("imgTagsOk requires non-empty alt and title on every <img>", () => {
  assert.equal(imgTagsOk("<p>no images</p>"), true);
  assert.equal(imgTagsOk('<img src="/a.png" alt="A" title="A"/>'), true);
  assert.equal(imgTagsOk('<img src="/a.png" alt="A"/>'), false);
  assert.equal(imgTagsOk('<img src="/a.png" alt="" title="A"/>'), false);
  assert.equal(imgTagsOk('<img src="/a.png" alt="A" title="A"/><img src="/b.png"/>'), false);
});
