import skills from "@/data/skills.json";
import type { SkillCategory } from "@/types";
import SkillCategoryCard from "@/components/ui/SkillCategory";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimatedEntry from "@/components/ui/AnimatedEntry";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerContainer";
import styles from "./SkillsSection.module.css";

export default function SkillsSection() {
  return (
    <section id="habilidades" className={styles.section}>
      <AnimatedEntry>
        <SectionHeader
          label="// 02. stack tecnológico"
          title="Herramientas & tecnologías"
        />
      </AnimatedEntry>
      <StaggerContainer className={styles.grid} initialDelay={0.1}>
        {(skills as SkillCategory[]).map((cat) => (
          <StaggerItem key={cat.id}>
            <SkillCategoryCard category={cat} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </section>
  );
}
