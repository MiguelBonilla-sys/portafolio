import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentEnv } from "../config.ts";
import { createLlm, providerHeaders } from "../lib/llm.ts";

test("providerHeaders sends the session id only to OpenCode and keeps it stable", () => {
  const a = providerHeaders("https://opencode.ai/zen/go/v1");
  const b = providerHeaders("https://opencode.ai/zen/go/v1");
  assert.match(a!["x-opencode-session"], /^[0-9a-f-]{36}$/);
  assert.equal(a!["x-opencode-session"], b!["x-opencode-session"], "stable per instance");
  assert.equal(providerHeaders("https://api.openai.com/v1"), undefined);
  assert.equal(providerHeaders("https://evil-opencode.ai.example.com/v1"), undefined);
  assert.equal(providerHeaders("not a url"), undefined);
  assert.equal(providerHeaders(undefined), undefined);
  assert.deepEqual(providerHeaders("https://api.opencode.ai/v1", "s-1"), { "x-opencode-session": "s-1", "User-Agent": "content-engine/1.0" });
});

const reply = () =>
  new Response(JSON.stringify({ id: "c1", object: "chat.completion", created: 1, model: "m", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "ok" } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

async function headersSent(baseURL: string) {
  const real = globalThis.fetch;
  let seen: Headers | undefined;
  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    seen = new Headers(init?.headers);
    return reply();
  }) as typeof fetch;
  try {
    const llm = createLlm({ LLM_BASE_URL: baseURL, LLM_API_KEY: "k", LLM_MODEL: "m" } as AgentEnv);
    await llm.invoke([["user", "hola"]]);
    return seen;
  } finally {
    globalThis.fetch = real;
  }
}

test("the real request to OpenCode carries x-opencode-session; another provider does not get it", async () => {
  const opencode = await headersSent("https://opencode.ai/zen/go/v1");
  assert.ok(opencode?.get("x-opencode-session"), "OpenCode rejects calls without the session header");
  assert.equal(opencode?.get("user-agent"), "content-engine/1.0", "and with the SDK default User-Agent");
  assert.doesNotMatch(opencode?.get("x-opencode-session") ?? "", /portafolio|mangel|miguel|bonilla/i, "the session id carries no names");
  const other = await headersSent("https://api.example.com/v1");
  assert.equal(other?.get("x-opencode-session"), null);
  assert.notEqual(other?.get("user-agent"), "content-engine/1.0");
});
