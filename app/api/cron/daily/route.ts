import { getEnv } from "@/agent/config.ts";
import { runDaily } from "@/agent/handlers.ts";
import { hasBearer } from "@/agent/lib/auth.ts";

export const runtime = "nodejs";
export const maxDuration = 300;

// Vercel Cron envía "Authorization: Bearer $CRON_SECRET" (vercel.json, 13:00 UTC = 8:00 Bogotá)
export async function GET(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch {
    // Sin detalle: la lista de variables faltantes solo la ve quien tiene ADMIN_SECRET (/api/agent/setup)
    return Response.json({ ok: false, error: "Content Engine sin configurar" }, { status: 503 });
  }
  if (!hasBearer(req, env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await runDaily();
  return Response.json({ ok: true, report });
}
