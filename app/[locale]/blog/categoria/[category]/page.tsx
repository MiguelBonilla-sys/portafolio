import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SectionHeader from "@/components/ui/SectionHeader";
import { ArrowIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { categoriesWithPages, getPosts } from "@/lib/blog";
import { alternatesFor, socialFor } from "@/lib/site";
import { CATEGORY_LABEL, CATEGORY_PAGE_MIN_POSTS, type Category } from "@/lib/taxonomy";
import styles from "../../blog.module.css";

type Params = { locale: Locale; category: Category };

// Solo existen las categorías con artículos suficientes en los dos idiomas: nada de páginas vacías o delgadas
export function generateStaticParams() {
  const both = categoriesWithPages("es", CATEGORY_PAGE_MIN_POSTS).filter((c) => categoriesWithPages("en", CATEGORY_PAGE_MIN_POSTS).includes(c));
  return routing.locales.flatMap((locale) => both.map((category) => ({ locale, category })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/categoria/[category]">): Promise<Metadata> {
  const { locale, category } = (await params) as Params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const title = `${CATEGORY_LABEL[category][locale]} · ${t("title")}`;
  const description = t("categoryLede", { category: CATEGORY_LABEL[category][locale] });
  const href = { pathname: "/blog/categoria/[category]" as const, params: { category } };
  return { title, description, alternates: alternatesFor(locale, href), ...socialFor(locale, href, { title, description }) };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/blog/categoria/[category]">) {
  const { locale, category } = (await params) as Params;
  if (!CATEGORY_LABEL[category]) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const posts = getPosts(locale).filter((p) => !p.draft && p.category === category);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });

  return (
    <section className={styles.section} aria-labelledby="category-title">
      <div className="shell">
        <SectionHeader as="h1" id="category-title" title={CATEGORY_LABEL[category][locale]} lede={t("categoryLede", { category: CATEGORY_LABEL[category][locale] })} />
        <ul className={styles.list}>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }} className={styles.row}>
                <span className={styles.meta}>
                  <time dateTime={post.date}>{dateFmt.format(new Date(post.date))}</time>
                </span>
                <span className={styles.main}>
                  <span className={styles.title}>{post.title}</span>
                  <span className={styles.desc}>{post.description}</span>
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  <ArrowIcon size={28} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
