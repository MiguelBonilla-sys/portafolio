import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/seo/JsonLd";
import ProjectCard from "@/components/ui/ProjectCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowIcon, GithubIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getProjects, GITHUB_URL } from "@/lib/content";
import { breadcrumbSchema } from "@/lib/jsonld";
import { absoluteUrl, alternatesFor, socialFor } from "@/lib/site";
import styles from "@/components/sections/ProjectsSection.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/proyectos">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "projects" });
  return {
    title: t("otherTitle"),
    description: t("otherLede"),
    alternates: alternatesFor(locale, "/proyectos"),
    ...socialFor(locale, "/proyectos", { title: t("otherTitle"), description: t("otherLede") }),
  };
}

/** Los proyectos que no son principales: cursos, prototipos y trabajos sin código público */
export default async function OtherProjects({ params }: PageProps<"/[locale]/proyectos">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const others = getProjects(locale).filter((p) => !p.featured);

  return (
    <section className={styles.section} aria-labelledby="otros-proyectos-title">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Miguel Bonilla", url: absoluteUrl(locale, "/") },
          { name: t("otherTitle"), url: absoluteUrl(locale, "/proyectos") },
        ])}
      />
      <div className="shell">
        <SectionHeader as="h1" id="otros-proyectos-title" title={t("otherTitle")} lede={t("otherLede")} />
        <ul className={styles.list}>
          {others.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} variant="compact" />
            </li>
          ))}
          <li>
            <a href={`${GITHUB_URL}?tab=repositories`} target="_blank" rel="noopener noreferrer" className={styles.archive}>
              <GithubIcon size={22} />
              <span>{t("archive")}</span>
              <ArrowIcon />
            </a>
          </li>
          <li>
            <Link href={{ pathname: "/", hash: "proyectos" }} className={styles.more}>
              <span>← {t("backHome")}</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
