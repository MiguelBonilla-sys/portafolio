import type { ExperienceItem, Project, SkillCategory } from "@/types";
import type { Locale } from "@/i18n/routing";
import projectsEs from "@/data/projects.es.json";
import projectsEn from "@/data/projects.en.json";
import experienceEs from "@/data/experience.es.json";
import experienceEn from "@/data/experience.en.json";
import skills from "@/data/skills.json";

// El JSON no conserva los tipos literales (status); el test de contenido valida los valores
const projects: Record<Locale, Project[]> = { es: projectsEs as Project[], en: projectsEn as Project[] };
const experience: Record<Locale, ExperienceItem[]> = {
  es: experienceEs as ExperienceItem[],
  en: experienceEn as ExperienceItem[],
};

export const PHONE = "+57 319 518 0894";
export const GITHUB_URL = "https://github.com/MiguelBonilla-sys";
export const LINKEDIN_URL = "https://www.linkedin.com/in/miguel-bonilla-sys";
export const X_URL = "https://x.com/_mangel14_";
export const EMAIL = "miguelangelboto14@gmail.com";

export function getProjects(locale: Locale): Project[] {
  return projects[locale];
}

export function getProject(locale: Locale, id: string): Project | undefined {
  return projects[locale].find((p) => p.id === id);
}

export function getExperience(locale: Locale): ExperienceItem[] {
  return experience[locale];
}

export function getFeaturedProjects(locale: Locale): Project[] {
  return projects[locale].filter((p) => p.featured);
}

export interface LocalizedSkillCategory {
  id: string;
  label: string;
  /** Principales: las respaldan los proyectos destacados o el trabajo actual */
  core: string[];
  /** Secundarias: usadas en proyectos o trabajos anteriores */
  items: string[];
}

export function getSkills(locale: Locale): LocalizedSkillCategory[] {
  const text = (i: SkillCategory["items"][number]) => (typeof i === "string" ? i : i[locale]);
  return (skills as SkillCategory[]).map((c) => ({
    id: c.id,
    label: c.label[locale],
    core: c.core.map(text),
    items: c.items.map(text),
  }));
}

/** Todas las tecnologías de una categoría, principales primero (CV, llms.txt, JSON-LD) */
export function skillNames(c: LocalizedSkillCategory): string[] {
  return [...c.core, ...c.items];
}
