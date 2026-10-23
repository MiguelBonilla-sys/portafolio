import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ThemeScript from "@/components/ThemeScript";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { routing } from "@/i18n/routing";
import { SITE_URL, alternatesFor, socialFor } from "@/lib/site";
import "../globals.css";

// Las tres fuentes son los variables "latin" de Google recortados con fontTools: eje wght limitado
// a los pesos que usa el sitio (instancer) y sin hinting. JetBrains Mono además va sin ligaduras de
// código (calt/liga). Total 54 KB contra 99 KB: son bytes que el celular baja antes de pintar el título.
const shoulders = localFont({
  src: "../fonts/big-shoulders-latin.woff2",
  variable: "--font-shoulders",
  weight: "800 900",
  adjustFontFallback: false,
});

const atkinson = localFont({
  src: "../fonts/atkinson-hyperlegible-next-latin.woff2",
  variable: "--font-atkinson",
  weight: "400 700",
  adjustFontFallback: false,
});

// On Vercel's builder, next/font/google failed to resolve JetBrains Mono's font files
// ("next/font/google queries have exactly one entry"), which is why it was self-hosted first.
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
    ...socialFor(locale, "/", { title: t("title"), description: t("description") }),
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
  const { nav } = await getMessages();

  return (
    <html lang={locale} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes de pintar, para no parpadear */}
        <ThemeScript />
      </head>
      <body className={`${shoulders.variable} ${atkinson.variable} ${mono.variable}`}>
        <GoogleAnalytics />
        <Analytics />
        {/* messages={null}: los componentes cliente reciben sus textos por props; el provider solo da el idioma a Link */}
        <NextIntlClientProvider messages={null}>
            <a href="#contenido" className="skip">
              {t("skip")}
            </a>
            <Navbar messages={nav} />
            <main id="contenido">{children}</main>
            <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
