import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Big_Shoulders, Atkinson_Hyperlegible_Next } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ThemeScript from "@/components/ThemeScript";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { routing } from "@/i18n/routing";
import { SITE_URL, alternatesFor } from "@/lib/site";
import "../globals.css";

const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  weight: ["800", "900"],
  adjustFontFallback: false,
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  // Solo latin (incluye á, é, ñ): latin-ext agregaba una precarga de 19 KB antes del título
  subsets: ["latin"],
  weight: ["400", "700"],
  adjustFontFallback: false,
});

// Self-hosted: on Vercel's builder, next/font/google failed to resolve JetBrains Mono's font files
// ("next/font/google queries have exactly one entry"). The file is Google's variable latin subset.
const mono = localFont({
  src: "../fonts/jetbrains-mono-latin.woff2",
  variable: "--font-mono",
  weight: "400 700",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Solo es/en: un primer segmento como "foo.png" (el proxy no toca rutas con punto) da 404
// en vez de renderizar las páginas con un idioma inválido, que fallaban con 500.
export const dynamicParams = false;

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
  // Solo lo que usan los componentes cliente (Navbar, ContactSection): el resto viajaba en el HTML sin usarse
  const { nav, contact } = await getMessages();

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar, para no parpadear */}
        <ThemeScript />
      </head>
      <body className={`${shoulders.variable} ${atkinson.variable} ${mono.variable}`}>
        <GoogleAnalytics />
        <Analytics />
        <SpeedInsights />
        <NextIntlClientProvider messages={{ nav, contact }}>
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
