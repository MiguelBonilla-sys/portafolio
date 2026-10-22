import { getTranslations } from "next-intl/server";
import Sigil from "@/components/brand/Sigil";
import { Link } from "@/i18n/navigation";
import { GITHUB_URL, LINKEDIN_URL, X_URL } from "@/lib/content";
import styles from "./Footer.module.css";

const links = [
  { href: GITHUB_URL, label: "GitHub" },
  { href: LINKEDIN_URL, label: "LinkedIn" },
  { href: X_URL, label: "X" },
];

export default async function Footer() {
  const t = await getTranslations("footer");

  return (
    <footer className={styles.footer}>
      <div className={`shell ${styles.inner}`}>
        <div className={styles.id}>
          <span className={styles.mark}>
            <Sigil variant="mark" />
          </span>
          <p>
            <span className={styles.name}>Miguel Bonilla</span>
            <span className={styles.sub}>{t("place")}</span>
          </p>
        </div>
        <ul className={styles.links}>
          <li>
            <Link href="/tarjeta">{t("card")}</Link>
          </li>
          <li>
            <Link href="/privacidad">{t("privacy")}</Link>
          </li>
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
