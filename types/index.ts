export interface ProjectLink {
  repo: string | null;
  demo: string | null;
}

export interface Project {
  id: string;
  title: string;
  language: string;
  /** Dónde vive: "Producción · app.bikans.com", "Tesis · USB Bogotá"... */
  context?: string;
  description: string;
  longDescription?: string;
  tags: string[];
  links: ProjectLink;
  featured: boolean;
}

type Localized = { es: string; en: string };

export interface SkillCategory {
  id: string;
  label: Localized;
  /** Texto igual en ambos idiomas, o traducido */
  items: (string | Localized)[];
}

export interface ExperienceItem {
  id: string;
  date: string;
  title: string;
  place: string;
  description: string;
  highlights?: string[];
  type: "work" | "education" | "course";
}
