import { getPosts } from "@/lib/blog";
import { getExperience, getProjects, getSkills, skillNames, EMAIL, GITHUB_URL, LINKEDIN_URL } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import { withOrgUrls } from "@/lib/orgs";
import en from "@/messages/en.json";
import type { Project } from "@/types";

export const dynamic = "force-static";

// Secciones del caso de estudio en texto plano, con los mismos títulos que la página
function caseStudyLines(p: Project): string[] {
  const cs = p.caseStudy;
  if (!cs) return [];
  const h = en.projects.case;
  const lines: string[] = [];
  if (cs.problem) lines.push(`${h.problem}: ${cs.problem}`, "");
  if (cs.role) lines.push(`${h.role}: ${cs.role}`, "");
  if (cs.architecture) {
    lines.push(`${h.architecture}:${cs.architecture.summary ? ` ${cs.architecture.summary}` : ""}`);
    lines.push(...cs.architecture.flow.map((step, i) => `${i + 1}. ${step}`), "");
  }
  for (const key of ["decisions", "challenges", "validation", "results", "limitations"] as const) {
    if (cs[key]?.length) lines.push(`${h[key]}:`, ...cs[key].map((item) => `- ${item}`), "");
  }
  return lines;
}

// Contenido completo del sitio en texto plano, para agentes y navegadores con IA
export function GET() {
  const posts = [...getPosts("en"), ...getPosts("es")].filter((p) => !p.draft);

  const lines = [
    "# Miguel Bonilla: full site content",
    "",
    `> ${en.meta.description}`,
    "",
    `Canonical site: ${absoluteUrl("en", "/")} (English) and ${absoluteUrl("es", "/")} (Spanish).`,
    `Contact: ${EMAIL} · ${LINKEDIN_URL} · ${GITHUB_URL}`,
    "",
    "## About",
    "",
    en.about.p1,
    "",
    en.about.p2,
    "",
    en.about.p3,
    "",
    "## Experience",
    "",
    ...getExperience("en").flatMap((e) => [
      `### ${e.title}`,
      "",
      `${withOrgUrls(e.place)} · ${e.date}`,
      "",
      e.description,
      ...(e.highlights ?? []).map((h) => `- ${h}`),
      "",
    ]),
    "## Skills",
    "",
    ...getSkills("en").map((c) => `- ${c.label}: ${skillNames(c).join(", ")}`),
    "",
    "## Projects",
    "",
    ...getProjects("en").flatMap((p) => [
      `### ${p.title}`,
      "",
      `URL: ${absoluteUrl("en", { pathname: "/proyectos/[id]", params: { id: p.id } })}`,
      p.links.repo ? `Repository: ${p.links.repo}` : "",
      `Status: ${en.projects.status[p.status]} · Language: ${p.language} · Stack: ${p.tags.join(", ")}${p.context ? ` · ${p.context}` : ""}`,
      p.links.demo ? `Live: ${p.links.demo}` : "",
      "",
      p.longDescription ?? p.description,
      "",
      ...caseStudyLines(p),
    ]),
  ];

  for (const post of posts) {
    lines.push(
      `## Article: ${post.title}`,
      "",
      `URL: ${absoluteUrl(post.locale, { pathname: "/blog/[slug]", params: { slug: post.slug } })}`,
      `Published: ${post.date} · Language: ${post.locale}`,
      "",
      post.summary,
      "",
      post.body.trim(),
      ""
    );
  }

  return new Response(lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
