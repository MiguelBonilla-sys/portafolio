import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Prose from "@/components/blog/Prose";
import JsonLd from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { ArrowIcon } from "@/components/ui/icons";
import { CATEGORY_PAGE_MIN_POSTS, CATEGORY_LABEL, ARTICLE_TYPE_LABEL } from "@/lib/taxonomy";
import { categoriesWithPages, getPost, getPosts, relatedPosts } from "@/lib/blog";
import { getProject } from "@/lib/content";
import { blogPostingSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import { absoluteUrl, alternatesFor, socialFor } from "@/lib/site";
import { articleLanguages } from "@/lib/article-seo";
import styles from "./post.module.css";

type Params = { locale: Locale; slug: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getPosts(locale).map((p) => ({ locale, slug: p.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = (await params) as Params;
  const post = getPost(locale, slug);
  if (!post) return {};
  const href = { pathname: "/blog/[slug]" as const, params: { slug } };
  const availableUrls = Object.fromEntries(
    routing.locales.filter((l) => getPost(l, slug) && !getPost(l, slug)?.draft).map((l) => [l, absoluteUrl(l, href)])
  );
  return {
    title: post.title,
    description: post.description,
    alternates: {
      ...alternatesFor(locale, href),
      languages: articleLanguages(Object.keys(availableUrls).length ? availableUrls : { [locale]: absoluteUrl(locale, href) }, routing.defaultLocale),
    },
    robots: post.draft ? { index: false, follow: false } : undefined,
    authors: [{ name: "Miguel Ángel Bonilla Torres", url: absoluteUrl(locale, "/") }],
    ...socialFor(locale, href, {
      type: "article",
      image: `${absoluteUrl(locale, href)}/opengraph-image`,
      imageAlt: `${post.title}: ${CATEGORY_LABEL[post.category][locale]}`,
      authors: [absoluteUrl(locale, "/")],
      section: CATEGORY_LABEL[post.category][locale],
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
    }),
  };
}

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = (await params) as Params;
  setRequestLocale(locale);
  const post = getPost(locale, slug);
  if (!post) notFound();

  const t = await getTranslations("blog");
  const tNav = await getTranslations("nav");
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  const otherLocale = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const hasTranslation = Boolean(getPost(otherLocale, slug));
  const href = { pathname: "/blog/[slug]" as const, params: { slug } };
  const related = relatedPosts(locale, post);
  const projects = post.projects.map((id) => getProject(locale, id)).filter((p) => p !== undefined);
  const categoryPage = categoriesWithPages(locale, CATEGORY_PAGE_MIN_POSTS).includes(post.category);
  const categoryLabel = CATEGORY_LABEL[post.category][locale];

  const schemas: object[] = [
    blogPostingSchema(locale, post),
    breadcrumbSchema([
      { name: "Miguel Bonilla", url: absoluteUrl(locale, "/") },
      { name: tNav("blog"), url: absoluteUrl(locale, "/blog") },
      { name: post.title, url: absoluteUrl(locale, href) },
    ]),
  ];
  if (post.faq.length > 0) schemas.push(faqSchema(post.faq));

  return (
    <article className={`shell ${styles.article}`}>
      <JsonLd data={schemas} />
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/blog" className="data">
          ← {t("back")}
        </Link>
        {hasTranslation && (
          <Link href={href} locale={otherLocale} hrefLang={otherLocale} className="data">
            {t("otherLang")}
          </Link>
        )}
      </nav>

      <header className={styles.header}>
        <div className={styles.meta}>
          {categoryPage ? (
            <Link href={{ pathname: "/blog/categoria/[category]", params: { category: post.category } }} className="chip">
              {categoryLabel}
            </Link>
          ) : (
            <span className="chip">{categoryLabel}</span>
          )}
          {post.articleType && <span className="data">{ARTICLE_TYPE_LABEL[post.articleType][locale]}</span>}
          {post.draft && <span className="chip chip-accent">draft</span>}
          <span className="data">
            {t("published")} <time dateTime={post.date}>{dateFmt.format(new Date(post.date))}</time>
          </span>
          {post.updated && (
            <span className="data">
              {t("updated")} <time dateTime={post.updated}>{dateFmt.format(new Date(post.updated))}</time>
            </span>
          )}
          <span className="data">{t("minutes", { count: post.readingMinutes })}</span>
        </div>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.summary}>{post.summary}</p>
        <p className={`data ${styles.byline}`}>
          {t("author")}:{" "}
          <Link href={{ pathname: "/", hash: "sobreMi" }} rel="author">
            Miguel Ángel Bonilla Torres
          </Link>
        </p>
      </header>

      <Prose source={post.body} />

      {post.faq.length > 0 && (
        <section className={styles.block} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.blockTitle}>
            {t("faq")}
          </h2>
          <dl className={styles.faq}>
            {post.faq.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {post.sources.length > 0 && (
        <section className={styles.block} aria-labelledby="sources-title">
          <h2 id="sources-title" className={styles.blockTitle}>
            {t("sources")}
          </h2>
          <ol className={styles.sources}>
            {post.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}

      {projects.length > 0 && (
        <section className={styles.block} aria-labelledby="project-title">
          <h2 id="project-title" className={styles.blockTitle}>
            {t("relatedProject")}
          </h2>
          <ul className={styles.links}>
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={{ pathname: "/proyectos/[id]", params: { id: p.id } }} className={styles.linkRow}>
                  <span>
                    <span className={styles.linkTitle}>{p.title}</span>
                    <span className={styles.linkDesc}>{p.description}</span>
                  </span>
                  <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className={styles.block} aria-labelledby="related-title">
          <h2 id="related-title" className={styles.blockTitle}>
            {t("related")}
          </h2>
          <ul className={styles.links}>
            {related.map((p) => (
              <li key={p.slug}>
                <Link href={{ pathname: "/blog/[slug]", params: { slug: p.slug } }} className={styles.linkRow}>
                  <span>
                    <span className={styles.linkTitle}>{p.title}</span>
                    <span className={styles.linkDesc}>{p.description}</span>
                  </span>
                  <ArrowIcon />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.cta} aria-labelledby="post-cta">
        <h2 id="post-cta" className={styles.blockTitle}>
          {t("ctaTitle")}
        </h2>
        <p>{t("ctaBody")}</p>
        <div className={styles.ctaLinks}>
          <Link href={{ pathname: "/", hash: "contacto" }} className="btn btn-primary">
            {t("ctaContact")}
          </Link>
          <Link href={{ pathname: "/", hash: "proyectos" }} className="btn btn-ghost">
            {t("ctaProjects")}
          </Link>
        </div>
      </section>
    </article>
  );
}
