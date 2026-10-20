import { ChatOpenAI } from "@langchain/openai";
import type { AgentEnv } from "../config.ts";

/** Lo único que el grafo necesita de un modelo de chat (los tests inyectan uno falso). */
export interface ChatLike {
  invoke(messages: [role: "system" | "user", content: string][]): Promise<{ content: unknown }>;
}

export function createLlm(env: AgentEnv): ChatLike {
  const primary = new ChatOpenAI({
    model: env.LLM_MODEL,
    apiKey: env.LLM_API_KEY,
    configuration: { baseURL: env.LLM_BASE_URL },
    temperature: 0.4,
    maxRetries: 1,
    timeout: 90_000,
  });

  if (env.LLM_FALLBACK_MODEL && env.LLM_FALLBACK_API_KEY) {
    const fallback = new ChatOpenAI({
      model: env.LLM_FALLBACK_MODEL,
      apiKey: env.LLM_FALLBACK_API_KEY,
      configuration: env.LLM_FALLBACK_BASE_URL ? { baseURL: env.LLM_FALLBACK_BASE_URL } : undefined,
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
