import { envReport, getEnv } from "@/agent/config.ts";
import { safeEqual } from "@/agent/lib/auth.ts";
import { getRuntime, LINKEDIN_TOKEN_KEY, type StoredLinkedInToken } from "@/agent/runtime.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Puesta en marcha y diagnóstico: /api/agent/setup?key=ADMIN_SECRET
// Crea las tablas, registra el webhook de Telegram y muestra qué falta.
export async function GET(req: Request) {
  const env = envReport();
  if (!env.ok) return Response.json({ ok: false, step: "variables de entorno", problems: env.problems }, { status: 503 });
  const cfg = getEnv();
  if (!safeEqual(new URL(req.url).searchParams.get("key"), cfg.ADMIN_SECRET)) return new Response("Unauthorized", { status: 401 });

  const result: Record<string, unknown> = { ok: true };
  try {
    const rt = await getRuntime();
    result.database = "ok (tablas y checkpointer listos)";

    const webhookUrl = `${cfg.SITE_URL}/api/telegram`;
    const res = await fetch(`https://api.telegram.org/bot${cfg.TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: cfg.TELEGRAM_WEBHOOK_SECRET,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      }),
    });
    result.telegramWebhook = res.ok ? webhookUrl : `error ${res.status}: ${await res.text()}`;

    const token = await rt.store.kvGet<StoredLinkedInToken>(LINKEDIN_TOKEN_KEY);
    result.linkedin = token ? `conectado, vence ${token.expiresAt}` : `sin conectar: abre ${rt.linkedinAuthUrl}`;

    await rt.telegram.sendMessage("🤖 Content Engine configurado. Escríbeme /ayuda para empezar.");
    result.telegramTest = "mensaje de prueba enviado";
  } catch (e) {
    result.ok = false;
    result.error = (e as Error).message;
  }
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
