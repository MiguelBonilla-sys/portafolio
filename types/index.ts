export interface ProjectLink {
  repo: string | null;
  demo: string | null;
  /** El repositorio existe pero no se enlaza mientras se resuelve un problema de seguridad (docs/phase-2/SECURITY_REMEDIATION.md) */
  repoWithheld?: boolean;
}

/**
 * Estado verificable del proyecto. Se asigna solo con evidencia (URL viva, repo, documento):
 * commercial = producto de un cliente en producción · deployed = proyecto propio publicado ·
 * academic = tesis o curso · prototype = funcional, sin despliegue comprobable ·
 * archived = sin mantenimiento · unverified = sin código ni demo públicos (pendiente de confirmar).
 */
export type ProjectStatus = "commercial" | "deployed" | "academic" | "prototype" | "archived" | "unverified";

/** Secciones del caso de estudio. Todas opcionales: la página solo muestra las que tienen contenido. */
export interface CaseStudy {
  problem?: string;
  /** Qué hizo Miguel y con quién */
  role?: string;
  architecture?: {
    summary?: string;
    /** Pasos del flujo de datos, en orden; se dibujan como diagrama */
    flow: string[];
  };
  decisions?: string[];
  challenges?: string[];
  validation?: string[];
  results?: string[];
  limitations?: string[];
}

export interface Project {
  id: string;
  title: string;
  language: string;
  status: ProjectStatus;
  /** Dónde vive: "Coordenadas.co · app.bikans.com", "Tesis en coautoría · USB Bogotá"... */
  context?: string;
  /** Qué resuelve, en una o dos frases */
  description: string;
  /** Aporte técnico principal, para la tarjeta */
  contribution?: string;
  longDescription?: string;
  tags: string[];
  links: ProjectLink;
  featured: boolean;
  /** Fuera de todas las superficies públicas hasta que el autor confirme qué existe */
  hidden?: boolean;
  caseStudy?: CaseStudy;
}

type Localized = { es: string; en: string };

export interface SkillCategory {
  id: string;
  label: Localized;
  /** Las que respaldan los proyectos destacados o el trabajo actual */
  core: (string | Localized)[];
  /** Usadas en proyectos o trabajos anteriores */
  items: (string | Localized)[];
}

export interface ExperienceItem {
  id: string;
  date: string;
  title: string;
  place: string;
  description: string;
  highlights?: string[];
  /** Tecnologías usadas en el cargo, tal como aparecen en los logros */
  stack?: string[];
  type: "work" | "education" | "course";
}
