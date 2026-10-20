import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getEnv, type AgentEnv } from "./config.ts";
import { compileGraph } from "./graph.ts";
import { renderCarousel } from "./carousel.tsx";
import type { AgentDeps } from "./deps.ts";
import { decrypt } from "./lib/crypto.ts";
import { createContentStore, type ContentStore } from "./lib/db.ts";
import { createGitHub } from "./lib/github.ts";
import { pingIndexNow } from "./lib/indexnow.ts";
import { createLinkedIn, LinkedInAuthError } from "./lib/linkedin.ts";
import { createLlm } from "./lib/llm.ts";
import { createTelegram, type TelegramClient } from "./lib/telegram.ts";

export const LINKEDIN_TOKEN_KEY = "linkedin_token";

export interface StoredLinkedInToken {
  token: string; // cifrado
  memberId: string;
  expiresAt: string;
}

export interface Runtime {
  env: AgentEnv;
  store: ContentStore;
  telegram: TelegramClient;
  graph: ReturnType<typeof compileGraph>;
  linkedinAuthUrl: string;
}

let runtime: Promise<Runtime> | null = null;

/** Una instancia por función de Vercel (se reutiliza entre invocaciones calientes). */
export function getRuntime(): Promise<Runtime> {
  runtime ??= build().catch((e) => {
    runtime = null;
    throw e;
  });
  return runtime;
}

async function build(): Promise<Runtime> {
  const env = getEnv();
  const store = createContentStore(env.DATABASE_URL);
  await store.ensureSchema();

  const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);
  await checkpointer.setup();

  const telegram = createTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
  const linkedinAuthUrl = `${env.SITE_URL}/api/linkedin/auth?key=${encodeURIComponent(env.ADMIN_SECRET)}`;

  const deps: AgentDeps = {
    llm: createLlm(env),
    telegram,
    store,
    github: createGitHub(env.GITHUB_TOKEN, env.GITHUB_REPO, env.GITHUB_BRANCH),
    async linkedin() {
      const stored = await store.kvGet<StoredLinkedInToken>(LINKEDIN_TOKEN_KEY);
      if (!stored || new Date(stored.expiresAt) <= new Date()) throw new LinkedInAuthError("LinkedIn no está conectado");
      return createLinkedIn(decrypt(stored.token, env.TOKEN_ENCRYPTION_KEY), stored.memberId, env.LINKEDIN_API_VERSION);
    },
    linkedinAuthUrl,
    renderCarousel,
    indexNow: (urls) => pingIndexNow(env.SITE_URL, env.INDEXNOW_KEY, urls),
    async fetchStatus(url) {
      try {
        return (await fetch(url, { method: "HEAD", cache: "no-store" })).status;
      } catch {
        return 0;
      }
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    siteUrl: env.SITE_URL.replace(/\/$/, ""),
    timezone: env.AGENT_TIMEZONE,
    deployWaitSeconds: env.DEPLOY_WAIT_SECONDS,
    now: () => new Date(),
  };

  return { env, store, telegram, graph: compileGraph(deps, checkpointer), linkedinAuthUrl };
}
