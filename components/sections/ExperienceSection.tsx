import experience from "@/data/experience.json";
import type { ExperienceItem } from "@/types";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./ExperienceSection.module.css";

const typeLabel: Record<ExperienceItem["type"], string> = {
  work: "Trabajo",
  education: "Formación",
  self: "Autodidacta",
};

export default function ExperienceSection() {
  return (
    <section id="formacion" className={styles.section} aria-labelledby="trayectoria-title">
      <div className="shell">
        <SectionHeader id="trayectoria-title" title="Trayectoria" />
        <ol className={styles.list}>
          {(experience as ExperienceItem[]).map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.meta}>
                <span className={`data ${styles.date}`}>{item.date}</span>
                <span className={item.type === "work" ? "chip chip-acid" : "chip"}>
                  {typeLabel[item.type]}
                </span>
              </div>
              <div>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.place}>{item.place}</p>
              </div>
              <p className={styles.desc}>{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
