// Toda imagen del artículo lleva texto alternativo y título, siempre. El alt no se inventa: si falta,
// el artículo no se aprueba. El título sí se completa solo, con el alt, porque ya describe la imagen.

const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export interface MarkdownImage {
  alt: string;
  src: string;
  title: string;
}

/** Imágenes en Markdown fuera de bloques de código */
export function imagesIn(body: string): MarkdownImage[] {
  const prose = body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]+`/g, " ");
  return [...prose.matchAll(IMAGE)].map((m) => ({ alt: m[1].trim(), src: m[2], title: (m[3] ?? "").trim() }));
}

/** Pone el alt como título a las imágenes que lo traen sin título. Las que no tienen alt no se tocan. */
export function ensureImageTitles(body: string): string {
  return body
    .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(IMAGE, (m, alt: string, src: string, title?: string) =>
            alt.trim() && !(title ?? "").trim() ? `![${alt}](${src} "${alt.trim().replace(/"/g, "”")}")` : m
          )
    )
    .join("");
}

/** Problemas de imágenes, para el informe SEO: sin alt o sin título */
export function imageProblems(body: string): { missingAlt: number; missingTitle: number } {
  const imgs = imagesIn(body);
  return { missingAlt: imgs.filter((i) => !i.alt).length, missingTitle: imgs.filter((i) => !i.title).length };
}
