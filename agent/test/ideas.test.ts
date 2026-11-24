import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandlers } from "../handlers.ts";
import type { SourceDoc } from "../inputs.ts";
import type { IdeaInput } from "../lib/db.ts";
import type { TelegramUpdate } from "../lib/telegram.ts";
import { setup } from "./helpers.ts";

const CHAT = 42;
const URL_A = "https://example.com/colas";
const PAGE = `<html><head><title>Colas</title></head><body><p>${"Una cola sobre Postgres reduce el acoplamiento entre servicios. ".repeat(6)}</p></body></html>`;
const IDEA: IdeaInput = { title: "Colas con Postgres", summary: "Reducen la latencia un 45 % en producción.", source_url: URL_A, topic: "backend" };

function bot() {
  const ctx = setup({ pages: { [URL_A]: PAGE } });
  const h = createHandlers({
    env: { TELEGRAM_CHAT_ID: String(CHAT), AGENT_TIMEZONE: "America/Bogota", SITE_URL: "https://mangel14.dev" },
    store: ctx.store,
    telegram: ctx.deps.telegram,
    graph: ctx.graph as never,
    linkedinAuthUrl: ctx.deps.linkedinAuthUrl,
  });
  let update = 1;
  const say = (text: string) => h.handleUpdate({ update_id: update++, message: { message_id: update, chat: { id: CHAT, type: "private" }, from: { id: CHAT }, text } });
  const press = (data: string, cb: Partial<NonNullable<TelegramUpdate["callback_query"]>> = {}) =>
    h.handleUpdate({ update_id: update++, callback_query: { id: `cb${update}`, from: { id: CHAT }, data, message: { message_id: 7, chat: { id: CHAT, type: "private" } }, ...cb } });
  const idea = async (over: Partial<IdeaInput> = {}) => (await ctx.store.addIdea({ ...IDEA, ...over })).id;
  const state = (contentId: string) => ctx.graph.getState({ configurable: { thread_id: contentId } });
  return { ...ctx, h, say, press, idea, state };
}

const NOTE = "Esta semana armé un gateway en FastAPI con JWT. El token de acceso dura 30 minutos y filtra 2.000 registros por dueño.";

test("Desarrollar opens the piece with the material marked external and nothing is published", async () => {
  const b = bot();
  const id = await b.idea();
  await b.press(`id:${id}`);

  assert.equal(b.ideas.get(id)!.status, "developing");
  assert.equal(b.rows.size, 1);
  const [row] = [...b.rows.values()];
  assert.equal((row as unknown as { source_type: string }).source_type, "agent_inbox");
  assert.equal(b.kv.get("active_content"), row.content_id);

  const { values } = await b.state(row.content_id);
  assert.ok(values.sources!.length >= 1);
  assert.deepEqual([...new Set(values.sources!.map((s: SourceDoc) => s.trust))], ["external"], "no source is the author's");
  assert.equal(values.sources![0].kind, "forwarded");
  assert.match(values.sources![0].text, /Colas con Postgres/);

  assert.equal(row.status, "awaiting_input", "stops at the proposal: the owner decides");
  assert.equal(b.posts.length, 0);
  assert.equal(b.files.size, 0);
  assert.ok(!b.messages.some((m) => /<b>Publicado<\/b>/.test(m.text)));
});

test("idea text cannot set draft options", async () => {
  const b = bot();
  await b.press(`id:${await b.idea({ title: "/carrusel /es con imagen", summary: "con la portada, por favor" })}`);
  const [row] = [...b.rows.values()];
  const { values } = await b.state(row.content_id);
  assert.equal(values.format, "text");
  assert.equal(values.linkedinLang, "en");
  assert.equal(values.linkedinMedia, "none");
});

test("an idea that asks for an explainer from the closed list gets a carousel; an unknown id does not", async () => {
  const b = bot();
  await b.press(`id:${await b.idea({ summary: "Un ángulo con explicador interactivo. Widget: blast-radius." })}`);
  const [row] = [...b.rows.values()];
  assert.equal((await b.state(row.content_id)).values.format, "carousel");

  const c = bot();
  await c.press(`id:${await c.idea({ summary: "Un ángulo con una pista falsa. Widget: constructor." })}`);
  const [other] = [...c.rows.values()];
  assert.equal((await c.state(other.content_id)).values.format, "text");
  assert.equal((await c.state(other.content_id)).values.linkedinMedia, "none", "the other options stay locked");
});

test("Desarrollar with an active draft does not overwrite it: the idea stays pending and the owner is told", async () => {
  const b = bot();
  await b.say(NOTE);
  const activeId = b.kv.get("active_content") as string;
  const rows = b.rows.size;
  const invoke = b.graph.invoke;
  let started = 0;
  b.graph.invoke = ((...args: Parameters<typeof invoke>) => {
    started++;
    return invoke.apply(b.graph, args);
  }) as typeof invoke;

  const id = await b.idea();
  await b.press(`id:${id}`);
  assert.equal(b.kv.get("active_content"), activeId);
  assert.equal(b.ideas.get(id)!.status, "pending");
  assert.equal(b.rows.size, rows);
  assert.equal(started, 0);
  assert.match(b.last().text, /borrador activo/);
  assert.match(b.last().text, /sigue pendiente/);

  // Once that draft is closed, the same button works
  await b.store.upsert(activeId, { status: "cancelled" });
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "developing");
  assert.notEqual(b.kv.get("active_content"), activeId);
});

test("Desarrollar during a /new collection leaves the idea pending", async () => {
  const b = bot();
  await b.say("/new");
  const id = await b.idea();
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "pending");
  assert.equal(b.rows.size, 0);
  assert.ok(b.kv.has("collecting"));
  assert.match(b.last().text, /sigue pendiente/);
});

test("a failed draft does not block a new idea", async () => {
  const b = bot();
  await b.say(NOTE);
  await b.store.upsert(b.kv.get("active_content") as string, { status: "failed" });
  const id = await b.idea();
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "developing");
});

test("two simultaneous Desarrollar taps on different ideas open a single piece", async () => {
  const b = bot();
  const [one, two] = [await b.idea(), await b.idea({ source_url: "https://example.com/otra" })];
  await Promise.all([b.press(`id:${one}`), b.press(`id:${two}`)]);
  assert.deepEqual([b.ideas.get(one)!.status, b.ideas.get(two)!.status].sort(), ["developing", "pending"]);
  assert.equal(b.rows.size, 1);
  assert.equal(b.kv.has("lock:idea-develop"), false, "the lock is released");
});

test("repeated taps on the same Desarrollar do not open two pieces", async () => {
  const b = bot();
  const id = await b.idea();
  await Promise.all([b.press(`id:${id}`), b.press(`id:${id}`)]);
  await b.press(`id:${id}`);
  assert.equal(b.rows.size, 1);
});

test("when startContent refuses on quota, the idea returns to pending and keeps its buttons", async () => {
  const b = bot();
  const id = await b.idea();
  for (let i = 0; i < 10; i++) await b.store.rateHit("new_content", 3600_000, 10);
  const cleared: number[] = [];
  b.deps.telegram.clearButtons = async (m) => void cleared.push(m);
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "pending");
  assert.equal(b.rows.size, 0);
  assert.deepEqual(cleared, []);
  assert.match(b.last().text, /Ya empecé 10 borradores/);
});

test("Descartar changes the status, clears the buttons and opens nothing", async () => {
  const b = bot();
  const id = await b.idea();
  const cleared: number[] = [];
  b.deps.telegram.clearButtons = async (m) => void cleared.push(m);
  await b.press(`ix:${id}`);
  assert.equal(b.ideas.get(id)!.status, "discarded");
  assert.deepEqual(cleared, [7]);
  assert.equal(b.rows.size, 0);
  assert.deepEqual(b.llm.calls, []);

  // An old button does not revive it
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "discarded");
  assert.equal(b.rows.size, 0);
});

test("a callback from another person or chat is ignored", async () => {
  const b = bot();
  const id = await b.idea();
  for (const cb of [{ from: { id: 999 } }, { message: { message_id: 7, chat: { id: -100, type: "group" } } }, { from: undefined }]) {
    await b.press(`id:${id}`, cb);
    await b.press(`ix:${id}`, cb);
  }
  assert.equal(b.ideas.get(id)!.status, "pending");
  assert.equal(b.rows.size, 0);
  assert.equal(b.messages.length, 0);
});

test("a callback for an unknown or malformed idea does nothing", async () => {
  const b = bot();
  const answers: (string | undefined)[] = [];
  b.deps.telegram.answerCallback = async (_id, text) => void answers.push(text);
  await b.press("id:00000000-0000-0000-0000-000000000000");
  await b.press("id:nope");
  assert.equal(b.rows.size, 0);
  assert.equal(answers.length, 2, "the callback is always answered");
});

test("Desarrollar that fails while opening the draft puts the idea back to pending", async () => {
  const b = bot();
  const id = await b.idea();
  const upsert = b.store.upsert;
  b.store.upsert = async () => {
    throw new Error("database down");
  };
  await assert.rejects(b.press(`id:${id}`), /database down/);
  assert.equal(b.ideas.get(id)!.status, "pending", "the owner can tap Desarrollar again");
  assert.equal(b.kv.get("lock:idea-develop"), undefined, "the lock is released");

  b.store.upsert = upsert;
  await b.press(`id:${id}`);
  assert.equal(b.ideas.get(id)!.status, "developing");
});
