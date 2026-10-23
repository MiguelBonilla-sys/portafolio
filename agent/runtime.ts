import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { getEnv, type AgentEnv } from "./config.ts";
import { compileGraph } from "./graph.ts";
import { renderCarousel } from "./carousel.tsx";
import type { AgentDeps } from "./deps.ts";
import { LIMITS } from "./inputs.ts";
import { signToken } from "./lib/auth.ts";
import { decrypt } from "./lib/crypto.ts";
import { createContentStore, type ContentStore } from "./lib/db.ts";
import { createGitHub } from "./lib/github.ts";
import { pingIndexNow } from "./lib/indexnow.ts";
import { createLinkedIn, LinkedInAuthError } from "./lib/linkedin.ts";
import { createLlm, textOf } from "./lib/llm.ts";
import { safeFetch } from "./lib/safe-fetch.ts";
import { createTelegram, type TelegramClient } from "./lib/telegram.ts";
import { DESCRIBE_IMAGE } from "./prompts.ts";
import { renderPng } from "./visuals/render.ts";

export const LINKEDIN_TOKEN_KEY = "linkedin_token";
export const LINKEDIN_AUTH_PURPOSE = "linkedin-auth";

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
  linkedinAuthUrl: () => string;
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

/** Descripción de imágenes solo si hay un modelo con visión configurado; si no, el agente lo dice */
function visionFor(env: AgentEnv): AgentDeps["inputs"]["describeImage"] {
  if (!env.LLM_VISION_MODEL) return undefined;
  const model = new ChatOpenAI({
    model: env.LLM_VISION_MODEL,
    apiKey: env.LLM_API_KEY,
    configuration: { baseURL: env.LLM_BASE_URL },
    temperature: 0,
    maxRetries: 1,
    timeout: 90_000,
  });
  return async (bytes, mime) => {
    const res = await model.invoke([
      {
        role: "user",
        content: [
          { type: "text", text: DESCRIBE_IMAGE },
          { type: "image_url", image_url: { url: `data:${mime};base64,${Buffer.from(bytes).toString("base64")}` } },
        ],
      },
    ]);
    return textOf(res.content);
  };
}

async function build(): Promise<Runtime> {
  const env = getEnv();
  const store = createContentStore(env.DATABASE_URL);
  await store.ensureSchema();

  const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);
  await checkpointer.setup();

  const telegram = createTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
  // Enlace firmado que vence en 24 h: ADMIN_SECRET no viaja en la URL ni queda en logs o en el chat
  const linkedinAuthUrl = () =>
    `${env.SITE_URL}/api/linkedin/auth?t=${signToken(env.ADMIN_SECRET, LINKEDIN_AUTH_PURPOSE, 24 * 3600_000)}`;
  const siteUrl = env.SITE_URL.replace(/\/$/, "");

  const deps: AgentDeps = {
    llm: createLlm(env),
    telegram,
    store,
    github: createGitHub(env.GITHUB_TOKEN, env.GITHUB_REPO, env.GITHUB_BRANCH),
    inputs: {
      download: (fileId) => telegram.downloadFile(fileId, LIMITS.fileBytes),
      fetchUrl: (url) => safeFetch(url),
      describeImage: visionFor(env),
    },
    async linkedin() {
      const stored = await store.kvGet<StoredLinkedInToken>(LINKEDIN_TOKEN_KEY);
      if (!stored || new Date(stored.expiresAt) <= new Date()) throw new LinkedInAuthError("LinkedIn no está conectado");
      return createLinkedIn(decrypt(stored.token, env.TOKEN_ENCRYPTION_KEY), stored.memberId, env.LINKEDIN_API_VERSION);
    },
    linkedinAuthUrl,
    renderCarousel,
    renderVisual: renderPng,
    indexNow: (urls) => pingIndexNow(env.SITE_URL, env.INDEXNOW_KEY, urls),
    async fetchStatus(url) {
      try {
        return (await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(10_000) })).status;
      } catch {
        return 0;
      }
    },
    async fetchPage(url) {
      // Solo páginas del propio sitio: no es una puerta para pedir URLs arbitrarias
      if (!url.startsWith(`${siteUrl}/`)) throw new Error("fetchPage solo lee el propio sitio");
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      return { status: res.status, html: await res.text() };
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    siteUrl,
    timezone: env.AGENT_TIMEZONE,
    deployWaitSeconds: env.DEPLOY_WAIT_SECONDS,
    now: () => new Date(),
  };

  return { env, store, telegram, graph: compileGraph(deps, checkpointer), linkedinAuthUrl };
}
