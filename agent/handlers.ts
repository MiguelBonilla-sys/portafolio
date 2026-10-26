import { randomUUID } from "node:crypto";
import { Command } from "@langchain/langgraph";
import { CHANNEL_LABEL, STATUS_LABEL, WAITING_FOR_AUTHOR, isTerminal, type Channel, type EditorialStatus } from "./editorial.ts";
import { blockers } from "./graph.ts";
import { LIMITS, type Attachment } from "./inputs.ts";
import type { Collection, CollectedPart, ContentRow, ContentStore } from "./lib/db.ts";
import { logError, toPublicError } from "./lib/redact.ts";
import { callback, esc, parseCallback, type TelegramClient, type TelegramMessage, type TelegramUpdate } from "./lib/telegram.ts";
import { describeSlot, parseBogotaDateTime } from "./lib/text.ts";
import type { Review, State } from "./state.ts";

// Telegram como mesa de edición: comandos para lo explícito y conversación para lo demás.
// El texto libre se interpreta según el estado de la pieza activa; publicar siempre pasa por una
// confirmación que nombra la versión exacta.

const ACTIVE = "active_content";
const PENDING_EDIT = "pending_edit";
const PENDING_SCHEDULE = "pending_schedule";
const PENDING_TEXT = "pending_text";
/** Material que llega en varios mensajes para un solo borrador */
const COLLECTING = "collecting";
const COLLECT_TTL = 6 * 3600_000;
const ALBUM_TTL = 10 * 60_000;
const DONE = /^(listo|lista|ya|ya est[aá]|eso es todo|termin[eé]|done|ready|that'?s all)[.!]?$/i;
const LOCK_TTL = 5 * 60_000;
const NEW_PER_HOUR = 10;
const MIN_NOTE_WORDS = 8;

export const HELP = `<b>Content Engine</b>
Mándame lo que construiste o aprendiste: notas, un Markdown, un PDF, una imagen o un enlace. Te propongo un enfoque, preparo el artículo (ES y EN) y un post de LinkedIn, y no publico nada sin tu confirmación.

Puedes hablarme normal: «el inicio está muy genérico», «enfatiza las pruebas», «publica el blog y LinkedIn».

<b>Comandos</b>
/new — empezar un borrador; mándame en varios mensajes las notas, imágenes, Markdown, PDF y enlaces, y escribe «listo» (también funciona con un álbum)
/drafts — borradores recientes
/status — estado del borrador activo
/preview — volver a ver la vista previa
/revise texto — pedir un cambio
/approve o /publish [blog|linkedin] — preparar la publicación (te pido confirmar)
/sources — fuentes y afirmaciones sin respaldo
/done o «listo» — terminar de juntar material y empezar el borrador
/cancel — cancelar lo pendiente (incluido el material que estás juntando)

Para sumar un archivo a una propuesta, respóndele al mensaje de la propuesta con el archivo.

Opciones al empezar: /es (LinkedIn en español), /carrusel (además un carrusel PDF), «con imagen» (el post lleva la portada).`;

export interface Runtime {
  env: { TELEGRAM_CHAT_ID: string; AGENT_TIMEZONE: string; SITE_URL: string };
  store: ContentStore;
  telegram: TelegramClient;
  graph: {
    invoke(input: unknown, config: unknown): Promise<unknown>;
    getState(config: unknown): Promise<{ values: Partial<State>; next: string[] }>;
  };
  linkedinAuthUrl: () => string;
}

const config = (contentId: string) => ({ configurable: { thread_id: contentId }, recursionLimit: 80 });

// ── Interpretación del texto libre ──

export type Intent =
  | { kind: "publish"; channels: Channel[] }
  | { kind: "cancel" }
  | { kind: "status" }
  | { kind: "preview" }
  | { kind: "sources" }
  | { kind: "new" }
  | { kind: "ack" }
  | { kind: "revise" };

/** Reglas deterministas: entendibles, probadas y sin costo de LLM */
export function detectIntent(text: string): Intent {
  const t = text.trim().toLowerCase().replace(/^[¿¡]+/, "");
  if (/^(ok|okay|gracias|vale|listo|perfecto|genial|thanks|thank you|👍)[\s.!]*$/.test(t)) return { kind: "ack" };
  if (/^(nuevo tema|otro tema|nueva idea|empecemos otro|new topic|start over)\b/.test(t)) return { kind: "new" };
  if (/^(cancela|cancelar|descarta|descártalo|olvídalo|no lo publiques|cancel|discard)\b/.test(t)) return { kind: "cancel" };
  if (/^(estado|cómo va|como va|en qué va|status)\b/.test(t)) return { kind: "status" };
  if (/(muéstrame|muestrame|ver|reenvía|reenvia|show)( me)? (la |el )?(vista previa|borrador|preview|draft)/.test(t)) return { kind: "preview" };
  if (/^(fuentes|qué fuentes|que fuentes|sources)\b/.test(t)) return { kind: "sources" };
  const publish = /^(publica|publícalo|publicalo|publicar|apruebo|aprobado|aprueba|aprobar|sube|súbelo|dale,? publica|publish|approve|ship)\b/.test(t);
  if (publish) {
    const blog = /\b(blog|art[ií]culo|article)\b/.test(t);
    const li = /\blinked ?in\b/.test(t);
    const only = /\bsolo|solamente|only\b/.test(t);
    const channels: Channel[] = blog && !li ? ["blog"] : li && !blog ? ["linkedin"] : only && blog ? ["blog"] : ["blog", "linkedin"];
    return { kind: "publish", channels };
  }
  return { kind: "revise" };
}

/** Respuesta a la propuesta: aceptar (con ajustes) o cancelar */
export function proposalAnswer(text: string): Review {
  const t = text.trim();
  if (/^(no|cancela|cancelar|descarta|olvídalo|cancel)\b/i.test(t)) return { action: "reject" };
  const unsourced = /(elimin|quita|sin ellas|sácalas|drop|remove)/i.test(t) && /(cifra|dato|afirmaci|número|number|claim)/i.test(t) ? "drop" : undefined;
  return { action: "accept", instructions: t, unsourced };
}

export function parseCommand(text: string): { cmd: string; args: string } | null {
  const m = text.trim().match(/^\/([a-zA-Záéíóú]+)(?:@\w+)?\s*([\s\S]*)$/);
  return m ? { cmd: m[1].toLowerCase(), args: m[2].trim() } : null;
}

/** Opciones al empezar: /es, /carrusel y «con imagen» */
export function parseOptions(text: string): { note: string; linkedinLang: "es" | "en"; format: "text" | "carousel"; linkedinMedia: "none" | "card" } {
  let note = text.trim();
  let linkedinLang: "es" | "en" = "en";
  let format: "text" | "carousel" = "text";
  for (let changed = true; changed; ) {
    changed = false;
    const m = note.match(/^\/(es|carrusel)\b\s*/i);
    if (m) {
      if (m[1].toLowerCase() === "es") linkedinLang = "es";
      else format = "carousel";
      note = note.slice(m[0].length);
      changed = true;
    }
  }
  const linkedinMedia = /\bcon (la )?(imagen|portada)\b|\bwith (an )?image\b/i.test(note) ? "card" : "none";
  return { note, linkedinLang, format, linkedinMedia };
}

export function attachmentsOf(msg: TelegramMessage): Attachment[] {
  const out: Attachment[] = [];
  if (msg.document) {
    out.push({
      fileId: msg.document.file_id,
      name: (msg.document.file_name ?? "documento").replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, "_").slice(0, 80),
      mime: msg.document.mime_type ?? "application/octet-stream",
      size: msg.document.file_size ?? 0,
      kind: "document",
    });
  }
  if (msg.photo?.length) {
    const largest = [...msg.photo].sort((a, b) => b.width * b.height - a.width * a.height)[0];
    out.push({ fileId: largest.file_id, name: "imagen.jpg", mime: "image/jpeg", size: largest.file_size ?? 0, kind: "photo" });
  }
  return out;
}

/**
 * Une el material de varios mensajes en la entrada de un solo borrador. Las opciones (/es, /carrusel)
 * valen en cualquier mensaje, no solo en el primero; los archivos que pasan del límite por pieza se descartan.
 */
export function mergeCollection(c: Collection): { text: string; attachments: Attachment[]; forwarded: boolean; ignored: number } {
  const options: string[] = [];
  const notes: string[] = [];
  for (const part of c.parts) {
    let note = (part.note ?? "").trim();
    for (let m = note.match(/^\/(es|carrusel)\b\s*/i); m; m = note.match(/^\/(es|carrusel)\b\s*/i)) {
      options.push(`/${m[1].toLowerCase()}`);
      note = note.slice(m[0].length);
    }
    if (note) notes.push(note);
  }
  // Las fotos de Telegram llegan todas como «imagen.jpg»: se numeran para distinguirlas en la propuesta
  const photos = c.parts.flatMap((p) => p.attachments).filter((a) => a.name === "imagen.jpg").length;
  let n = 0;
  const all = c.parts.flatMap((p) => p.attachments).map((a) => (photos > 1 && a.name === "imagen.jpg" ? { ...a, name: `imagen-${++n}.jpg` } : a));
  return {
    text: [...new Set(options), notes.join("\n\n")].filter(Boolean).join(" "),
    attachments: all.slice(0, LIMITS.filesPerPiece),
    // Si algo fue reenviado, todo el texto se trata como material externo (lo más prudente)
    forwarded: c.parts.some((p) => p.forwarded),
    ignored: Math.max(0, all.length - LIMITS.filesPerPiece),
  };
}

/** "2 archivos (1 imagen, 1 PDF), 1 nota y 1 enlace" */
export function describeCollection(c: Collection): string {
  const files = c.parts.flatMap((p) => p.attachments);
  const images = files.filter((a) => a.kind === "photo" || a.mime.startsWith("image/")).length;
  const pdfs = files.filter((a) => a.mime === "application/pdf" || /\.pdf$/i.test(a.name)).length;
  const others = files.length - images - pdfs;
  const notes = c.parts.filter((p) => p.note?.trim()).length;
  const links = c.parts.reduce((n, p) => n + (p.note?.match(/https?:\/\/\S+/g)?.length ?? 0), 0);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const kinds = [
    images && plural(images, "imagen", "imágenes"),
    pdfs && plural(pdfs, "PDF", "PDF"),
    others && plural(others, "documento", "documentos"),
  ].filter(Boolean);
  const parts = [
    files.length ? `${plural(files.length, "archivo", "archivos")}${kinds.length > 1 ? ` (${kinds.join(", ")})` : kinds.length ? ` (${kinds[0]})` : ""}` : "",
    notes ? plural(notes, "nota", "notas") : "",
    links ? plural(links, "enlace", "enlaces") : "",
  ].filter(Boolean);
  if (!parts.length) return "nada todavía";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}`;
}

/** Solo el chat privado de Miguel: mismo id de chat y de remitente, y no un bot */
export function isAuthorized(update: TelegramUpdate, chatId: string): boolean {
  const msg = update.message;
  const cb = update.callback_query;
  if (msg) return String(msg.chat.id) === chatId && msg.chat.type === "private" && String(msg.from?.id ?? "") === chatId && !msg.from?.is_bot;
  if (cb) return String(cb.from?.id ?? "") === chatId && String(cb.message?.chat.id ?? "") === chatId;
  return false;
}

// ── Manejadores ──

export function createHandlers(rt: Runtime) {
  const tg = rt.telegram;

  async function run(contentId: string, input: unknown) {
    if (!(await rt.store.tryLock(`lock:${contentId}`, LOCK_TTL))) {
      await tg.sendMessage("Ya estoy trabajando en ese borrador. Te aviso cuando termine.");
      return;
    }
    try {
      await rt.graph.invoke(input, config(contentId));
    } catch (e) {
      const { message } = toPublicError(e, `piece ${contentId.slice(0, 8)}`);
      const row = await rt.store.get(contentId).catch(() => null);
      if (row && !isTerminal(row.status)) {
        await rt.store.upsert(contentId, { status: "failed" }).catch(() => undefined);
        await rt.store.event(contentId, { from: row.status, to: "failed", detail: message }).catch(() => undefined);
      }
      await tg.sendMessage(`No pude terminar el borrador ${contentId.slice(0, 8)}. ${esc(message)}`).catch(() => undefined);
    } finally {
      await rt.store.kvDelete(`lock:${contentId}`).catch(() => undefined);
    }
  }

  async function snapshot(contentId: string) {
    const st = await rt.graph.getState(config(contentId));
    return { values: st.values, waitingAt: st.next[0] as string | undefined };
  }

  async function active(): Promise<ContentRow | null> {
    const id = await rt.store.kvGet<string>(ACTIVE);
    return id ? rt.store.get(id) : null;
  }

  async function resume(contentId: string, review: Review) {
    const row = await rt.store.get(contentId);
    if (row?.preview_message_id) await tg.clearButtons(row.preview_message_id);
    await run(contentId, new Command({ resume: review }));
  }

  async function startContent(rawText: string, attachments: Attachment[], forwarded = false) {
    const opts = parseOptions(rawText);
    const words = opts.note.split(/\s+/).filter(Boolean).length;
    if (!attachments.length && words < MIN_NOTE_WORDS && !/https?:\/\//.test(opts.note)) {
      await tg.sendMessage("Necesito un poco más de material: qué construiste, qué decidiste y qué resultado tuvo. También puedes mandarme un archivo o un enlace.");
      return;
    }
    if (!(await rt.store.rateHit("new_content", 3600_000, NEW_PER_HOUR))) {
      await tg.sendMessage(`Ya empecé ${NEW_PER_HOUR} borradores en la última hora. Retomemos los pendientes (/drafts) o espera un rato.`);
      return;
    }
    const contentId = randomUUID();
    await rt.store.upsert(contentId, { source_type: attachments.length ? "telegram_files" : forwarded ? "telegram_forward" : "telegram_note", status: "received", format: opts.format });
    await rt.store.event(contentId, { from: null, to: "received" });
    await rt.store.kvSet(ACTIVE, contentId);
    await run(contentId, {
      contentId,
      note: opts.note,
      forwarded,
      attachments,
      format: opts.format,
      linkedinLang: opts.linkedinLang,
      linkedinMedia: opts.linkedinMedia,
      status: "received",
    });
  }

  async function resolve(arg: string): Promise<ContentRow | null> {
    if (arg) {
      const row = await rt.store.findByPrefix(arg.split(/\s+/)[0]);
      if (row) await rt.store.kvSet(ACTIVE, row.content_id);
      return row;
    }
    return active();
  }

  async function noActive() {
    await tg.sendMessage("No hay un borrador activo. Mándame material para empezar, o usa /drafts para elegir uno.");
  }

  // ── Material en varios mensajes ──

  /** La recolección abierta, si no venció */
  async function collecting(): Promise<Collection | null> {
    const c = await rt.store.kvGet<Collection>(COLLECTING);
    if (!c) return null;
    if (Date.now() - Date.parse(c.startedAt) > COLLECT_TTL) {
      await rt.store.kvDelete(COLLECTING);
      if (c.parts.length) await tg.sendMessage(`Descarté el material que estabas juntando (${describeCollection(c)}): pasaron más de 6 horas sin «listo».`);
      return null;
    }
    return c;
  }

  async function openCollection() {
    const previous = await rt.store.kvTake<Collection>(COLLECTING);
    await Promise.all([ACTIVE, PENDING_EDIT, PENDING_SCHEDULE, PENDING_TEXT].map((k) => rt.store.kvDelete(k)));
    await rt.store.kvSet(COLLECTING, { startedAt: new Date().toISOString(), parts: [] } satisfies Collection);
    await tg.sendMessage(
      [
        previous?.parts.length ? `Descarté lo que estabas juntando (${describeCollection(previous)}).` : "",
        "Junto el material para un solo borrador. Mándame notas, imágenes, Markdown, PDF o enlaces, en uno o varios mensajes, y escribe «listo» cuando termines.",
        "/cancel lo descarta.",
      ].filter(Boolean).join("\n")
    );
  }

  /** Suma el mensaje a la recolección. Con `open`, la abre si no hay una (un álbum o una respuesta en varios archivos). */
  async function addToCollection(msg: TelegramMessage, text: string, open: false | { target?: string }): Promise<boolean> {
    const part: CollectedPart = { attachments: attachmentsOf(msg), ...(text ? { note: text } : {}), ...(msg.forward_origin ? { forwarded: true } : {}) };
    const current = await rt.store.kvGet<Collection>(COLLECTING);
    const files = current?.parts.flatMap((p) => p.attachments).length ?? 0;
    if (files + part.attachments.length > LIMITS.filesPerPiece) {
      await tg.sendMessage(`Un borrador admite ${LIMITS.filesPerPiece} archivos y ya llevo ${files}; no agregué ${part.attachments.length === 1 ? "este" : "estos"}. Escribe «listo» para seguir con lo que hay.`);
      return true;
    }
    const c = await rt.store.collect(COLLECTING, part, open);
    if (!c) return false;
    // Un álbum son varios mensajes casi simultáneos: se confirma una sola vez
    if (msg.media_group_id) {
      if (!(await rt.store.tryLock(`album:${msg.media_group_id}`, ALBUM_TTL))) return true;
      const target = c.target ? await rt.store.get(c.target) : null;
      await tg.sendMessage(
        target
          ? `Recibo el álbum para «${esc(target.title ?? target.content_id.slice(0, 8))}». Cuando terminen de llegar los archivos, escribe «listo» y reviso todo junto.`
          : "Recibo el álbum y sumo todos sus archivos al mismo borrador. Mándame más material o escribe «listo» cuando termines."
      );
      return true;
    }
    await tg.sendMessage(`Agregado. Llevo ${describeCollection(c)}. Mándame más o escribe «listo».`);
    return true;
  }

  async function finishCollection() {
    const current = await rt.store.kvGet<Collection>(COLLECTING);
    if (!current) return void (await tg.sendMessage("No estoy juntando material. Usa /new para empezar un borrador con varios mensajes."));
    if (!current.parts.length) return void (await tg.sendMessage("Todavía no me mandaste nada. Envía notas, archivos o enlaces, o /cancel."));
    // Leer y borrar en un paso: un segundo «listo» no arranca otro borrador
    const c = await rt.store.kvTake<Collection>(COLLECTING);
    if (!c) return;
    const merged = mergeCollection(c);
    if (merged.ignored) await tg.sendMessage(`Un borrador admite ${LIMITS.filesPerPiece} archivos; dejé fuera ${merged.ignored}.`);
    if (c.target) {
      const target = await rt.store.get(c.target);
      if (!target || target.status !== "awaiting_input") {
        return void (await tg.sendMessage("Esa propuesta ya no espera respuesta, así que no le sumé los archivos. Empieza un borrador nuevo con /new si quieres usarlos."));
      }
      await rt.store.kvSet(ACTIVE, target.content_id);
      return resume(target.content_id, { ...proposalAnswer(merged.text), attachments: merged.attachments });
    }
    await rt.store.kvDelete(ACTIVE);
    return startContent(merged.text, merged.attachments, merged.forwarded);
  }

  async function drafts() {
    const rows = await rt.store.recent(8);
    if (!rows.length) return void (await tg.sendMessage("Todavía no hay borradores."));
    const activeId = await rt.store.kvGet<string>(ACTIVE);
    const lines = rows.map(
      (r) =>
        `${r.content_id === activeId ? "▸" : "·"} <code>${r.content_id.slice(0, 8)}</code> ${esc(r.title ?? "sin título")} — ${STATUS_LABEL[r.status] ?? r.status}${r.version ? `, v${r.version}` : ""}`
    );
    await tg.sendMessage(`<b>Borradores recientes</b>\n${lines.join("\n")}\n\nPara trabajar en otro: /status <code>id</code>`);
  }

  async function status(row: ContentRow) {
    const { values } = await snapshot(row.content_id);
    const lines = [
      `<b>${esc(row.title ?? row.content_id.slice(0, 8))}</b> <code>${row.content_id.slice(0, 8)}</code>`,
      `Estado: ${STATUS_LABEL[row.status] ?? row.status}${row.version ? ` · versión ${row.version} (<code>${row.content_hash}</code>)` : ""}`,
      values.publishedChannels?.length ? `Publicado en: ${values.publishedChannels.map((c) => CHANNEL_LABEL[c]).join(", ")}` : "",
      values.missingFacts?.length ? `Datos pendientes: ${values.missingFacts.length}` : "",
      row.scheduled_for ? `Programado: sale ${describeSlot(new Date(row.scheduled_for), rt.env.AGENT_TIMEZONE)}` : "",
      row.published_urls?.blog_es ? `Blog: ${row.published_urls.blog_es}` : "",
      row.published_urls?.linkedin ? `LinkedIn: ${row.published_urls.linkedin}` : "",
    ].filter(Boolean);
    await tg.sendMessage(lines.join("\n"));
  }

  async function sources(row: ContentRow) {
    const { values } = await snapshot(row.content_id);
    const src = values.sources ?? [];
    if (!src.length) return void (await tg.sendMessage("Este borrador todavía no tiene fuentes extraídas."));
    const claims = values.claims ?? [];
    const lines = [
      "<b>Fuentes</b>",
      ...src.map((s) => `${s.id} · ${esc(s.title)} (${s.kind}, ${s.trust === "author" ? "tuya" : "externa"})${s.warnings.length ? ` — ${esc(s.warnings.join("; "))}` : ""}`),
      "",
      `Afirmaciones: ${claims.filter((c) => c.status === "author").length} tuyas, ${claims.filter((c) => c.status === "sourced").length} con fuente, ${claims.filter((c) => c.status === "unsourced").length} sin fuente.`,
      ...claims.filter((c) => c.status === "unsourced").slice(0, 6).map((c) => `· sin fuente: ${esc(c.text)}`),
    ];
    await tg.sendMessage(lines.join("\n"));
  }

  /** Antes de publicar: qué versión, qué canales y qué enlaces. El botón lleva el hash de esa versión. */
  async function confirmPublish(row: ContentRow, wanted: Channel[]) {
    const { values: v, waitingAt } = await snapshot(row.content_id);
    if (waitingAt !== "humanReview") {
      await tg.sendMessage(`Ese borrador está ${STATUS_LABEL[row.status] ?? row.status}; ahora no se puede publicar.`);
      return;
    }
    const blocking = blockers({ lint: v.lint ?? {}, missingFacts: v.missingFacts ?? [], seo: v.seo ?? null });
    if (blocking.length) {
      await tg.sendMessage(`Todavía no se puede publicar:\n${blocking.map((b) => `· ${esc(b)}`).join("\n")}\nRespóndeme con los datos que faltan o con lo que quieres cambiar.`);
      return;
    }
    const channels = wanted.filter((c) => !(v.publishedChannels ?? []).includes(c));
    if (!channels.length) return void (await tg.sendMessage("Eso ya está publicado."));
    const words = (v.linkedin ?? "").split(/\s+/).filter(Boolean).length;
    const site = rt.env.SITE_URL.replace(/\/$/, "");
    const lines = [
      `Vas a publicar la <b>versión ${v.version}</b> (<code>${v.contentHash}</code>) de «${esc(v.blogEs?.title ?? "")}».`,
      `Canales: ${channels.map((c) => (c === "blog" ? "blog (ES y EN)" : `LinkedIn (${(v.linkedinLang ?? "en").toUpperCase()})`)).join(" y ")}.`,
      channels.includes("blog") ? `Enlaces previstos: ${site}/es/blog/${v.slug} y ${site}/en/blog/${v.slug} (cambian si el slug ya existe).` : "",
      channels.includes("linkedin")
        ? `LinkedIn: post de ${words} palabras${v.linkedinMedia === "card" ? " con la portada" : ""}; ${channels.includes("blog") || v.publishedChannels?.includes("blog") ? "el enlace al artículo va en el primer comentario." : "sin enlace al artículo, porque el blog no se publica."}`
        : "",
      "¿Confirmas?",
    ].filter(Boolean);
    const action = channels.length === 2 ? "p" : channels[0] === "blog" ? "b" : "l";
    await tg.sendMessage(lines.join("\n"), {
      buttons: [[
        { text: "Confirmar y publicar", callback_data: callback(action, row.content_id, v.contentHash) },
        { text: "Todavía no", callback_data: callback("k", row.content_id) },
      ]],
    });
  }

  async function cancel(row: ContentRow | null) {
    const collected = await rt.store.kvTake<Collection>(COLLECTING);
    if (collected) {
      return void (await tg.sendMessage(collected.parts.length ? `Listo, descarté el material que estabas juntando (${describeCollection(collected)}).` : "Listo, ya no estoy juntando material."));
    }
    const hadPending = Boolean((await rt.store.kvGet(PENDING_EDIT)) || (await rt.store.kvGet(PENDING_SCHEDULE)) || (await rt.store.kvGet(PENDING_TEXT)));
    await Promise.all([PENDING_EDIT, PENDING_SCHEDULE, PENDING_TEXT].map((k) => rt.store.kvDelete(k)));
    if (hadPending) return void (await tg.sendMessage("Listo, cancelé lo que estaba pendiente."));
    if (!row) return noActive();
    const { waitingAt } = await snapshot(row.content_id);
    if (waitingAt === "awaitProposal" || waitingAt === "humanReview" || waitingAt === "waitSchedule" || waitingAt === "hold") {
      return resume(row.content_id, { action: "reject" });
    }
    await tg.sendMessage(`Ese borrador está ${STATUS_LABEL[row.status] ?? row.status}; no hay nada que cancelar.`);
  }

  async function onCommand(cmd: string, args: string, msg: TelegramMessage) {
    switch (cmd) {
      case "start":
      case "help":
      case "ayuda":
        return void (await tg.sendMessage(HELP));
      case "new":
      case "nuevo":
        // Sin material: se junta lo que llegue en los mensajes siguientes hasta «listo»
        if (!args && !attachmentsOf(msg).length) return openCollection();
        await rt.store.kvDelete(ACTIVE);
        return startContent(args, attachmentsOf(msg));
      case "done":
      case "listo":
        return finishCollection();
      case "drafts":
      case "borradores":
        return drafts();
      case "status":
      case "estado": {
        const c = await collecting();
        if (c && !args) return void (await tg.sendMessage(`Estoy juntando material para un borrador: ${describeCollection(c)}. Escribe «listo» cuando termines o /cancel para descartarlo.`));
        const row = await resolve(args);
        return row ? status(row) : noActive();
      }
      case "preview":
      case "vista": {
        const row = await resolve(args);
        if (!row) return noActive();
        const { waitingAt } = await snapshot(row.content_id);
        if (waitingAt !== "humanReview") return void (await tg.sendMessage(`No hay vista previa: el borrador está ${STATUS_LABEL[row.status] ?? row.status}.`));
        return resume(row.content_id, { action: "preview" });
      }
      case "revise":
      case "revisar": {
        const row = await active();
        if (!row) return noActive();
        if (!args) {
          await rt.store.kvSet(PENDING_EDIT, row.content_id);
          return void (await tg.sendMessage("¿Qué quieres cambiar?"));
        }
        return revise(row, args);
      }
      case "approve":
      case "aprobar":
      case "publish":
      case "publicar": {
        const row = await active();
        if (!row) return noActive();
        const channels: Channel[] = /^blog\b/i.test(args) ? ["blog"] : /^linked ?in\b/i.test(args) ? ["linkedin"] : ["blog", "linkedin"];
        return confirmPublish(row, channels);
      }
      case "sources":
      case "fuentes": {
        const row = await resolve(args);
        return row ? sources(row) : noActive();
      }
      case "cancel":
      case "cancelar":
        return cancel(await active());
      case "es":
      case "carrusel":
        // Durante la recolección son opciones del borrador que se está juntando
        if (await collecting()) return void (await addToCollection(msg, msg.text || msg.caption || "", false));
        return startContent(msg.text || msg.caption || "", attachmentsOf(msg));
      default:
        await tg.sendMessage("No conozco ese comando. /help muestra los disponibles.");
    }
  }

  async function revise(row: ContentRow, text: string) {
    const { waitingAt } = await snapshot(row.content_id);
    if (waitingAt !== "humanReview" && waitingAt !== "waitSchedule") {
      return void (await tg.sendMessage(`Ese borrador está ${STATUS_LABEL[row.status] ?? row.status}; no puedo editarlo ahora.`));
    }
    await tg.sendMessage("Aplicando el cambio…");
    return resume(row.content_id, { action: "edit", instructions: text });
  }

  async function onText(msg: TelegramMessage, text: string) {
    const attachments = attachmentsOf(msg);
    const forwarded = Boolean(msg.forward_origin);

    // Juntando material: todo lo que llega es para el mismo borrador, hasta «listo»
    if (await collecting()) {
      if (!attachments.length && !forwarded && DONE.test(text)) return finishCollection();
      if (await addToCollection(msg, text, false)) return;
    }

    const pendingSchedule = await rt.store.kvGet<{ id: string; hash?: string; channels?: Channel[] }>(PENDING_SCHEDULE);
    if (pendingSchedule && text) {
      const at = parseBogotaDateTime(text);
      if (!at || at <= new Date()) {
        return void (await tg.sendMessage("No entendí la fecha, ya pasó o falta decir si es a. m. o p. m. Escríbela así: <code>2026-11-03 8:00 am</code> o <code>2026-11-03 6:30 pm</code>."));
      }
      await rt.store.kvDelete(PENDING_SCHEDULE);
      return resume(pendingSchedule.id, { action: "reschedule", at: at.toISOString(), hash: pendingSchedule.hash, channels: pendingSchedule.channels });
    }

    const pendingEdit = await rt.store.kvGet<string>(PENDING_EDIT);
    if (pendingEdit && text && !forwarded) {
      await rt.store.kvDelete(PENDING_EDIT);
      const row = await rt.store.get(pendingEdit);
      if (row) return revise(row, text);
    }

    // Responder a una vista previa es pedir un cambio en esa pieza; responder a la propuesta con archivos, sumarlos
    if (msg.reply_to_message && (text || attachments.length) && !forwarded) {
      const rows = await rt.store.recent(20);
      const target = rows.find((r) => Number(r.preview_message_id) === msg.reply_to_message!.message_id);
      if (target) {
        await rt.store.kvSet(ACTIVE, target.content_id);
        if (attachments.length) {
          if (target.status !== "awaiting_input") {
            return void (await tg.sendMessage("Ese borrador ya está redactado: el material nuevo solo se suma antes, en la propuesta. Para usarlo, empieza otro con /new."));
          }
          // Un álbum llega en varios mensajes: se junta y se suma con «listo»
          if (msg.media_group_id) return void (await addToCollection(msg, text, { target: target.content_id }));
          return resume(target.content_id, { ...proposalAnswer(text), attachments });
        }
        return target.status === "awaiting_input" ? resume(target.content_id, proposalAnswer(text)) : revise(target, text);
      }
    }

    // Un álbum sin /new también es un solo borrador: sus archivos llegan como mensajes separados
    if (msg.media_group_id && attachments.length) return void (await addToCollection(msg, text, {}));

    // Archivos o reenvíos siempre son material nuevo
    if (attachments.length || forwarded) return startContent(text, attachments, forwarded);

    const row = await active();
    if (!row || !WAITING_FOR_AUTHOR.concat("scheduled" as EditorialStatus).includes(row.status)) return startContent(text, []);

    if (row.status === "awaiting_input") return resume(row.content_id, proposalAnswer(text));

    const intent = detectIntent(text);
    switch (intent.kind) {
      case "publish":
        return confirmPublish(row, intent.channels);
      case "cancel":
        return cancel(row);
      case "status":
        return status(row);
      case "preview":
        return onCommand("preview", "", msg);
      case "sources":
        return sources(row);
      case "ack":
        return void (await tg.sendMessage("Listo. Cuando quieras, dime qué cambiar o «publica» para preparar la publicación."));
      case "new":
        await rt.store.kvDelete(ACTIVE);
        return startContent(text.replace(/^(nuevo tema|otro tema|nueva idea|empecemos otro|new topic|start over)[:,.]?\s*/i, ""), []);
      case "revise": {
        // Un texto largo puede ser material nuevo o un cambio: se pregunta en vez de adivinar
        if (text.length >= 400) {
          await rt.store.kvSet(PENDING_TEXT, text);
          return void (await tg.sendMessage(`¿Ese texto es un cambio para «${esc(row.title ?? "el borrador activo")}» o material para un borrador nuevo?`, {
            buttons: [[
              { text: "Aplicar como cambio", callback_data: callback("c", row.content_id) },
              { text: "Borrador nuevo", callback_data: callback("w", row.content_id) },
            ]],
          }));
        }
        return revise(row, text);
      }
    }
  }

  async function onCallback(cb: NonNullable<TelegramUpdate["callback_query"]>) {
    const parsed = parseCallback(cb.data);
    if (!parsed) return tg.answerCallback(cb.id);
    const { action, contentId, hash } = parsed;
    const row = await rt.store.get(contentId);
    if (!row) return tg.answerCallback(cb.id, "Ese borrador ya no existe.");
    await rt.store.kvSet(ACTIVE, contentId);
    const { waitingAt } = await snapshot(contentId);
    const stale = (text = "Ese botón ya no aplica a este borrador.") => tg.answerCallback(cb.id, text);
    if (cb.message?.message_id && action !== "k") await tg.clearButtons(cb.message.message_id);

    switch (action) {
      case "y":
      case "m":
      case "d":
      case "n":
        if (waitingAt !== "awaitProposal") return stale();
        await tg.answerCallback(cb.id);
        return resume(contentId, action === "n" ? { action: "reject" } : { action: "accept", unsourced: action === "d" ? "drop" : action === "m" ? "mark" : undefined });
      case "p":
      case "b":
      case "l": {
        if (waitingAt !== "humanReview") return stale();
        await tg.answerCallback(cb.id, "Publicando…");
        const channels: Channel[] = action === "p" ? ["blog", "linkedin"] : action === "b" ? ["blog"] : ["linkedin"];
        return resume(contentId, { action: "approve", channels, hash });
      }
      case "e":
        if (waitingAt !== "humanReview" && waitingAt !== "waitSchedule") return stale();
        await rt.store.kvSet(PENDING_EDIT, contentId);
        await tg.answerCallback(cb.id);
        return void (await tg.sendMessage("¿Qué quieres cambiar? Puedes incluir los datos que faltan. /cancel para salir."));
      case "s":
        if (waitingAt !== "humanReview") return stale();
        await rt.store.kvSet(PENDING_SCHEDULE, { id: contentId, hash, channels: ["blog", "linkedin"] });
        await tg.answerCallback(cb.id);
        return void (await tg.sendMessage("¿Cuándo lo publico? Responde con la fecha y la hora de Bogotá, por ejemplo <code>2026-11-03 8:00 am</code>. El publicador corre una vez al día, entre las 8:00 y las 9:00 a. m.; te digo el día exacto en que sale."));
      case "r":
        if (!["humanReview", "waitSchedule", "hold", "awaitProposal"].includes(waitingAt ?? "")) return stale();
        await tg.answerCallback(cb.id);
        return resume(contentId, { action: "reject" });
      case "t":
      case "f":
        if (waitingAt !== "hold") return stale();
        await tg.answerCallback(cb.id, "Reintentando…");
        return resume(contentId, { action: action === "f" ? "force" : "retry" });
      case "c":
      case "w": {
        const text = await rt.store.kvGet<string>(PENDING_TEXT);
        await rt.store.kvDelete(PENDING_TEXT);
        await tg.answerCallback(cb.id);
        if (!text) return;
        if (action === "c") return revise(row, text);
        await rt.store.kvDelete(ACTIVE);
        return startContent(text, []);
      }
      case "k":
        if (cb.message?.message_id) await tg.clearButtons(cb.message.message_id);
        await tg.answerCallback(cb.id, "No publico nada.");
        return;
    }
  }

  /** Webhook de Telegram: un update ya autenticado por la ruta */
  async function handleUpdate(update: TelegramUpdate) {
    if (!(await rt.store.claimUpdate(update.update_id))) return; // reintento de Telegram ya procesado
    if (!isAuthorized(update, rt.env.TELEGRAM_CHAT_ID)) return; // solo el chat privado de Miguel
    if (update.callback_query) return onCallback(update.callback_query);

    const msg = update.message;
    if (!msg) return;
    if (msg.voice) return void (await tg.sendMessage("Todavía no transcribo audio. Escríbeme las notas o mándame un archivo."));
    // Los documentos y fotos traen el texto en caption, no en text
    const text = (msg.text || msg.caption || "").trim();
    if (!text && !attachmentsOf(msg).length) return;

    const command = msg.forward_origin ? null : parseCommand(text);
    if (command) return onCommand(command.cmd, command.args, msg);
    return onText(msg, text);
  }

  /** Cron diario (13:00 UTC = 8:00 a. m. en Bogotá; ver CRON_UTC_HOUR) */
  async function runDaily(now = new Date()) {
    const report: string[] = [];
    for (const row of await rt.store.dueScheduled(now)) {
      const { values } = await snapshot(row.content_id);
      await resume(row.content_id, { action: "approve", hash: row.content_hash ?? undefined, channels: values.approvedChannels?.length ? values.approvedChannels : undefined });
      report.push(`programado: ${row.content_id}`);
    }
    for (const row of await rt.store.byStatus("awaiting_deploy")) {
      await resume(row.content_id, { action: "retry" });
      report.push(`reintento de deploy: ${row.content_id}`);
    }
    for (const row of await rt.store.staleAwaiting(new Date(now.getTime() - 48 * 3600_000))) {
      await resume(row.content_id, { action: "expire" });
      report.push(`expirado: ${row.content_id}`);
    }

    const token = await rt.store.kvGet<{ expiresAt: string }>("linkedin_token");
    const daysLeft = token ? Math.floor((new Date(token.expiresAt).getTime() - now.getTime()) / 86_400_000) : -1;
    if (daysLeft <= 10) {
      await tg.sendMessage(
        daysLeft < 0
          ? `LinkedIn no está conectado. Conéctalo aquí (el enlace vence en 24 h): ${esc(rt.linkedinAuthUrl())}`
          : `El token de LinkedIn vence en ${daysLeft} días. Renuévalo aquí: ${esc(rt.linkedinAuthUrl())}`
      );
      report.push(`aviso de token (${daysLeft} días)`);
    }

    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: rt.env.AGENT_TIMEZONE, weekday: "short" }).format(now);
    if (weekday === "Mon") {
      await tg.sendMessage("¿Qué construiste, arreglaste o aprendiste la semana pasada? Mándame notas, un documento o un enlace y te propongo un artículo.");
      report.push("pedido de material");
    }
    if (weekday === "Sun") {
      await tg.sendMessage(await weeklyReport(now));
      report.push("reporte semanal");
    }
    return report;
  }

  async function weeklyReport(now: Date): Promise<string> {
    const rows = await rt.store.since(new Date(now.getTime() - 7 * 86_400_000));
    const count = (s: EditorialStatus) => rows.filter((r) => r.status === s).length;
    const scored = rows.map((r) => r.eval_scores).filter((e): e is Record<string, number | string> => Boolean(e) && Number(e?.specificity) > 0);
    const avg = (k: string) => (scored.length ? (scored.reduce((n, e) => n + Number(e[k] ?? 0), 0) / scored.length).toFixed(1) : "–");
    const published = rows.filter((r) => (r.status === "published" || r.status === "partially_published") && r.published_urls);
    return [
      "<b>Resumen de la semana</b>",
      `Borradores: ${rows.length} · publicados: ${count("published")} · en parte: ${count("partially_published")} · cancelados: ${count("cancelled")} · expirados: ${count("expired")} · con error: ${count("failed")}`,
      `Revisión editorial promedio: especificidad ${avg("specificity")} · hechos ${avg("factDensity")} · sin relleno ${avg("aiMarkers")}`,
      published.length ? `\n<b>Publicado</b>\n${published.map((r) => `· ${esc(r.title ?? "")}: ${r.published_urls?.blog_es ?? r.published_urls?.linkedin ?? ""}`).join("\n")}` : "",
      "\nAnota en docs/baseline.md las métricas de LinkedIn de esta semana (impresiones, seguidores, apariciones en búsquedas).",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return { handleUpdate, runDaily, weeklyReport, startContent };
}

// ── Entradas de producción (rutas de Next) ──

async function handlers() {
  const { getRuntime } = await import("./runtime.ts");
  return createHandlers(await getRuntime());
}

export async function handleUpdate(update: TelegramUpdate) {
  try {
    await (await handlers()).handleUpdate(update);
  } catch (e) {
    logError("telegram-update", e);
  }
}

export async function runDaily(now = new Date()) {
  return (await handlers()).runDaily(now);
}
