import { test } from "node:test";
import assert from "node:assert/strict";
import { Command, MemorySaver } from "@langchain/langgraph";
import { compileGraph, markUnknownNumbers } from "../graph.ts";
import type { AgentDeps } from "../deps.ts";
import type { ContentStore, ContentRow } from "../lib/db.ts";
import { LinkedInAuthError, type LinkedInClient } from "../lib/linkedin.ts";
import type { Review } from "../state.ts";

const SOURCE = `Esta semana armé un gateway en FastAPI con JWT. El token de acceso dura 30 minutos y el de refresco 7 días.
El gateway pide hasta 2.000 registros a la API de inventario y filtra en memoria por dueño. Repo: https://github.com/MiguelBonilla-sys/API_AUTH_HACKATON`;

const BODY_ES = `## El problema

El gateway en FastAPI recibe un token JWT. El token de acceso dura 30 minutos y el de refresco 7 días. ${"Texto de relleno técnico con detalle. ".repeat(6)}

## Lo que hice

Pide hasta 2.000 registros y filtra en memoria por dueño.`;

/** LLM falso: decide la respuesta según el prompt de sistema */
function fakeLlm(opts: { linkedinExtra?: string; inventNumber?: boolean } = {}) {
  const calls: string[] = [];
  return {
    calls,
    async invoke(messages: [string, string][]) {
      const [system, user] = [messages[0][1], messages[1][1]];
      const reply = (content: string) => ({ content });
      if (system.includes("Extraes hechos")) {
        calls.push("facts");
        return reply(
          JSON.stringify({
            facts: ["Gateway en FastAPI con JWT", "Token de acceso de 30 minutos y de refresco de 7 días", "Pide hasta 2.000 registros y filtra en memoria"],
            pillar: "backend",
            topic: "Control de acceso en un gateway FastAPI",
            sourceUrls: ["https://github.com/MiguelBonilla-sys/API_AUTH_HACKATON", "https://inventado.example.com"],
          })
        );
      }
      if (system.includes("artículos de blog técnicos")) {
        calls.push("blogEs");
        return reply(
          "```json\n" +
            JSON.stringify({
              title: "Control de acceso por propiedad en FastAPI",
              description: "Cómo un gateway FastAPI con JWT filtra los activos de cada usuario y qué límites tiene ese diseño en producción.",
              summary: "Un gateway en FastAPI valida el JWT, consulta la API de inventario y devuelve solo los activos del usuario. El token de acceso dura 30 minutos.",
              tags: ["FastAPI", "JWT"],
              faq: [{ q: "¿Cuánto dura el token?", a: "El de acceso 30 minutos y el de refresco 7 días." }],
              body: opts.inventNumber ? `${BODY_ES}\n\nRedujo la latencia un 45 %.` : BODY_ES,
            }) +
            "\n```"
        );
      }
      if (system.includes("adapt technical blog posts")) {
        calls.push("blogEn");
        const es = JSON.parse(user.slice(user.indexOf("JSON:\n") + 6, user.indexOf("\n\nReturn")));
        return reply(JSON.stringify({ ...es, title: "Ownership-based access control in FastAPI", body: es.body.replace("El problema", "The problem") }));
      }
      if (system.includes("posts de LinkedIn")) {
        calls.push("linkedin");
        return reply(`Mi gateway en FastAPI filtra 2.000 registros en memoria por dueño.\n\nEl token de acceso dura 30 minutos.${opts.linkedinExtra ?? ""}\n\n#FastAPI`);
      }
      if (system.includes("editor anti-slop")) {
        calls.push("edit");
        const text = user.slice(user.indexOf('"""') + 3, user.lastIndexOf('"""')).trim();
        return reply(text.replace(/¿Y tú qué opinas\? ?👇?/g, "").replace(/potenciar/g, "mejorar").trim());
      }
      if (system.includes("carruseles")) {
        calls.push("slides");
        return reply(JSON.stringify({ slides: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `Lámina ${i}`, body: "Token de 30 minutos." })) }));
      }
      if (system.includes("Evalúas")) {
        calls.push("eval");
        return reply(JSON.stringify({ specificity: 4, factDensity: 4, aiMarkers: 5, pillarFit: 5, note: "Falta un resultado medible." }));
      }
      throw new Error(`prompt inesperado: ${system.slice(0, 60)}`);
    },
  };
}

function memoryStore() {
  const rows = new Map<string, ContentRow>();
  const kv = new Map<string, unknown>();
  const store: ContentStore = {
    async ensureSchema() {},
    async upsert(id, fields) {
      rows.set(id, { ...(rows.get(id) ?? { content_id: id }), ...fields } as ContentRow);
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async byStatus(status) {
      return [...rows.values()].filter((r) => r.status === status);
    },
    async dueScheduled() {
      return [];
    },
    async staleAwaiting() {
      return [];
    },
    async since() {
      return [];
    },
    async kvGet<T>(k: string) {
      return (kv.get(k) as T) ?? null;
    },
    async kvSet(k, v) {
      kv.set(k, v);
    },
    async kvDelete(k) {
      kv.delete(k);
    },
    async claimUpdate() {
      return true;
    },
  };
  return { store, rows };
}

function setup(opts: Parameters<typeof fakeLlm>[0] & { deployOk?: boolean; linkedinAuthFails?: number } = {}) {
  const llm = fakeLlm(opts);
  const { store, rows } = memoryStore();
  const messages: { text: string; buttons?: string[] }[] = [];
  const documents: string[] = [];
  const files = new Map<string, string>();
  const posts: string[] = [];
  const comments: string[] = [];
  let authFailures = opts.linkedinAuthFails ?? 0;
  let deployOk = opts.deployOk ?? true;

  const linkedin: LinkedInClient = {
    async createPost(text) {
      posts.push(text);
      return `urn:li:share:${posts.length}`;
    },
    async comment(_urn, text) {
      comments.push(text);
    },
    async uploadDocument() {
      return "urn:li:document:1";
    },
  };

  const deps: AgentDeps = {
    llm,
    store,
    telegram: {
      async sendMessage(text, o) {
        messages.push({ text, buttons: o?.buttons?.flat().map((b) => b.callback_data.split(":")[0]) });
        return messages.length;
      },
      async sendDocument(_f, name) {
        documents.push(name);
        return 0;
      },
      async answerCallback() {},
      async clearButtons() {},
    },
    github: {
      async getFile(path) {
        return files.get(path);
      },
      async putFile(path, content) {
        files.set(path, content);
        return { commitSha: `sha-${files.size}` };
      },
    },
    async linkedin() {
      if (authFailures > 0) {
        authFailures--;
        throw new LinkedInAuthError("token vencido");
      }
      return linkedin;
    },
    linkedinAuthUrl: () => "https://example.com/api/linkedin/auth",
    renderCarousel: async () => new Uint8Array([37, 80, 68, 70]),
    indexNow: async () => 200,
    fetchStatus: async () => (deployOk ? 200 : 404),
    sleep: async () => {},
    siteUrl: "https://example.com",
    timezone: "America/Bogota",
    deployWaitSeconds: 1,
    now: () => new Date("2026-10-20T15:00:00Z"),
  };

  const graph = compileGraph(deps, new MemorySaver());
  const contentId = "11111111-2222-3333-4444-555555555555";
  const config = { configurable: { thread_id: contentId } };
  return {
    graph,
    llm,
    rows,
    messages,
    documents,
    files,
    posts,
    comments,
    contentId,
    setDeploy: (ok: boolean) => (deployOk = ok),
    start: (input: Record<string, unknown> = {}) => graph.invoke({ contentId, source: SOURCE, ...input }, config),
    resume: (review: Review) => graph.invoke(new Command({ resume: review }), config),
    state: async () => (await graph.getState(config)).values,
  };
}

test("flujo feliz: genera, pide aprobación y publica blog, LinkedIn e IndexNow", async () => {
  const t = setup();
  await t.start();
  let s = await t.state();
  assert.equal(s.status, "awaiting_approval");
  assert.deepEqual(t.messages.at(-1)?.buttons, ["a", "e", "s", "r"]);
  assert.ok(t.documents.includes(`${s.slug}.md`));
  // Las fuentes solo incluyen URLs que estaban en las notas
  assert.deepEqual(s.sourceUrls, ["https://github.com/MiguelBonilla-sys/API_AUTH_HACKATON"]);

  await t.resume({ action: "approve" });
  s = await t.state();
  assert.equal(s.status, "published");
  assert.ok(t.files.has(`content/blog/es/${s.slug}.mdx`));
  assert.ok(t.files.has(`content/blog/en/${s.slug}.mdx`));
  assert.match(t.files.get(`content/blog/es/${s.slug}.mdx`)!, /draft: false/);
  assert.equal(t.posts.length, 1);
  assert.match(t.comments[0], new RegExp(`https://example.com/en/blog/${s.slug}`));
  assert.equal(t.rows.get(t.contentId)?.status, "published");
});

test("si otro artículo ya usa el slug, publica con sufijo y no lo pisa", async () => {
  const t = setup();
  await t.start();
  const { slug } = await t.state();
  const other = "---\ncontentId: otra-pieza\n---\nArtículo anterior\n";
  t.files.set(`content/blog/es/${slug}.mdx`, other);

  await t.resume({ action: "approve" });
  const s = await t.state();
  assert.equal(s.status, "published");
  assert.equal(s.slug, `${slug}-2`);
  assert.equal(t.files.get(`content/blog/es/${slug}.mdx`), other);
  assert.ok(t.files.has(`content/blog/es/${slug}-2.mdx`));
  assert.ok(t.files.has(`content/blog/en/${slug}-2.mdx`));
  assert.match(t.comments[0], new RegExp(`/blog/${slug}-2$`));
});

test("una cifra inventada por el modelo se marca como [DATO?] y bloquea la aprobación", async () => {
  const t = setup({ inventNumber: true });
  await t.start();
  const s = await t.state();
  assert.equal(s.status, "blocked");
  assert.ok(s.missingFacts.some((m: string) => m.includes("45")));
  assert.deepEqual(t.messages.at(-1)?.buttons, ["e", "r"]);

  // Aprobar un bloqueado no publica
  await t.resume({ action: "approve" });
  assert.equal(t.posts.length, 0);
  assert.equal(t.files.size, 0);
});

test("el editor quita marcas del linter antes de mostrar el borrador", async () => {
  const t = setup({ linkedinExtra: "\n\n¿Y tú qué opinas? 👇" });
  await t.start();
  const s = await t.state();
  assert.ok(t.llm.calls.includes("edit"));
  assert.doesNotMatch(s.linkedin, /qué opinas/);
  assert.equal(s.status, "awaiting_approval");
});

test("editar con instrucciones regenera y vuelve a pedir aprobación; la cifra que da el autor ya no se marca", async () => {
  const t = setup({ inventNumber: true });
  await t.start();
  assert.equal((await t.state()).status, "blocked");
  await t.resume({ action: "edit", instructions: "La latencia bajó un 45 % medida con k6." });
  const s = await t.state();
  assert.equal(s.status, "awaiting_approval");
  assert.equal(s.missingFacts.length, 0);
});

test("reprogramar deja la pieza en espera y el cron la publica después", async () => {
  const t = setup();
  await t.start();
  await t.resume({ action: "reschedule", at: "2026-10-22T13:00:00.000Z" });
  let s = await t.state();
  assert.equal(s.status, "scheduled");
  assert.equal(t.posts.length, 0);
  await t.resume({ action: "approve" });
  s = await t.state();
  assert.equal(s.status, "published");
});

test("si el deploy no responde, queda en espera; al reintentar no se repite el commit", async () => {
  const t = setup({ deployOk: false });
  await t.start();
  await t.resume({ action: "approve" });
  let s = await t.state();
  assert.equal(s.status, "awaiting_deploy");
  assert.equal(t.files.size, 2);
  t.setDeploy(true);
  await t.resume({ action: "retry" });
  s = await t.state();
  assert.equal(s.status, "published");
  assert.equal(t.files.size, 2);
  assert.equal(t.posts.length, 1);
});

test("si LinkedIn pide reconectar, avisa y al reintentar publica una sola vez", async () => {
  const t = setup({ linkedinAuthFails: 1 });
  await t.start();
  await t.resume({ action: "approve" });
  let s = await t.state();
  assert.equal(s.retryTarget, "publishLinkedIn");
  assert.match(t.messages.at(-1)!.text, /reconectarse/);
  await t.resume({ action: "retry" });
  s = await t.state();
  assert.equal(s.status, "published");
  assert.equal(t.posts.length, 1);
  assert.equal(t.comments.length, 1);
});

test("rechazar cierra sin publicar", async () => {
  const t = setup();
  await t.start();
  await t.resume({ action: "reject" });
  assert.equal((await t.state()).status, "rejected");
  assert.equal(t.files.size, 0);
});

test("formato carrusel genera láminas y adjunta el PDF en la vista previa", async () => {
  const t = setup();
  await t.start({ format: "carousel" });
  const s = await t.state();
  assert.equal(s.slides.length, 6);
  assert.ok(t.documents.some((d) => d.endsWith(".pdf")));
});

test("markUnknownNumbers respeta el código y las cifras conocidas", () => {
  const r = markUnknownNumbers("Bajó de 1,8 s a 400 ms.\n```\nport = 8080\n```", new Set(["1.8"]));
  assert.equal(r.text, "Bajó de 1,8 s a [DATO?: 400] ms.\n```\nport = 8080\n```");
});
