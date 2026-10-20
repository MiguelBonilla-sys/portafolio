import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
}

export default function SectionHeader({ id, title, lede }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {lede && <p className={styles.lede}>{lede}</p>}
    </div>
  );
}
