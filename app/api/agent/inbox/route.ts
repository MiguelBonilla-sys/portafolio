import { after } from "next/server";
import { getEnv } from "@/agent/config.ts";
import { notifyIdea } from "@/agent/handlers.ts";
import { getRuntime } from "@/agent/runtime.ts";
import { handleInbox } from "./handler.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

// /api is excluded from the middleware (proxy.ts), so the handler authenticates the request itself.
export async function POST(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch {
    return new Response("Content Engine sin configurar", { status: 503 });
  }
  return handleInbox(req, {
    env,
    store: async () => (await getRuntime()).store,
    notify: (id, idea) => after(() => notifyIdea(id, idea)),
  });
}
