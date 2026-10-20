import skills from "@/data/skills.json";
import type { SkillCategory } from "@/types";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./SkillsSection.module.css";

export default function SkillsSection() {
  return (
    <section id="habilidades" className={styles.section} aria-labelledby="stack-title">
      <div className="shell">
        <SectionHeader
          id="stack-title"
          title="Stack"
          lede="Las herramientas con las que he entregado proyectos. Cada una aparece en al menos un repositorio o en mi trabajo actual."
        />
        <div className={styles.grid}>
          {(skills as SkillCategory[]).map((cat) => (
            <div key={cat.id} className={styles.block}>
              <h3 className={styles.label}>{cat.label}</h3>
              <ul className={styles.items}>
                {cat.items.map((item) => (
                  <li key={item} className="chip">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
