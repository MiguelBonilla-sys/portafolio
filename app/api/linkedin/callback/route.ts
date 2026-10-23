import { cookies } from "next/headers";
import { getEnv } from "@/agent/config.ts";
import { safeEqual } from "@/agent/lib/auth.ts";
import { encrypt } from "@/agent/lib/crypto.ts";
import { exchangeCode, fetchMemberId } from "@/agent/lib/linkedin.ts";
import { toPublicError } from "@/agent/lib/redact.ts";
import { esc } from "@/agent/lib/telegram.ts";
import { getRuntime, LINKEDIN_TOKEN_KEY, type StoredLinkedInToken } from "@/agent/runtime.ts";

export const runtime = "nodejs";

// Se escapa todo: error_description llega de la query y cualquiera puede armar el enlace
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><body style="font-family:system-ui;padding:2rem;max-width:40rem"><h1>${esc(title)}</h1><p>${esc(body)}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

export async function GET(req: Request) {
  let env;
  try {
    env = getEnv();
  } catch (e) {
    return page("Content Engine sin configurar", (e as Error).message, 503);
  }
  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("li_oauth_state")?.value;
  jar.delete("li_oauth_state");

  if (url.searchParams.get("error")) return page("LinkedIn no conectado", (url.searchParams.get("error_description") ?? "Se canceló la autorización.").slice(0, 300), 400);
  if (!expected || !safeEqual(url.searchParams.get("state"), expected)) return page("Estado inválido", "Vuelve a abrir el enlace de conexión.", 400);
  const code = url.searchParams.get("code");
  if (!code) return page("Falta el código", "LinkedIn no devolvió un código de autorización.", 400);

  let accessToken: string, expiresAt: string, memberId: string;
  try {
    ({ accessToken, expiresAt } = await exchangeCode(code, env.LINKEDIN_CLIENT_ID, env.LINKEDIN_CLIENT_SECRET, `${env.SITE_URL}/api/linkedin/callback`));
    memberId = await fetchMemberId(accessToken);
  } catch (e) {
    // El detalle (redactado) queda en los logs; la página no muestra respuestas de LinkedIn
    const { ref } = toPublicError(e, "linkedin-callback");
    return page("LinkedIn no conectado", `LinkedIn rechazó el intercambio del código. Vuelve a abrir el enlace de conexión. Referencia: ${ref}.`, 502);
  }
  const rt = await getRuntime();
  const stored: StoredLinkedInToken = { token: encrypt(accessToken, env.TOKEN_ENCRYPTION_KEY), memberId, expiresAt };
  await rt.store.kvSet(LINKEDIN_TOKEN_KEY, stored);
  const until = new Date(expiresAt).toLocaleDateString("es-CO", { timeZone: env.AGENT_TIMEZONE, dateStyle: "long" });
  await rt.telegram.sendMessage(`🔗 LinkedIn conectado. El token vence el ${until}; te aviso 10 días antes.`).catch(() => undefined);
  return page("LinkedIn conectado", `Listo. El token vence el ${until}. Ya puedes cerrar esta pestaña.`);
}
