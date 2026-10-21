import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "@/agent/config.ts";
import { safeEqual } from "@/agent/lib/auth.ts";
import { authorizeUrl } from "@/agent/lib/linkedin.ts";

export const runtime = "nodejs";

// Inicia el OAuth de LinkedIn. Protegido con ?key=ADMIN_SECRET (el enlace llega por Telegram).
export async function GET(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    return new Response((e as Error).message, { status: 503 });
  }
  if (!safeEqual(new URL(req.url).searchParams.get("key"), env.ADMIN_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("li_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/linkedin" });
  return Response.redirect(authorizeUrl(env.LINKEDIN_CLIENT_ID, `${env.SITE_URL}/api/linkedin/callback`, state), 302);
}
