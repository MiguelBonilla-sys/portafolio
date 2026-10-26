import { getTranslations } from "next-intl/server";
import type { Project } from "@/types";
import { Link } from "@/i18n/navigation";
import { ArrowIcon } from "./icons";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
  /** compact: fila corta para la página de otros proyectos (/proyectos) */
  variant?: "featured" | "compact";
}

// Cuatro tecnologías bastan para explicar un proyecto; el resto está en su página
const VISIBLE_TAGS = 4;

// El título enlaza a la página del proyecto y su área cubre toda la fila; repo y demo quedan
// encima como enlaces propios (sin anidar <a>). La URL real la siguen buscadores y agentes de IA.
export default async function ProjectCard({ project, variant = "featured" }: ProjectCardProps) {
  const t = await getTranslations("projects");
  const compact = variant === "compact";
  const tags = project.tags.slice(0, VISIBLE_TAGS);
  const hasLinks = !compact && (project.links.repo || project.links.demo);
  // En el archivo, los proyectos cuelgan del h3 "Otros proyectos"
  // compact solo se usa en /proyectos, bajo el h1 de la página
  const Heading = compact ? "h2" : "h3";

  return (
    <article className={`${styles.row} ${compact ? styles.compact : styles.featured}`}>
      <div className={styles.meta}>
        <span className={project.status === "unverified" ? "chip chip-muted" : "chip"}>
          {t(`status.${project.status}`)}
        </span>
        {project.context && <span className={styles.context}>{project.context}</span>}
      </div>
      <div className={styles.main}>
        <Heading className={styles.title}>
          <Link href={{ pathname: "/proyectos/[id]", params: { id: project.id } }} className={styles.stretch}>
            {project.title}
          </Link>
        </Heading>
        <p className={styles.desc}>{project.description}</p>
        {!compact && project.solves && (
          <p className={styles.solves}>
            <span className={styles.solvesLabel}>{t("solves")}:</span> {project.solves}
          </p>
        )}
        <p className={styles.tags}>
          <span className="visually-hidden">{t("stack")}: </span>
          {tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </p>
        {hasLinks && (
          <p className={styles.links}>
            {project.links.repo && (
              <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className={styles.ext}>
                {t("viewRepo")}
              </a>
            )}
            {project.links.demo && (
              <a href={project.links.demo} target="_blank" rel="noopener noreferrer" className={styles.ext}>
                {t("viewDemo")}
              </a>
            )}
          </p>
        )}
        {!compact && project.links.repoWithheld && <p className={styles.withheld}>{t("repoWithheld")}</p>}
      </div>
      <span className={styles.arrow} aria-hidden="true">
        <ArrowIcon size={compact ? 22 : 28} />
      </span>
    </article>
  );
}
