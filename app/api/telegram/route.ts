import { after } from "next/server";
import { getEnv } from "@/agent/config.ts";
import { handleUpdate } from "@/agent/handlers.ts";
import { safeEqual } from "@/agent/lib/auth.ts";
import type { TelegramUpdate } from "@/agent/lib/telegram.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

// Webhook del bot. Responde 200 de inmediato y procesa en segundo plano (after → waitUntil en Vercel),
// para que Telegram no reenvíe el update mientras el grafo trabaja.
export async function POST(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch {
    return new Response("Content Engine sin configurar", { status: 503 });
  }
  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token"), env.TELEGRAM_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const update = (await req.json()) as TelegramUpdate;
  after(() => handleUpdate(update).catch((e) => console.error("telegram update", e)));
  return Response.json({ ok: true });
}
