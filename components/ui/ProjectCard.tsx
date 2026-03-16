"use client";

import { useState } from "react";
import type { Project } from "@/types";
import ProjectModal from "./ProjectModal";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={`${styles.card} ${project.featured ? styles.cardFeatured : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Ver detalles de ${project.title}`}
      >
        <div className={styles.lang}>{project.language}</div>
        <div className={styles.title}>{project.title}</div>
        <p className={styles.desc}>{project.description}</p>
        {project.tags.length > 0 && (
          <div className={styles.tags}>
            {project.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className={styles.cta}>
          Ver detalles →
        </div>
      </button>

      {open && (
        <ProjectModal project={project} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
