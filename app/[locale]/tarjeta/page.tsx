import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import QRCode from "qrcode";
import Sigil from "@/components/brand/Sigil";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { CARD } from "@/lib/card";
import { alternatesFor, openGraphFor } from "@/lib/site";
import { googleWalletConfig } from "@/lib/wallet";
import styles from "./card.module.css";

const SHOW_GOOGLE_WALLET = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/tarjeta">): Promise<Metadata> {
  const { locale } = (await params) as { locale: Locale };
  const t = await getTranslations({ locale, namespace: "card" });
  const title = `${t("title")}: ${CARD.fullName}`;
  return {
    title,
    description: t("metaDescription"),
    alternates: alternatesFor(locale, "/tarjeta"),
    openGraph: openGraphFor(locale, "/tarjeta", { title, description: t("metaDescription") }),
    // Página utilitaria para compartir en persona; el teléfono no necesita más exposición en buscadores
    robots: { index: false, follow: true },
  };
}

export default async function CardPage({ params }: PageProps<"/[locale]/tarjeta">) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  const t = await getTranslations("card");

  // QR siempre negro sobre blanco: es lo que mejor leen las cámaras
  const qr = await QRCode.toString(CARD.vcardUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0a0b10", light: "#ffffff" },
  });
  // Se decide en el build: las variables de Vercel solo cambian con un nuevo deploy
  // Botón oculto a propósito; /api/wallet/google sigue funcionando. Para mostrarlo, SHOW_GOOGLE_WALLET = true
  const google = SHOW_GOOGLE_WALLET && googleWalletConfig() !== null;

  return (
    <div className={`shell ${styles.wrap}`}>
      <h1 className={styles.title}>{t("title")}</h1>

      <article className={styles.card} aria-label={`${t("title")}: ${CARD.fullName}`}>
        <div className={styles.id}>
          <span className={styles.mark}>
            <Sigil variant="mark" />
          </span>
          <div>
            <p className={styles.name}>{CARD.fullName}</p>
            <p className={styles.role}>{CARD.title}</p>
            <p className={styles.place}>{CARD.place}</p>
          </div>
        </div>

        <dl className={styles.rows}>
          <div>
            <dt>{t("email")}</dt>
            <dd>
              <a href={`mailto:${CARD.email}`}>{CARD.email}</a>
            </dd>
          </div>
          <div>
            <dt>{t("phone")}</dt>
            <dd>
              <a href={`tel:${CARD.phone.replace(/\s/g, "")}`}>{CARD.phone}</a>
            </dd>
          </div>
          <div>
            <dt>{t("web")}</dt>
            <dd>
              <a href={CARD.site}>{CARD.siteLabel}</a>
            </dd>
          </div>
          <div>
            <dt>LinkedIn</dt>
            <dd>
              <a href={CARD.linkedin} target="_blank" rel="noopener noreferrer">
                in/miguel-bonilla-sys
              </a>
            </dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd>
              <a href={CARD.github} target="_blank" rel="noopener noreferrer">
                MiguelBonilla-sys
              </a>
            </dd>
          </div>
        </dl>

        <figure className={styles.qr}>
          <div role="img" aria-label={t("qrAlt")} dangerouslySetInnerHTML={{ __html: qr }} />
          <figcaption>{t("scan")}</figcaption>
        </figure>
      </article>

      <div className={styles.actions}>
        <a href="/contact.vcf" className="btn btn-primary" download="miguel-bonilla.vcf">
          {t("save")}
        </a>
        {google && (
          <a href={`/api/wallet/google?locale=${locale}`} className="btn btn-ghost" rel="nofollow">
            {t("google")}
          </a>
        )}
        <Link href="/" className="btn btn-ghost">
          {t("portfolio")}
        </Link>
      </div>
    </div>
  );
}
