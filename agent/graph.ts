import { END, START, StateGraph, interrupt, type BaseCheckpointSaver } from "@langchain/langgraph";
import { z } from "zod";
import { askJson, askText } from "./lib/json.ts";
import { describeFindings, lintText, type LintReport } from "./lib/lint.ts";
import { blogPath, buildMdx } from "./lib/mdx.ts";
import { esc, type InlineButton } from "./lib/telegram.ts";
import { dateIn, normalizeNumber, numbersIn, slugify, wordCount } from "./lib/text.ts";
import { LinkedInAuthError } from "./lib/linkedin.ts";
import type { AgentDeps } from "./deps.ts";
import {
  PILLARS,
  carouselPrompt,
  draftBlogPrompt,
  editPrompt,
  evaluatePrompt,
  extractFactsPrompt,
  linkedinPrompt,
  localizePrompt,
  type Pillar,
} from "./prompts.ts";
import { ContentState, type BlogDraft, type Review, type State, type Update } from "./state.ts";

const MAX_EDIT_PASSES = 2;
const DATO = /\[DATO\?[^\]]*\]/g;

const blogSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  summary: z.string().min(20),
  tags: z.array(z.string()).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  body: z.string().min(100),
});

const factsSchema = z.object({
  facts: z.array(z.string()),
  pillar: z.enum(["agents", "automation", "backend", "career"]),
  topic: z.string(),
  sourceUrls: z.array(z.string()).default([]),
});

const slidesSchema = z.object({
  slides: z.array(z.object({ title: z.string(), body: z.string() })).min(3).max(10),
});

const evalSchema = z.object({
  specificity: z.number().min(1).max(5),
  factDensity: z.number().min(1).max(5),
  aiMarkers: z.number().min(1).max(5),
  pillarFit: z.number().min(1).max(5),
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

function isBlocked(lint: Record<string, LintReport>): boolean {
  return Object.values(lint).some((r) => r.blocked);
}

/**
 * Reemplaza en la prosa las cifras que no aparecen en el material del autor por [DATO?: cifra].
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
        // Años, versiones de una cifra y números ya presentes en el material pasan
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

export function buildGraph(deps: AgentDeps) {
  const log = (s: State, fields: Parameters<AgentDeps["store"]["upsert"]>[1]) => deps.store.upsert(s.contentId, fields);

  // ── Generación ──

  async function extractFacts(s: State): Promise<Update> {
    const p = extractFactsPrompt(s.source);
    const r = await askJson(deps.llm, p.system, p.user, factsSchema);
    const urls = r.sourceUrls.filter((u) => s.source.includes(u));
    await log(s, { pillar: r.pillar, status: "generating", format: s.format });
    return { facts: r.facts, pillar: r.pillar as Pillar, topic: r.topic, sourceUrls: urls };
  }

  async function needMaterial(s: State): Promise<Update> {
    await deps.telegram.sendMessage(
      "Con ese material no tengo hechos suficientes para un artículo. Cuéntame qué construiste, qué decidiste y qué resultado tuvo (cifras, herramientas, errores)."
    );
    await log(s, { status: "rejected" });
    return { status: "rejected" };
  }

  async function draftBlogEs(s: State): Promise<Update> {
    const p = draftBlogPrompt(s.facts, s.topic);
    const blogEs = await askJson(deps.llm, p.system, p.user, blogSchema);
    return { blogEs, slug: slugify(blogEs.title), date: dateIn(deps.timezone, deps.now()) };
  }

  async function draftLinkedIn(s: State): Promise<Update> {
    const p = linkedinPrompt(s.linkedinLang, s.facts, s.blogEs?.summary ?? s.topic);
    return { linkedin: await askText(deps.llm, p.system, p.user) };
  }

  /** Hasta 2 pasadas del editor sobre los textos con marcas P1 (los [DATO?] no se tocan) */
  async function antiSlop(s: State): Promise<Update> {
    let { blogEs, linkedin } = s;
    for (let pass = 0; pass < MAX_EDIT_PASSES; pass++) {
      const lint = lintAll({ blogEs, blogEn: null, linkedin, slides: [] });
      const fix = (r: LintReport) => r.p1.length > 0 || r.p0.some((f) => f.rule !== "dato pendiente");
      if (!fix(lint.blogEs) && !fix(lint.linkedin)) break;
      if (blogEs && fix(lint.blogEs)) {
        const p = editPrompt("es", blogEs.body, s.facts, describeFindings(lint.blogEs));
        blogEs = { ...blogEs, body: await askText(deps.llm, p.system, p.user) };
      }
      if (fix(lint.linkedin)) {
        const p = editPrompt(s.linkedinLang, linkedin, s.facts, describeFindings(lint.linkedin));
        linkedin = await askText(deps.llm, p.system, p.user);
      }
    }
    return { blogEs, linkedin };
  }

  async function localizeEn(s: State): Promise<Update> {
    if (!s.blogEs) return {};
    const p = localizePrompt(s.blogEs);
    let blogEn = await askJson(deps.llm, p.system, p.user, blogSchema);
    const lint = lintText(blogText(blogEn), "blog");
    if (lint.p1.length > 0) {
      const e = editPrompt("en", blogEn.body, s.facts, describeFindings(lint));
      blogEn = { ...blogEn, body: await askText(deps.llm, e.system, e.user) };
    }
    return { blogEn };
  }

  async function draftCarousel(s: State): Promise<Update> {
    const p = carouselPrompt(s.linkedinLang, s.facts, s.blogEs?.title ?? s.topic);
    const r = await askJson(deps.llm, p.system, p.user, slidesSchema);
    return { slides: r.slides };
  }

  async function verifyFacts(s: State): Promise<Update> {
    const known = new Set([...numbersIn(s.source), ...numbersIn(s.facts.join("\n"))]);
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
    unknown.push(...li.unknown);
    const slides = s.slides.map((sl) => {
      const t = markUnknownNumbers(sl.title, known);
      const b = markUnknownNumbers(sl.body, known);
      unknown.push(...t.unknown, ...b.unknown);
      return { title: t.text, body: b.text };
    });
    const all = [blogText(blogEs), blogText(blogEn), li.text, ...slides.map((x) => `${x.title} ${x.body}`)].join("\n");
    const missingFacts = [...new Set(all.match(DATO) ?? [])];
    const next = { blogEs, blogEn, linkedin: li.text, slides };
    return { ...next, missingFacts, lint: lintAll(next) };
  }

  async function evaluate(s: State): Promise<Update> {
    const lintFindings = Object.values(s.lint).reduce((n, r) => n + r.p0.length + r.p1.length + r.p2.length, 0);
    const deterministic = { lintFindings, missingFacts: s.missingFacts.length, words: wordCount(s.linkedin) };
    try {
      const p = evaluatePrompt(s.linkedin, s.blogEs?.summary ?? "", s.facts, PILLARS[s.pillar]);
      const judged = await askJson(deps.llm, p.system, p.user, evalSchema);
      const evalScores = { ...judged, ...deterministic };
      await log(s, { eval_scores: evalScores });
      return { evalScores };
    } catch {
      // La evaluación nunca bloquea la publicación
      return { evalScores: { specificity: 0, factDensity: 0, aiMarkers: 0, pillarFit: 0, note: "evaluación no disponible", ...deterministic } };
    }
  }

  // ── Revisión humana ──

  async function sendPreview(s: State): Promise<Update> {
    const blocked = isBlocked(s.lint);
    const status = blocked ? "blocked" : "awaiting_approval";
    const sc = s.evalScores;
    const findings = Object.entries(s.lint).flatMap(([k, r]) => describeFindings(r).map((f) => `${k}: ${f}`));

    const lines = [
      blocked ? "<b>⛔ Bloqueado: corrige antes de aprobar</b>" : "<b>Borrador listo para revisar</b>",
      "",
      `<b>${esc(s.blogEs?.title ?? s.topic)}</b>`,
      `Pilar: ${esc(PILLARS[s.pillar])} · LinkedIn en ${s.linkedinLang.toUpperCase()}${s.format === "carousel" ? " · carrusel" : ""}`,
      sc ? `Eval: especificidad ${sc.specificity}/5 · hechos ${sc.factDensity}/5 · sin marcas de IA ${sc.aiMarkers}/5 · pilar ${sc.pillarFit}/5` : "",
      sc?.note ? `Nota: ${esc(sc.note)}` : "",
      s.missingFacts.length ? `\n<b>Faltan datos:</b>\n${s.missingFacts.map((m) => `• ${esc(m)}`).join("\n")}` : "",
      findings.length ? `\n<b>Linter:</b>\n${findings.slice(0, 8).map((f) => `• ${esc(f)}`).join("\n")}` : "",
      "",
      "<b>Post de LinkedIn:</b>",
      esc(s.linkedin),
      "",
      "El artículo completo (ES y EN) va adjunto. Para cambiar algo, toca Editar y escribe las instrucciones.",
    ].filter((l) => l !== "");

    const row1: InlineButton[] = blocked
      ? [{ text: "✏️ Editar", callback_data: `e:${s.contentId}` }]
      : [
          { text: "✅ Aprobar", callback_data: `a:${s.contentId}` },
          { text: "✏️ Editar", callback_data: `e:${s.contentId}` },
        ];
    const row2: InlineButton[] = [
      ...(blocked ? [] : [{ text: "🗓 Reprogramar", callback_data: `s:${s.contentId}` }]),
      { text: "❌ Rechazar", callback_data: `r:${s.contentId}` },
    ];

    const md = (d: BlogDraft | null, locale: "es" | "en") =>
      d ? `# ${d.title}\n\n> ${d.summary}\n\n${d.body}\n\n${d.faq.map((f) => `**${f.q}**\n${f.a}`).join("\n\n")}` : `(sin borrador ${locale})`;
    await deps.telegram.sendDocument(
      new TextEncoder().encode(`${md(s.blogEs, "es")}\n\n---\n\n${md(s.blogEn, "en")}\n`),
      `${s.slug || "borrador"}.md`
    );
    if (s.format === "carousel" && s.slides.length && deps.renderCarousel) {
      const pdf = await deps.renderCarousel(s.slides, s.blogEs?.title ?? s.topic);
      await deps.telegram.sendDocument(pdf, `${s.slug || "carrusel"}.pdf`, "Carrusel");
    }
    const messageId = await deps.telegram.sendMessage(lines.join("\n"), { buttons: [row1, row2] });
    await log(s, { status, title: s.blogEs?.title ?? s.topic, preview_message_id: messageId });
    return { status, review: null };
  }

  function humanReview(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: "review" }) as Review;
    return { review: decision };
  }

  async function refuseApprove(s: State): Promise<Update> {
    await deps.telegram.sendMessage("Este borrador está bloqueado (faltan datos o tiene marcas del linter). Tócale Editar con los datos que faltan.");
    return { review: null, status: s.status };
  }

  async function applyEdit(s: State): Promise<Update> {
    const instructions = s.review?.instructions ?? "";
    if (!s.blogEs) return {};
    const facts = [...s.facts, `Instrucción del autor: ${instructions}`];
    // Las cifras que el autor da en la instrucción resuelven sus marcadores antes de editar
    const given = new Set(numbersIn(instructions));
    const restore = (t: string) => restoreKnownNumbers(t, given);
    const pBody = editPrompt("es", restore(s.blogEs.body), facts, [], instructions);
    const pSummary = editPrompt("es", restore(`${s.blogEs.title}\n\n${s.blogEs.summary}`), facts, [], instructions);
    const pPost = editPrompt(s.linkedinLang, restore(s.linkedin), facts, [], instructions);
    const [body, titleSummary, linkedin] = await Promise.all([
      askText(deps.llm, pBody.system, pBody.user),
      askText(deps.llm, pSummary.system, pSummary.user),
      askText(deps.llm, pPost.system, pPost.user),
    ]);
    const [title, ...rest] = titleSummary.split(/\n\s*\n/);
    const blogEs = { ...s.blogEs, body, title: title.trim() || s.blogEs.title, summary: rest.join("\n\n").trim() || s.blogEs.summary };
    const blogEn = s.blogEn
      ? { ...s.blogEn, title: restore(s.blogEn.title), summary: restore(s.blogEn.summary), description: restore(s.blogEn.description), body: restore(s.blogEn.body), faq: s.blogEn.faq.map((f) => ({ q: restore(f.q), a: restore(f.a) })) }
      : null;
    // El autor puede aportar cifras nuevas en la instrucción: pasan a ser material conocido
    return { blogEs, blogEn, linkedin, facts, source: `${s.source}\n\n${instructions}`, review: null };
  }

  async function schedule(s: State): Promise<Update> {
    const at = s.review?.at ?? null;
    await log(s, { status: "scheduled", scheduled_for: at });
    const when = at ? new Date(at).toLocaleString("es-CO", { timeZone: deps.timezone, dateStyle: "medium", timeStyle: "short" }) : "?";
    await deps.telegram.sendMessage(`🗓 Programado para ${esc(when)} (hora de Bogotá). Lo publico en el cron de esa mañana.`);
    return { scheduledFor: at, status: "scheduled" };
  }

  function waitSchedule(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: "schedule" }) as Review;
    return { review: decision };
  }

  async function close(s: State): Promise<Update> {
    const status = s.review?.action === "expire" ? "expired" : "rejected";
    await log(s, { status });
    await deps.telegram.sendMessage(
      status === "expired" ? `⌛ «${esc(s.blogEs?.title ?? s.topic)}» expiró sin respuesta en 48 h.` : "❌ Descartado. No se publicó nada."
    );
    return { status };
  }

  // ── Publicación (cada paso revisa state.steps: reanudar nunca duplica) ──

  async function publishBlog(s: State): Promise<Update> {
    if (s.steps.commit) return {};
    await log(s, { status: "publishing" });
    const sources = s.sourceUrls.map((url) => ({ title: url.replace(/^https?:\/\//, ""), url }));
    let commit = "";
    for (const [locale, draft] of [["es", s.blogEs], ["en", s.blogEn]] as const) {
      if (!draft) continue;
      const mdx = buildMdx({ draft, slug: s.slug, locale, date: s.date, pillar: s.pillar, contentId: s.contentId, sources });
      const r = await deps.github.putFile(blogPath(locale, s.slug), mdx, `content: ${s.slug} (${locale})`);
      commit = r.commitSha;
    }
    return { steps: { ...s.steps, commit }, status: "publishing" };
  }

  const postUrl = (s: State, locale: "es" | "en") => `${deps.siteUrl}/${locale}/blog/${s.slug}`;

  async function waitDeploy(s: State): Promise<Update> {
    if (s.steps.deployed) return {};
    const deadline = Date.now() + deps.deployWaitSeconds * 1000;
    while (Date.now() < deadline) {
      if ((await deps.fetchStatus(postUrl(s, "es"))) === 200) return { steps: { ...s.steps, deployed: true } };
      await deps.sleep(10_000);
    }
    return {};
  }

  async function deployPending(s: State): Promise<Update> {
    await log(s, { status: "awaiting_deploy" });
    await deps.telegram.sendMessage(
      `⏳ El artículo se subió al repo pero el deploy de Vercel aún no responde. Reintento en el cron diario, o toca Reintentar.`,
      { buttons: [[{ text: "🔁 Reintentar", callback_data: `t:${s.contentId}` }]] }
    );
    return { status: "awaiting_deploy", retryTarget: "waitDeploy" };
  }

  async function publishLinkedIn(s: State): Promise<Update> {
    const steps = { ...s.steps };
    try {
      const li = await deps.linkedin();
      if (!steps.linkedin) {
        if (s.format === "carousel" && s.slides.length && deps.renderCarousel) {
          try {
            const pdf = await deps.renderCarousel(s.slides, s.blogEs?.title ?? s.topic);
            const urn = steps.carouselUrn ?? (await li.uploadDocument(pdf, s.blogEs?.title ?? "Carrusel"));
            steps.carouselUrn = urn;
            steps.linkedin = await li.createPost(s.linkedin, { documentUrn: urn, documentTitle: s.blogEs?.title });
          } catch (e) {
            if (e instanceof LinkedInAuthError) throw e;
            // Plan B (spike T30): si el documento falla, se publica como texto y se avisa
            await deps.telegram.sendMessage(`El carrusel no se pudo subir (${esc((e as Error).message.slice(0, 200))}). Publico el post como texto.`);
          }
        }
        if (!steps.linkedin) steps.linkedin = await li.createPost(s.linkedin);
      }
      if (!steps.comment) {
        const lead = s.linkedinLang === "es" ? "Artículo completo:" : "Full write-up:";
        await li.comment(steps.linkedin, `${lead} ${postUrl(s, s.linkedinLang)}`);
        steps.comment = true;
      }
      return { steps, retryTarget: null };
    } catch (e) {
      if (!(e instanceof LinkedInAuthError)) throw e;
      await log(s, { status: "failed" });
      await deps.telegram.sendMessage(
        `🔑 LinkedIn necesita reconectarse. Abre ${esc(deps.linkedinAuthUrl)} y luego toca Reintentar.`,
        { buttons: [[{ text: "🔁 Reintentar", callback_data: `t:${s.contentId}` }]] }
      );
      return { steps, retryTarget: "publishLinkedIn", status: "failed" };
    }
  }

  function hold(s: State): Update {
    const decision = interrupt({ contentId: s.contentId, waitingFor: s.retryTarget }) as Review;
    return { review: decision };
  }

  async function indexNow(s: State): Promise<Update> {
    if (s.steps.indexNow) return {};
    const status = await deps.indexNow([postUrl(s, "es"), postUrl(s, "en"), `${deps.siteUrl}/es/blog`, `${deps.siteUrl}/en/blog`]).catch(() => -1);
    return { steps: { ...s.steps, indexNow: status } };
  }

  async function notifyPublished(s: State): Promise<Update> {
    const urls = {
      blog_es: postUrl(s, "es"),
      blog_en: postUrl(s, "en"),
      linkedin: s.steps.linkedin ? `https://www.linkedin.com/feed/update/${s.steps.linkedin}/` : "",
    };
    await log(s, { status: "published", published_urls: urls });
    await deps.telegram.sendMessage(
      [`✅ Publicado: <b>${esc(s.blogEs?.title ?? "")}</b>`, urls.blog_es, urls.blog_en, urls.linkedin].filter(Boolean).join("\n")
    );
    return { status: "published" };
  }

  // ── Enrutamiento ──

  const afterFacts = (s: State) => (s.facts.length >= 2 ? "draftBlogEs" : "needMaterial");
  const afterLocalize = (s: State) => (s.format === "carousel" ? "draftCarousel" : "verifyFacts");
  const afterReview = (s: State) => {
    switch (s.review?.action) {
      case "approve":
        return isBlocked(s.lint) ? "refuseApprove" : "publishBlog";
      case "edit":
        return "applyEdit";
      case "reschedule":
        return isBlocked(s.lint) ? "refuseApprove" : "schedule";
      case "reject":
      case "expire":
        return "close";
      default:
        return "humanReview";
    }
  };
  const afterWaitSchedule = (s: State) =>
    s.review?.action === "approve" ? "publishBlog" : s.review?.action === "reschedule" ? "schedule" : s.review?.action === "edit" ? "applyEdit" : "close";
  const afterDeploy = (s: State) => (s.steps.deployed ? "publishLinkedIn" : "deployPending");
  const afterLinkedIn = (s: State) => (s.retryTarget === "publishLinkedIn" ? "hold" : "indexNow");
  const afterHold = (s: State) => (s.review?.action === "reject" ? "close" : (s.retryTarget ?? "waitDeploy"));

  return new StateGraph(ContentState)
    .addNode("extractFacts", extractFacts)
    .addNode("needMaterial", needMaterial)
    .addNode("draftBlogEs", draftBlogEs)
    .addNode("draftLinkedIn", draftLinkedIn)
    .addNode("antiSlop", antiSlop)
    .addNode("localizeEn", localizeEn)
    .addNode("draftCarousel", draftCarousel)
    .addNode("verifyFacts", verifyFacts)
    .addNode("evaluate", evaluate)
    .addNode("sendPreview", sendPreview)
    .addNode("humanReview", humanReview)
    .addNode("refuseApprove", refuseApprove)
    .addNode("applyEdit", applyEdit)
    .addNode("schedule", schedule)
    .addNode("waitSchedule", waitSchedule)
    .addNode("close", close)
    .addNode("publishBlog", publishBlog)
    .addNode("waitDeploy", waitDeploy)
    .addNode("deployPending", deployPending)
    .addNode("hold", hold)
    .addNode("publishLinkedIn", publishLinkedIn)
    .addNode("indexNow", indexNow)
    .addNode("notifyPublished", notifyPublished)
    .addEdge(START, "extractFacts")
    .addConditionalEdges("extractFacts", afterFacts, ["draftBlogEs", "needMaterial"])
    .addEdge("needMaterial", END)
    .addEdge("draftBlogEs", "draftLinkedIn")
    .addEdge("draftLinkedIn", "antiSlop")
    .addEdge("antiSlop", "localizeEn")
    .addConditionalEdges("localizeEn", afterLocalize, ["draftCarousel", "verifyFacts"])
    .addEdge("draftCarousel", "verifyFacts")
    .addEdge("verifyFacts", "evaluate")
    .addEdge("evaluate", "sendPreview")
    .addEdge("sendPreview", "humanReview")
    .addConditionalEdges("humanReview", afterReview, ["publishBlog", "applyEdit", "schedule", "close", "refuseApprove", "humanReview"])
    .addEdge("refuseApprove", "humanReview")
    .addEdge("applyEdit", "verifyFacts")
    .addEdge("schedule", "waitSchedule")
    .addConditionalEdges("waitSchedule", afterWaitSchedule, ["publishBlog", "schedule", "applyEdit", "close"])
    .addEdge("close", END)
    .addEdge("publishBlog", "waitDeploy")
    .addConditionalEdges("waitDeploy", afterDeploy, ["publishLinkedIn", "deployPending"])
    .addEdge("deployPending", "hold")
    .addConditionalEdges("hold", afterHold, ["waitDeploy", "publishLinkedIn", "close"])
    .addConditionalEdges("publishLinkedIn", afterLinkedIn, ["hold", "indexNow"])
    .addEdge("indexNow", "notifyPublished")
    .addEdge("notifyPublished", END);
}

export function compileGraph(deps: AgentDeps, checkpointer: BaseCheckpointSaver) {
  return buildGraph(deps).compile({ checkpointer });
}
