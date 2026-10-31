import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import BlogTools from "@/components/webmcp/BlogTools";
import { ArrowIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPosts } from "@/lib/blog";
import { CATEGORY_LABEL } from "@/lib/taxonomy";
import { SITE_URL, alternatesFor, socialFor } from "@/lib/site";
import styles from "./blog.module.css";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "blog" });
  return {
    title: t("title"),
    description: t("lede"),
    alternates: alternatesFor(locale, "/blog"),
    ...socialFor(locale, "/blog", { title: t("title"), description: t("lede") }),
  };
}

export default async function BlogIndex({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const posts = getPosts(locale);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });

  return (
    <section className={styles.section} aria-labelledby="blog-title">
      <BlogTools locale={locale} siteUrl={SITE_URL} posts={posts.filter((post) => !post.draft).map((post) => ({ slug: post.slug, title: post.title, summary: post.summary, tags: post.tags, category: post.category, draft: post.draft, date: post.date }))} />
      <div className="shell">
        <SectionHeader as="h1" id="blog-title" title={t("title")} lede={t("lede")} />

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <p>{t("empty")}</p>
            <Link href={{ pathname: "/", hash: "proyectos" }} className="btn btn-primary">
              {t("emptyCta")}
            </Link>
          </div>
        ) : (
          <ul className={styles.list}>
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }} className={styles.row}>
                  <span className={styles.meta}>
                    <time dateTime={post.date}>{dateFmt.format(new Date(post.date))}</time>
                    <span className="chip">{CATEGORY_LABEL[post.category][locale]}</span>
                    {post.draft && <span className="chip chip-accent">draft</span>}
                  </span>
                  <span className={styles.main}>
                    <span className={styles.title}>{post.title}</span>
                    <span className={styles.desc}>{post.description}</span>
                    <span className={`data ${styles.minutes}`}>{t("minutes", { count: post.readingMinutes })}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">
                    <ArrowIcon size={28} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.rss}>
          <a href={`/${locale}/feed.xml`} className="data">
            {t("rss")}
          </a>
        </p>
      </div>
    </section>
  );
}
