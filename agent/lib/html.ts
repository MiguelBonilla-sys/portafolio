// Texto legible de una página HTML, sin ejecutar nada: se descartan scripts, estilos, formularios
// y elementos embebidos; se conservan título, descripción, encabezados, párrafos, listas y código.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

const attr = (html: string, re: RegExp) => {
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
};

export interface PageText {
  title: string;
  description: string;
  canonical: string;
  text: string;
}

export function htmlToText(html: string, maxChars = 40_000): PageText {
  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description =
    attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    attr(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);

  // El contenido principal si existe; si no, el body
  const scope = html.match(/<(main|article)\b[\s\S]*?<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
  const text = scope
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|iframe|object|embed|svg|canvas|form|nav|footer|header|aside)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(script|style|iframe|object|embed|input|button|select)\b[^>]*\/?>/gi, " ")
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, code: string) => `\n\`\`\`\n${code.replace(/<[^>]+>/g, "")}\n\`\`\`\n`)
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, t: string) => `\n${"#".repeat(Number(level))} ${t}\n`)
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<(p|div|section|br|tr|table|ul|ol|blockquote)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const clean = decodeEntities(text)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter((l, i, a) => l || a[i - 1])
    .join("\n")
    .trim();

  return { title, description, canonical, text: clean.slice(0, maxChars) };
}
