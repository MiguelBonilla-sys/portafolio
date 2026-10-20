import { getPosts } from "@/lib/blog";
import { getExperience, getProjects, getSkills, EMAIL, GITHUB_URL, LINKEDIN_URL } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
import en from "@/messages/en.json";

export const dynamic = "force-static";

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
    ...getExperience("en").flatMap((e) => [`### ${e.title}`, "", `${e.place} · ${e.date}`, "", e.description, ""]),
    "## Skills",
    "",
    ...getSkills().map((c) => `- ${c.label.en}: ${c.items.join(", ")}`),
    "",
    "## Projects",
    "",
    ...getProjects("en").flatMap((p) => [
      `### ${p.title}`,
      "",
      `URL: ${absoluteUrl("en", { pathname: "/proyectos/[id]", params: { id: p.id } })}`,
      p.links.repo ? `Repository: ${p.links.repo}` : "",
      `Language: ${p.language} · Stack: ${p.tags.join(", ")}`,
      "",
      p.longDescription ?? p.description,
      "",
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
