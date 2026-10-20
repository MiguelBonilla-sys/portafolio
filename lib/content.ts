import type { ExperienceItem, Project, SkillCategory } from "@/types";
import type { Locale } from "@/i18n/routing";
import projectsEs from "@/data/projects.es.json";
import projectsEn from "@/data/projects.en.json";
import experienceEs from "@/data/experience.es.json";
import experienceEn from "@/data/experience.en.json";
import skills from "@/data/skills.json";

const projects: Record<Locale, Project[]> = { es: projectsEs, en: projectsEn };
const experience: Record<Locale, ExperienceItem[]> = {
  es: experienceEs as ExperienceItem[],
  en: experienceEn as ExperienceItem[],
};

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

export function getSkills(): SkillCategory[] {
  return skills as SkillCategory[];
}
