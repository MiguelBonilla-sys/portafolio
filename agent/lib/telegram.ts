// Cliente mínimo de la Bot API de Telegram (https://core.telegram.org/bots/api)

import { redact } from "./redact.ts";

export interface InlineButton {
  text: string;
  callback_data: string;
}

export interface TelegramClient {
  sendMessage(text: string, opts?: { buttons?: InlineButton[][]; replyTo?: number }): Promise<number>;
  /** Reemplaza el texto de un mensaje propio (mensajes de progreso) */
  editMessage(messageId: number, text: string, opts?: { buttons?: InlineButton[][] }): Promise<void>;
  sendDocument(file: Uint8Array, filename: string, caption?: string): Promise<number>;
  sendPhoto(file: Uint8Array, filename: string, caption?: string): Promise<number>;
  answerCallback(callbackId: string, text?: string): Promise<void>;
  clearButtons(messageId: number): Promise<void>;
  /** Descarga un archivo enviado por el autor; falla si supera maxBytes */
  downloadFile(fileId: string, maxBytes: number): Promise<Uint8Array>;
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
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { ok: boolean; result: T; description?: string };
    // El token va en la URL: nunca se incluye en el error
    if (!json.ok) throw new Error(`Telegram ${method}: ${redact(json.description ?? String(res.status))}`);
    return json.result;
  }

  async function upload(method: "sendDocument" | "sendPhoto", field: string, file: Uint8Array, filename: string, caption?: string) {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(field, new Blob([new Uint8Array(file)]), filename);
    if (caption) {
      form.append("caption", clip(caption, 1000));
      form.append("parse_mode", "HTML");
    }
    const res = await fetch(api(method), { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
    const json = (await res.json()) as { ok: boolean; result: { message_id: number }; description?: string };
    if (!json.ok) throw new Error(`Telegram ${method}: ${redact(json.description ?? String(res.status))}`);
    return json.result.message_id;
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

    async editMessage(messageId, text, opts = {}) {
      await call("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: clip(text),
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: opts.buttons ? { inline_keyboard: opts.buttons } : undefined,
      }).catch((e: Error) => {
        // "message is not modified" no es un error real
        if (!/not modified/i.test(e.message)) throw e;
      });
    },

    sendDocument: (file, filename, caption) => upload("sendDocument", "document", file, filename, caption),
    sendPhoto: (file, filename, caption) => upload("sendPhoto", "photo", file, filename, caption),

    async answerCallback(callbackId, text) {
      await call("answerCallbackQuery", { callback_query_id: callbackId, text });
    },

    async clearButtons(messageId) {
      await call("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(
        () => undefined
      );
    },

    async downloadFile(fileId, maxBytes) {
      const file = await call<{ file_path?: string; file_size?: number }>("getFile", { file_id: fileId });
      if (!file.file_path) throw new Error("Telegram getFile: sin ruta (el archivo supera 20 MB)");
      if ((file.file_size ?? 0) > maxBytes) throw new Error("Telegram getFile: archivo demasiado grande");
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`Telegram download: ${res.status}`);
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > maxBytes) throw new Error("Telegram download: archivo demasiado grande");
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length > maxBytes) throw new Error("Telegram download: archivo demasiado grande");
      return bytes;
    },
  };
}

// ── Updates entrantes (solo los campos que usamos) ──

export interface TelegramMessage {
  message_id: number;
  date?: number;
  chat: { id: number; type?: string };
  from?: { id: number; is_bot?: boolean };
  text?: string;
  caption?: string;
  voice?: unknown;
  document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
  photo?: { file_id: string; file_size?: number; width: number; height: number }[];
  /** Presente en mensajes reenviados: su contenido es material externo */
  forward_origin?: unknown;
  reply_to_message?: { message_id: number };
  /** Los archivos de un álbum llegan como mensajes separados con el mismo id */
  media_group_id?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from?: { id: number };
    data?: string;
    message?: { message_id: number; chat: { id: number; type?: string } };
  };
}

/**
 * callback_data ≤ 64 bytes: "<acción>:<contentId>[:<hash>]".
 * Acciones: p publicar blog + LinkedIn · b solo blog · l solo LinkedIn · e editar · s programar ·
 * r rechazar · t reintentar · y aceptar propuesta · m marcar cifras sin fuente · d eliminarlas ·
 * n cancelar la propuesta · f forzar reintento de LinkedIn · c aplicar el texto pendiente como cambio ·
 * w usarlo para un borrador nuevo · k cerrar la tarjeta sin hacer nada
 */
export type CallbackAction = "p" | "b" | "l" | "e" | "s" | "r" | "t" | "y" | "m" | "d" | "n" | "f" | "c" | "w" | "k";

export function parseCallback(data: string | undefined): { action: CallbackAction; contentId: string; hash?: string } | null {
  const m = data?.match(/^([pblesrtymdnfcwk]):([0-9a-f-]{36})(?::([0-9a-f]{12}))?$/);
  return m ? { action: m[1] as CallbackAction, contentId: m[2], hash: m[3] } : null;
}

export const callback = (action: CallbackAction, contentId: string, hash?: string) => `${action}:${contentId}${hash ? `:${hash}` : ""}`;
