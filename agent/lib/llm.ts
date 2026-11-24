import { randomUUID } from "node:crypto";
import { ChatOpenAI } from "@langchain/openai";
import type { AgentEnv } from "../config.ts";

/** Lo único que el grafo necesita de un modelo de chat (los tests inyectan uno falso). */
export interface ChatLike {
  invoke(messages: [role: "system" | "user", content: string][]): Promise<{ content: unknown }>;
}

// OpenCode Go rechaza con 400 las llamadas sin dos cabeceras (verificado también en HalfClick):
//  - x-opencode-session: un id estable por conversación, para enrutar y reutilizar el caché del prompt.
//    Un id por instancia del agente basta; es opaco a propósito, sin nombres de personas ni de proyectos.
//  - User-Agent: que identifique al cliente y no sea el de la librería. Nombre genérico, sin datos personales.
// Solo se envían a OpenCode.
const SESSION = randomUUID();
const USER_AGENT = "content-engine/1.0";

/** Cabeceras que un proveedor exige además de la clave; vacío si el proveedor no las pide */
export function providerHeaders(baseURL: string | undefined, session: string = SESSION): Record<string, string> | undefined {
  try {
    const host = new URL(baseURL ?? "").hostname;
    return host === "opencode.ai" || host.endsWith(".opencode.ai") ? { "x-opencode-session": session, "User-Agent": USER_AGENT } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * fetch que fija esas cabeceras en el último paso: ni el SDK ni LangChain pueden pisarlas después
 * (LangChain pone su propio User-Agent, "langchainjs-openai", por encima de defaultHeaders).
 */
export function providerFetch(baseURL: string | undefined): typeof fetch | undefined {
  const extra = providerHeaders(baseURL);
  if (!extra) return undefined;
  return (input, init) => {
    const headers = new Headers(init?.headers);
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
    return globalThis.fetch(input, { ...init, headers });
  };
}

export function createLlm(env: AgentEnv): ChatLike {
  const primary = new ChatOpenAI({
    model: env.LLM_MODEL,
    apiKey: env.LLM_API_KEY,
    configuration: { baseURL: env.LLM_BASE_URL, fetch: providerFetch(env.LLM_BASE_URL) },
    temperature: 0.4,
    maxRetries: 1,
    timeout: 90_000,
  });

  if (env.LLM_FALLBACK_MODEL && env.LLM_FALLBACK_API_KEY) {
    const fallback = new ChatOpenAI({
      model: env.LLM_FALLBACK_MODEL,
      apiKey: env.LLM_FALLBACK_API_KEY,
      configuration: env.LLM_FALLBACK_BASE_URL ? { baseURL: env.LLM_FALLBACK_BASE_URL, fetch: providerFetch(env.LLM_FALLBACK_BASE_URL) } : undefined,
      temperature: 0.4,
      maxRetries: 1,
      timeout: 90_000,
    });
    return primary.withFallbacks([fallback]);
  }
  return primary;
}

export function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === "string" ? p : (p as { text?: string }).text ?? "")).join("");
  }
  return String(content ?? "");
}
