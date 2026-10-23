// Diagramas en SVG para el cuerpo del artículo: vectoriales, livianos, con <title> y <desc>
// para lectores de pantalla y texto real (seleccionable e indexable).

import { PALETTE as C, altText, fitText, validateSpec, VisualFitError, wrapText, type VisualSpec } from "./scene.ts";

const SANS = "'Atkinson Hyperlegible Next', 'Segoe UI', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";
const W = 800;
const PAD = 32;

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function frame(spec: VisualSpec, height: number, body: string, locale: "es" | "en"): string {
  const id = `v-${spec.name}`;
  const title = fitText(spec.title, { width: W - PAD * 2, maxLines: 2, max: 26, min: 18 }, "sans");
  const titleSvg = title.lines
    .map((l, i) => `<text x="${PAD}" y="${PAD + title.fontSize * (i + 1)}" font-family="${SANS}" font-size="${title.fontSize}" font-weight="700" fill="${C.ink}">${x(l)}</text>`)
    .join("");
  const top = PAD + title.fontSize * title.lines.length + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height + top}" width="${W}" height="${height + top}" role="img" aria-labelledby="${id}-t ${id}-d">
<title id="${id}-t">${x(spec.title)}</title>
<desc id="${id}-d">${x(altText(spec, locale))}</desc>
<rect width="100%" height="100%" fill="${C.ground}"/>
<rect x="1" y="1" width="${W - 2}" height="${height + top - 2}" fill="none" stroke="${C.ink}" stroke-width="2"/>
${titleSvg}
<g transform="translate(0 ${top})">${body}</g>
</svg>
`;
}

function flow(spec: Extract<VisualSpec, { kind: "flow" }>): { body: string; height: number } {
  const textX = PAD + 64;
  const width = W - textX - PAD;
  let y = 0;
  const parts: string[] = [];
  spec.steps.forEach((step, i) => {
    const lines = wrapText(step, width, 17, "sans");
    const h = Math.max(36, lines.length * 24 + 12);
    parts.push(`<rect x="${PAD}" y="${y}" width="48" height="32" fill="none" stroke="${C.blue}" stroke-width="2"/>`);
    parts.push(`<text x="${PAD + 24}" y="${y + 21}" text-anchor="middle" font-family="${MONO}" font-size="14" font-weight="700" fill="${C.ink}">${String(i + 1).padStart(2, "0")}</text>`);
    lines.forEach((l, j) => parts.push(`<text x="${textX}" y="${y + 22 + j * 24}" font-family="${SANS}" font-size="17" fill="${C.ink}">${x(l)}</text>`));
    if (i < spec.steps.length - 1) parts.push(`<line x1="${PAD + 24}" y1="${y + 32}" x2="${PAD + 24}" y2="${y + h + 16}" stroke="${C.blue}" stroke-width="2"/>`);
    y += h + 16;
  });
  return { body: parts.join("\n"), height: y + PAD - 16 };
}

function sequence(spec: Extract<VisualSpec, { kind: "sequence" }>): { body: string; height: number } {
  const col = (W - PAD * 2) / spec.actors.length;
  const cx = (a: string) => PAD + col * spec.actors.indexOf(a) + col / 2;
  const parts: string[] = [];
  spec.actors.forEach((a) => {
    const label = fitText(a, { width: col - 16, maxLines: 2, max: 15, min: 12 }, "sans");
    parts.push(`<rect x="${cx(a) - col / 2 + 8}" y="0" width="${col - 16}" height="44" fill="${C.surface}" stroke="${C.ink}" stroke-width="2"/>`);
    label.lines.forEach((l, j) =>
      parts.push(`<text x="${cx(a)}" y="${(44 - label.lines.length * 17) / 2 + 14 + j * 17}" text-anchor="middle" font-family="${SANS}" font-size="${label.fontSize}" font-weight="700" fill="${C.ink}">${x(l)}</text>`)
    );
  });
  let y = 76;
  for (const m of spec.messages) {
    const [x1, x2] = [cx(m.from), cx(m.to)];
    const span = Math.max(Math.abs(x2 - x1) - 16, col - 16);
    const label = fitText(m.label, { width: span, maxLines: 2, max: 14, min: 12 }, "sans");
    label.lines.forEach((l, j) =>
      parts.push(`<text x="${(x1 + x2) / 2}" y="${y + j * 16}" text-anchor="middle" font-family="${SANS}" font-size="${label.fontSize}" fill="${C.ink2}">${x(l)}</text>`)
    );
    const ay = y + label.lines.length * 16;
    const dir = x2 >= x1 ? 1 : -1;
    if (x1 === x2) {
      parts.push(`<path d="M${x1} ${ay} h28 v14 h-24" fill="none" stroke="${C.accent}" stroke-width="2"/>`);
    } else {
      parts.push(`<line x1="${x1}" y1="${ay}" x2="${x2 - dir * 8}" y2="${ay}" stroke="${C.accent}" stroke-width="2"/>`);
      parts.push(`<path d="M${x2} ${ay} l${-dir * 10} -6 v12 z" fill="${C.accent}"/>`);
    }
    y = ay + 34;
  }
  const lifelines = spec.actors.map((a) => `<line x1="${cx(a)}" y1="44" x2="${cx(a)}" y2="${y - 10}" stroke="${C.hair}" stroke-width="2" stroke-dasharray="4 6"/>`);
  return { body: [...lifelines, ...parts].join("\n"), height: y + PAD - 20 };
}

function comparison(spec: Extract<VisualSpec, { kind: "comparison" }>): { body: string; height: number } {
  const first = 200;
  const col = (W - PAD * 2 - first) / spec.columns.length;
  const parts: string[] = [];
  const cell = (text: string, width: number, bold = false, color: string = C.ink) => wrapText(text, width - 20, 15, "sans").map((l) => ({ l, bold, color }));
  const rows = [
    { cells: [cell("", first), ...spec.columns.map((c) => cell(c, col, true, C.accent))] },
    ...spec.rows.map((r) => ({ cells: [cell(r.criterion, first, true), ...r.values.map((v) => cell(v, col))] })),
  ];
  let y = 0;
  rows.forEach((row, i) => {
    const h = Math.max(...row.cells.map((c) => c.length)) * 20 + 20;
    row.cells.forEach((lines, j) => {
      const cx = j === 0 ? PAD : PAD + first + col * (j - 1);
      lines.forEach((ln, k) =>
        parts.push(`<text x="${cx + 10}" y="${y + 24 + k * 20}" font-family="${SANS}" font-size="15" ${ln.bold ? 'font-weight="700"' : ""} fill="${ln.color}">${x(ln.l)}</text>`)
      );
    });
    parts.push(`<line x1="${PAD}" y1="${y + h}" x2="${W - PAD}" y2="${y + h}" stroke="${i === 0 ? C.ink : C.hair}" stroke-width="${i === 0 ? 2 : 1}"/>`);
    y += h;
  });
  return { body: parts.join("\n"), height: y + PAD };
}

function bars(spec: Extract<VisualSpec, { kind: "bars" }>): { body: string; height: number } {
  const labelW = 220;
  const maxW = W - PAD * 2 - labelW - 90;
  const max = Math.max(...spec.bars.map((b) => b.value)) || 1;
  const parts: string[] = [];
  spec.bars.forEach((b, i) => {
    const y = i * 44;
    const label = fitText(b.label, { width: labelW - 12, maxLines: 1, max: 15, min: 12 }, "sans");
    parts.push(`<text x="${PAD}" y="${y + 22}" font-family="${SANS}" font-size="${label.fontSize}" fill="${C.ink}">${x(label.lines[0])}</text>`);
    const w = Math.max(2, (b.value / max) * maxW);
    parts.push(`<rect x="${PAD + labelW}" y="${y + 6}" width="${w}" height="24" fill="${C.blue}"/>`);
    parts.push(`<text x="${PAD + labelW + w + 8}" y="${y + 23}" font-family="${MONO}" font-size="14" fill="${C.ink}">${x(`${b.value} ${spec.unit}`.trim())}</text>`);
  });
  const y = spec.bars.length * 44 + 16;
  parts.push(`<text x="${PAD}" y="${y}" font-family="${SANS}" font-size="13" fill="${C.ink2}">${x(`Fuente / Source: ${spec.source}`)}</text>`);
  return { body: parts.join("\n"), height: y + PAD };
}

function code(spec: Extract<VisualSpec, { kind: "code" }>): { body: string; height: number } {
  const lines = spec.code.split("\n");
  const parts = [`<rect x="${PAD}" y="0" width="${W - PAD * 2}" height="${lines.length * 22 + 28}" fill="${C.surface}" stroke="${C.hair}"/>`];
  parts.push(`<text x="${W - PAD - 12}" y="18" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.ink2}">${x(spec.language)}</text>`);
  lines.forEach((l, i) =>
    parts.push(`<text x="${PAD + 16}" y="${30 + i * 22}" font-family="${MONO}" font-size="14" fill="${C.ink}" xml:space="preserve">${x(l)}</text>`)
  );
  return { body: parts.join("\n"), height: lines.length * 22 + 28 + PAD };
}

/** SVG del diagrama, o error con el motivo si no cumple las reglas de contenido o de espacio */
export function renderSvg(spec: VisualSpec, locale: "es" | "en" = "es"): string {
  const problems = validateSpec(spec);
  if (problems.length) throw new VisualFitError(problems.join("; "));
  switch (spec.kind) {
    case "flow": {
      const r = flow(spec);
      return frame(spec, r.height, r.body, locale);
    }
    case "sequence": {
      const r = sequence(spec);
      return frame(spec, r.height, r.body, locale);
    }
    case "comparison": {
      const r = comparison(spec);
      return frame(spec, r.height, r.body, locale);
    }
    case "bars": {
      const r = bars(spec);
      return frame(spec, r.height, r.body, locale);
    }
    case "code": {
      const r = code(spec);
      return frame(spec, r.height, r.body, locale);
    }
    case "cover":
      throw new VisualFitError("la portada se genera como PNG (renderPng), no como SVG del cuerpo");
  }
}
