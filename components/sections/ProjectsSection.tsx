import { getLocale, getTranslations } from "next-intl/server";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { getProjects } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import styles from "./ProjectsSection.module.css";

/** Portada: solo los proyectos principales. Los demás viven en /proyectos */
export default async function ProjectsSection() {
  const t = await getTranslations("projects");
  const locale = (await getLocale()) as Locale;
  const projects = getProjects(locale);
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <section id="proyectos" className={styles.section} aria-labelledby="proyectos-title">
      <div className="shell">
        <SectionHeader id="proyectos-title" title={t("title")} lede={t("lede")} />
        <ul className={styles.list} aria-label={t("featuredProjects")}>
          {featured.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>

        {others.length > 0 && (
          <Link href="/proyectos" className={styles.more}>
            <span>{t("seeOthers", { count: others.length })}</span>
            <ArrowIcon />
          </Link>
        )}
      </div>
    </section>
  );
}
