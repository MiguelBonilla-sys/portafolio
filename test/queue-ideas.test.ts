import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { problems, queueIdeas } from "../scripts/queue-ideas.mjs";

const ideas = JSON.parse(readFileSync(new URL("../docs/content/quadship-ideas.json", import.meta.url), "utf8"));

test("las 5 ideas de QuadShip cumplen los límites del endpoint y piden un explicador distinto", () => {
  assert.equal(ideas.length, 5);
  for (const i of ideas) assert.deepEqual(problems(i), [], i.title);
  const widgets = ideas.map((i: { summary: string }) => i.summary.match(/Widget: ([a-z-]+)\./)?.[1]);
  assert.equal(new Set(widgets).size, 5);
  for (const i of ideas) assert.doesNotMatch(JSON.stringify(i), /35\s?%/, "el porcentaje de avance no se menciona");
});

test("problems rechaza campos faltantes, largos, http y extras", () => {
  assert.ok(problems({ title: "", summary: "x", topic: "t", source_url: "https://a.com" }).some((p) => p.startsWith("title")));
  assert.ok(problems({ title: "t", summary: "x".repeat(2001), topic: "t", source_url: "https://a.com" }).some((p) => p.startsWith("summary")));
  assert.ok(problems({ title: "t", summary: "s", topic: "t", source_url: "http://a.com" }).some((p) => p.startsWith("source_url")));
  assert.ok(problems({ title: "t", summary: "s", topic: "t", source_url: "https://user:pw@a.com" }).some((p) => p.startsWith("source_url")), "credenciales en la URL");
  assert.ok(problems({ title: "t", summary: "s", topic: "t", source_url: "https://a.com", extra: 1 }).some((p) => p.includes("extra")));
});

test("queueIdeas envía el token por cabecera, no lo imprime y se detiene ante 401/404", async () => {
  const sent: { url: string; auth: string | null; body: string }[] = [];
  const logs: string[] = [];
  const ok = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), auth: (init?.headers as Record<string, string>).Authorization, body: String(init?.body) });
    return new Response(JSON.stringify({ id: `id-${sent.length}` }), { status: 202 });
  };
  const r = await queueIdeas({ ideas, baseUrl: "https://site.test", token: "secret-token-1234567890", fetchImpl: ok, log: (m: string) => logs.push(m) });
  assert.equal(r.length, 5);
  assert.ok(r.every((x: { ok: boolean }) => x.ok));
  assert.equal(sent[0].url, "https://site.test/api/agent/inbox");
  assert.equal(sent[0].auth, "Bearer secret-token-1234567890");
  assert.ok(!logs.join("\n").includes("secret-token"), "el token nunca se imprime");

  const notFound = async () => new Response("Not found", { status: 404 });
  const stopped = await queueIdeas({ ideas, baseUrl: "https://site.test", token: "x".repeat(20), fetchImpl: notFound, log: () => {} });
  assert.equal(stopped.length, 1, "no insiste después de un 404");
  const dry = await queueIdeas({ ideas, baseUrl: "https://site.test", token: undefined, dryRun: true, fetchImpl: () => assert.fail("no debe enviar"), log: () => {} });
  assert.ok(dry.every((x: { ok: boolean }) => x.ok));
});
