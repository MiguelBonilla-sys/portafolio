import { getLocale, getTranslations } from "next-intl/server";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowIcon, GithubIcon } from "@/components/ui/icons";
import { getProjects, GITHUB_URL } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import styles from "./ProjectsSection.module.css";

export default async function ProjectsSection() {
  const t = await getTranslations("projects");
  const locale = (await getLocale()) as Locale;

  return (
    <section id="proyectos" className={styles.section} aria-labelledby="proyectos-title">
      <div className="shell">
        <SectionHeader id="proyectos-title" title={t("title")} lede={t("lede")} />
        <ul className={styles.list}>
          {getProjects(locale).map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
          <li>
            <a href={`${GITHUB_URL}?tab=repositories`} target="_blank" rel="noopener noreferrer" className={styles.archive}>
              <GithubIcon size={22} />
              <span>{t("archive")}</span>
              <ArrowIcon />
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
