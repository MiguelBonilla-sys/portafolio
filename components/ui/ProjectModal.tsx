"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import type { Project } from "@/types";
import { CloseIcon, ExternalIcon, GithubIcon } from "./icons";
import styles from "./ProjectModal.module.css";

interface ProjectModalProps {
  project: Project;
  onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // ESC cierra; Tab queda dentro del panel
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Bloquea el scroll y devuelve el foco al disparador al cerrar
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = original;
      trigger?.focus();
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const titleId = `modal-title-${project.id}`;

  return createPortal(
    <motion.div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <motion.div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduceMotion ? false : { opacity: 0, x: -10, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.header}>
          <div className={styles.meta}>
            <span className="chip">{project.language}</span>
            {project.featured && <span className="chip chip-accent">Destacado</span>}
          </div>
          <button ref={closeBtnRef} className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {project.title}
          </h2>
          <div className={styles.desc}>
            {(project.longDescription ?? project.description).split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {project.tags.length > 0 && (
            <div className={styles.stack}>
              <h3 className={styles.stackTitle}>Stack</h3>
              <ul className={styles.tags}>
                {project.tags.map((tag) => (
                  <li key={tag} className="chip">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {(project.links.repo || project.links.demo) && (
          <div className={styles.footer}>
            {project.links.repo && (
              <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <GithubIcon />
                Ver repositorio
              </a>
            )}
            {project.links.demo && (
              <a href={project.links.demo} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <ExternalIcon />
                Ver demo
              </a>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
