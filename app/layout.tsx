import type { Metadata } from "next";
import { Syne, JetBrains_Mono } from "next/font/google";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const theme = createTheme({
  fontFamily: "var(--font-syne), system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-mono), monospace",
  primaryColor: "cyan",
  cursorType: "pointer",
  defaultRadius: 0,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Miguel Bonilla | Full Stack Developer",
  description:
    "Ingeniero de Sistemas apasionado por construir plataformas web escalables, ecosistemas de automatización y sistemas CRM. Bogotá, Colombia.",
  keywords: [
    "Full Stack Developer",
    "Next.js",
    "WordPress",
    "Automatización",
    "CRM",
    "Bogotá",
    "Colombia",
    "Ingeniero de Sistemas",
    "React",
    "Python",
  ],
  authors: [{ name: "Miguel Bonilla", url: "https://github.com/MiguelBonilla-sys" }],
  creator: "Miguel Bonilla",
  icons: {
    icon: "favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Miguel Bonilla | Portfolio",
    title: "Miguel Bonilla | Full Stack Developer",
    description:
      "Ingeniero de Sistemas apasionado por construir plataformas web escalables, ecosistemas de automatización y sistemas CRM. Bogotá, Colombia.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Miguel Bonilla — Full Stack Developer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Miguel Bonilla | Full Stack Developer",
    description:
      "Ingeniero de Sistemas — Next.js · WordPress · Automatización · CRM. Bogotá, Colombia.",
    creator: "@_mangel14_",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={`${syne.variable} ${jetbrainsMono.variable}`}>
        <MantineProvider theme={theme} defaultColorScheme="dark">{children}</MantineProvider>
      </body>
    </html>
  );
}
