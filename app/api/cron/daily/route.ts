import { getEnv } from "@/agent/config.ts";
import { runDaily } from "@/agent/handlers.ts";
import { safeEqual } from "@/agent/lib/auth.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron envía "Authorization: Bearer $CRON_SECRET" (vercel.json, 13:00 UTC = 8:00 Bogotá)
export async function GET(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 503 });
  }
  if (!safeEqual(req.headers.get("authorization"), `Bearer ${env.CRON_SECRET}`)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await runDaily();
  return Response.json({ ok: true, report });
}
