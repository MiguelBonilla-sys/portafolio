// Dobles en memoria para probar el grafo y los manejadores sin red ni base de datos.
import { MemorySaver } from "@langchain/langgraph";
import type { AgentDeps } from "../deps.ts";
import { canTransition, type EditorialStatus } from "../editorial.ts";
import { compileGraph } from "../graph.ts";
import type { Collection, ContentEvent, ContentRow, ContentStore } from "../lib/db.ts";
import { LinkedInAuthError, type LinkedInClient } from "../lib/linkedin.ts";
import type { SafeResponse } from "../lib/safe-fetch.ts";
import type { InlineButton, TelegramClient } from "../lib/telegram.ts";

export const NOTE = `Esta semana armé un gateway en FastAPI con JWT para una API de inventario que no tenía usuarios.
El token de acceso dura 30 minutos y el de refresco 7 días. El gateway pide hasta 2.000 registros a la API y filtra en memoria por dueño.
Escribí pruebas de integración para el filtro por dueño.`;

const PARA = "El gateway valida el token antes de llamar a la API externa y descarta lo que no pertenece al usuario. ";

export const BODY_ES = `## El problema

La API de inventario no tenía usuarios: devolvía todo. El token de acceso dura 30 minutos y el de refresco 7 días. ${PARA.repeat(8)}

## La decisión

Pide hasta 2.000 registros y filtra en memoria por dueño. ${PARA.repeat(8)}

## Pruebas

Las pruebas de integración cubren el filtro por dueño. ${PARA.repeat(8)}`;

export interface FakeOpts {
  linkedinExtra?: string;
  inventNumber?: boolean;
  /** Afirmaciones que devuelve el investigador */
  claims?: { text: string; sources: string[]; support?: string }[];
  questions?: string[];
  flow?: { title: string; steps: string[] } | null;
  topics?: string[];
}

/** LLM falso: decide la respuesta según el prompt de sistema */
export function fakeLlm(opts: FakeOpts = {}) {
  const calls: string[] = [];
  const prompts: { system: string; user: string }[] = [];
  return {
    calls,
    prompts,
    async invoke(messages: [string, string][]) {
      const [system, user] = [messages[0][1], messages[1][1]];
      prompts.push({ system, user });
      const reply = (content: string) => ({ content });
      if (system.includes("base de un artículo verificable")) {
        calls.push("research");
        return reply(
          JSON.stringify({
            topic: "Control de acceso por propiedad en un gateway FastAPI",
            topics: opts.topics ?? ["diseño del sistema", "decisiones de seguridad", "pruebas"],
            category: "backend",
            articleType: "case-study",
            angle: "filtrar por dueño en el gateway sin tocar la API original",
            claims: opts.claims ?? [
              { text: "Gateway en FastAPI con JWT delante de una API sin usuarios", sources: ["S1"], support: "none" },
              { text: "El token de acceso dura 30 minutos y el de refresco 7 días", sources: ["S1"], support: "none" },
              { text: "Pide hasta 2.000 registros y filtra en memoria por dueño", sources: ["S1"], support: "none" },
            ],
            questions: opts.questions ?? [],
            privateMaterial: [],
            flow: opts.flow ?? null,
          })
        );
      }
      if (system.includes("artículos técnicos en español")) {
        calls.push("blogEs");
        return reply(
          "```json\n" +
            JSON.stringify({
              title: "Control de acceso por propiedad en FastAPI",
              description: "Cómo un gateway FastAPI con JWT filtra los activos de cada usuario y qué límites tiene ese diseño en producción.",
              summary: "Un gateway en FastAPI valida el JWT, consulta la API de inventario y devuelve solo los activos del usuario. El token de acceso dura 30 minutos y el filtro corre en memoria sobre hasta 2.000 registros por consulta.",
              tags: ["FastAPI", "JWT"],
              faq: [],
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
      if (system.includes("Eres el editor de")) {
        calls.push("edit");
        const text = user.slice(user.indexOf('"""') + 3, user.lastIndexOf('"""')).trim();
        if (user.includes("Instrucciones del autor") && /inicio/.test(user) && text.startsWith("## El problema")) {
          return reply(text.replace("La API de inventario no tenía usuarios: devolvía todo.", "Tenía que limitar qué ve cada usuario sin tocar la API original."));
        }
        return reply(text.replace(/¿Y tú qué opinas\? ?👇?/g, "").replace(/potenciar/g, "mejorar").trim());
      }
      if (system.includes("carruseles")) {
        calls.push("slides");
        return reply(JSON.stringify({ slides: [1, 2, 3, 4, 5, 6].map((i) => ({ title: `Lámina ${i}`, body: "Token de 30 minutos." })) }));
      }
      if (system.includes("Evalúas")) {
        calls.push("eval");
        return reply(JSON.stringify({ specificity: 4, factDensity: 4, aiMarkers: 5, categoryFit: 5, note: "Falta un resultado medible." }));
      }
      throw new Error(`prompt inesperado: ${system.slice(0, 60)}`);
    },
  };
}

export function memoryStore() {
  const rows = new Map<string, ContentRow & { created_at?: string }>();
  const kv = new Map<string, unknown>();
  const events: (ContentEvent & { contentId: string })[] = [];
  const claimed = new Set<number>();
  const rate = new Map<string, number[]>();
  const store: ContentStore = {
    async ensureSchema() {},
    async upsert(id, fields) {
      rows.set(id, { ...(rows.get(id) ?? { content_id: id, updated_at: new Date().toISOString() }), ...fields } as ContentRow);
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async byStatus(status) {
      return [...rows.values()].filter((r) => r.status === status);
    },
    async recent(limit) {
      return [...rows.values()].reverse().slice(0, limit);
    },
    async findByPrefix(prefix) {
      const found = [...rows.values()].filter((r) => r.content_id.startsWith(prefix));
      return found.length === 1 ? found[0] : null;
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
    async event(contentId, e) {
      events.push({ contentId, ...e });
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
    async kvTake<T>(k: string) {
      const v = (kv.get(k) as T) ?? null;
      kv.delete(k);
      return v;
    },
    async collect(k, part, open) {
      const current = kv.get(k) as Collection | undefined;
      if (!current && !open) return null;
      const next: Collection = current
        ? { ...current, parts: [...current.parts, part] }
        : { startedAt: new Date().toISOString(), parts: [part], ...(open && open.target ? { target: open.target } : {}) };
      kv.set(k, next);
      return next;
    },
    async claimUpdate(id) {
      if (claimed.has(id)) return false;
      claimed.add(id);
      return true;
    },
    async rateHit(key, windowMs, max) {
      const now = Date.now();
      const hits = (rate.get(key) ?? []).filter((t) => t > now - windowMs);
      if (hits.length >= max) return false;
      rate.set(key, [...hits, now]);
      return true;
    },
    async tryLock(key) {
      if (kv.has(key)) return false;
      kv.set(key, { lock: true });
      return true;
    },
  };
  return { store, rows, kv, events };
}

export interface SetupOpts extends FakeOpts {
  deployOk?: boolean;
  linkedinAuthFails?: number;
  linkedinFails?: number;
  files?: Record<string, Uint8Array>;
  pages?: Record<string, string>;
  vision?: boolean;
}

export function setup(opts: SetupOpts = {}) {
  const llm = fakeLlm(opts);
  const { store, rows, kv, events } = memoryStore();
  const messages: { id: number; text: string; buttons?: InlineButton[][] }[] = [];
  const edits: { id: number; text: string }[] = [];
  const documents: string[] = [];
  const photos: string[] = [];
  const files = new Map<string, string>();
  const posts: { text: string; image?: string }[] = [];
  const comments: string[] = [];
  let authFailures = opts.linkedinAuthFails ?? 0;
  let failures = opts.linkedinFails ?? 0;
  let deployOk = opts.deployOk ?? true;
  let nextId = 100;

  const telegram: TelegramClient = {
    async sendMessage(text, o) {
      const id = nextId++;
      messages.push({ id, text, buttons: o?.buttons });
      return id;
    },
    async editMessage(id, text) {
      edits.push({ id, text });
    },
    async sendDocument(_f, name) {
      documents.push(name);
      return nextId++;
    },
    async sendPhoto(_f, name) {
      photos.push(name);
      return nextId++;
    },
    async answerCallback() {},
    async clearButtons() {},
    async downloadFile(fileId) {
      const f = opts.files?.[fileId];
      if (!f) throw new Error("archivo inexistente");
      return f;
    },
  };

  const linkedinClient: LinkedInClient = {
    async createPost(text, o) {
      if (failures > 0) {
        failures--;
        throw new Error("LinkedIn createPost: 422 {\"message\":\"duplicate\"}");
      }
      posts.push({ text, image: o?.imageUrn });
      return `urn:li:share:${posts.length}`;
    },
    async comment(_urn, text) {
      comments.push(text);
    },
    async uploadDocument() {
      return "urn:li:document:1";
    },
    async uploadImage() {
      return "urn:li:image:1";
    },
  };

  const deps: AgentDeps = {
    llm,
    telegram,
    store,
    github: {
      async getFile(path) {
        return files.get(path);
      },
      async putFile(path, content) {
        files.set(path, content);
        return { commitSha: `sha${files.size}` };
      },
    },
    inputs: {
      async download(fileId) {
        return telegram.downloadFile(fileId, 10_000_000);
      },
      async fetchUrl(url): Promise<SafeResponse> {
        const html = opts.pages?.[url];
        if (!html) throw new Error("no encontrada");
        return { url, status: 200, contentType: "text/html; charset=utf-8", body: Buffer.from(html) };
      },
      describeImage: opts.vision ? async () => "Diagrama con tres cajas: cliente, gateway y API." : undefined,
    },
    async linkedin() {
      if (authFailures > 0) {
        authFailures--;
        throw new LinkedInAuthError("token vencido");
      }
      return linkedinClient;
    },
    linkedinAuthUrl: () => "https://mangel14.dev/api/linkedin/auth?t=x",
    renderCarousel: async () => new Uint8Array([1, 2, 3]),
    renderVisual: async () => new Uint8Array([4, 5, 6]),
    indexNow: async () => 202,
    fetchStatus: async () => (deployOk ? 200 : 404),
    fetchPage: async (url) => ({
      status: 200,
      html: `<title>Post | Miguel Bonilla</title><link rel="canonical" href="${url}"/><link rel="alternate" hrefLang="en" href="x"/><script type="application/ld+json">{"@type":"BlogPosting"}</script>`,
    }),
    sleep: async () => {},
    siteUrl: "https://mangel14.dev",
    timezone: "America/Bogota",
    deployWaitSeconds: 1,
    now: () => new Date("2026-10-23T15:00:00Z"),
  };

  const graph = compileGraph(deps, new MemorySaver());
  return {
    graph,
    deps,
    llm,
    store,
    rows,
    kv,
    events,
    messages,
    edits,
    documents,
    photos,
    files,
    posts,
    comments,
    setDeploy: (ok: boolean) => (deployOk = ok),
    last: () => messages[messages.length - 1],
    buttonData: () => messages.flatMap((m) => m.buttons?.flat().map((b) => b.callback_data) ?? []),
  };
}

/** Todas las transiciones registradas son válidas según editorial.ts */
export function invalidTransitions(events: (ContentEvent & { contentId: string })[]): string[] {
  return events.filter((e) => e.from && e.from !== e.to && !canTransition(e.from as EditorialStatus, e.to)).map((e) => `${e.from} → ${e.to}`);
}
