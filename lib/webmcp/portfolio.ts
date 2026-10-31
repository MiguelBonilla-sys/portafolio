type Locale = "es" | "en";

export type PublicProject = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  status: string;
  context?: string;
  links: { repo: string | null; demo: string | null };
  caseStudy?: unknown;
};

export type PublicArticle = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  category: string;
  draft: boolean;
  date?: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

const bad = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } });
const statuses = new Set(["commercial", "deployed", "academic", "prototype", "archived", "unverified"]);

function objectInput(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > max) return null;
  return value.trim().toLowerCase();
}

function projectPath(locale: Locale, id: string): string {
  return `/${locale}/${locale === "en" ? "projects" : "proyectos"}/${encodeURIComponent(id)}`;
}

export function searchPortfolioProjects(projects: PublicProject[], input: unknown, locale: Locale, siteUrl: string): Result<Array<{
  id: string; title: string; summary: string; stack: string[]; status: string; canonicalUrl: string; evidence: string[];
}>> {
  const args = objectInput(input);
  if (!args) return bad("invalid_input", "Expected an object");
  const query = optionalText(args.query, 200);
  const technology = optionalText(args.technology, 80);
  const category = optionalText(args.category, 80);
  const status = optionalText(args.status, 40);
  if ([query, technology, category, status].some((x) => x === null) || (status && !statuses.has(status))) {
    return bad("invalid_input", "Invalid project search filter");
  }
  const matches = projects.filter((p) => {
    const searchable = [p.title, p.description, p.context ?? "", ...p.tags].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) &&
      (!technology || p.tags.some((tag) => tag.toLowerCase().includes(technology))) &&
      (!category || searchable.includes(category)) &&
      (!status || p.status === status);
  });
  return { ok: true, data: matches.map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.description,
    stack: p.tags,
    status: p.status,
    canonicalUrl: `${siteUrl}${projectPath(locale, p.id)}`,
    evidence: [p.links.repo, p.links.demo].filter((url): url is string => Boolean(url)),
  })) };
}

export function getProjectDetails(projects: PublicProject[], id: unknown, locale: Locale, siteUrl: string): Result<{
  id: string; title: string; summary: string; stack: string[]; status: string; canonicalUrl: string;
  caseStudy: unknown; evidence: { repo: string | null; demo: string | null; page: string };
}> {
  if (typeof id !== "string" || !/^[a-z0-9-]{1,100}$/.test(id)) return bad("invalid_input", "Invalid project ID");
  const project = projects.find((p) => p.id === id);
  if (!project) return bad("not_found", "Project not found");
  const page = `${siteUrl}${projectPath(locale, project.id)}`;
  return { ok: true, data: {
    id: project.id, title: project.title, summary: project.description, stack: project.tags,
    status: project.status, canonicalUrl: page, caseStudy: project.caseStudy ?? null,
    evidence: { repo: project.links.repo, demo: project.links.demo, page },
  } };
}

export function searchBlogArticles(posts: PublicArticle[], input: unknown, locale: Locale, siteUrl: string): Result<Array<{
  slug: string; title: string; summary: string; tags: string[]; category: string; published: string | null; canonicalUrl: string;
}>> {
  const args = objectInput(input);
  if (!args) return bad("invalid_input", "Expected an object");
  const query = optionalText(args.query, 200);
  const technology = optionalText(args.technology, 80);
  if (query === null || technology === null) return bad("invalid_input", "Invalid article search filter");
  return { ok: true, data: posts.filter((p) => !p.draft).filter((p) => {
    const searchable = [p.title, p.summary, p.category, ...p.tags].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (!technology || p.tags.some((tag) => tag.toLowerCase().includes(technology)));
  }).map((p) => ({
    slug: p.slug, title: p.title, summary: p.summary, tags: p.tags,
    category: p.category, published: p.date ?? null,
    canonicalUrl: `${siteUrl}/${locale}/blog/${encodeURIComponent(p.slug)}`,
  })) };
}

export function navigateToSection(section: unknown, locale: Locale, projectIds: string[]): Result<{ path: string }> {
  if (typeof section !== "string") return bad("invalid_input", "Invalid section");
  const home = `/${locale}`;
  const paths: Record<string, string> = {
    home,
    about: `${home}#sobreMi`,
    experience: `${home}#formacion`,
    projects: `${home}/${locale === "en" ? "projects" : "proyectos"}`,
    blog: `${home}/blog`,
    contact: `${home}#contacto`,
    cv: `${home}/cv`,
  };
  if (section.startsWith("project:")) {
    const id = section.slice("project:".length);
    return projectIds.includes(id) ? { ok: true, data: { path: projectPath(locale, id) } } : bad("not_found", "Project not found");
  }
  return Object.hasOwn(paths, section) ? { ok: true, data: { path: paths[section] } } : bad("not_found", "Section not found");
}
