// Linter determinista anti-slop. Fuente de las reglas: docs/content-style-guide.md §3, §4 y §9.
// Si cambias un patrón aquí, actualiza la guía (y al revés).

export type Severity = "p0" | "p1" | "p2";
export type TextKind = "linkedin" | "blog";

export interface LintFinding {
  severity: Severity;
  rule: string;
  match: string;
}

export interface LintReport {
  p0: LintFinding[];
  p1: LintFinding[];
  p2: LintFinding[];
  /** P0 o P1 presentes, o marcadores [DATO?]: no se puede aprobar */
  blocked: boolean;
}

const P0: [string, RegExp][] = [
  ["chatbot", /espero que (te|les) sirva|excelente pregunta|como modelo de lenguaje|i hope this helps|great question|as an ai\b/i],
  ["atribución vaga", /los expertos (coinciden|creen|afirman)|estudios (demuestran|muestran)|experts (agree|believe)|studies show/i],
  ["inflación", /sin precedentes|esto lo cambia todo|un antes y un después|game[- ]changer|revolutionary/i],
  ["dato pendiente", /\[DATO\?/],
];

const P1: [string, RegExp][] = [
  ["vocabulario inflado (es)", /\bpotenci(ar|ó|é|a|ando)\b|\bsinergia|\brobust[oa]s?\b|\bdisruptiv|\brevolucion(ar|ó|ando)\b|\bdesbloque|\bsumerg|\bholístic|\bde vanguardia\b/i],
  ["apertura de plantilla (es)", /en el mundo actual|en la era digital|en constante evolución|hoy quiero hablar(les|te)? de/i],
  ["paralelismo negativo (es)", /no es solo .{1,40}, es\b|no se trata de .{1,40}, sino|esto no es .{1,30}\. es\b/i],
  ["conectores de relleno (es)", /cabe destacar|es importante mencionar|en conclusión,|en resumen,/i],
  ["cierre de enganche (es)", /¿y tú qué opinas|te leo en (los )?comentarios|comenta s[ií] si|guarda este post/i],
  ["gancho de infomercial (es)", /nadie te cuenta|el secreto que|te va a volar la cabeza/i],
  ["vocabulario inflado (en)", /\bdelve|\bleverag|\bharness|\bseamless|cutting[- ]edge|\bunlock|\belevate|\bempower|\btapestry|\blandscape\b|\bpivotal|\btestament|\bshowcas|\bsupercharg/i],
  ["apertura de plantilla (en)", /in today's (fast-paced )?world|ever[- ]evolving|let's dive|let's explore/i],
  ["paralelismo negativo (en)", /it's not just .{1,40}, it's|this isn't .{1,30}\. it's/i],
  ["evitar el verbo ser (en)", /\bserves as\b|\bstands as\b|\bboasts\b/i],
  ["cierre de enganche (en)", /what do you think\?|\bthoughts\?|\bagree\?|the future looks bright|this one is worth your time/i],
  ["franqueza narrada", /i'll be honest|in the interest of full disclosure|seamos honestos|real talk|here's the thing/i],
  ["hedging apilado", /could potentially|may eventually|podría potencialmente|tal vez eventualmente/i],
  ["transición repetida", /(^|\n)(moreover|furthermore|additionally|además|asimismo),/i],
  ["marketing vacío", /\binnovador(a|es|as)?\b|\brevolucionari[oa]s?\b|de última generación|\bde clase mundial\b|state[- ]of[- ]the[- ]art|\binnovative\b|world[- ]class|best[- ]in[- ]class|next[- ]gen(eration)?\b/i],
  ["experiencia simulada", /en mi experiencia|lo he visto (cientos de|muchas|mil) veces|como siempre digo|in my experience|i'?ve seen this (a hundred|many|countless) times|as i always say/i],
];

// Usos técnicos correctos de palabras de las listas: se quitan antes de buscar marcas
const TECHNICAL: RegExp[] = [
  /robust[oa]?s? (regression|regresión|estimator|estimador|standard errors|errores estándar|statistics|estadística)/gi,
  /(errores estándar|estimador(es)?|regresi[oó]n|estad[ií]stic[oa]s?) robust[oa]s?/gi,
  /landscape (mode|orientation|orientación)/gi,
  /leverage ratio/gi,
];

// "escalable"/"scalable" solo cuenta como relleno si la frase no trae ninguna cifra que lo respalde
const UNBACKED_SCALE = /[^.!?\n]*\b(escalables?|scalable)\b[^.!?\n]*/gi;

const EMOJI_LINE_START = /^\s*\p{Extended_Pictographic}/gmu;
const EM_DASH = /—/g;
const HASHTAG = /(^|\s)#[\p{L}\d_]+/gu;
const LINK = /https?:\/\/\S+/g;

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Quita bloques de código y código en línea: el código no se juzga como prosa. */
function proseOnly(text: string): string {
  return text.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]+`/g, " ");
}

/** Secciones ## sin contenido antes del siguiente encabezado */
function emptyHeadings(text: string): string[] {
  const out: string[] = [];
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!/^#{2,4}\s+\S/.test(line)) return;
    const rest = lines.slice(i + 1);
    const next = rest.findIndex((l) => /^#{1,4}\s/.test(l));
    const body = (next === -1 ? rest : rest.slice(0, next)).join("").trim();
    if (!body) out.push(line.replace(/^#+\s*/, ""));
  });
  return out;
}

/** Trigramas que se repiten: el mismo concepto dicho varias veces o relleno de palabras clave */
function repeatedPhrase(prose: string): string | null {
  const words = prose.toLowerCase().match(/[\p{L}\d]+/gu) ?? [];
  if (words.length < 200) return null;
  const counts = new Map<string, number>();
  for (let i = 0; i + 2 < words.length; i++) {
    const tri = words.slice(i, i + 3);
    if (tri.some((w) => w.length < 4)) continue;
    const k = tri.join(" ");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const [k, n] of counts) if (n >= 4) return `${k} (×${n})`;
  return null;
}

export function lintText(text: string, kind: TextKind): LintReport {
  const prose = TECHNICAL.reduce((t, re) => t.replace(re, " "), proseOnly(text));
  const report: LintReport = { p0: [], p1: [], p2: [], blocked: false };

  for (const [rule, re] of P0) {
    const m = prose.match(re);
    if (m) report.p0.push({ severity: "p0", rule, match: m[0] });
  }
  for (const [rule, re] of P1) {
    const m = prose.match(re);
    if (m) report.p1.push({ severity: "p1", rule, match: m[0].trim() });
  }

  const unbacked = (prose.match(UNBACKED_SCALE) ?? []).find((sentence) => !/\d/.test(sentence));
  if (unbacked) report.p1.push({ severity: "p1", rule: "«escalable» sin evidencia", match: unbacked.trim().slice(0, 80) });

  if (kind === "blog") {
    const empty = emptyHeadings(text);
    if (empty.length) report.p1.push({ severity: "p1", rule: "encabezado vacío", match: empty[0] });

    if (/^#{2,3}\s*(conclusi[oó]n|conclusion|en resumen|summary|resumen)\s*$/im.test(text)) {
      report.p2.push({ severity: "p2", rule: "sección de conclusión genérica", match: "## Conclusión" });
    }

    // Listas de 5+ viñetas de 1 a 3 palabras: enumeran sin explicar
    const bullets = text.match(/(^[ \t]*[-*] .+\n?){5,}/gm) ?? [];
    const terse = bullets.find((block) => block.trim().split("\n").every((l) => l.replace(/^[ \t]*[-*] /, "").trim().split(/\s+/).length <= 3));
    if (terse) report.p2.push({ severity: "p2", rule: "lista sin explicación", match: terse.trim().split("\n")[0] });

    const fences = text.match(/```([^\n`]*)\n/g) ?? [];
    if (fences.some((f, i) => i % 2 === 0 && f === "```\n")) report.p2.push({ severity: "p2", rule: "bloque de código sin lenguaje", match: "```" });

    const repeated = repeatedPhrase(prose);
    if (repeated) report.p2.push({ severity: "p2", rule: "frase repetida", match: repeated });
  }

  const hashtags = prose.match(HASHTAG) ?? [];
  if (kind === "linkedin" && hashtags.length > 3) {
    report.p0.push({ severity: "p0", rule: "más de 3 hashtags", match: hashtags.join(" ").trim() });
  } else if (kind === "blog" && hashtags.length > 5) {
    report.p2.push({ severity: "p2", rule: "hashtags en exceso", match: hashtags.join(" ").trim() });
  }

  const emojiStarts = prose.match(EMOJI_LINE_START) ?? [];
  if (emojiStarts.length > 0) {
    report.p1.push({ severity: "p1", rule: "emojis como viñetas", match: emojiStarts.join(" ") });
  }

  if (kind === "linkedin") {
    const links = prose.match(LINK) ?? [];
    if (links[0]) report.p1.push({ severity: "p1", rule: "enlace en el cuerpo del post", match: links[0] });
  }

  const dashes = (prose.match(EM_DASH) ?? []).length;
  if (dashes > Math.max(1, Math.floor(words(prose) / 1000))) {
    report.p2.push({ severity: "p2", rule: "rayas en exceso", match: `${dashes} rayas` });
  }

  const bolds = prose.split(/\n\s*\n/).filter((para) => (para.match(/\*\*[^*]+\*\*/g) ?? []).length > 1);
  if (bolds.length > 0) report.p2.push({ severity: "p2", rule: "más de una negrita por párrafo", match: bolds[0].slice(0, 60) });

  report.blocked = report.p0.length > 0 || report.p1.length > 0;
  return report;
}

/** Resumen corto para Telegram y para pedirle correcciones al editor. */
export function describeFindings(report: LintReport): string[] {
  return [...report.p0, ...report.p1, ...report.p2].map((f) => `${f.severity.toUpperCase()} ${f.rule}: «${f.match}»`);
}
