import { envReport, getEnv } from "@/agent/config.ts";
import { hasBearer } from "@/agent/lib/auth.ts";
import { redact } from "@/agent/lib/redact.ts";
import { formatDateTime } from "@/agent/lib/text.ts";
import { getRuntime, LINKEDIN_TOKEN_KEY, type StoredLinkedInToken } from "@/agent/runtime.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

// Puesta en marcha y diagnóstico: curl -H "Authorization: Bearer $ADMIN_SECRET" https://dominio/api/agent/setup
// Crea las tablas, registra el webhook de Telegram y muestra qué falta.
// El secreto va en el header (no en la URL, que queda en logs) y se valida antes de mostrar nada.
export async function GET(req: Request) {
  const admin = process.env.ADMIN_SECRET;
  if (!admin || admin.length < 16) return new Response("Falta ADMIN_SECRET (mínimo 16 caracteres)", { status: 503 });
  if (!hasBearer(req, admin)) return new Response("Unauthorized", { status: 401 });
  const env = envReport();
  if (!env.ok) return Response.json({ ok: false, step: "variables de entorno", problems: env.problems }, { status: 503 });
  const cfg = getEnv();

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
    result.telegramWebhook = res.ok ? webhookUrl : `error ${res.status}: ${redact((await res.text()).slice(0, 300))}`;

    const token = await rt.store.kvGet<StoredLinkedInToken>(LINKEDIN_TOKEN_KEY);
    result.linkedin = token ? `conectado, vence el ${formatDateTime(new Date(token.expiresAt), cfg.AGENT_TIMEZONE)}` : `sin conectar: abre ${rt.linkedinAuthUrl()} (vence en 24 h)`;

    await rt.telegram.sendMessage("Content Engine configurado. Escríbeme /help para empezar.");
    result.telegramTest = "mensaje de prueba enviado";
  } catch (e) {
    result.ok = false;
    result.error = redact((e as Error).message);
  }
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
