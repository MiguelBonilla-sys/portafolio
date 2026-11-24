import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getArticleDetails,
  getProjectDetails,
  navigateToSection,
  searchBlogArticles,
  searchPortfolioProjects,
} from "../lib/webmcp/portfolio.ts";

const projects = [
  { id: "thesis", title: "IDN detector", description: "Phishing detection", tags: ["Python", "FastAPI"], status: "academic", links: { repo: "https://github.com/example/thesis", demo: null }, caseStudy: { role: "Co-author" } },
  { id: "private", title: "Private product", description: "Payroll", tags: ["React"], status: "commercial", links: { repo: null, demo: "https://example.com" } },
];

test("project search filters real public records and returns evidence", () => {
  const found = searchPortfolioProjects(projects, { technology: "python" }, "en", "https://mangel14.dev");
  assert.equal(found.ok, true);
  if (found.ok) {
    assert.deepEqual(found.data.map((p) => p.id), ["thesis"]);
    assert.equal(found.data[0].canonicalUrl, "https://mangel14.dev/en/projects/thesis");
    assert.deepEqual(found.data[0].evidence, ["https://github.com/example/thesis"]);
  }
  assert.equal(searchPortfolioProjects(projects, { status: "made-up" }, "en", "https://mangel14.dev").ok, false);
});

test("project details rejects unknown IDs and never fabricates a repository", () => {
  assert.deepEqual(getProjectDetails(projects, "missing", "es", "https://mangel14.dev"), {
    ok: false,
    error: { code: "not_found", message: "Project not found" },
  });
  const result = getProjectDetails(projects, "private", "es", "https://mangel14.dev");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.evidence.repo, null);
});

test("article search excludes drafts even if supplied by a caller", () => {
  const posts = [
    { slug: "approved", title: "FastAPI authorization", summary: "Ownership", tags: ["FastAPI"], category: "backend", draft: false },
    { slug: "draft", title: "Private draft", summary: "Hidden", tags: ["FastAPI"], category: "backend", draft: true },
  ];
  const found = searchBlogArticles(posts, { query: "FastAPI" }, "en", "https://mangel14.dev");
  assert.equal(found.ok, true);
  if (found.ok) assert.deepEqual(found.data.map((p) => p.slug), ["approved"]);
  assert.equal(searchBlogArticles(posts, { query: "x".repeat(201) }, "en", "https://mangel14.dev").ok, false);
});

test("navigation uses localized same-origin routes and rejects unknown sections", () => {
  assert.deepEqual(navigateToSection("projects", "en", ["thesis"]), { ok: true, data: { path: "/en/projects" } });
  assert.deepEqual(navigateToSection("project:thesis", "es", ["thesis"]), { ok: true, data: { path: "/es/proyectos/thesis" } });
  assert.equal(navigateToSection("https://evil.example", "en", ["thesis"]).ok, false);
  assert.equal(navigateToSection("project:unknown", "en", ["thesis"]).ok, false);
  assert.equal(navigateToSection("toString", "en", ["thesis"]).ok, false);
  assert.equal(navigateToSection("__proto__", "en", ["thesis"]).ok, false);
});

test("article details return only the published article, with FAQ, sources and canonical URLs", () => {
  const post = {
    slug: "backup-restore-test", title: "Backup restore test", summary: "Restore it to know.", tags: ["backups"], category: "backend", draft: false,
    date: "2026-12-04", updated: "2026-12-05", readingMinutes: 3, faq: [{ q: "How often?", a: "Monthly." }],
    sources: [{ title: "Report", url: "https://example.com/report" }], projects: ["quadship"], hasTranslation: true,
  };
  const found = getArticleDetails([post], "backup-restore-test", "en", "https://mangel14.dev");
  assert.equal(found.ok, true);
  if (found.ok) {
    assert.equal(found.data.canonicalUrl, "https://mangel14.dev/en/blog/backup-restore-test");
    assert.equal(found.data.translationUrl, "https://mangel14.dev/es/blog/backup-restore-test");
    assert.deepEqual(found.data.faq, post.faq);
    assert.deepEqual(found.data.projects, ["quadship"]);
  }
  const noTranslation = getArticleDetails([{ ...post, hasTranslation: false }], "backup-restore-test", "es", "https://mangel14.dev");
  assert.equal(noTranslation.ok && noTranslation.data.translationUrl, null);
});

test("article details reject bad slugs, unknown articles and drafts", () => {
  const draft = { slug: "wip", title: "WIP", summary: "x", tags: [], category: "backend", draft: true };
  assert.equal(getArticleDetails([draft], "wip", "en", "https://mangel14.dev").ok, false);
  assert.deepEqual(getArticleDetails([], "missing", "en", "https://mangel14.dev"), { ok: false, error: { code: "not_found", message: "Article not found" } });
  for (const bad of ["../etc", "UPPER", "a b", 42, undefined, "x".repeat(121)]) {
    assert.equal(getArticleDetails([draft], bad, "en", "https://mangel14.dev").ok, false);
  }
});
