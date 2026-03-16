import type { ExperienceItem } from "@/types";
import styles from "./TimelineItem.module.css";

interface TimelineItemProps {
  item: ExperienceItem;
}

export default function TimelineItem({ item }: TimelineItemProps) {
  return (
    <div className={styles.item}>
      <div className={styles.date}>{item.date}</div>
      <div className={styles.title}>{item.title}</div>
      <div className={styles.place}>{item.place}</div>
      <p className={styles.desc}>{item.description}</p>
    </div>
  );
}
