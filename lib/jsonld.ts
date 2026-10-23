import type { Locale } from "@/i18n/routing";
import type { Project } from "@/types";
import type { Post } from "@/lib/blog";
import { getSkills, skillNames, GITHUB_URL, LINKEDIN_URL, X_URL } from "@/lib/content";
import { SITE_URL, absoluteUrl } from "@/lib/site";

const PERSON_ID = `${SITE_URL}/#person`;

const description: Record<Locale, string> = {
  es: "Full Stack Engineer en Bogotá. Construye backends en Python, frontends en React, integraciones con LLM y automatizaciones con n8n.",
  en: "Full Stack Engineer based in Bogotá. Builds Python backends, React frontends, LLM integrations and n8n automations.",
};

export function personSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Miguel Ángel Bonilla Torres",
    alternateName: ["Miguel Bonilla", "mangel14"],
    jobTitle: "Full Stack Engineer",
    description: description[locale],
    url: absoluteUrl(locale, "/"),
    image: `${SITE_URL}/avatar.png`,
    sameAs: [GITHUB_URL, LINKEDIN_URL, X_URL],
    worksFor: { "@type": "Organization", name: "Coordenadas.co" },
    alumniOf: [
      { "@type": "CollegeOrUniversity", name: "Universidad de San Buenaventura" },
      { "@type": "CollegeOrUniversity", name: "Universidad Sergio Arboleda" },
      { "@type": "CollegeOrUniversity", name: "Universidad Nacional de Colombia" },
    ],
    address: { "@type": "PostalAddress", addressLocality: "Bogotá", addressCountry: "CO" },
    knowsAbout: getSkills(locale).flatMap(skillNames),
  };
}

// Página de perfil (Google ProfilePage): la persona es la entidad principal del sitio
export function profilePageSchema(locale: Locale) {
  const person: Partial<ReturnType<typeof personSchema>> = personSchema(locale);
  delete person["@context"];
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(locale, "/"),
    inLanguage: locale,
    dateModified: new Date().toISOString().slice(0, 10),
    mainEntity: person,
  };
}

export function projectListSchema(locale: Locale, projects: Project[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "es" ? "Proyectos de Miguel Bonilla" : "Miguel Bonilla's projects",
    itemListElement: projects.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(locale, { pathname: "/proyectos/[id]", params: { id: p.id } }),
      name: p.title,
    })),
  };
}

export function websiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Miguel Bonilla",
    url: absoluteUrl(locale, "/"),
    inLanguage: locale,
    author: { "@id": PERSON_ID },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// SoftwareSourceCode solo cuando hay repositorio público; sin código, la página describe una obra (CreativeWork)
export function projectSchema(locale: Locale, project: Project) {
  const code = project.links.repo
    ? { "@type": "SoftwareSourceCode", codeRepository: project.links.repo, programmingLanguage: project.language }
    : { "@type": "CreativeWork" };
  return {
    "@context": "https://schema.org",
    ...code,
    name: project.title,
    description: project.description,
    url: absoluteUrl(locale, { pathname: "/proyectos/[id]", params: { id: project.id } }),
    sameAs: project.links.demo ?? undefined,
    keywords: project.tags.join(", "),
    inLanguage: locale,
    author: { "@id": PERSON_ID },
  };
}

export function blogPostingSchema(locale: Locale, post: Post) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    abstract: post.summary,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: locale,
    keywords: post.tags.join(", "),
    url: absoluteUrl(locale, { pathname: "/blog/[slug]", params: { slug: post.slug } }),
    mainEntityOfPage: absoluteUrl(locale, { pathname: "/blog/[slug]", params: { slug: post.slug } }),
    author: { "@id": PERSON_ID, "@type": "Person", name: "Miguel Ángel Bonilla Torres" },
    citation: post.sources.map((s) => s.url),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
