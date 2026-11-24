// Sube ideas a la bandeja del agente (POST /api/agent/inbox) desde un archivo JSON.
// Uso:  AGENT_INBOX_TOKEN=... node scripts/queue-ideas.mjs docs/content/quadship-ideas.json [--dry-run]
// El token se lee del entorno y nunca se imprime. Cada idea llega a Telegram como pendiente; no se publica nada.
// --only=1,3 sube solo esas ideas (por número). --fresh agrega #r<código> a la fuente para que cuente como idea nueva
// (úsalo si una idea quedó atascada en «desarrollándose» con una versión anterior del agente).
// BASE_URL cambia el sitio (por defecto https://mangel14.dev). Repetir una source_url no duplica la idea.
import { readFileSync } from "node:fs";

const FIELDS = ["title", "summary", "topic", "source_url"];

/** Valida una idea con los mismos límites del endpoint (agent/inputs.ts LIMITS) */
export function problems(idea) {
  const out = [];
  const max = { title: 200, summary: 2000, topic: 80, source_url: 2000 };
  for (const f of FIELDS) {
    if (typeof idea[f] !== "string" || !idea[f].trim()) out.push(`${f}: falta`);
    else if (idea[f].length > max[f]) out.push(`${f}: ${idea[f].length} caracteres (máximo ${max[f]})`);
  }
  if (typeof idea.source_url === "string" && (!/^https:\/\/[^/?#]+/.test(idea.source_url) || /^https:\/\/[^/?#]*@/i.test(idea.source_url))) out.push("source_url: solo https y sin credenciales");
  const extra = Object.keys(idea).filter((k) => !FIELDS.includes(k));
  if (extra.length) out.push(`campos no admitidos: ${extra.join(", ")}`);
  return out;
}

/** @param {{ ideas: any[], baseUrl: string, token?: string, fetchImpl?: typeof fetch, dryRun?: boolean, only?: number[], fresh?: boolean, log?: (message: string) => void }} opts */
export async function queueIdeas({ ideas, baseUrl, token, fetchImpl = fetch, dryRun = false, only = undefined, fresh = false, log = console.log }) {
  const results = [];
  for (const [i, original] of ideas.entries()) {
    if (only && !only.includes(i + 1)) continue;
    const idea = fresh && typeof original.source_url === "string" ? { ...original, source_url: `${original.source_url.split("#")[0]}#r${Date.now().toString(36)}` } : original;
    const label = `${i + 1}/${ideas.length} ${idea.title?.slice(0, 50) ?? ""}`;
    const bad = problems(idea);
    if (bad.length) {
      log(`✗ ${label}\n  ${bad.join("\n  ")}`);
      results.push({ ok: false, status: 0 });
      continue;
    }
    if (dryRun) {
      log(`· ${label} (dry-run, no se envía)`);
      results.push({ ok: true, status: 0 });
      continue;
    }
    const res = await fetchImpl(`${baseUrl}/api/agent/inbox`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(idea),
    });
    const body = await res.text();
    if (res.status === 202) log(`✓ ${label} → en cola (${JSON.parse(body).id})`);
    else if (res.status === 404) log("✗ 404: el inbox no está activo. Falta AGENT_INBOX_TOKEN en Vercel (o tiene menos de 16 caracteres, o es igual a ADMIN_SECRET) y redeplegar.");
    else if (res.status === 401) log("✗ 401: el token no coincide con AGENT_INBOX_TOKEN de Vercel.");
    else if (res.status === 429) log("✗ 429: más de 20 ideas en la última hora. Espera y repite.");
    else log(`✗ ${label} → ${res.status} ${body.slice(0, 200)}`);
    results.push({ ok: res.status === 202, status: res.status });
    if (res.status === 401 || res.status === 404 || res.status === 429) break;
  }
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const fresh = args.includes("--fresh");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice(7).split(",").map(Number).filter(Boolean) : undefined;
  const token = process.env.AGENT_INBOX_TOKEN;
  if (!file) {
    console.error("Uso: AGENT_INBOX_TOKEN=... node scripts/queue-ideas.mjs <archivo.json> [--dry-run]");
    process.exit(2);
  }
  if (!dryRun && !token) {
    console.error("Falta AGENT_INBOX_TOKEN en el entorno.");
    process.exit(2);
  }
  const ideas = JSON.parse(readFileSync(file, "utf8"));
  const results = await queueIdeas({ ideas, baseUrl: (process.env.BASE_URL ?? "https://mangel14.dev").replace(/\/$/, ""), token, dryRun, only, fresh });
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
