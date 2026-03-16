import type { SkillCategory as SkillCategoryType } from "@/types";
import styles from "./SkillCategory.module.css";

interface SkillCategoryProps {
  category: SkillCategoryType;
}

export default function SkillCategoryCard({ category }: SkillCategoryProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{category.label}</div>
      <div className={styles.items}>
        {category.items.map((item) => (
          <span key={item} className={styles.tag}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
