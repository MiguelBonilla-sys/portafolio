import Sigil from "@/components/brand/Sigil";
import styles from "./Footer.module.css";

const links = [
  { href: "https://github.com/MiguelBonilla-sys", label: "GitHub" },
  { href: "https://www.linkedin.com/in/miguel-bonilla-sys", label: "LinkedIn" },
  { href: "https://x.com/_mangel14_", label: "X" },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.inner}`}>
        <div className={styles.id}>
          <span className={styles.mark}>
            <Sigil variant="mark" />
          </span>
          <p>
            <span className={styles.name}>Miguel Bonilla</span>
            <span className={styles.sub}>Bogotá, Colombia · © 2026</span>
          </p>
        </div>
        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
