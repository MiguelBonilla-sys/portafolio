import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  id: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** h1 when the header is the page title (e.g. /blog); h2 inside the home sections */
  as?: "h1" | "h2";
}

export default function SectionHeader({ id, title, lede, as: Heading = "h2" }: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <Heading id={id} className={styles.title}>
        {title}
      </Heading>
      {lede && <p className={styles.lede}>{lede}</p>}
    </div>
  );
}
