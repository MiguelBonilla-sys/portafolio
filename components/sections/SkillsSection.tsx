import { getLocale, getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import { getSkills } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import styles from "./SkillsSection.module.css";

export default async function SkillsSection() {
  const t = await getTranslations("stack");
  const locale = (await getLocale()) as Locale;

  return (
    <section id="habilidades" className={styles.section} aria-labelledby="stack-title">
      <div className="shell">
        <SectionHeader id="stack-title" title={t("title")} lede={t("lede")} />
        <div className={styles.grid}>
          {getSkills().map((cat) => (
            <div key={cat.id} className={styles.block}>
              <h3 className={styles.label}>{cat.label[locale]}</h3>
              <ul className={styles.items}>
                {cat.items.map((item) => (
                  <li key={item} className="chip">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
