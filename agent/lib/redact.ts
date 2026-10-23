import { randomBytes } from "node:crypto";

// Lo que nunca debe llegar a un log ni a Telegram: tokens de bot, Bearer, llaves de GitHub/OpenAI,
// cadenas de conexión con contraseña y secretos hex largos.
const PATTERNS: [RegExp, string][] = [
  [/bot\d{6,}:[\w-]{30,}/g, "bot<redacted>"],
  [/\b\d{6,}:[\w-]{30,}\b/g, "<telegram-token>"],
  [/Bearer\s+[\w.~+/=-]{8,}/gi, "Bearer <redacted>"],
  [/\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "<github-token>"],
  [/\bsk-[A-Za-z0-9_-]{16,}\b/g, "<api-key>"],
  [/\b(postgres(?:ql)?|mysql|redis):\/\/[^\s:@/]+:[^\s@/]+@/gi, "$1://<user>:<redacted>@"],
  [/([?&](?:access_token|code|client_secret|key|token|t)=)[^&\s"']+/gi, "$1<redacted>"],
  [/\b[0-9a-f]{40,}\b/gi, "<hex-redacted>"],
];

export function redact(text: string): string {
  return PATTERNS.reduce((t, [re, to]) => t.replace(re, to), text);
}

/** Log del servidor sin secretos. El detalle técnico queda aquí, nunca en el chat. */
export function logError(scope: string, error: unknown, ref?: string): void {
  const e = error as Error;
  console.error(`[${scope}]${ref ? ` ref=${ref}` : ""} ${redact(`${e?.name ?? "Error"}: ${e?.message ?? String(error)}`)}`);
}

export interface PublicError {
  ref: string;
  message: string;
}

/** Errores que el bot puede explicar en lenguaje humano */
export class UserFacingError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.userMessage = userMessage;
  }
}

/**
 * Convierte cualquier error en un mensaje para el autor: corto, sin JSON ni stack trace,
 * con una referencia para buscar el detalle en los logs de Vercel.
 */
export function toPublicError(error: unknown, scope = "agent"): PublicError {
  const ref = randomBytes(3).toString("hex");
  logError(scope, error, ref);
  if (error instanceof UserFacingError) return { ref, message: error.userMessage };
  const text = String((error as Error)?.message ?? error);
  const hint = /timeout|timed out|ETIMEDOUT|aborted/i.test(text)
    ? "Un servicio externo tardó demasiado en responder."
    : /JSON|formato pedido/i.test(text)
      ? "El modelo devolvió una respuesta que no pude interpretar."
      : /GitHub/i.test(text)
        ? "GitHub rechazó la operación."
        : /LinkedIn/i.test(text)
          ? "LinkedIn rechazó la operación."
          : /Telegram/i.test(text)
            ? "Telegram rechazó la operación."
            : "Algo falló de mi lado.";
  return { ref, message: `${hint} Referencia: ${ref}.` };
}
