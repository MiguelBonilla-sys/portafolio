import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

// La metadata va en la página y no solo en not-found.tsx: Next resuelve la del segmento que lanzó
// notFound() y, sin esto, tras hidratar quedaban el título, el canonical y el "index" de la home.
export async function generateMetadata({ params }: PageProps<"/[locale]/[...rest]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "notFound" });
  return { title: t("metaTitle"), robots: { index: false, follow: true }, alternates: null };
}

// Cualquier ruta desconocida bajo un idioma muestra el 404 traducido
export default function CatchAll() {
  notFound();
}
