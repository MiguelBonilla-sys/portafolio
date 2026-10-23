// Contrato de datos para videos explicativos futuros con Hyperframes (https://hyperframes.app).
// En esta fase NO se renderiza video ni la publicación depende de esto: se define el storyboard
// derivado de un artículo y se genera una composición HTML que Hyperframes podría renderizar localmente.
// Ver docs/phase-2/HYPERFRAMES.md.

import { z } from "zod";
import { PALETTE as C, type VisualSpec } from "../visuals/scene.ts";

const visualSpecSchema = z.custom<VisualSpec>((v) => typeof v === "object" && v !== null && "kind" in v && "title" in v);

/** Una escena anima algo real del artículo: un flujo, código, datos con fuente o una afirmación citada */
export const sceneSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("title"), id: z.string(), duration: z.number().min(2).max(8), title: z.string(), subtitle: z.string() }),
  z.object({
    kind: z.literal("visual"),
    id: z.string(),
    duration: z.number().min(3).max(30),
    /** Reutiliza la misma escena del motor visual: el video y el artículo muestran lo mismo */
    visual: visualSpecSchema,
  }),
  z.object({
    kind: z.literal("claim"),
    id: z.string(),
    duration: z.number().min(3).max(10),
    text: z.string().max(220),
    /** ids de fuente (S1…) o "artículo": nada sin trazabilidad */
    source: z.string().min(1),
  }),
  z.object({ kind: z.literal("outro"), id: z.string(), duration: z.number().min(2).max(6), url: z.url() }),
]);
export type Scene = z.infer<typeof sceneSchema>;

export const storyboardSchema = z.object({
  version: z.literal(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  locale: z.enum(["es", "en"]),
  title: z.string(),
  fps: z.union([z.literal(24), z.literal(30)]),
  format: z.enum(["landscape", "vertical", "square"]),
  scenes: z.array(sceneSchema).min(3).max(12),
  /** Subtítulos: el video se entiende sin audio; la narración con voz queda fuera de esta fase */
  captions: z.array(z.object({ sceneId: z.string(), text: z.string() })),
});
export type Storyboard = z.infer<typeof storyboardSchema>;

export const FORMATS = {
  landscape: { width: 1920, height: 1080 },
  vertical: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
} as const;

interface ArticleInput {
  slug: string;
  locale: "es" | "en";
  title: string;
  summary: string;
  body: string;
  url: string;
  visuals: VisualSpec[];
}

/** Duración de lectura: ~2.5 palabras por segundo, con mínimo y máximo por escena */
const readTime = (text: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(text.split(/\s+/).length / 2.5)));

/**
 * Storyboard determinista desde un artículo: título, un visual por diagrama, la primera frase de
 * hasta tres secciones como afirmaciones citadas del propio artículo, y cierre con la URL.
 */
export function storyboardFromArticle(a: ArticleInput, format: Storyboard["format"] = "landscape"): Storyboard {
  const scenes: Scene[] = [{ kind: "title", id: "titulo", duration: 4, title: a.title, subtitle: a.summary.split(/(?<=\.)\s/)[0] ?? "" }];
  for (const v of a.visuals.filter((x) => x.kind !== "cover")) {
    const items = v.kind === "flow" ? v.steps.length : v.kind === "sequence" ? v.messages.length : v.kind === "bars" ? v.bars.length : v.kind === "comparison" ? v.rows.length : v.kind === "code" ? v.code.split("\n").length : 1;
    scenes.push({ kind: "visual", id: v.name, duration: Math.min(30, 3 + items * 2), visual: v });
  }
  const sections = [...a.body.matchAll(/^##\s+.+\n+([^\n#][^\n]*)/gm)].map((m) => m[1].split(/(?<=\.)\s/)[0]).filter((t) => t.length > 20 && t.length <= 220);
  sections.slice(0, 3).forEach((text, i) => scenes.push({ kind: "claim", id: `seccion-${i + 1}`, duration: readTime(text, 3, 10), text, source: "artículo" }));
  scenes.push({ kind: "outro", id: "cierre", duration: 3, url: a.url });
  const captions = scenes.map((s) => ({
    sceneId: s.id,
    text: s.kind === "title" ? s.title : s.kind === "claim" ? s.text : s.kind === "outro" ? s.url : s.visual.title,
  }));
  return storyboardSchema.parse({ version: 1, slug: a.slug, locale: a.locale, title: a.title, fps: 30, format, scenes, captions });
}

export const totalDuration = (s: Storyboard) => s.scenes.reduce((n, sc) => n + sc.duration, 0);

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Composición HTML para Hyperframes: cada escena es un clip con data-start/data-duration y las
 * animaciones viven en un timeline GSAP pausado registrado en window.__timelines (como exige su runtime).
 * Los pasos de un flujo aparecen en orden y la pista que los une se dibuja: animación de un proceso real.
 */
export function compositionHtml(s: Storyboard): string {
  const { width, height } = FORMATS[s.format];
  let t = 0;
  const clips: string[] = [];
  const tweens: string[] = [];
  for (const sc of s.scenes) {
    const start = t;
    const attrs = `id="${sc.id}" class="clip scene" data-start="${start}" data-duration="${sc.duration}" data-track-index="1"`;
    if (sc.kind === "title") {
      clips.push(`<section ${attrs}><h1>${esc(sc.title)}</h1><p>${esc(sc.subtitle)}</p></section>`);
      tweens.push(`tl.from("#${sc.id} h1", { opacity: 0, y: 40, duration: 0.6 }, ${start});`);
    } else if (sc.kind === "visual" && sc.visual.kind === "flow") {
      const steps = sc.visual.steps.map((step, i) => `<li class="step"><span class="n">${String(i + 1).padStart(2, "0")}</span>${esc(step)}</li>`).join("");
      clips.push(`<section ${attrs}><h2>${esc(sc.visual.title)}</h2><ol>${steps}</ol></section>`);
      const per = (sc.duration - 1) / sc.visual.steps.length;
      sc.visual.steps.forEach((_, i) => tweens.push(`tl.from("#${sc.id} .step:nth-child(${i + 1})", { opacity: 0, x: -30, duration: 0.4 }, ${(start + 0.5 + i * per).toFixed(2)});`));
    } else if (sc.kind === "visual") {
      clips.push(`<section ${attrs}><h2>${esc(sc.visual.title)}</h2><img src="${esc(sc.visual.name)}.svg" alt=""></section>`);
      tweens.push(`tl.from("#${sc.id} img", { opacity: 0, scale: 0.96, duration: 0.6 }, ${start + 0.3});`);
    } else if (sc.kind === "claim") {
      clips.push(`<section ${attrs}><blockquote>${esc(sc.text)}</blockquote><cite>${esc(sc.source)}</cite></section>`);
      tweens.push(`tl.from("#${sc.id} blockquote", { opacity: 0, duration: 0.5 }, ${start + 0.2});`);
    } else {
      clips.push(`<section ${attrs}><p class="url">${esc(sc.url)}</p></section>`);
    }
    t += sc.duration;
  }
  return `<!doctype html>
<html lang="${s.locale}">
<head>
<meta charset="utf-8">
<title>${esc(s.title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  #root { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; background: ${C.ground}; color: ${C.ink}; font-family: "Atkinson Hyperlegible Next", system-ui, sans-serif; }
  .scene { position: absolute; inset: 0; padding: 96px; display: flex; flex-direction: column; justify-content: center; gap: 32px; }
  h1, h2 { font-family: "Big Shoulders", sans-serif; text-transform: uppercase; line-height: 0.95; }
  h1 { font-size: 120px; } h2 { font-size: 72px; color: ${C.blue}; }
  ol { list-style: none; display: grid; gap: 24px; font-size: 40px; }
  .n { display: inline-block; width: 96px; margin-right: 24px; border: 4px solid ${C.blue}; text-align: center; font-family: monospace; }
  blockquote { font-size: 56px; max-width: 1400px; } cite { color: ${C.ink2}; font-size: 28px; }
  .url { font-size: 48px; color: ${C.accent}; }
</style>
</head>
<body>
<div id="root" data-composition-id="root" data-start="0" data-width="${width}" data-height="${height}">
${clips.join("\n")}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script>
  const tl = gsap.timeline({ paused: true });
  ${tweens.join("\n  ")}
  tl.set({}, {}, ${t});
  window.__timelines = window.__timelines || {};
  window.__timelines["root"] = tl;
</script>
</body>
</html>
`;
}
