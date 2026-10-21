import type { z } from "zod";
import { textOf, type ChatLike } from "./llm.ts";

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  const end = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("la respuesta no contiene JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Pide JSON al modelo y lo valida con zod. Si la primera respuesta no cumple el esquema,
 * reintenta una vez mostrándole el error.
 */
export async function askJson<T extends z.ZodType>(
  llm: ChatLike,
  system: string,
  user: string,
  schema: T
): Promise<z.infer<T>> {
  let prompt = `${user}\n\nResponde solo con JSON válido, sin texto antes ni después.`;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await llm.invoke([
      ["system", system],
      ["user", prompt],
    ]);
    try {
      const parsed = schema.safeParse(extractJson(textOf(res.content)));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = (e as Error).message;
    }
    prompt = `${user}\n\nTu respuesta anterior no era válida (${lastError}). Responde solo con JSON que cumpla el formato pedido.`;
  }
  throw new Error(`El modelo no devolvió JSON válido: ${lastError}`);
}

export async function askText(llm: ChatLike, system: string, user: string): Promise<string> {
  const res = await llm.invoke([
    ["system", system],
    ["user", user],
  ]);
  return textOf(res.content).trim();
}
