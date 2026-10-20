// Cliente mínimo de la Bot API de Telegram (https://core.telegram.org/bots/api)

export interface InlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramClient {
  sendMessage(text: string, opts?: { buttons?: InlineButton[][]; replyTo?: number }): Promise<number>;
  sendDocument(file: Uint8Array, filename: string, caption?: string): Promise<number>;
  answerCallback(callbackId: string, text?: string): Promise<void>;
  clearButtons(messageId: number): Promise<void>;
}

/** Escapa texto para parse_mode HTML */
export function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Telegram corta en 4096 caracteres: recorta con aviso */
export function clip(text: string, max = 3900): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n…`;
}

export function createTelegram(token: string, chatId: string): TelegramClient {
  const api = (method: string) => `https://api.telegram.org/bot${token}/${method}`;

  async function call<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(api(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
    return json.result;
  }

  return {
    async sendMessage(text, opts = {}) {
      const msg = await call<{ message_id: number }>("sendMessage", {
        chat_id: chatId,
        text: clip(text),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: opts.buttons ? { inline_keyboard: opts.buttons } : undefined,
        reply_parameters: opts.replyTo ? { message_id: opts.replyTo } : undefined,
      });
      return msg.message_id;
    },

    async sendDocument(file, filename, caption) {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("document", new Blob([new Uint8Array(file)]), filename);
      if (caption) {
        form.append("caption", clip(caption, 1000));
        form.append("parse_mode", "HTML");
      }
      const res = await fetch(api("sendDocument"), { method: "POST", body: form });
      const json = (await res.json()) as { ok: boolean; result: { message_id: number }; description?: string };
      if (!json.ok) throw new Error(`Telegram sendDocument: ${json.description ?? res.status}`);
      return json.result.message_id;
    },

    async answerCallback(callbackId, text) {
      await call("answerCallbackQuery", { callback_query_id: callbackId, text });
    },

    async clearButtons(messageId) {
      await call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(
        () => undefined
      );
    },
  };
}

// ── Updates entrantes (solo los campos que usamos) ──

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    caption?: string;
    voice?: unknown;
    reply_to_message?: { message_id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
}

/** callback_data ≤ 64 bytes: "<acción>:<contentId>" */
export type CallbackAction = "a" | "e" | "s" | "r" | "t";

export function parseCallback(data: string | undefined): { action: CallbackAction; contentId: string } | null {
  const m = data?.match(/^([aesrt]):([0-9a-f-]{36})$/);
  return m ? { action: m[1] as CallbackAction, contentId: m[2] } : null;
}
