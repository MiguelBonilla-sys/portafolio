import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import styles from "./not-found.module.css";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <section className={`shell ${styles.wrap}`}>
      <p className={`data ${styles.code}`}>404</p>
      <h1 className={styles.title}>{t("title")}</h1>
      <p className={styles.body}>{t("body")}</p>
      <Link href="/" className="btn btn-primary">
        {t("home")}
      </Link>
    </section>
  );
}
