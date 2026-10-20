import projects from "@/data/projects.json";
import type { Project } from "@/types";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowIcon, GithubIcon } from "@/components/ui/icons";
import styles from "./ProjectsSection.module.css";

export default function ProjectsSection() {
  const all = projects as Project[];
  const archive = all.find((p) => p.id === "more-repos");
  const list = all.filter((p) => p.id !== "more-repos");

  return (
    <section id="proyectos" className={styles.section} aria-labelledby="proyectos-title">
      <div className="shell">
        <SectionHeader
          id="proyectos-title"
          title="Proyectos"
          lede="Repositorios públicos. Abre cualquiera para ver cómo está construido y qué decidí en el camino."
        />
        <ul className={styles.list}>
          {list.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
          {archive && (
            <li>
              <a
                href={archive.links.repo ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.archive}
              >
                <GithubIcon size={22} />
                <span>{archive.description}</span>
                <ArrowIcon />
              </a>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
