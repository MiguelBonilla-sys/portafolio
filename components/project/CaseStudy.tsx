import { getTranslations } from "next-intl/server";
import RichText, { Inline } from "@/components/ui/RichText";
import type { Project } from "@/types";
import styles from "./CaseStudy.module.css";

type SectionKey =
  | "overview"
  | "need"
  | "constraints"
  | "solution"
  | "architecture"
  | "decisions"
  | "challenges"
  | "validation"
  | "results"
  | "limitations"
  | "role";

const LIST_SECTIONS = ["constraints", "decisions", "challenges", "validation", "results", "limitations"] as const;

/**
 * Caso de estudio de un proyecto. Solo se dibujan las secciones con contenido en data/projects.*.json:
 * un proyecto sin `caseStudy` muestra el resumen y el stack, sin títulos vacíos.
 */
export default async function CaseStudy({ project }: { project: Project }) {
  const t = await getTranslations("projects");
  const cs = project.caseStudy ?? {};
  const overview = project.longDescription ?? project.description;

  // Primero la necesidad y la solución; "Mi parte" al final (docs/research/PROJECT_NARRATIVE.md)
  const present: SectionKey[] = ["overview"];
  if (cs.need) present.push("need");
  if (cs.constraints?.length) present.push("constraints");
  if (cs.solution) present.push("solution");
  if (cs.architecture && (cs.architecture.flow.length > 0 || cs.architecture.summary)) present.push("architecture");
  for (const key of LIST_SECTIONS) if (key !== "constraints" && cs[key]?.length) present.push(key);
  if (cs.role) present.push("role");

  const id = (key: SectionKey) => `cs-${key}`;
  const showToc = present.length > 2;

  return (
    <div className={styles.grid}>
      <div className={styles.body}>
        {present.map((key) => (
          <section key={key} className={styles.section} aria-labelledby={id(key)}>
            <h2 id={id(key)} className={styles.heading}>
              {t(`case.${key}`)}
            </h2>
            {key === "overview" && <RichText text={overview} />}
            {key === "need" && cs.need && <RichText text={cs.need} />}
            {key === "solution" && cs.solution && <RichText text={cs.solution} />}
            {key === "role" && cs.role && <RichText text={cs.role} />}
            {key === "architecture" && cs.architecture && (
              <>
                {cs.architecture.summary && <RichText text={cs.architecture.summary} />}
                {cs.architecture.flow.length > 0 && (
                  <figure className={styles.flow}>
                    <figcaption className={`data ${styles.flowCaption}`}>{t("case.flow")}</figcaption>
                    <ol className={styles.steps}>
                      {cs.architecture.flow.map((step, i) => (
                        <li key={i} className={styles.step}>
                          <span className={`data ${styles.stepNum}`} aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>
                            <Inline text={step} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </figure>
                )}
              </>
            )}
            {(LIST_SECTIONS as readonly string[]).includes(key) && (
              <ul className={styles.list}>
                {(cs[key as (typeof LIST_SECTIONS)[number]] ?? []).map((item, i) => (
                  <li key={i}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className={styles.side}>
        {showToc && (
          <nav className={styles.panel} aria-labelledby="cs-toc">
            <h2 id="cs-toc" className={styles.panelTitle}>
              {t("case.contents")}
            </h2>
            <ol className={styles.toc}>
              {present.map((key) => (
                <li key={key}>
                  <a href={`#${id(key)}`}>{t(`case.${key}`)}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t("stack")}</h2>
          <ul className={styles.tags}>
            {project.tags.map((tag) => (
              <li key={tag} className="chip">
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
