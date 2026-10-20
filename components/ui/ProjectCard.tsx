"use client";

import { useState } from "react";
import type { Project } from "@/types";
import ProjectModal from "./ProjectModal";
import { ArrowIcon } from "./icons";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
}

const VISIBLE_TAGS = 5;

export default function ProjectCard({ project }: ProjectCardProps) {
  const [open, setOpen] = useState(false);
  const extra = project.tags.length - VISIBLE_TAGS;

  return (
    <>
      <button
        type="button"
        className={`${styles.row} ${project.featured ? styles.featured : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${project.title}: ver detalles`}
      >
        <span className={styles.meta}>
          <span className="chip">{project.language}</span>
          {project.featured && <span className="chip chip-acid">Destacado</span>}
        </span>
        <span className={styles.main}>
          <span className={styles.title}>{project.title}</span>
          <span className={styles.desc}>{project.description}</span>
          <span className={styles.tags}>
            {project.tags.slice(0, VISIBLE_TAGS).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
            {extra > 0 && <span className={styles.tag}>+{extra}</span>}
          </span>
        </span>
        <span className={styles.arrow}>
          <ArrowIcon size={28} />
        </span>
      </button>

      {open && <ProjectModal project={project} onClose={() => setOpen(false)} />}
    </>
  );
}
