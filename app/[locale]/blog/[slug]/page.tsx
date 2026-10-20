import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Prose from "@/components/blog/Prose";
import JsonLd from "@/components/seo/JsonLd";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPost, getPosts } from "@/lib/blog";
import { blogPostingSchema, breadcrumbSchema, faqSchema } from "@/lib/jsonld";
import { absoluteUrl, alternatesFor } from "@/lib/site";
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
  return {
    title: post.title,
    description: post.description,
    alternates: alternatesFor(locale, href),
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
    },
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
          <span className="chip">{t(`pillars.${post.pillar}`)}</span>
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
    </article>
  );
}
