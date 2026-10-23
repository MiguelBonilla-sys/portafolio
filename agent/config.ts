import { z } from "zod";

// Variables del Content Engine. Se validan al usarlas, no al importar, para que el sitio
// estático compile aunque el agente no esté configurado.
const envSchema = z.object({
  SITE_URL: z.url().default("https://mangel14.dev"),

  LLM_BASE_URL: z.url().default("https://opencode.ai/zen/go/v1"),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().min(1),
  LLM_FALLBACK_BASE_URL: z.url().optional(),
  LLM_FALLBACK_API_KEY: z.string().optional(),
  LLM_FALLBACK_MODEL: z.string().optional(),
  /** Opcional: modelo con visión (mismo proveedor) para describir imágenes enviadas por Telegram */
  LLM_VISION_MODEL: z.string().optional(),

  DATABASE_URL: z.string().min(1),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),
  TELEGRAM_CHAT_ID: z.string().regex(/^-?\d+$/),

  CRON_SECRET: z.string().min(16),
  ADMIN_SECRET: z.string().min(16),

  GITHUB_TOKEN: z.string().min(1),
  GITHUB_REPO: z.string().regex(/^[\w.-]+\/[\w.-]+$/).default("MiguelBonilla-sys/portafolio"),
  GITHUB_BRANCH: z.string().default("main"),

  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),
  LINKEDIN_API_VERSION: z.string().regex(/^\d{6}$/).default("202608"),
  TOKEN_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, "32 bytes en hex (64 caracteres)"),

  INDEXNOW_KEY: z.string().default("3a142bdab1da687057cc12b488c8e24c"),
  AGENT_TIMEZONE: z.string().default("America/Bogota"),
  DEPLOY_WAIT_SECONDS: z.coerce.number().int().min(10).max(240).default(180),
});

export type AgentEnv = z.infer<typeof envSchema>;

let cached: AgentEnv | null = null;

export function getEnv(): AgentEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse({
    ...process.env,
    SITE_URL: process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Content Engine sin configurar. Revisa estas variables: ${missing}`);
  }
  cached = parsed.data;
  return cached;
}

/** Lista de variables que faltan o son inválidas, para el endpoint de estado. */
export function envReport(): { ok: boolean; problems: string[] } {
  const parsed = envSchema.safeParse({
    ...process.env,
    SITE_URL: process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (parsed.success) return { ok: true, problems: [] };
  return { ok: false, problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}
