import { renderPng } from "@/agent/visuals/render.ts";
import { VisualFitError } from "@/agent/visuals/scene.ts";
import { routing, type Locale } from "@/i18n/routing";
import { getPost, getPosts } from "@/lib/blog";
import { ARTICLE_TYPE_LABEL, CATEGORY_LABEL } from "@/lib/taxonomy";

// Portada del artículo generada con el motor visual del Content Engine (agent/visuals):
// el tema y la categoría cambian la composición, y el texto nunca se recorta.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Portada del artículo";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getPosts(locale).map((p) => ({ locale, slug: p.slug })));
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = (await params) as { locale: Locale; slug: string };
  const post = getPost(locale, slug);
  const category = post?.category ?? "software";
  const kicker = [CATEGORY_LABEL[category][locale], post?.articleType ? ARTICLE_TYPE_LABEL[post.articleType][locale] : null].filter(Boolean).join(" · ");
  let png: Uint8Array;
  try {
    png = await renderPng({ kind: "cover", name: "portada", title: post?.title ?? "Blog", category, kicker }, "og");
  } catch (e) {
    if (!(e instanceof VisualFitError)) throw e;
    // Un título que no cabe sin cortar se reemplaza por el nombre del blog: nunca texto recortado
    png = await renderPng({ kind: "cover", name: "portada", title: "Miguel Bonilla · Blog", category, kicker }, "og");
  }
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
