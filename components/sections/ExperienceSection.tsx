import { getLocale, getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import { getExperience } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import styles from "./ExperienceSection.module.css";

export default async function ExperienceSection() {
  const t = await getTranslations("path");
  const locale = (await getLocale()) as Locale;

  return (
    <section id="formacion" className={styles.section} aria-labelledby="trayectoria-title">
      <div className="shell">
        <SectionHeader id="trayectoria-title" title={t("title")} />
        <ol className={styles.list}>
          {getExperience(locale).map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.meta}>
                <span className={`data ${styles.date}`}>{item.date}</span>
                <span className={item.type === "work" ? "chip chip-accent" : "chip"}>{t(item.type)}</span>
              </div>
              <div>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.place}>{item.place}</p>
              </div>
              <div className={styles.desc}>
                <p>{item.description}</p>
                {item.highlights && (
                  <ul className={styles.highlights}>
                    {item.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
