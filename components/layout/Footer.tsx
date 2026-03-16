import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.copy}>
        © 2026 ·{" "}
        <span className={styles.accent}>Miguel Angel Bonilla Torres</span>
        {" "}· Coded with ♥ in Bogotá
      </div>
      <div className={styles.copy}>
        <span className={styles.accent}>mbonilla</span>@dev:~$
      </div>
    </footer>
  );
}
