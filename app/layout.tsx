import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Atkinson_Hyperlegible_Next, JetBrains_Mono } from "next/font/google";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import "./globals.css";

const shoulders = Big_Shoulders({
  variable: "--font-shoulders",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const theme = createTheme({
  fontFamily: "var(--font-atkinson), system-ui, sans-serif",
  fontFamilyMonospace: "var(--font-mono), monospace",
  primaryColor: "blue",
  cursorType: "pointer",
  defaultRadius: 0,
});

const description =
  "Full Stack AI Engineer en Bogotá. Construyo APIs, automatizaciones con n8n y CRM, y sistemas con LLMs. Abierto a trabajo remoto.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Miguel Bonilla | Full Stack AI Engineer",
  description,
  keywords: [
    "Full Stack AI Engineer",
    "Full Stack Developer",
    "AI Engineer",
    "FastAPI",
    "Next.js",
    "n8n",
    "Automatización",
    "LLM",
    "Bogotá",
    "Colombia",
    "Remoto",
  ],
  authors: [{ name: "Miguel Bonilla", url: "https://github.com/MiguelBonilla-sys" }],
  creator: "Miguel Bonilla",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Miguel Bonilla",
    title: "Miguel Bonilla | Full Stack AI Engineer",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Miguel Bonilla | Full Stack AI Engineer",
    description,
    creator: "@_mangel14_",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b10" },
    { media: "(prefers-color-scheme: light)", color: "#e9eaec" },
  ],
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
      <body className={`${shoulders.variable} ${atkinson.variable} ${mono.variable}`}>
        <GoogleAnalytics />
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
