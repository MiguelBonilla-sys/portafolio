import { END, START, StateGraph, interrupt, type BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";
import { ARTICLE_TYPES, ARTICLE_TYPE_LABEL, CATEGORIES, CATEGORY_LABEL } from "../lib/taxonomy.ts";
import type { AgentDeps } from "./deps.ts";
import { assertTransition, CHANNEL_LABEL, contentHash, type Channel, type EditorialStatus } from "./editorial.ts";
import { extractSources, LIMITS, sourcesBlock, type SourceDoc } from "./inputs.ts";
import { askJson, askText } from "./lib/json.ts";
import { LinkedInAuthError } from "./lib/linkedin.ts";
import { describeFindings, lintText, type LintReport } from "./lib/lint.ts";
import { assetPath, blogPath, buildMdx } from "./lib/mdx.ts";
import { toPublicError, UserFacingError } from "./lib/redact.ts";
import { callback, esc, type InlineButton } from "./lib/telegram.ts";
import { dateIn, describeSlot, formatDateTime, nextCronSlot, normalizeNumber, numbersIn, slugify, wordCount } from "./lib/text.ts";
import {
  carouselPrompt,
  draftBlogPrompt,
  editPrompt,
  evaluatePrompt,
  linkedinPrompt,
  localizePrompt,
  researchPrompt,
} from "./prompts.ts";
import { seoReport } from "./seo.ts";
import { ContentState, type BlogDraft, type Claim, type PublishCheck, type RawClaim, type Review, type State, type Update } from "./state.ts";
import { altText, VisualFitError, type VisualSpec } from "./visuals/scene.ts";
import { renderSvg } from "./visuals/svg.ts";

const MAX_EDIT_PASSES = 2;
const DATO = /\[DATO\?[^\]]*\]/g;
const ALL_CHANNELS: Channel[] = ["blog", "linkedin"];

const blogSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  summary: z.string().min(20),
  tags: z.array(z.string()).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  body: z.string().min(100),
});

const researchSchema = z.object({
  topic: z.string().min(3),
  topics: z.array(z.string()).default([]),
  category: z.enum(CATEGORIES).catch("software"),
  articleType: z.enum(ARTICLE_TYPES).catch("lessons"),
  angle: z.string().default(""),
  claims: z
    .array(
      z.object({
        text: z.string().min(3),
        sources: z.array(z.string()).default([]),
        support: z.enum(["code", "test", "doc", "citation", "none"]).catch("none"),
      })
    )
    .default([]),
  questions: z.array(z.string()).default([]),
  privateMaterial: z.array(z.string()).default([]),
  flow: z.object({ title: z.string(), steps: z.array(z.string()) }).nullable().catch(null),
});

const slidesSchema = z.object({
  slides: z.array(z.object({ title: z.string(), body: z.string() })).min(3).max(10),
});

const evalSchema = z.object({
  specificity: z.number().min(1).max(5),
  factDensity: z.number().min(1).max(5),
  aiMarkers: z.number().min(1).max(5),
  categoryFit: z.number().min(1).max(5),
  note: z.string(),
});

function blogText(d: BlogDraft | null): string {
  return d ? [d.title, d.summary, d.body, ...d.faq.map((f) => `${f.q} ${f.a}`)].join("\n\n") : "";
}

function lintAll(s: Pick<State, "blogEs" | "blogEn" | "linkedin" | "slides">): Record<string, LintReport> {
  const out: Record<string, LintReport> = {
    blogEs: lintText(blogText(s.blogEs), "blog"),
    linkedin: lintText(s.linkedin, "linkedin"),
  };
  if (s.blogEn) out.blogEn = lintText(blogText(s.blogEn), "blog");
  if (s.slides.length) out.slides = lintText(s.slides.map((sl) => `${sl.title}\n${sl.body}`).join("\n\n"), "linkedin");
  return out;
}

/** Bloqueos que impiden aprobar: marcas P0/P1, datos pendientes o errores SEO */
export function blockers(s: Pick<State, "lint" | "missingFacts" | "seo">): string[] {
  const out: string[] = [];
  for (const [k, r] of Object.entries(s.lint)) if (r.blocked) out.push(`${k}: ${describeFindings(r).filter((f) => !f.startsWith("P2"))[0] ?? "marcas por corregir"}`);
  if (s.missingFacts.length) out.push(`faltan ${s.missingFacts.length} datos`);
  for (const e of s.seo?.errors ?? []) out.push(`SEO: ${e}`);
  return out;
}

/**
 * Reemplaza en la prosa las cifras que no aparecen en el material verificable por [DATO?: cifra].
 * El código queda intacto.
 */
export function markUnknownNumbers(text: string, known: Set<string>): { text: string; unknown: string[] } {
  const unknown: string[] = [];
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`|\[DATO\?[^\]]*\])/g);
  const out = parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // código o marcador existente
      return part.replace(/(?<![\w.,])\d+(?:[.,]\d+)*(?![\w])/g, (n) => {
        const norm = normalizeNumber(n);
        // Versiones de una cifra y números presentes en el material verificable pasan
        if (known.has(norm) || /^\d$/.test(norm)) return n;
        unknown.push(n);
        return `[DATO?: ${n}]`;
      });
    })
    .join("");
  return { text: out, unknown };
}

/** Quita los marcadores [DATO?: n] cuya cifra ya está en el material conocido. */
export function restoreKnownNumbers(text: string, known: Set<string>): string {
  return text.replace(/\[DATO\?:\s*([\d.,]+)\]/g, (m, n: string) => (known.has(normalizeNumber(n)) ? n : m));
}

/**
 * Trazabilidad de las afirmaciones: una afirmación de las notas del autor es suya; una de material
 * externo cuenta como respaldada solo si cita una fuente real y, si tiene cifras, la cifra está en esa fuente
 * y la fuente da un respaldo (código, prueba, documento o cita). Lo demás queda sin fuente.
 */
export function traceClaims(raw: RawClaim[], sources: SourceDoc[]): Claim[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return raw.map((c) => {
    const cited = c.sources.map((id) => byId.get(id)).filter((s): s is SourceDoc => Boolean(s));
    const nums = numbersIn(c.text).filter((n) => !/^\d$/.test(n));
    const numeric = nums.length > 0;
    const inText = (s: SourceDoc) => nums.every((n) => numbersIn(s.text).includes(n));
    let status: Claim["status"] = "unsourced";
    if (cited.some((s) => s.trust === "author" && (!numeric || inText(s)))) status = "author";
    else if (cited.length && cited.every((s) => !numeric || inText(s)) && (!numeric || c.support !== "none")) status = "sourced";
    return { text: c.text, sources: cited.map((s) => s.id), status, numeric };
  });
}

/** Lista de hechos para los prompts: cada uno con su fuente, sin los descartados por el autor */
export function factsFor(s: Pick<State, "claims" | "unsourced" | "instructions">): string[] {
  const out = s.claims
    .filter((c) => c.status !== "unsourced" || (c.numeric ? s.unsourced === "mark" : true))
    .map((c) => (c.status === "unsourced" ? `[SIN FUENTE: escribe [DATO?: verificar] en vez de la cifra] ${c.text}` : `[${c.sources.join(",")}] ${c.text}`));
  return [...out, ...s.instructions.map((i) => `[autor] ${i}`)];
}

/** Cifras que se pueden publicar: las del autor y las de afirmaciones con respaldo */
function knownNumbers(s: Pick<State, "claims" | "sources" | "instructions">): Set<string> {
  const known = new Set<string>();
  for (const src of s.sources) if (src.trust === "author") numbersIn(src.text).forEach((n) => known.add(n));
  for (const c of s.claims) if (c.status !== "unsourced") numbersIn(c.text).forEach((n) => known.add(n));
  for (const i of s.instructions) numbersIn(i).forEach((n) => known.add(n));
  return known;
}

/** Qué parte del borrador cambió una edición, para contárselo al autor sin inventar */
export function describeChange(before: State, after: Pick<State, "blogEs" | "linkedin">): string {
  const parts: string[] = [];
  const b = before.blogEs;
  const a = after.blogEs;
  if (b && a) {
    if (b.title !== a.title) parts.push("el título");
    if (b.summary !== a.summary) parts.push("el resumen");
    const paras = (t: string) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const [pb, pa] = [paras(b.body), paras(a.body)];
    const changed = pa.filter((p, i) => p !== pb[i]).length + Math.max(0, pb.length - pa.length);
    if (changed) {
      const first = pa.findIndex((p, i) => p !== pb[i]);
      // Antes del primer cambio solo hay encabezados: es el inicio
      const atStart = pb.slice(0, first).every((p) => /^#/.test(p));
      parts.push(atStart && changed <= 2 ? "el inicio del artículo" : `${changed} de ${pb.length} párrafos del artículo`);
    }
  }
  if (before.linkedin !== after.linkedin) parts.push("el post de LinkedIn");
  return parts.length ? `Cambié ${parts.join(", ")}. El resto no cambió.` : "No hubo cambios en el texto.";
}

/** A qué parte apunta una instrucción de edición */
export function editTarget(instructions: string): "blog" | "linkedin" | "both" {
  const li = /\blinked\s?in\b|\bel post\b|\bthe post\b/i.test(instructions);
  const blog = /\b(art[ií]culo|blog|t[ií]tulo|inicio|introducci[oó]n|secci[oó]n|resumen|article|title|intro|section)\b/i.test(instructions);
  return li && !blog ? "linkedin" : blog && !li ? "blog" : "both";
}

/** Inserta un diagrama al final de la primera sección del artículo */
export function insertFigure(body: string, markdown: string): string {
  const h2 = [...body.matchAll(/^##\s.+$/gm)];
  if (h2.length < 2) return `${body.trim()}\n\n${markdown}\n`;
  const at = h2[1].index ?? body.length;
  return `${body.slice(0, at).trimEnd()}\n\n${markdown}\n\n${body.slice(at)}`;
}

export function buildGraph(deps: AgentDeps) {
  // ── Utilidades de estado ──

  /** Cambia el estado editorial validando la transición y dejando rastro en content_events */
  async function to(s: State, status: EditorialStatus, extra: Record<string, unknown> = {}, detail?: string): Promise<Update> {
    if (s.status !== status) assertTransition(s.status, status);
    await deps.store.upsert(s.contentId, { status, ...extra });
    if (s.status !== status || detail) await deps.store.event(s.contentId, { from: s.status, to: status, version: s.version, detail });
    return { status };
  }

  /** Un solo mensaje de progreso por pieza, editado en cada avance significativo */
  async function progress(s: State, line: string): Promise<Update> {
    const lines = [...s.progressLines, line];
    const text = `<b>Pieza ${s.contentId.slice(0, 8)}</b>\n${lines.map((l) => `· ${esc(l)}`).join("\n")}`;
    try {
      if (s.progressId) {
        await deps.telegram.editMessage(s.progressId, text);
        return { progressLines: lines };
      }
      const id = await deps.telegram.sendMessage(text);
      await deps.store.upsert(s.contentId, { progress_message_id: id });
      return { progressLines: lines, progressId: id };
    } catch {
      return { progressLines: lines }; // el progreso nunca detiene el trabajo
    }
  }

  const id8 = (s: State) => s.contentId.slice(0, 8);
  const postUrl = (slug: string, locale: "es" | "en") => `${deps.siteUrl}/${locale}/blog/${slug}`;

  // ── Entrada e investigación ──

  async function extract(s: State): Promise<Update> {
    const st = await to(s, "extracting");
    const p1 = await progress({ ...s, ...st } as State, s.attachments.length ? "Material recibido." : "Notas recibidas.");
    const { sources, notices } = await extractSources({ note: s.note, forwarded: s.forwarded, attachments: s.attachments }, deps.inputs);
    const usable = sources.filter((x) => x.text.trim().length > 0);
    const s2 = { ...s, ...st, ...p1 } as State;
    const p2 = await progress(s2, usable.length ? "Contenido extraído." : "No pude extraer texto.");
    return { ...st, ...p1, ...p2, sources, notices };
  }

  async function nothingToUse(s: State): Promise<Update> {
    await deps.telegram.sendMessage(
      [
        "No encontré texto que pueda usar.",
        ...s.notices.map((n) => `· ${esc(n)}`),
        ...s.sources.flatMap((x) => x.warnings.map((w) => `· ${esc(x.title)}: ${esc(w)}`)),
        "Envíame las notas como texto, un Markdown, un PDF con texto o un enlace.",
      ].join("\n")
    );
    return to(s, "cancelled", {}, "sin material utilizable");
  }

  async function research(s: State): Promise<Update> {
    const st = await to(s, "researching");
    const p = researchPrompt(sourcesBlock(s.sources), s.instructions);
    const r = await askJson(deps.llm, p.system, p.user, researchSchema);
    const claims = traceClaims(r.claims, s.sources);
    const pr = await progress({ ...s, ...st } as State, "Fuentes revisadas.");
    await deps.store.upsert(s.contentId, { title: r.topic, category: r.category });
    return {
      ...st,
      ...pr,
      claims,
      rerunResearch: false,
      research: {
        topic: r.topic,
        topics: r.topics.slice(0, 4),
        category: r.category,
        articleType: r.articleType,
        angle: r.angle,
        questions: r.questions.slice(0, 3),
        privateMaterial: r.privateMaterial.slice(0, 3),
        flow: r.flow && r.flow.steps.length >= 3 && r.flow.steps.length <= 8 ? r.flow : null,
      },
    };
  }

  /** Propuesta editorial: lo que leyó, qué recomienda, qué falta. Espera la respuesta del autor. */
  async function propose(s: State): Promise<Update> {
    const r = s.research!;
    const st = await to(s, "awaiting_input");
    const usable = s.claims.filter((c) => c.status !== "unsourced");
    const unsourcedNumbers = s.claims.filter((c) => c.status === "unsourced" && c.numeric);
    const external = s.sources.filter((x) => x.trust === "external");
    const read = [...external.map((x) => `«${esc(x.title)}»`), ...(s.sources.length > external.length ? ["tus notas"] : [])];
    const sourceLine = external.length ? `Leí ${read.length > 1 ? `${read.slice(0, -1).join(", ")} y ${read.at(-1)}` : read[0]}.` : "Leí tus notas.";
    const topics = r.topics.length > 1 ? `Identifiqué ${r.topics.length} temas: ${r.topics.map(esc).join(", ")}.` : "";
    const lines = [sourceLine, topics, ""];

    if (usable.length < 2) {
      lines.push("Con este material no tengo hechos suficientes para un artículo que valga la pena leer.");
      lines.push("Cuéntame qué construiste, qué decidiste y qué resultado tuvo; con tu respuesta vuelvo a revisar.");
    } else {
      const type = ARTICLE_TYPE_LABEL[r.articleType].es.toLowerCase();
      const visual = r.flow ? ", con un diagrama del flujo" : "";
      lines.push(`Recomiendo un ${type} sobre ${esc(r.angle || r.topic)}${visual}, y una publicación para LinkedIn que adapte la idea principal.`);
      lines.push(`Categoría: ${CATEGORY_LABEL[r.category].es}.`);
    }
    if (unsourcedNumbers.length) {
      lines.push("");
      lines.push(
        `Hay ${unsourcedNumbers.length === 1 ? "una afirmación numérica" : `${unsourcedNumbers.length} afirmaciones numéricas`} sin fuente verificable:`
      );
      unsourcedNumbers.slice(0, 4).forEach((c) => lines.push(`· ${esc(c.text)}`));
      lines.push("Puedo conservarlas como datos pendientes o eliminarlas del borrador. Recomiendo no publicarlas hasta confirmarlas.");
    }
    if (r.questions.length) {
      lines.push("", "Para no inventar, me falta saber:");
      r.questions.forEach((q) => lines.push(`· ${esc(q)}`));
    }
    if (r.privateMaterial.length) {
      lines.push("", "Esto parece material privado de un cliente; no lo usaré salvo que me digas que es público:");
      r.privateMaterial.forEach((m) => lines.push(`· ${esc(m.slice(0, 160))}`));
    }
    const warnings = [...s.notices, ...s.sources.flatMap((x) => x.warnings.map((w) => `${x.title}: ${w}`))];
    if (warnings.length) {
      lines.push("", "Avisos sobre el material:");
      warnings.slice(0, 5).forEach((w) => lines.push(`· ${esc(w)}`));
    }
    lines.push("");
    lines.push(usable.length < 2 ? "Respóndeme con más detalle o cancela." : "¿Preparo ambos borradores? Puedes responder con ajustes, por ejemplo «sí, pero enfatiza las pruebas».");

    const buttons: InlineButton[][] =
      usable.length < 2
        ? [[{ text: "Cancelar", callback_data: callback("n", s.contentId) }]]
        : unsourcedNumbers.length
          ? [
              [
                { text: "Preparar y marcarlas", callback_data: callback("m", s.contentId) },
                { text: "Preparar sin ellas", callback_data: callback("d", s.contentId) },
              ],
              [{ text: "Cancelar", callback_data: callback("n", s.contentId) }],
            ]
          : [
              [
                { text: "Preparar borradores", callback_data: callback("y", s.contentId) },
                { text: "Cancelar", callback_data: callback("n", s.contentId) },
              ],
            ];
    const messageId = await deps.telegram.sendMessage(lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n"), { buttons });
    await deps.store.upsert(s.contentId, { preview_message_id: messageId });
    return { ...st, review: null };
  }

  function awaitProposal(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: "proposal" }) as Review;
    return { review: decision };
  }

  /** La respuesta del autor a la propuesta: ajustes, datos que faltaban y qué hacer con las cifras sin fuente */
  async function takeAnswer(s: State): Promise<Update> {
    const r = s.review!;
    const instructions = r.instructions?.trim() ? [...s.instructions, r.instructions.trim()] : s.instructions;
    const unsourced = r.unsourced ?? s.unsourced;
    // Archivos enviados como respuesta a la propuesta: fuentes nuevas de la misma pieza, y se vuelve a investigar
    if (r.attachments?.length) {
      const room = Math.max(0, LIMITS.filesPerPiece - s.attachments.length);
      const files = r.attachments.slice(0, room);
      const { sources: added, notices } = await extractSources({ note: "", attachments: files, existing: s.sources }, deps.inputs);
      if (files.length < r.attachments.length) notices.push(`Una pieza admite ${LIMITS.filesPerPiece} archivos; ignoré ${r.attachments.length - files.length}.`);
      const answer: SourceDoc[] = (r.instructions ?? "").trim().split(/\s+/).length >= 6
        ? [{ id: `S${s.sources.length + added.length + 1}`, kind: "note", title: "Tu respuesta", origin: "Telegram", text: r.instructions!.trim(), trust: "author", warnings: [] }]
        : [];
      const names = added.map((x) => `«${esc(x.title)}»`).join(", ");
      await deps.telegram.sendMessage(
        [added.length ? `Agregué ${names}. Vuelvo a revisar las fuentes con todo junto.` : "No pude usar los archivos nuevos; te repito la propuesta con lo que ya tenía.", ...notices.map((n) => `· ${esc(n)}`)].join("\n")
      );
      // Sin fuentes nuevas igual se vuelve a la propuesta: mandar un archivo no es aceptar
      if (!added.length) return { instructions, unsourced, rerunResearch: true, review: null };
      return {
        instructions,
        unsourced,
        attachments: [...s.attachments, ...files],
        sources: [...s.sources, ...added, ...answer],
        rerunResearch: true,
        review: null,
      };
    }
    // Si faltaban hechos o preguntas y el autor respondió algo sustancial, su respuesta es material nuevo
    const usable = s.claims.filter((c) => c.status !== "unsourced").length;
    const needsMore = usable < 2 || (s.research?.questions.length ?? 0) > 0;
    const substantive = (r.instructions ?? "").trim().split(/\s+/).length >= 6;
    if (needsMore && substantive) {
      const answer: SourceDoc = {
        id: `S${s.sources.length + 1}`,
        kind: "note",
        title: "Tu respuesta",
        origin: "Telegram",
        text: r.instructions!.trim(),
        trust: "author",
        warnings: [],
      };
      return { instructions, unsourced, sources: [...s.sources, answer], rerunResearch: true, review: null };
    }
    const emphasis = r.instructions?.trim() && !/^(s[ií]|dale|ok|okay|listo|yes|go|adelante)[.!]?$/i.test(r.instructions.trim());
    const ack = [
      emphasis ? `Prepararé los borradores teniendo en cuenta: «${esc(r.instructions!.trim())}».` : "Preparo los borradores.",
      unsourced === "drop" ? "Dejo fuera las cifras sin fuente." : "Las cifras que no pueda verificar quedarán marcadas para revisión.",
    ].join(" ");
    await deps.telegram.sendMessage(ack);
    return { instructions, unsourced, review: null };
  }

  // ── Redacción ──

  async function draftBlogEs(s: State): Promise<Update> {
    const st = await to(s, "drafting");
    const r = s.research!;
    const p = draftBlogPrompt(factsFor(s), r.topic, r.articleType, r.category, s.instructions);
    const draft = await askJson(deps.llm, p.system, p.user, blogSchema);
    const blogEs: BlogDraft = { ...draft, articleType: r.articleType };
    return { ...st, blogEs, slug: slugify(blogEs.title), date: dateIn(deps.timezone, deps.now()) };
  }

  async function draftLinkedIn(s: State): Promise<Update> {
    const p = linkedinPrompt(s.linkedinLang, factsFor(s), s.blogEs?.summary ?? s.research?.topic ?? "", s.contentId.charCodeAt(0));
    return { linkedin: await askText(deps.llm, p.system, p.user) };
  }

  /** Hasta 2 pasadas del editor sobre los textos con marcas P0/P1 (los [DATO?] no se tocan) */
  async function antiSlop(s: State): Promise<Update> {
    let { blogEs, linkedin } = s;
    const facts = factsFor(s);
    for (let pass = 0; pass < MAX_EDIT_PASSES; pass++) {
      const lint = lintAll({ blogEs, blogEn: null, linkedin, slides: [] });
      const fix = (r: LintReport) => r.p1.length > 0 || r.p0.some((f) => f.rule !== "dato pendiente");
      if (!fix(lint.blogEs) && !fix(lint.linkedin)) break;
      if (blogEs && fix(lint.blogEs)) {
        const p = editPrompt("es", blogEs.body, facts, describeFindings(lint.blogEs));
        blogEs = { ...blogEs, body: await askText(deps.llm, p.system, p.user) };
      }
      if (fix(lint.linkedin)) {
        const p = editPrompt(s.linkedinLang, linkedin, facts, describeFindings(lint.linkedin));
        linkedin = await askText(deps.llm, p.system, p.user);
      }
    }
    return { blogEs, linkedin };
  }

  /** La versión en inglés se regenera desde la española cada vez: los dos idiomas dicen lo mismo */
  async function localizeEn(s: State): Promise<Update> {
    if (!s.blogEs) return {};
    const p = localizePrompt(s.blogEs);
    let blogEn: BlogDraft = { ...(await askJson(deps.llm, p.system, p.user, blogSchema)), articleType: s.blogEs.articleType };
    const lint = lintText(blogText(blogEn), "blog");
    if (lint.p1.length > 0) {
      const e = editPrompt("en", blogEn.body, factsFor(s), describeFindings(lint));
      blogEn = { ...blogEn, body: await askText(deps.llm, e.system, e.user) };
    }
    return { blogEn };
  }

  async function draftCarousel(s: State): Promise<Update> {
    const p = carouselPrompt(s.linkedinLang, factsFor(s), s.blogEs?.title ?? s.research?.topic ?? "");
    const r = await askJson(deps.llm, p.system, p.user, slidesSchema);
    return { slides: r.slides };
  }

  /** Portada siempre; diagrama de flujo solo si el material describe un flujo ordenado */
  async function buildVisuals(s: State): Promise<Update> {
    const r = s.research!;
    const visuals: VisualSpec[] = [
      {
        kind: "cover",
        name: "portada",
        title: s.blogEs?.title ?? r.topic,
        category: r.category,
        kicker: `${CATEGORY_LABEL[r.category].es} · ${ARTICLE_TYPE_LABEL[r.articleType].es}`,
      },
    ];
    const notices: string[] = [];
    if (r.flow) {
      const flow: VisualSpec = { kind: "flow", name: "flujo", title: r.flow.title, steps: r.flow.steps };
      try {
        renderSvg(flow); // valida que el texto quepa sin recortes
        visuals.push(flow);
      } catch (e) {
        if (!(e instanceof VisualFitError)) throw e;
        notices.push(`No generé el diagrama de flujo: ${e.message}. Si es importante, envíame una imagen o simplifica los pasos.`);
      }
    }
    return { visuals, notices: [...s.notices, ...notices] };
  }

  // ── Validación ──

  async function verifyFacts(s: State): Promise<Update> {
    const st = await to(s, "validating");
    const known = knownNumbers(s);
    const unknown: string[] = [];
    const fixDraft = (d: BlogDraft | null): BlogDraft | null => {
      if (!d) return d;
      const mark = (t: string) => {
        const r = markUnknownNumbers(t, known);
        unknown.push(...r.unknown);
        return r.text;
      };
      return {
        ...d,
        title: mark(d.title),
        summary: mark(d.summary),
        description: mark(d.description),
        body: mark(d.body),
        faq: d.faq.map((f) => ({ q: mark(f.q), a: mark(f.a) })),
      };
    };
    const blogEs = fixDraft(s.blogEs);
    const blogEn = fixDraft(s.blogEn);
    const li = markUnknownNumbers(s.linkedin, known);
    const slides = s.slides.map((sl) => ({ title: markUnknownNumbers(sl.title, known).text, body: markUnknownNumbers(sl.body, known).text }));
    const all = [blogText(blogEs), blogText(blogEn), li.text, ...slides.map((x) => `${x.title} ${x.body}`)].join("\n");
    const missingFacts = [...new Set(all.match(DATO) ?? [])];
    const next = { blogEs, blogEn, linkedin: li.text, slides };
    return { ...st, ...next, missingFacts, lint: lintAll(next) };
  }

  async function validate(s: State): Promise<Update> {
    const seo = s.blogEs ? seoReport(s.blogEs, "es") : null;
    const version = s.version + 1;
    const hash = contentHash({ es: s.blogEs, en: s.blogEn, li: s.linkedin, slides: s.slides, visuals: s.visuals });
    await deps.store.upsert(s.contentId, { version, content_hash: hash });
    const pr = await progress(s, s.version === 0 ? "Borrador disponible. Validación completada." : `Versión ${version} lista. Validación completada.`);
    return { ...pr, seo, version, contentHash: hash, relatedProjects: seo?.relatedProjects ?? [] };
  }

  async function evaluate(s: State): Promise<Update> {
    const lintFindings = Object.values(s.lint).reduce((n, r) => n + r.p0.length + r.p1.length + r.p2.length, 0);
    const deterministic = { lintFindings, missingFacts: s.missingFacts.length, words: wordCount(s.blogEs?.body ?? "") };
    try {
      const p = evaluatePrompt(s.linkedin, s.blogEs?.body ?? "", factsFor(s), CATEGORY_LABEL[s.research?.category ?? "software"].es);
      const judged = await askJson(deps.llm, p.system, p.user, evalSchema);
      const evalScores = { ...judged, ...deterministic };
      await deps.store.upsert(s.contentId, { eval_scores: evalScores });
      return { evalScores };
    } catch {
      // La revisión contextual nunca bloquea: es una opinión, no una prueba
      return { evalScores: { specificity: 0, factDensity: 0, aiMarkers: 0, categoryFit: 0, note: "revisión contextual no disponible", ...deterministic } };
    }
  }

  // ── Revisión humana ──

  function reviewButtons(s: State, blocked: boolean): InlineButton[][] {
    const pending = ALL_CHANNELS.filter((c) => !s.publishedChannels.includes(c));
    const h = s.contentHash;
    const row1: InlineButton[] = blocked
      ? []
      : pending.length === 2
        ? [
            { text: "Publicar blog + LinkedIn", callback_data: callback("p", s.contentId, h) },
            { text: "Solo blog", callback_data: callback("b", s.contentId, h) },
            { text: "Solo LinkedIn", callback_data: callback("l", s.contentId, h) },
          ]
        : pending.map((c) => ({ text: `Publicar ${CHANNEL_LABEL[c]}`, callback_data: callback(c === "blog" ? "b" : "l", s.contentId, h) }));
    const row2: InlineButton[] = [
      { text: "Editar", callback_data: callback("e", s.contentId) },
      ...(blocked || s.publishedChannels.length ? [] : [{ text: "Programar", callback_data: callback("s", s.contentId, h) }]),
      { text: s.publishedChannels.length ? "No publicar más" : "Descartar", callback_data: callback("r", s.contentId) },
    ];
    return [row1, row2].filter((r) => r.length);
  }

  async function sendPreview(s: State): Promise<Update> {
    const blocking = blockers(s);
    const blocked = blocking.length > 0;
    const status: EditorialStatus = s.publishedChannels.length ? "partially_published" : blocked ? "blocked" : "awaiting_review";
    const sc = s.evalScores;
    const r = s.research;
    const lintNotes = Object.entries(s.lint).flatMap(([k, rep]) => describeFindings(rep).map((f) => `${k}: ${f}`));
    const projects = s.relatedProjects.map((id) => `${deps.siteUrl}/es/proyectos/${id}`);

    const lines = [
      `<b>Borrador ${id8(s)} · versión ${s.version}</b> <code>${s.contentHash}</code>`,
      `<b>${esc(s.blogEs?.title ?? r?.topic ?? "")}</b>`,
      r ? `${CATEGORY_LABEL[r.category].es} · ${ARTICLE_TYPE_LABEL[r.articleType].es} · LinkedIn en ${s.linkedinLang.toUpperCase()}${s.format === "carousel" ? " · carrusel" : ""}` : "",
      s.changeNote ? `\n${esc(s.changeNote)}` : "",
      s.publishedChannels.length ? `\nYa publicado: ${s.publishedChannels.map((c) => CHANNEL_LABEL[c]).join(", ")}.` : "",
      blocked ? `\n<b>No se puede publicar todavía:</b>\n${blocking.map((b) => `· ${esc(b)}`).join("\n")}` : "",
      s.missingFacts.length ? `\n<b>Datos pendientes</b> (respóndeme con el dato o pídeme quitar la frase):\n${s.missingFacts.map((m) => `· ${esc(m)}`).join("\n")}` : "",
      sc && sc.specificity ? `\nRevisión editorial: especificidad ${sc.specificity}/5 · hechos ${sc.factDensity}/5 · sin relleno ${sc.aiMarkers}/5. ${esc(sc.note)}` : "",
      lintNotes.length ? `\n<b>Linter:</b>\n${lintNotes.slice(0, 6).map((f) => `· ${esc(f)}`).join("\n")}` : "",
      s.seo?.warnings.length ? `\n<b>SEO:</b>\n${s.seo.warnings.slice(0, 4).map((w) => `· ${esc(w)}`).join("\n")}` : "",
      projects.length ? `\nEnlazará a: ${projects.map(esc).join(" · ")}` : "",
      "",
      "<b>Post de LinkedIn:</b>",
      esc(s.linkedin),
      "",
      "El artículo completo (ES y EN) va adjunto. Para cambiar algo, respóndeme con lo que quieres cambiar.",
    ].filter((l) => l !== "");

    const md = (d: BlogDraft | null) => (d ? `# ${d.title}\n\n> ${d.summary}\n\n${d.body}\n\n${d.faq.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}` : "");
    await deps.telegram.sendDocument(
      new TextEncoder().encode(`${md(s.blogEs)}\n\n---\n\n${md(s.blogEn)}\n`),
      `${s.slug || "borrador"}-v${s.version}.md`
    );
    if (deps.renderVisual) {
      for (const v of s.visuals) {
        try {
          const png = await deps.renderVisual(v, v.kind === "cover" ? "og" : "linkedin");
          await deps.telegram.sendPhoto(png, `${v.name}.png`, esc(altText(v)));
        } catch (e) {
          if (!(e instanceof VisualFitError)) throw e;
          await deps.telegram.sendMessage(`No incluyo «${esc(v.title)}»: ${esc(e.message)}.`);
        }
      }
    }
    if (s.format === "carousel" && s.slides.length && deps.renderCarousel) {
      const pdf = await deps.renderCarousel(s.slides, s.blogEs?.title ?? "");
      await deps.telegram.sendDocument(pdf, `${s.slug || "carrusel"}.pdf`, "Carrusel");
    }
    const messageId = await deps.telegram.sendMessage(lines.join("\n"), { buttons: reviewButtons(s, blocked) });
    const st = await to(s, status, { title: s.blogEs?.title ?? r?.topic, preview_message_id: messageId });
    return { ...st, review: null, changeNote: "" };
  }

  function humanReview(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: "review", version: s.version, hash: s.contentHash }) as Review;
    return { review: decision };
  }

  /** Una aprobación vale para una versión exacta y para canales que aún no se publicaron */
  async function checkApproval(s: State): Promise<Update> {
    const r = s.review!;
    if (r.hash && r.hash !== s.contentHash) {
      await deps.telegram.sendMessage(
        `Ese botón era de una versión anterior. La versión actual es la ${s.version} (<code>${s.contentHash}</code>); revisa la última vista previa y apruébala desde ahí.`
      );
      return { review: null };
    }
    const blocking = blockers(s);
    if (blocking.length) {
      await deps.telegram.sendMessage(`Todavía no se puede publicar:\n${blocking.map((b) => `· ${esc(b)}`).join("\n")}\nRespóndeme con los datos que faltan o con lo que quieres cambiar.`);
      return { review: null };
    }
    const channels = (r.channels ?? ALL_CHANNELS).filter((c) => !s.publishedChannels.includes(c));
    if (!channels.length) {
      await deps.telegram.sendMessage("Eso ya está publicado.");
      return { review: null };
    }
    const st = await to(s, "approved", {}, `aprobado v${s.version} ${s.contentHash}: ${channels.join(", ")}`);
    return { ...st, approvedChannels: channels };
  }

  async function refuseApprove(s: State): Promise<Update> {
    return { review: null, status: s.status };
  }

  async function applyEdit(s: State): Promise<Update> {
    const st = await to(s, "revising");
    const instructions = s.review?.instructions ?? "";
    if (!s.blogEs) return st;
    const known = new Set([...knownNumbers(s), ...numbersIn(instructions)]);
    const restore = (t: string) => restoreKnownNumbers(t, known);
    const facts = [...factsFor(s), `[autor] ${instructions}`];
    const target = editTarget(instructions);
    let blogEs = s.blogEs;
    let linkedin = s.linkedin;
    if (target !== "linkedin") {
      const pBody = editPrompt("es", restore(s.blogEs.body), facts, [], instructions);
      const pHead = editPrompt("es", restore(`${s.blogEs.title}\n\n${s.blogEs.summary}`), facts, [], instructions);
      const [body, head] = await Promise.all([askText(deps.llm, pBody.system, pBody.user), askText(deps.llm, pHead.system, pHead.user)]);
      const [title, ...rest] = head.split(/\n\s*\n/);
      blogEs = { ...s.blogEs, body, title: title.trim() || s.blogEs.title, summary: rest.join("\n\n").trim() || s.blogEs.summary };
    }
    if (target !== "blog") {
      const pPost = editPrompt(s.linkedinLang, restore(s.linkedin), facts, [], instructions);
      linkedin = await askText(deps.llm, pPost.system, pPost.user);
    }
    const changeNote = describeChange(s, { blogEs, linkedin });
    // Las cifras que da el autor en la instrucción pasan a ser material conocido
    return { ...st, blogEs, linkedin, instructions: [...s.instructions, instructions], changeNote, review: null };
  }

  async function schedule(s: State): Promise<Update> {
    const r = s.review!;
    if (r.hash && r.hash !== s.contentHash) {
      await deps.telegram.sendMessage(`Ese botón era de una versión anterior (la actual es la ${s.version}). Programa desde la última vista previa.`);
      return { review: null };
    }
    // El cron publica una vez al día: se guarda la franja que de verdad la va a publicar y se dice cuál es
    const slot = r.at ? nextCronSlot(new Date(r.at)) : null;
    const at = slot?.toISOString() ?? null;
    const st = await to(s, "scheduled", { scheduled_for: at }, `programado v${s.version} ${s.contentHash}`);
    await deps.telegram.sendMessage(
      slot
        ? `Programada la versión ${s.version}. Pediste ${esc(formatDateTime(new Date(r.at!), deps.timezone))}; como el publicador corre una vez al día, sale ${esc(describeSlot(slot, deps.timezone))} (hora de Bogotá).`
        : `Programada la versión ${s.version}.`
    );
    return { ...st, scheduledFor: at, approvedChannels: r.channels ?? ALL_CHANNELS };
  }

  function waitSchedule(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: "schedule" }) as Review;
    return { review: decision };
  }

  async function close(s: State): Promise<Update> {
    const action = s.review?.action;
    if (s.publishedChannels.length) {
      await deps.telegram.sendMessage(`Listo. ${s.publishedChannels.map((c) => CHANNEL_LABEL[c]).join(" y ")} quedó publicado; el resto no se publica.`);
      return to(s, "published", {}, "el autor no publicó los demás canales");
    }
    const status: EditorialStatus = action === "expire" ? "expired" : "cancelled";
    await deps.telegram.sendMessage(
      status === "expired" ? `«${esc(s.blogEs?.title ?? s.research?.topic ?? id8(s))}» expiró sin respuesta en 48 h. No se publicó nada.` : "Descartado. No se publicó nada."
    );
    return to(s, status);
  }

  // ── Publicación (cada paso revisa state.steps: reanudar nunca duplica) ──

  // El slug sale del título: si otro artículo ya lo usa, se agrega -2, -3…
  // Un archivo con este mismo contentId es de un intento anterior de esta pieza y se reescribe.
  async function freeSlug(s: State): Promise<string> {
    for (let n = 1; n <= 20; n++) {
      const slug = n === 1 ? s.slug : `${s.slug}-${n}`;
      const existing = await Promise.all((["es", "en"] as const).map((l) => deps.github.getFile(blogPath(l, slug))));
      if (existing.every((f) => f === undefined || f.includes(`contentId: ${s.contentId}`))) return slug;
    }
    throw new UserFacingError(`No encontré un slug libre para «${s.slug}».`);
  }

  async function publishBlog(s: State): Promise<Update> {
    const st = await to(s, "publishing");
    if (!s.approvedChannels.includes("blog") || s.steps.commit) return st;
    const slug = await freeSlug(s);
    const sources = s.sources.filter((x) => x.kind === "url").map((x) => ({ title: x.title, url: x.origin }));
    const assets: string[] = [];
    let blogEs = s.blogEs;
    let blogEn = s.blogEn;
    for (const v of s.visuals) {
      if (v.kind === "cover") continue; // la portada la genera la ruta opengraph-image del artículo
      const { repoPath, publicPath } = assetPath(slug, v.name);
      await deps.github.putFile(repoPath, renderSvg(v, "es"), `content: ${slug} (${v.name})`);
      assets.push(publicPath);
      if (blogEs) blogEs = { ...blogEs, body: insertFigure(blogEs.body, `![${altText(v, "es")}](${publicPath})`) };
      if (blogEn) blogEn = { ...blogEn, body: insertFigure(blogEn.body, `![${altText(v, "en")}](${publicPath})`) };
    }
    let commit = "";
    for (const [locale, draft] of [["es", blogEs], ["en", blogEn]] as const) {
      if (!draft) continue;
      const mdx = buildMdx({
        draft,
        slug,
        locale,
        date: s.date,
        category: s.research?.category ?? "software",
        contentId: s.contentId,
        sources,
        projects: s.relatedProjects,
        version: s.version,
      });
      commit = (await deps.github.putFile(blogPath(locale, slug), mdx, `content: ${slug} (${locale}) v${s.version}`)).commitSha;
    }
    return { ...st, slug, steps: { ...s.steps, commit, assets } };
  }

  async function waitDeploy(s: State): Promise<Update> {
    if (!s.approvedChannels.includes("blog") || s.steps.deployed) return {};
    const deadline = Date.now() + deps.deployWaitSeconds * 1000;
    while (Date.now() < deadline) {
      if ((await deps.fetchStatus(postUrl(s.slug, "es"))) === 200) {
        const st = s.status === "awaiting_deploy" ? await to(s, "publishing", {}, "deploy disponible") : {};
        return { ...st, steps: { ...s.steps, deployed: true } };
      }
      await deps.sleep(10_000);
    }
    return {};
  }

  async function deployPending(s: State): Promise<Update> {
    const st = await to(s, "awaiting_deploy");
    await deps.telegram.sendMessage(
      "El artículo está en el repositorio, pero el deploy de Vercel todavía no responde. No publiqué nada en LinkedIn. Reintento en el cron diario, o toca Reintentar.",
      { buttons: [[{ text: "Reintentar", callback_data: callback("t", s.contentId) }]] }
    );
    return { ...st, retryTarget: "waitDeploy" };
  }

  /** Validador posterior: la página publicada tiene lo que los buscadores necesitan */
  async function validatePublished(s: State): Promise<Update> {
    if (!s.approvedChannels.includes("blog") || s.steps.validated) return {};
    const checks: PublishCheck[] = [];
    for (const locale of ["es", "en"] as const) {
      const url = postUrl(s.slug, locale);
      const page = await deps.fetchPage(url).catch(() => ({ status: 0, html: "" }));
      const h = page.html;
      checks.push({
        url,
        status: page.status,
        checks: {
          título: /<title>[^<]{5,}<\/title>/i.test(h),
          canonical: h.includes(`rel="canonical" href="${url}"`),
          hreflang: /hrefLang="(es|en)"|hreflang="(es|en)"/.test(h),
          "JSON-LD BlogPosting": h.includes('"@type":"BlogPosting"'),
          indexable: !/<meta name="robots" content="[^"]*noindex/i.test(h),
        },
      });
    }
    return { checks, steps: { ...s.steps, validated: true } };
  }

  const attemptKey = (s: State) => `linkedin_attempt:${s.contentId}:${s.contentHash}`;

  async function publishLinkedIn(s: State): Promise<Update> {
    if (!s.approvedChannels.includes("linkedin")) return {};
    const steps = { ...s.steps };
    const blogLive = s.publishedChannels.includes("blog") || Boolean(steps.deployed);
    try {
      const li = await deps.linkedin();
      if (!steps.linkedin) {
        // LinkedIn no tiene clave de idempotencia: si un intento anterior se cortó después de enviar,
        // no se reintenta a ciegas; el autor confirma con «forzar» tras revisar su perfil.
        if ((await deps.store.kvGet(attemptKey(s))) && s.review?.action !== "force") {
          await deps.telegram.sendMessage(
            "Un intento anterior de publicar en LinkedIn se cortó y no sé si el post llegó. Revisa tu perfil: si no está, toca Publicar de nuevo.",
            { buttons: [[{ text: "Publicar de nuevo en LinkedIn", callback_data: callback("f", s.contentId) }]] }
          );
          return { steps, retryTarget: "publishLinkedIn" };
        }
        await deps.store.kvSet(attemptKey(s), { at: deps.now().toISOString() });
        if (s.format === "carousel" && s.slides.length && deps.renderCarousel) {
          try {
            const pdf = await deps.renderCarousel(s.slides, s.blogEs?.title ?? "");
            const urn = steps.carouselUrn ?? (await li.uploadDocument(pdf, s.blogEs?.title ?? "Carrusel"));
            steps.carouselUrn = urn;
            steps.linkedin = await li.createPost(s.linkedin, { documentUrn: urn, documentTitle: s.blogEs?.title });
          } catch (e) {
            if (e instanceof LinkedInAuthError) throw e;
            await deps.telegram.sendMessage("El carrusel no se pudo subir. Publico el post como texto.");
          }
        }
        if (!steps.linkedin && s.linkedinMedia === "card" && deps.renderVisual) {
          const cover = s.visuals.find((v) => v.kind === "cover");
          if (cover) {
            const png = await deps.renderVisual(cover, "linkedin");
            steps.imageUrn = steps.imageUrn ?? (await li.uploadImage(png));
            steps.linkedin = await li.createPost(s.linkedin, { imageUrn: steps.imageUrn, altText: altText(cover) });
          }
        }
        if (!steps.linkedin) steps.linkedin = await li.createPost(s.linkedin);
        await deps.store.kvDelete(attemptKey(s));
      }
      if (!steps.comment && blogLive) {
        const lead = s.linkedinLang === "es" ? "Artículo completo:" : "Full write-up:";
        await li.comment(steps.linkedin, `${lead} ${postUrl(s.slug, s.linkedinLang)}`);
        steps.comment = true;
      }
      return { steps, retryTarget: null };
    } catch (e) {
      const blogNote = blogLive ? " El blog sí está publicado." : "";
      if (e instanceof LinkedInAuthError) {
        await deps.telegram.sendMessage(`LinkedIn necesita reconectarse: abre ${esc(deps.linkedinAuthUrl())} y luego toca Reintentar.${blogNote}`, {
          buttons: [[{ text: "Reintentar", callback_data: callback("t", s.contentId) }]],
        });
      } else {
        const { message } = toPublicError(e, "linkedin-publish");
        await deps.telegram.sendMessage(`No se publicó en LinkedIn. ${esc(message)}${blogNote}`, {
          buttons: [[{ text: "Reintentar", callback_data: callback("t", s.contentId) }]],
        });
      }
      await deps.store.kvDelete(attemptKey(s)).catch(() => undefined);
      const st = blogLive ? await to(s, "partially_published", {}, "LinkedIn falló") : await to(s, "failed", {}, "LinkedIn falló");
      return { ...st, steps, retryTarget: "publishLinkedIn", publishedChannels: blogLive ? ["blog"] : s.publishedChannels };
    }
  }

  function hold(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: s.retryTarget }) as Review;
    return { review: decision };
  }

  async function indexNow(s: State): Promise<Update> {
    if (!s.approvedChannels.includes("blog") || s.steps.indexNow) return {};
    const status = await deps.indexNow([postUrl(s.slug, "es"), postUrl(s.slug, "en"), `${deps.siteUrl}/es/blog`, `${deps.siteUrl}/en/blog`]).catch(() => -1);
    return { steps: { ...s.steps, indexNow: status } };
  }

  /** Solo dice "publicado" con la confirmación de cada plataforma: commit + 200 del sitio, URN de LinkedIn */
  async function notifyPublished(s: State): Promise<Update> {
    const published = new Set(s.publishedChannels);
    if (s.approvedChannels.includes("blog") && s.steps.deployed) published.add("blog");
    if (s.approvedChannels.includes("linkedin") && s.steps.linkedin) published.add("linkedin");
    const publishedChannels = ALL_CHANNELS.filter((c) => published.has(c));
    const urls: Record<string, string> = {};
    if (published.has("blog")) Object.assign(urls, { blog_es: postUrl(s.slug, "es"), blog_en: postUrl(s.slug, "en") });
    if (s.steps.linkedin) urls.linkedin = `https://www.linkedin.com/feed/update/${s.steps.linkedin}/`;

    const failedChecks = s.checks.flatMap((c) => [
      ...(c.status !== 200 ? [`${c.url} respondió ${c.status}`] : []),
      ...Object.entries(c.checks).filter(([, ok]) => !ok).map(([k]) => `${c.url}: falta ${k}`),
    ]);
    const remaining = ALL_CHANNELS.filter((c) => !published.has(c));
    const lines = [
      `<b>Publicado</b>: ${esc(s.blogEs?.title ?? "")} (versión ${s.version})`,
      urls.blog_es ? `Blog: ${urls.blog_es}\n${urls.blog_en}` : "",
      urls.linkedin ? `LinkedIn: ${urls.linkedin}${s.steps.comment ? " (enlace al artículo en el primer comentario)" : ""}` : "",
      s.steps.commit ? `Commit: <code>${s.steps.commit.slice(0, 7)}</code>` : "",
      failedChecks.length ? `\nRevisión de la página publicada:\n${failedChecks.map((f) => `· ${esc(f)}`).join("\n")}` : s.checks.length ? "La página publicada pasó la revisión (título, canonical, hreflang, JSON-LD, indexable)." : "",
      remaining.length ? `\nFalta: ${remaining.map((c) => CHANNEL_LABEL[c]).join(", ")}. Puedes publicarlo desde la vista previa o con /publish.` : "",
    ].filter(Boolean);
    await deps.telegram.sendMessage(lines.join("\n"));
    const status: EditorialStatus = remaining.length ? "partially_published" : "published";
    const st = await to(s, status, { published_urls: urls, published_channels: publishedChannels });
    // Los pasos de blog quedan hechos; si después se aprueba LinkedIn, no se repiten
    return { ...st, publishedChannels, approvedChannels: [], review: null };
  }

  // ── Enrutamiento ──

  const afterExtract = (s: State) => (s.sources.some((x) => x.text.trim()) ? "investigate" : "nothingToUse");
  const afterProposal = (s: State) => {
    const a = s.review?.action;
    if (a === "reject" || a === "expire") return "close";
    return "takeAnswer";
  };
  // Respuesta con material nuevo: se vuelve a investigar (una vez por respuesta)
  const afterAnswer = (s: State) => (s.rerunResearch ? "investigate" : "draftBlogEs");
  const afterLocalize = (s: State) => (s.format === "carousel" && s.slides.length === 0 ? "draftCarousel" : "buildVisuals");
  const afterReview = (s: State) => {
    switch (s.review?.action) {
      case "approve":
      case "force":
        return "checkApproval";
      case "edit":
        return "applyEdit";
      case "reschedule":
        return blockers(s).length ? "refuseApprove" : "schedule";
      case "reject":
      case "expire":
        return "close";
      case "preview":
        return "sendPreview";
      default:
        return "humanReview";
    }
  };
  const afterCheck = (s: State) => (s.status === "approved" ? "publishBlog" : "humanReview");
  const afterSchedule = (s: State) => (s.status === "scheduled" ? "waitSchedule" : "humanReview");
  const afterWaitSchedule = (s: State) => {
    switch (s.review?.action) {
      case "approve":
        return "checkApproval";
      case "reschedule":
        return "schedule";
      case "edit":
        return "applyEdit";
      default:
        return "close";
    }
  };
  const afterDeploy = (s: State) => (!s.approvedChannels.includes("blog") || s.steps.deployed ? "validatePublished" : "deployPending");
  const afterLinkedIn = (s: State) => (s.retryTarget === "publishLinkedIn" ? "hold" : "indexNow");
  const afterHold = (s: State) => (s.review?.action === "reject" ? "close" : (s.retryTarget ?? "waitDeploy"));
  const afterNotify = (s: State) => (s.status === "partially_published" ? "sendPreview" : END);

  return new StateGraph(ContentState)
    .addNode("extract", extract)
    .addNode("nothingToUse", nothingToUse)
    .addNode("investigate", research)
    .addNode("propose", propose)
    .addNode("awaitProposal", awaitProposal)
    .addNode("takeAnswer", takeAnswer)
    .addNode("draftBlogEs", draftBlogEs)
    .addNode("draftLinkedIn", draftLinkedIn)
    .addNode("antiSlop", antiSlop)
    .addNode("localizeEn", localizeEn)
    .addNode("draftCarousel", draftCarousel)
    .addNode("buildVisuals", buildVisuals)
    .addNode("verifyFacts", verifyFacts)
    .addNode("validate", validate)
    .addNode("evaluate", evaluate)
    .addNode("sendPreview", sendPreview)
    .addNode("humanReview", humanReview)
    .addNode("checkApproval", checkApproval)
    .addNode("refuseApprove", refuseApprove)
    .addNode("applyEdit", applyEdit)
    .addNode("schedule", schedule)
    .addNode("waitSchedule", waitSchedule)
    .addNode("close", close)
    .addNode("publishBlog", publishBlog)
    .addNode("waitDeploy", waitDeploy)
    .addNode("deployPending", deployPending)
    .addNode("validatePublished", validatePublished)
    .addNode("hold", hold)
    .addNode("publishLinkedIn", publishLinkedIn)
    .addNode("indexNow", indexNow)
    .addNode("notifyPublished", notifyPublished)
    .addEdge(START, "extract")
    .addConditionalEdges("extract", afterExtract, ["investigate", "nothingToUse"])
    .addEdge("nothingToUse", END)
    .addEdge("investigate", "propose")
    .addEdge("propose", "awaitProposal")
    .addConditionalEdges("awaitProposal", afterProposal, ["takeAnswer", "close"])
    .addConditionalEdges("takeAnswer", afterAnswer, ["investigate", "draftBlogEs"])
    .addEdge("draftBlogEs", "draftLinkedIn")
    .addEdge("draftLinkedIn", "antiSlop")
    .addEdge("antiSlop", "localizeEn")
    .addConditionalEdges("localizeEn", afterLocalize, ["draftCarousel", "buildVisuals"])
    .addEdge("draftCarousel", "buildVisuals")
    .addEdge("buildVisuals", "verifyFacts")
    .addEdge("verifyFacts", "validate")
    .addEdge("validate", "evaluate")
    .addEdge("evaluate", "sendPreview")
    .addEdge("sendPreview", "humanReview")
    .addConditionalEdges("humanReview", afterReview, ["checkApproval", "applyEdit", "schedule", "close", "refuseApprove", "sendPreview", "humanReview"])
    .addConditionalEdges("checkApproval", afterCheck, ["publishBlog", "humanReview"])
    .addEdge("refuseApprove", "humanReview")
    .addEdge("applyEdit", "antiSlop")
    .addConditionalEdges("schedule", afterSchedule, ["waitSchedule", "humanReview"])
    .addConditionalEdges("waitSchedule", afterWaitSchedule, ["checkApproval", "schedule", "applyEdit", "close"])
    .addEdge("close", END)
    .addEdge("publishBlog", "waitDeploy")
    .addConditionalEdges("waitDeploy", afterDeploy, ["validatePublished", "deployPending"])
    .addEdge("deployPending", "hold")
    .addConditionalEdges("hold", afterHold, ["waitDeploy", "publishLinkedIn", "close"])
    .addEdge("validatePublished", "publishLinkedIn")
    .addConditionalEdges("publishLinkedIn", afterLinkedIn, ["hold", "indexNow"])
    .addEdge("indexNow", "notifyPublished")
    .addConditionalEdges("notifyPublished", afterNotify, ["sendPreview", END]);
}

export function compileGraph(deps: AgentDeps, checkpointer: BaseCheckpointSaver) {
  return buildGraph(deps).compile({ checkpointer });
}
