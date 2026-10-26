import { getLocale, getTranslations } from "next-intl/server";
import Sigil from "@/components/brand/Sigil";
import OrgText from "@/components/ui/OrgText";
import { Link } from "@/i18n/navigation";
import { EMAIL, GITHUB_URL, LINKEDIN_URL, X_URL } from "@/lib/content";
import { GithubIcon, LinkedInIcon, MailIcon, XIcon } from "@/components/ui/icons";
import styles from "./HeroSection.module.css";

const socials = [
  { href: GITHUB_URL, label: "GitHub", Icon: GithubIcon },
  { href: LINKEDIN_URL, label: "LinkedIn", Icon: LinkedInIcon },
  { href: `mailto:${EMAIL}`, label: "Email", Icon: MailIcon },
  { href: X_URL, label: "X", Icon: XIcon },
];

export default async function HeroSection() {
  const t = await getTranslations("hero");
  const locale = await getLocale();
  const facts = [
    { term: t("factBase"), value: t("factBaseValue") },
    { term: t("factNow"), value: t("factNowValue") },
    { term: t("factExp"), value: t("factExpValue") },
    { term: t("factSeek"), value: t("factSeekValue") },
  ];

  return (
    <section id="home" className={styles.hero} aria-labelledby="hero-title">
      <div className={`shell ${styles.grid}`}>
        <div className={styles.copy}>
          <h1 id="hero-title" className={styles.name}>
            Miguel
            <br />
            Bonilla
          </h1>
          <p className={styles.role}>{t("role")}</p>
          <p className={styles.lede}>{t("lede")}</p>
          <div className={styles.ctas}>
            <Link href={{ pathname: "/", hash: "contacto" }} className="btn btn-primary">
              {t("ctaContact")}
            </Link>
            <Link href={{ pathname: "/", hash: "proyectos" }} className="btn btn-ghost">
              {t("ctaProjects")}
            </Link>
            <a href={`/cv/miguel-bonilla-cv-${locale}.pdf`} className="btn btn-ghost" download>
              {t("ctaCv")}
            </a>
          </div>
          <ul className={styles.socials}>
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  className={styles.social}
                  {...(href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  <Icon />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <div className={styles.sigil}>
            <Sigil title={t("sigilTitle")} />
          </div>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.term} className={styles.fact}>
                <dt>{f.term}</dt>
                <dd>
                  <OrgText text={f.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
