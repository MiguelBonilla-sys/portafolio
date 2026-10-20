import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import JsonLd from "@/components/seo/JsonLd";
import RichText from "@/components/ui/RichText";
import { ArrowIcon, ExternalIcon, GithubIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getProject, getProjects } from "@/lib/content";
import { breadcrumbSchema, projectSchema } from "@/lib/jsonld";
import { absoluteUrl, alternatesFor } from "@/lib/site";
import styles from "./project.module.css";

type Params = { locale: Locale; id: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProjects(locale).map((p) => ({ locale, id: p.id })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/proyectos/[id]">): Promise<Metadata> {
  const { locale, id } = (await params) as Params;
  const project = getProject(locale, id);
  if (!project) return {};
  return {
    title: project.title,
    description: project.description,
    alternates: alternatesFor(locale, { pathname: "/proyectos/[id]", params: { id } }),
    openGraph: { title: project.title, description: project.description },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/proyectos/[id]">) {
  const { locale, id } = (await params) as Params;
  setRequestLocale(locale);
  const project = getProject(locale, id);
  if (!project) notFound();

  const t = await getTranslations("projects");
  const href = { pathname: "/proyectos/[id]" as const, params: { id } };
  const others = getProjects(locale).filter((p) => p.id !== id).slice(0, 3);

  return (
    <article className={`shell ${styles.article}`}>
      <JsonLd
        data={[
          projectSchema(locale, project),
          breadcrumbSchema([
            { name: "Miguel Bonilla", url: absoluteUrl(locale, "/") },
            { name: t("title"), url: `${absoluteUrl(locale, "/")}#proyectos` },
            { name: project.title, url: absoluteUrl(locale, href) },
          ]),
        ]}
      />
      <nav aria-label="Breadcrumb">
        <Link href={{ pathname: "/", hash: "proyectos" }} className={`data ${styles.back}`}>
          ← {t("back")}
        </Link>
      </nav>

      <header className={styles.header}>
        <div className={styles.meta}>
          <span className="chip">{project.language}</span>
          {project.featured && <span className="chip chip-accent">{t("featured")}</span>}
        </div>
        <h1 className={styles.title}>{project.title}</h1>
        <p className={styles.lede}>{project.description}</p>
        <div className={styles.links}>
          {project.links.repo && (
            <a href={project.links.repo} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <GithubIcon />
              {t("viewRepo")}
            </a>
          )}
          {project.links.demo && (
            <a href={project.links.demo} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              <ExternalIcon />
              {t("viewDemo")}
            </a>
          )}
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.body}>
          <RichText text={project.longDescription ?? project.description} />
        </div>
        <aside className={styles.side}>
          <h2 className={styles.sideTitle}>{t("stack")}</h2>
          <ul className={styles.tags}>
            {project.tags.map((tag) => (
              <li key={tag} className="chip">
                {tag}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <section className={styles.others} aria-labelledby="otros-proyectos">
        <h2 id="otros-proyectos" className={styles.othersTitle}>
          {t("otherProjects")}
        </h2>
        <ul className={styles.othersList}>
          {others.map((p) => (
            <li key={p.id}>
              <Link href={{ pathname: "/proyectos/[id]", params: { id: p.id } }} className={styles.other}>
                <span>{p.title}</span>
                <ArrowIcon />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
