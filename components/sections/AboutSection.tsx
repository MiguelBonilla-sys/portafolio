import Image from "next/image";
import { getTranslations } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./AboutSection.module.css";

export default async function AboutSection() {
  const t = await getTranslations("about");

  return (
    <section id="sobreMi" className={styles.section} aria-labelledby="sobre-mi-title">
      <div className="shell">
        <SectionHeader id="sobre-mi-title" title={t("title")} />
        <div className={styles.grid}>
          <div className={styles.body}>
            <p className={styles.lead}>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
          </div>

          <figure className={styles.frame}>
            <div className={styles.portrait}>
              <Image
                src="/avatar.png?v=20260315"
                alt={t("portraitAlt")}
                width={379}
                height={659}
                sizes="(max-width: 900px) 70vw, 380px"
                className={styles.img}
              />
            </div>
            <figcaption className={styles.caption}>
              <span>Miguel Ángel Bonilla Torres</span>
              <span className={styles.handle}>@_mangel14_</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
