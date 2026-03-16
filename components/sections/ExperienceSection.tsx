import experience from "@/data/experience.json";
import type { ExperienceItem } from "@/types";
import TimelineItemComponent from "@/components/ui/TimelineItem";
import SectionHeader from "@/components/ui/SectionHeader";
import Scene3DWrapper from "@/components/ui/Scene3DWrapper";
import AnimatedEntry from "@/components/ui/AnimatedEntry";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerContainer";
import styles from "./ExperienceSection.module.css";

export default function ExperienceSection() {
  return (
    <section id="formacion" className={styles.section}>
      {/* Canvas de red ocupa todo el fondo de la sección */}
      <div className={styles.canvasBg} aria-hidden="true">
        <Scene3DWrapper />
      </div>

      {/* Contenido encima */}
      <div className={styles.content}>
        <AnimatedEntry>
          <SectionHeader
            label="// 03. experiencia & formación"
            title="Trayectoria"
          />
        </AnimatedEntry>
        <StaggerContainer className={styles.timeline} initialDelay={0.1}>
          {(experience as ExperienceItem[]).map((item) => (
            <StaggerItem key={item.id}>
              <TimelineItemComponent item={item} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
