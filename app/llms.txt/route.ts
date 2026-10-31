import { getPosts } from "@/lib/blog";
import { getExperience, getProjects, getSkills, skillNames, EMAIL, GITHUB_URL, LINKEDIN_URL } from "@/lib/content";
import { withOrgUrls } from "@/lib/orgs";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import type { Project } from "@/types";

export const dynamic = "force-static";

const STATUS: Record<Project["status"], string> = {
  commercial: "commercial production",
  deployed: "deployed personal project",
  academic: "academic research",
  prototype: "prototype",
  archived: "archived",
  unverified: "no public code",
};

// Resumen en texto plano para agentes y buscadores de IA (https://llmstxt.org)
export function GET() {
  const projects = getProjects("en");
  const experience = getExperience("en");
  const posts = [...getPosts("en"), ...getPosts("es")].filter((p) => !p.draft).slice(0, 20);

  const lines = [
    "# Miguel Bonilla",
    "",
    "> Full Stack Engineer (Python, React & AI systems) based in Bogotá, Colombia (UTC−5). Builds Python backends, React frontends, LLM and RAG integrations, and n8n automations. Open to remote work.",
    "",
    "Miguel Ángel Bonilla Torres (handle: mangel14) has 2+ years of professional software experience. He has worked as a Frontend Developer at Coordenadas.co (https://coordenadas.co/, remote) since September 2025, was a freelance Junior Backend Engineer for Sibartech Technology SAS (Feb 2024 – Aug 2025), and is in the 10th semester of Systems Engineering at Universidad de San Buenaventura, Bogotá. The site is available in Spanish (/es) and English (/en).",
    "",
    `Full content in one file: ${SITE_URL}/llms-full.txt`,
    "",
    "## Contact",
    "",
    `- Email: ${EMAIL}`,
    `- LinkedIn: ${LINKEDIN_URL}`,
    `- GitHub: ${GITHUB_URL}`,
    `- Resume (English): ${absoluteUrl("en", "/cv")} · PDF: ${SITE_URL}/cv/miguel-bonilla-cv-en.pdf`,
    `- Portfolio (English): ${absoluteUrl("en", "/")}`,
    `- Portfolio (Spanish): ${absoluteUrl("es", "/")}`,
    "",
    "## Experience",
    "",
    ...experience.map((e) => `- ${e.title}, ${withOrgUrls(e.place)} (${e.date}): ${[e.description, ...(e.highlights ?? [])].join(" ")}`),
    "",
    "## Projects",
    "",
    ...projects.map(
      (p) =>
        `- [${p.title}](${absoluteUrl("en", { pathname: "/proyectos/[id]", params: { id: p.id } })}) (${STATUS[p.status]}): ${p.description} Stack: ${p.tags.join(", ")}.${p.links.repo ? ` Code: ${p.links.repo}` : ""}`
    ),
    "",
    "## Skills",
    "",
    ...getSkills("en").map((c) => `- ${c.label}: ${skillNames(c).join(", ")}`),
  ];

  if (posts.length > 0) {
    lines.push(
      "",
      "## Articles",
      "",
      ...posts.map(
        (p) => `- [${p.title}](${absoluteUrl(p.locale, { pathname: "/blog/[slug]", params: { slug: p.slug } })}): ${p.summary}`
      )
    );
  }

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
