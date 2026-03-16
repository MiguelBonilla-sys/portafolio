import projects from "@/data/projects.json";
import type { Project } from "@/types";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimatedEntry from "@/components/ui/AnimatedEntry";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerContainer";
import styles from "./ProjectsSection.module.css";

export default function ProjectsSection() {
  return (
    <section id="proyectos" className={styles.section}>
      <AnimatedEntry>
        <SectionHeader
          label="// 04. proyectos destacados"
          title="Lo que he construido"
        />
      </AnimatedEntry>
      <StaggerContainer className={styles.grid} initialDelay={0.1}>
        {(projects as Project[]).map((project) => (
          <StaggerItem
            key={project.id}
            className={project.featured ? styles.featured : undefined}
          >
            <ProjectCard project={project} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
