import { getTranslations } from "next-intl/server";
import type { Project } from "@/types";
import { Link } from "@/i18n/navigation";
import { ArrowIcon } from "./icons";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
}

const VISIBLE_TAGS = 5;

// Fila enlazada a la página del proyecto: una URL real que buscadores y agentes de IA pueden seguir
export default async function ProjectCard({ project }: ProjectCardProps) {
  const t = await getTranslations("projects");
  const extra = project.tags.length - VISIBLE_TAGS;

  return (
    <Link
      href={{ pathname: "/proyectos/[id]", params: { id: project.id } }}
      className={`${styles.row} ${project.featured ? styles.featured : ""}`}
    >
      <div className={styles.meta}>
        <span className="chip">{project.language}</span>
        {project.featured && <span className="chip chip-accent">{t("featured")}</span>}
        {project.context && <span className={styles.context}>{project.context}</span>}
      </div>
      <div className={styles.main}>
        <h3 className={styles.title}>{project.title}</h3>
        <span className={styles.desc}>{project.description}</span>
        <span className={styles.tags}>
          {project.tags.slice(0, VISIBLE_TAGS).map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
          {extra > 0 && <span className={styles.tag}>+{extra}</span>}
        </span>
      </div>
      <span className={styles.arrow} aria-hidden="true">
        <ArrowIcon size={28} />
      </span>
    </Link>
  );
}
