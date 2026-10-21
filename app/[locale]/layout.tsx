import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Big_Shoulders, Atkinson_Hyperlegible_Next, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { routing } from "@/i18n/routing";
import { SITE_URL, alternatesFor } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import "../globals.css";

const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  weight: ["800", "900"],
  adjustFontFallback: false,
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  adjustFontFallback: false,
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s | Miguel Bonilla" },
    description: t("description"),
    alternates: alternatesFor(locale, "/"),
    authors: [{ name: "Miguel Bonilla", url: "https://github.com/MiguelBonilla-sys" }],
    creator: "Miguel Bonilla",
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: t("ogLocale"),
      siteName: "Miguel Bonilla",
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      creator: "@_mangel14_",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
    { media: "(prefers-color-scheme: light)", color: "#e9eaec" },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar, para no parpadear */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${shoulders.variable} ${atkinson.variable} ${mono.variable}`}>
        <GoogleAnalytics />
        <NextIntlClientProvider>
            <a href="#contenido" className="skip">
              {t("skip")}
            </a>
            <Navbar />
            <main id="contenido">{children}</main>
            <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
