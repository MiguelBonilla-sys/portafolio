import { after } from "next/server";
import { getEnv } from "@/agent/config.ts";
import { handleUpdate } from "@/agent/handlers.ts";
import { safeEqual } from "@/agent/lib/auth.ts";
import { logError } from "@/agent/lib/redact.ts";
import type { TelegramUpdate } from "@/agent/lib/telegram.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

// Un update de Telegram ocupa pocos KB (los archivos se descargan aparte con getFile)
const MAX_BODY = 256 * 1024;

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
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return new Response("Payload too large", { status: 413 });
  let update: TelegramUpdate;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
    update = JSON.parse(raw) as TelegramUpdate;
    if (!Number.isSafeInteger(update?.update_id)) throw new Error("update_id inválido");
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  after(() => handleUpdate(update).catch((e) => logError("telegram", e)));
  return Response.json({ ok: true });
}
