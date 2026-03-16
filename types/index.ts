export interface ProjectLink {
  repo: string | null;
  demo: string | null;
}

export interface Project {
  id: string;
  title: string;
  language: string;
  description: string;
  tags: string[];
  links: ProjectLink;
  featured: boolean;
}

export interface SkillCategory {
  id: string;
  label: string;
  items: string[];
}

export interface ExperienceItem {
  id: string;
  date: string;
  title: string;
  place: string;
  description: string;
  type: "work" | "education" | "self";
}
