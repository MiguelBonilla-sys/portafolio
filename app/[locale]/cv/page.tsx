import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { EMAIL, GITHUB_URL, LINKEDIN_URL, PHONE, getExperience, getProjects, getSkills } from "@/lib/content";
import { SITE_URL, alternatesFor } from "@/lib/site";
import styles from "./cv.module.css";

// Proyectos y orden que lleva el CV (los demás quedan en el portafolio)
const CV_PROJECTS = ["bikans", "api-auth-hackaton", "idn-phishing-detector", "etl-parcial", "taskflow", "ledgercore", "sentinel-rag"];

export async function generateMetadata({ params }: PageProps<"/[locale]/cv">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "cv" });
  return {
    title: `${t("title")}: Miguel Ángel Bonilla Torres`,
    description: t("summaryText").slice(0, 160),
    alternates: alternatesFor(locale, "/cv"),
  };
}

export default async function CvPage({ params }: PageProps<"/[locale]/cv">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations("cv");
  const otherLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;

  const experience = getExperience(locale);
  const jobs = experience.filter((e) => e.type === "work");
  const education = experience.filter((e) => e.type === "education");
  const courses = experience.filter((e) => e.type === "course");
  const projects = CV_PROJECTS.map((id) => getProjects(locale).find((p) => p.id === id)).filter((p) => p !== undefined);
  const site = SITE_URL.replace(/^https?:\/\//, "");

  return (
    <div className={`shell ${styles.wrap}`}>
      <div className={styles.toolbar}>
        <a href={`/cv/miguel-bonilla-cv-${locale}.pdf`} className="btn btn-primary" download>
          {t("download")}
        </a>
        <Link href="/cv" locale={otherLocale} hrefLang={otherLocale} className="btn btn-ghost">
          {t("otherLang")}
        </Link>
      </div>

      <article className={styles.sheet}>
        <header className={styles.head}>
          <h1 className={styles.name}>Miguel Ángel Bonilla Torres</h1>
          <p className={styles.role}>Full Stack Developer / AI Engineer</p>
          <p className={styles.contact}>
            <span>{PHONE}</span> · <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · <span>Bogotá, Colombia</span>
          </p>
          <p className={styles.contact}>
            <a href={SITE_URL}>{site}</a> · <a href={LINKEDIN_URL}>linkedin.com/in/miguel-bonilla-sys</a> ·{" "}
            <a href={GITHUB_URL}>github.com/MiguelBonilla-sys</a>
          </p>
        </header>

        <section className={styles.block}>
          <h2>{t("summary")}</h2>
          <p>{t("summaryText")}</p>
        </section>

        <section className={styles.block}>
          <h2>{t("skills")}</h2>
          <dl className={styles.skills}>
            {getSkills(locale).map((c) => (
              <div key={c.id}>
                <dt>{c.label}:</dt> <dd>{c.items.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.block}>
          <h2>{t("experience")}</h2>
          {jobs.map((job) => (
            <div key={job.id} className={styles.item}>
              <div className={styles.itemHead}>
                <h3>{job.place.split(" · ")[0]}</h3>
                <span>{job.date}</span>
              </div>
              <p className={styles.sub}>
                {job.title} · {job.place.split(" · ").slice(1).join(" · ")}
              </p>
              <ul>
                {(job.highlights ?? [job.description]).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2>{t("projects")}</h2>
          {projects.map((p) => (
            <div key={p.id} className={styles.item}>
              <div className={styles.itemHead}>
                <h3>{p.title}</h3>
                {p.context && <span>{p.context}</span>}
              </div>
              <p className={styles.sub}>
                {t("technologies")}: {p.tags.join(", ")}
              </p>
              <ul>
                <li>{p.description}</li>
              </ul>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2>{t("education")}</h2>
          {education.map((e) => (
            <div key={e.id} className={styles.item}>
              <div className={styles.itemHead}>
                <h3>{e.place.split(" · ")[0]}</h3>
                <span>{e.date}</span>
              </div>
              <p className={styles.sub}>
                {e.title} · {e.place.split(" · ").slice(1).join(" · ")}
              </p>
              <ul>
                <li>{e.description}</li>
                {(e.highlights ?? []).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className={styles.block}>
          <h2>{t("courses")}</h2>
          <ul className={styles.plain}>
            {courses.map((c) => (
              <li key={c.id}>
                {c.title} · {c.place}, {c.date}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.block}>
          <h2>{t("strengths")}</h2>
          <p>{t("strengthsList")}</p>
        </section>
      </article>
    </div>
  );
}
