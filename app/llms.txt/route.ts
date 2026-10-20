import { getPosts } from "@/lib/blog";
import { getExperience, getProjects, getSkills, EMAIL, GITHUB_URL, LINKEDIN_URL } from "@/lib/content";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

// Resumen en texto plano para agentes y buscadores de IA (https://llmstxt.org)
export function GET() {
  const projects = getProjects("en");
  const experience = getExperience("en");
  const posts = [...getPosts("en"), ...getPosts("es")].filter((p) => !p.draft).slice(0, 20);

  const lines = [
    "# Miguel Bonilla",
    "",
    "> Full Stack AI Engineer based in Bogotá, Colombia (UTC−5). Builds secure APIs, n8n and CRM automations, and LLM-powered systems. Open to remote work.",
    "",
    "Miguel Ángel Bonilla Torres (handle: mangel14) works as a Full Stack Developer at Coordenadas.co since September 2025 and studies Systems Engineering at Universidad de San Buenaventura, Bogotá. The site is available in Spanish (/es) and English (/en).",
    "",
    `Full content in one file: ${SITE_URL}/llms-full.txt`,
    "",
    "## Contact",
    "",
    `- Email: ${EMAIL}`,
    `- LinkedIn: ${LINKEDIN_URL}`,
    `- GitHub: ${GITHUB_URL}`,
    `- Portfolio (English): ${absoluteUrl("en", "/")}`,
    `- Portfolio (Spanish): ${absoluteUrl("es", "/")}`,
    "",
    "## Experience",
    "",
    ...experience.map((e) => `- ${e.title}, ${e.place} (${e.date}): ${e.description}`),
    "",
    "## Projects",
    "",
    ...projects.map(
      (p) =>
        `- [${p.title}](${absoluteUrl("en", { pathname: "/proyectos/[id]", params: { id: p.id } })}): ${p.description} Stack: ${p.tags.join(", ")}.${p.links.repo ? ` Code: ${p.links.repo}` : ""}`
    ),
    "",
    "## Skills",
    "",
    ...getSkills().map((c) => `- ${c.label.en}: ${c.items.join(", ")}`),
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
