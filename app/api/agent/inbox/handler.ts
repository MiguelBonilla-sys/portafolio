import { z } from "zod";
import type { AgentEnv } from "../../../../agent/config.ts";
import { LIMITS } from "../../../../agent/inputs.ts";
import { hasBearer, safeEqual } from "../../../../agent/lib/auth.ts";
import type { ContentStore, IdeaInput } from "../../../../agent/lib/db.ts";
import { logError } from "../../../../agent/lib/redact.ts";

// Four short fields; leaves room for JSON-escaped text at the field limits.
const MAX_BODY = 16 * 1024;
const MIN_TOKEN = 16;
const RATE_KEY = "agent_inbox";
// ponytail: rateHit (agent/lib/db.ts) checks then inserts, so it is not atomic. The real ceiling is
// IDEAS_PER_HOUR plus whatever is in flight when the limit is reached. Accepted because only one
// instance holds the token and an idea costs a row and a Telegram message, never an LLM call.
const IDEAS_PER_HOUR = 20;

const text = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\0]*$/); // Postgres text rejects NUL

const ideaSchema = z.strictObject({
  title: text(LIMITS.ideaTitle),
  summary: text(LIMITS.ideaSummary),
  topic: text(LIMITS.ideaTopic),
  source_url: z
    .url({ protocol: /^https$/, normalize: true })
    .max(LIMITS.ideaUrl)
    .refine((u) => !/^https:\/\/[^/?#]*@/i.test(u)), // no credentials in a stored and displayed URL
});

export interface InboxDeps {
  env: Pick<AgentEnv, "AGENT_INBOX_TOKEN" | "ADMIN_SECRET">;
  /** Lazy, so a refused request never opens the database */
  store: () => Promise<Pick<ContentStore, "rateHit" | "addIdea">>;
  notify: (id: string, idea: IdeaInput) => void;
}

/** Validated here and not in the env schema: getEnv() throws for the whole engine on one invalid variable. */
function usableToken({ AGENT_INBOX_TOKEN: token, ADMIN_SECRET }: InboxDeps["env"]): string | null {
  if (!token) return null;
  if (token.length < MIN_TOKEN || safeEqual(token, ADMIN_SECRET)) {
    logError("agent-inbox", new Error("AGENT_INBOX_TOKEN is misconfigured: too short or equal to ADMIN_SECRET"));
    return null;
  }
  return token;
}

/** Queues an external idea for the owner to decide on. No LLM, no graph: nothing here can publish. */
export async function handleInbox(req: Request, deps: InboxDeps): Promise<Response> {
  const token = usableToken(deps.env);
  if (!token) return new Response("Not found", { status: 404 });
  if (!hasBearer(req, token)) return new Response("Unauthorized", { status: 401 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return new Response("Payload too large", { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const parsed = ideaSchema.safeParse(body);
  // Field names only: the response never echoes what the caller sent
  if (!parsed.success) return Response.json({ error: "invalid_idea", fields: [...new Set(parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean))] }, { status: 400 });

  try {
    const store = await deps.store();
    if (!(await store.rateHit(RATE_KEY, 3600_000, IDEAS_PER_HOUR))) return new Response("Too many requests", { status: 429 });
    const { id, created } = await store.addIdea(parsed.data);
    // ponytail: a failed notification leaves the idea pending without buttons. Add a resend path if that ever happens.
    if (created) deps.notify(id, parsed.data);
    return Response.json({ id }, { status: 202 });
  } catch (e) {
    logError("agent-inbox", e);
    return new Response("Internal error", { status: 500 });
  }
}
