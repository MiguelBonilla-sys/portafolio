// PNG con next/og (Satori + resvg), el mismo motor de las imágenes OG del sitio y del carrusel:
// funciona en las funciones de Vercel sin navegador. Se usa createElement en vez de JSX para que
// los tests de node:test puedan importarlo sin compilar.

import { ImageResponse } from "next/og.js";
import { createElement as h, type ReactElement } from "react";
import { loadDisplayFont } from "../../lib/og-font.ts";
import type { Category } from "../../lib/taxonomy.ts";
import { PALETTE as C, PRESETS, VisualFitError, fitText, seedOf, validateSpec, type CoverSpec, type FlowSpec, type Preset, type VisualSpec } from "./scene.ts";

type Fonts = { name: string; data: ArrayBuffer; weight: 900; style: "normal" }[] | undefined;

function motif(category: Category, seed: number, size: number): ReactElement {
  const s = (n: number) => ((seed >> n) & 0xff) / 255;
  const stroke = { fill: "none", stroke: C.blue, strokeWidth: 6 };
  const accent = { fill: "none", stroke: C.accent, strokeWidth: 6 };
  const shapes: ReactElement[] = [];
  switch (category) {
    case "software":
      for (let i = 0; i < 16; i++) {
        const [cx, cy] = [(i % 4) * 70 + 20, Math.floor(i / 4) * 70 + 20];
        shapes.push(h("rect", { key: i, x: cx, y: cy, width: 50, height: 50, ...(s(i % 24) > 0.6 ? { fill: C.blue } : stroke) }));
      }
      break;
    case "backend":
      for (let i = 0; i < 4; i++) shapes.push(h("rect", { key: i, x: 30 + i * 6, y: 30 + i * 62, width: 240 - i * 12, height: 44, ...(i === Math.floor(s(3) * 4) ? accent : stroke) }));
      break;
    case "frontend":
      for (let i = 0; i < 4; i++) shapes.push(h("rect", { key: i, x: 20 + i * 28, y: 20 + i * 28, width: 260 - i * 56, height: 260 - i * 56, ...(i === 3 ? accent : stroke) }));
      break;
    case "security":
      shapes.push(h("path", { key: "s", d: "M150 20 L260 60 L260 150 C260 220 210 262 150 285 C90 262 40 220 40 150 L40 60 Z", ...stroke }));
      shapes.push(h("circle", { key: "k", cx: 150, cy: 135, r: 26, ...accent }));
      shapes.push(h("path", { key: "l", d: "M150 161 L150 215", ...accent }));
      break;
    case "ai": {
      const pts = Array.from({ length: 7 }, (_, i) => [40 + s(i * 3) * 220, 40 + s(i * 3 + 1) * 220] as const);
      pts.forEach(([ax, ay], i) => pts.slice(i + 1, i + 3).forEach(([bx, by], j) => shapes.push(h("line", { key: `${i}-${j}`, x1: ax, y1: ay, x2: bx, y2: by, stroke: C.hair, strokeWidth: 4 }))));
      pts.forEach(([cx, cy], i) => shapes.push(h("circle", { key: `n${i}`, cx, cy, r: 16, ...(i === 0 ? accent : stroke) })));
      break;
    }
    case "automation":
      [[70, 80], [230, 80], [150, 220]].forEach(([cx, cy], i) => shapes.push(h("circle", { key: i, cx, cy, r: 40, ...(i === 0 ? accent : stroke) })));
      shapes.push(h("path", { key: "a", d: "M115 80 L180 80 M215 120 L175 180 M110 200 L80 125", ...stroke }));
      break;
  }
  return h("svg", { width: size, height: size, viewBox: "0 0 300 300" }, ...shapes);
}

function coverTree(spec: CoverSpec, preset: Preset, displayFont: boolean): ReactElement {
  const { width, height } = PRESETS[preset];
  const pad = Math.round(width * 0.06);
  const tall = height > width;
  const motifSize = Math.round(Math.min(width, height) * (tall ? 0.42 : 0.38));
  const titleWidth = tall ? width - pad * 2 : width - pad * 2 - motifSize - 40;
  const title = fitText(spec.title.toUpperCase(), { width: titleWidth, maxLines: tall ? 5 : 4, max: tall ? 104 : 84, min: 44 }, displayFont ? "display" : "sans");
  const kicker = fitText(spec.kicker.toUpperCase(), { width: width - pad * 2, maxLines: 1, max: 28, min: 18 }, "sans");

  return h(
    "div",
    { style: { width, height, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: pad, background: C.ground, border: `12px solid ${C.ink}`, fontFamily: displayFont ? "Display" : undefined } },
    h("div", { style: { display: "flex" } }, h("div", { style: { background: C.accent, color: C.ground, fontSize: kicker.fontSize, fontWeight: 900, padding: "6px 16px" } }, kicker.lines[0])),
    h(
      "div",
      { style: { display: "flex", flexDirection: tall ? "column" : "row", alignItems: tall ? "flex-start" : "center", justifyContent: "space-between", gap: 40 } },
      h("div", { style: { display: "flex", flexDirection: "column", color: C.ink, fontSize: title.fontSize, lineHeight: 0.95, fontWeight: 900 } }, ...title.lines.map((l, i) => h("div", { key: i }, l))),
      motif(spec.category, seedOf(spec.title), motifSize)
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 20, color: C.ink2, fontSize: 26 } },
      h("div", { style: { width: 90, height: 12, background: C.blue } }),
      h("span", null, "MIGUEL BONILLA · MANGEL14.DEV")
    )
  );
}

function flowTree(spec: FlowSpec, preset: Preset): ReactElement {
  const { width, height } = PRESETS[preset];
  const pad = Math.round(width * 0.06);
  const title = fitText(spec.title, { width: width - pad * 2, maxLines: 2, max: 52, min: 30 }, "sans");
  const available = height - pad * 2 - title.fontSize * title.lines.length - 60 - 40;
  const rowH = available / spec.steps.length;
  const stepSize = Math.min(30, Math.floor(rowH / 2.6));
  if (stepSize < 18) throw new VisualFitError(`${spec.steps.length} pasos no caben legibles en ${preset}`);
  const steps = spec.steps.map((st) => fitText(st, { width: width - pad * 2 - 110, maxLines: 2, max: stepSize, min: 18 }, "sans"));

  return h(
    "div",
    { style: { width, height, display: "flex", flexDirection: "column", padding: pad, background: C.ground, border: `12px solid ${C.ink}`, gap: 28 } },
    h("div", { style: { display: "flex", flexDirection: "column", color: C.ink, fontSize: title.fontSize, fontWeight: 700, lineHeight: 1.1 } }, ...title.lines.map((l, i) => h("div", { key: i }, l))),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 12, flexGrow: 1 } },
      ...steps.map((st, i) =>
        h(
          "div",
          { key: i, style: { display: "flex", alignItems: "center", gap: 24 } },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 48, border: `4px solid ${C.blue}`, color: C.ink, fontSize: 24, fontWeight: 700 } }, String(i + 1).padStart(2, "0")),
          h("div", { style: { display: "flex", flexDirection: "column", color: C.ink, fontSize: st.fontSize, lineHeight: 1.2 } }, ...st.lines.map((l, j) => h("div", { key: j }, l)))
        )
      )
    ),
    h("div", { style: { display: "flex", color: C.ink2, fontSize: 22 } }, "MIGUEL BONILLA · MANGEL14.DEV")
  );
}

/**
 * PNG de una escena en un formato (og 1200×630, linkedin 1200×627, square 1080×1080, vertical 1080×1350).
 * Lanza VisualFitError si el texto no cabe: el agente avisa en lugar de publicar una imagen cortada.
 */
export async function renderPng(spec: VisualSpec, preset: Preset): Promise<Uint8Array> {
  const problems = validateSpec(spec);
  if (problems.length) throw new VisualFitError(problems.join("; "));
  const font = spec.kind === "cover" ? await loadDisplayFont() : null;
  const fonts: Fonts = font ? [{ name: "Display", data: font, weight: 900, style: "normal" }] : undefined;
  let tree: ReactElement;
  if (spec.kind === "cover") tree = coverTree(spec, preset, Boolean(font));
  else if (spec.kind === "flow") tree = flowTree(spec, preset);
  else throw new VisualFitError(`el tipo ${spec.kind} se publica como SVG en el artículo; no tiene versión PNG`);
  const { width, height } = PRESETS[preset];
  return new Uint8Array(await new ImageResponse(tree, { width, height, fonts }).arrayBuffer());
}

/** Lee ancho y alto de un PNG (cabecera IHDR), para validar el resultado */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
