import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  label: string;
  title: React.ReactNode;
}

export default function SectionHeader({ label, title }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.label}>{label}</div>
      <h2 className={styles.title}>{title}</h2>
    </div>
  );
}
