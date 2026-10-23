// Motor visual del Content Engine: escenas descritas como datos y validadas antes de dibujarse.
// Paleta y tipografías de DESIGN.md (tema oscuro, que es la identidad por defecto).

import type { Category } from "../../lib/taxonomy.ts";

export const PALETTE = {
  ground: "#0A0B10",
  surface: "#12141C",
  ink: "#EDEFF5",
  ink2: "#9AA3B5",
  hair: "#2A2E3A",
  blue: "#3D7BFF",
  accent: "#2EE6FF",
} as const;

export const PRESETS = {
  og: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  square: { width: 1080, height: 1080 },
  vertical: { width: 1080, height: 1350 },
} as const;
export type Preset = keyof typeof PRESETS;

export type VisualKind = "cover" | "flow" | "sequence" | "comparison" | "bars" | "code";

interface Base {
  /** slug del recurso: flujo, comparacion… */
  name: string;
  kind: VisualKind;
  title: string;
}

export interface CoverSpec extends Base {
  kind: "cover";
  category: Category;
  kicker: string;
}
export interface FlowSpec extends Base {
  kind: "flow";
  steps: string[];
}
export interface SequenceSpec extends Base {
  kind: "sequence";
  actors: string[];
  messages: { from: string; to: string; label: string }[];
}
export interface ComparisonSpec extends Base {
  kind: "comparison";
  columns: string[];
  rows: { criterion: string; values: string[] }[];
}
export interface BarsSpec extends Base {
  kind: "bars";
  unit: string;
  /** Solo cifras con fuente: el grafo no dibuja números que no estén en el material */
  bars: { label: string; value: number }[];
  source: string;
}
export interface CodeSpec extends Base {
  kind: "code";
  language: string;
  code: string;
}

export type VisualSpec = CoverSpec | FlowSpec | SequenceSpec | ComparisonSpec | BarsSpec | CodeSpec;

export class VisualFitError extends Error {}

// ── Texto ──

/**
 * Ancho aproximado de un texto en px. Conservador a propósito (sobreestima), para que el
 * ajuste falle antes de que el renderizador real recorte una palabra.
 */
export function textWidth(text: string, fontSize: number, family: "sans" | "display" | "mono" = "sans"): number {
  const factor = family === "mono" ? 0.62 : family === "display" ? 0.5 : 0.58;
  let units = 0;
  for (const ch of text) units += /[A-ZÁÉÍÓÚÑMW@#%&]/.test(ch) ? 1.2 : /[il.,:;'|!]/.test(ch) ? 0.5 : ch === " " ? 0.55 : 1;
  return units * fontSize * factor;
}

/** Parte un texto en líneas que caben en maxWidth; una palabra que no cabe sola es un error */
export function wrapText(text: string, maxWidth: number, fontSize: number, family: "sans" | "display" | "mono" = "sans"): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (textWidth(word, fontSize, family) > maxWidth) throw new VisualFitError(`la palabra «${word}» no cabe en ${Math.round(maxWidth)} px`);
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, fontSize, family) <= maxWidth) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Busca el tamaño más grande (entre max y min) con el que el texto cabe en maxLines.
 * Si ni con el mínimo cabe, lanza VisualFitError: nunca se publica texto cortado.
 */
export function fitText(
  text: string,
  box: { width: number; maxLines: number; max: number; min: number },
  family: "sans" | "display" | "mono" = "sans"
): { fontSize: number; lines: string[] } {
  for (let size = box.max; size >= box.min; size -= 2) {
    try {
      const lines = wrapText(text, box.width, size, family);
      if (lines.length <= box.maxLines) return { fontSize: size, lines };
    } catch (e) {
      if (!(e instanceof VisualFitError)) throw e;
    }
  }
  throw new VisualFitError(`«${text.slice(0, 60)}» no cabe en ${box.maxLines} líneas ni con ${box.min} px`);
}

// ── Contraste (WCAG 2.2) ──

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Pares de texto/fondo que usan los renderizadores; el test exige ≥ 4.5 en todos */
export const TEXT_PAIRS: [string, string][] = [
  [PALETTE.ink, PALETTE.ground],
  [PALETTE.ink2, PALETTE.ground],
  [PALETTE.ink, PALETTE.surface],
  [PALETTE.ink2, PALETTE.surface],
  [PALETTE.accent, PALETTE.ground],
  [PALETTE.blue, PALETTE.ground],
  [PALETTE.ground, PALETTE.accent],
];

// ── Validación y texto alternativo ──

const MAX = { steps: 8, actors: 5, messages: 10, columns: 4, rows: 8, bars: 10, codeLines: 24, codeCols: 72 };

/** Reglas de contenido: un diagrama que no cabe o que no explica nada no se genera */
export function validateSpec(spec: VisualSpec): string[] {
  const problems: string[] = [];
  if (!spec.title.trim()) problems.push("falta el título");
  switch (spec.kind) {
    case "flow":
      if (spec.steps.length < 3) problems.push("un flujo de menos de 3 pasos no necesita diagrama");
      if (spec.steps.length > MAX.steps) problems.push(`más de ${MAX.steps} pasos: divídelo`);
      break;
    case "sequence":
      if (spec.actors.length < 2 || spec.actors.length > MAX.actors) problems.push(`entre 2 y ${MAX.actors} participantes`);
      if (spec.messages.length < 2 || spec.messages.length > MAX.messages) problems.push(`entre 2 y ${MAX.messages} mensajes`);
      for (const m of spec.messages) if (!spec.actors.includes(m.from) || !spec.actors.includes(m.to)) problems.push(`mensaje con participante desconocido: ${m.from} → ${m.to}`);
      break;
    case "comparison":
      if (spec.columns.length < 2 || spec.columns.length > MAX.columns) problems.push(`entre 2 y ${MAX.columns} opciones`);
      if (spec.rows.length < 2 || spec.rows.length > MAX.rows) problems.push(`entre 2 y ${MAX.rows} criterios`);
      for (const r of spec.rows) if (r.values.length !== spec.columns.length) problems.push(`el criterio «${r.criterion}» no tiene un valor por opción`);
      break;
    case "bars":
      if (spec.bars.length < 2 || spec.bars.length > MAX.bars) problems.push(`entre 2 y ${MAX.bars} barras`);
      if (!spec.source.trim()) problems.push("un gráfico de datos necesita su fuente");
      if (spec.bars.some((b) => !Number.isFinite(b.value) || b.value < 0)) problems.push("valores no numéricos o negativos");
      break;
    case "code": {
      const lines = spec.code.split("\n");
      if (lines.length > MAX.codeLines) problems.push(`más de ${MAX.codeLines} líneas de código`);
      if (lines.some((l) => l.length > MAX.codeCols)) problems.push(`líneas de más de ${MAX.codeCols} caracteres`);
      break;
    }
    case "cover":
      break;
  }
  return problems;
}

export function altText(spec: VisualSpec, locale: "es" | "en" = "es"): string {
  const es = locale === "es";
  switch (spec.kind) {
    case "cover":
      return es ? `Portada del artículo «${spec.title}», categoría ${spec.kicker}.` : `Cover for the article “${spec.title}”, category ${spec.kicker}.`;
    case "flow":
      return `${es ? "Diagrama de flujo" : "Flow diagram"} «${spec.title}»: ${spec.steps.map((s, i) => `${i + 1}) ${s}`).join("; ")}.`;
    case "sequence":
      return `${es ? "Diagrama de secuencia" : "Sequence diagram"} «${spec.title}» ${es ? "entre" : "between"} ${spec.actors.join(", ")}: ${spec.messages.map((m) => `${m.from} → ${m.to}: ${m.label}`).join("; ")}.`;
    case "comparison":
      return `${es ? "Tabla comparativa" : "Comparison table"} «${spec.title}» ${es ? "de" : "of"} ${spec.columns.join(", ")} ${es ? "según" : "by"} ${spec.rows.map((r) => r.criterion).join(", ")}.`;
    case "bars":
      return `${es ? "Gráfico de barras" : "Bar chart"} «${spec.title}»: ${spec.bars.map((b) => `${b.label} ${b.value} ${spec.unit}`).join("; ")}. ${es ? "Fuente" : "Source"}: ${spec.source}.`;
    case "code":
      return `${es ? "Fragmento de código" : "Code snippet"} ${spec.language} «${spec.title}».`;
  }
}

/** Variación determinista por título: dos portadas de la misma categoría no quedan idénticas */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}
