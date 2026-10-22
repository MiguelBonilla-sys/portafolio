import { createHmac, timingSafeEqual } from "node:crypto";

/** Comparación de secretos en tiempo constante */
export function safeEqual(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const mac = (secret: string, purpose: string, exp: number) =>
  createHmac("sha256", secret).update(`${purpose}:${exp}`).digest("hex");

/** Token firmado que vence, para enlaces que viajan por Telegram sin exponer el secreto. */
export function signToken(secret: string, purpose: string, ttlMs: number, now = Date.now()): string {
  const exp = now + ttlMs;
  return `${exp}.${mac(secret, purpose, exp)}`;
}

export function verifyToken(token: string | null | undefined, secret: string, purpose: string, now = Date.now()): boolean {
  const [exp, sig] = (token ?? "").split(".");
  const expMs = Number(exp);
  return Number.isSafeInteger(expMs) && expMs > now && safeEqual(sig, mac(secret, purpose, expMs));
}

/** Header "Authorization: Bearer <secret>" */
export function hasBearer(req: Request, secret: string): boolean {
  return safeEqual(req.headers.get("authorization"), `Bearer ${secret}`);
}
