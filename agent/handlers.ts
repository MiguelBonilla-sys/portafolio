import { randomUUID } from "node:crypto";
import { Command } from "@langchain/langgraph";
import type { ContentRow } from "./lib/db.ts";
import { esc, parseCallback, type TelegramUpdate } from "./lib/telegram.ts";
import { parseBogotaDateTime } from "./lib/text.ts";
import { getRuntime, LINKEDIN_TOKEN_KEY, type Runtime, type StoredLinkedInToken } from "./runtime.ts";
import type { Review } from "./state.ts";

const PENDING_EDIT = "pending_edit";
const PENDING_SCHEDULE = "pending_schedule";
const MIN_SOURCE_CHARS = 60;

const HELP = `<b>Content Engine</b>
Escríbeme lo que construiste o aprendiste (qué hiciste, qué decidiste, cifras, errores). Con eso preparo:
• artículo del blog en español e inglés
• post de LinkedIn (en inglés por defecto)

Opciones al inicio del mensaje:
<code>/es</code> post de LinkedIn en español
<code>/carrusel</code> además, un carrusel PDF

Comandos: <code>/estado</code> piezas pendientes · <code>/cancelar</code> cancela una edición o reprogramación en curso · <code>/ayuda</code>

Nada se publica sin que toques ✅ Aprobar.`;

const config = (contentId: string) => ({ configurable: { thread_id: contentId }, recursionLimit: 60 });

async function run(rt: Runtime, contentId: string, input: Parameters<Runtime["graph"]["invoke"]>[0]) {
  try {
    await rt.graph.invoke(input, config(contentId));
  } catch (e) {
    const message = (e as Error).message ?? String(e);
    await rt.store.upsert(contentId, { status: "failed" }).catch(() => undefined);
    await rt.telegram
      .sendMessage(`⚠️ Error en la pieza <code>${contentId.slice(0, 8)}</code>: ${esc(message.slice(0, 500))}`)
      .catch(() => undefined);
  }
}

export async function startContent(text: string, sourceType = "telegram_note") {
  const rt = await getRuntime();
  let source = text.trim();
  let format: "text" | "carousel" = "text";
  let linkedinLang: "es" | "en" = "en";
  // Opciones al inicio: /es y /carrusel, en cualquier orden
  for (let changed = true; changed; ) {
    changed = false;
    const m = source.match(/^\/(es|carrusel)\b\s*/i);
    if (m) {
      if (m[1].toLowerCase() === "es") linkedinLang = "es";
      else format = "carousel";
      source = source.slice(m[0].length);
      changed = true;
    }
  }
  if (source.length < MIN_SOURCE_CHARS) {
    await rt.telegram.sendMessage("Necesito un poco más de material: qué construiste, qué decidiste y qué resultado tuvo.");
    return;
  }
  const contentId = randomUUID();
  await rt.store.upsert(contentId, { source_type: sourceType, status: "generating", format });
  await rt.telegram.sendMessage(`⏳ Preparando borrador <code>${contentId.slice(0, 8)}</code>…`);
  await run(rt, contentId, { contentId, source, sourceType, format, linkedinLang });
}

export async function resumeContent(contentId: string, review: Review) {
  const rt = await getRuntime();
  const row = await rt.store.get(contentId);
  if (row?.preview_message_id) await rt.telegram.clearButtons(row.preview_message_id);
  await run(rt, contentId, new Command({ resume: review }));
}

async function statusReport(rt: Runtime) {
  const groups: [ContentRow["status"], string][] = [
    ["awaiting_approval", "Esperando tu aprobación"],
    ["blocked", "Bloqueados (faltan datos)"],
    ["scheduled", "Programados"],
    ["awaiting_deploy", "Esperando deploy"],
    ["failed", "Con error"],
  ];
  const lines: string[] = [];
  for (const [status, label] of groups) {
    const rows = await rt.store.byStatus(status);
    if (rows.length) lines.push(`<b>${label}</b>\n${rows.map((r) => `• ${esc(r.title ?? r.content_id.slice(0, 8))}`).join("\n")}`);
  }
  await rt.telegram.sendMessage(lines.length ? lines.join("\n\n") : "No hay piezas pendientes.");
}

/** Webhook de Telegram: un update ya autenticado por la ruta */
export async function handleUpdate(update: TelegramUpdate) {
  const rt = await getRuntime();
  if (!(await rt.store.claimUpdate(update.update_id))) return; // reintento de Telegram ya procesado

  const chatId = String(update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? "");
  if (chatId !== rt.env.TELEGRAM_CHAT_ID) return; // solo el chat de Miguel

  if (update.callback_query) {
    const cb = update.callback_query;
    const parsed = parseCallback(cb.data);
    if (!parsed) return rt.telegram.answerCallback(cb.id);
    const { action, contentId } = parsed;
    if (action === "e") {
      await rt.store.kvSet(PENDING_EDIT, contentId);
      await rt.telegram.answerCallback(cb.id);
      await rt.telegram.sendMessage("✏️ Escribe qué cambio quieres (puedes incluir los datos que faltan). /cancelar para salir.");
      return;
    }
    if (action === "s") {
      await rt.store.kvSet(PENDING_SCHEDULE, contentId);
      await rt.telegram.answerCallback(cb.id);
      await rt.telegram.sendMessage("🗓 ¿Cuándo lo publico? Responde <code>AAAA-MM-DD HH:mm</code> en hora de Bogotá (el cron corre a las 8:00).");
      return;
    }
    const review: Review = { action: action === "a" ? "approve" : action === "r" ? "reject" : "retry" };
    await rt.telegram.answerCallback(cb.id, action === "a" ? "Publicando…" : undefined);
    return resumeContent(contentId, review);
  }

  const msg = update.message;
  if (!msg) return;
  if (msg.voice) {
    await rt.telegram.sendMessage("Por ahora solo leo texto. Escríbeme las notas.");
    return;
  }
  const text = (msg.text ?? msg.caption ?? "").trim();
  if (!text) return;

  if (/^\/(start|ayuda|help)\b/i.test(text)) return void (await rt.telegram.sendMessage(HELP));
  if (/^\/estado\b/i.test(text)) return statusReport(rt);
  if (/^\/cancelar\b/i.test(text)) {
    await rt.store.kvDelete(PENDING_EDIT);
    await rt.store.kvDelete(PENDING_SCHEDULE);
    return void (await rt.telegram.sendMessage("Listo, cancelado."));
  }

  const pendingSchedule = await rt.store.kvGet<string>(PENDING_SCHEDULE);
  if (pendingSchedule) {
    const at = parseBogotaDateTime(text);
    if (!at || at <= new Date()) {
      await rt.telegram.sendMessage("No entendí la fecha o ya pasó. Usa <code>AAAA-MM-DD HH:mm</code>, por ejemplo <code>2026-11-03 08:00</code>.");
      return;
    }
    await rt.store.kvDelete(PENDING_SCHEDULE);
    return resumeContent(pendingSchedule, { action: "reschedule", at: at.toISOString() });
  }

  const pendingEdit = await rt.store.kvGet<string>(PENDING_EDIT);
  if (pendingEdit) {
    await rt.store.kvDelete(PENDING_EDIT);
    await rt.telegram.sendMessage("⏳ Aplicando cambios…");
    return resumeContent(pendingEdit, { action: "edit", instructions: text });
  }

  // Responder a la vista previa también cuenta como edición
  if (msg.reply_to_message) {
    const rows = [...(await rt.store.byStatus("awaiting_approval")), ...(await rt.store.byStatus("blocked"))];
    const target = rows.find((r) => Number(r.preview_message_id) === msg.reply_to_message!.message_id);
    if (target) return resumeContent(target.content_id, { action: "edit", instructions: text });
  }

  return startContent(text);
}

/** Cron diario (13:00 UTC = 8:00 Bogotá) */
export async function runDaily(now = new Date()) {
  const rt = await getRuntime();
  const report: string[] = [];

  for (const row of await rt.store.dueScheduled(now)) {
    await resumeContent(row.content_id, { action: "approve" });
    report.push(`programado publicado: ${row.content_id}`);
  }
  for (const row of await rt.store.byStatus("awaiting_deploy")) {
    await resumeContent(row.content_id, { action: "retry" });
    report.push(`reintento de deploy: ${row.content_id}`);
  }
  for (const row of await rt.store.staleAwaiting(new Date(now.getTime() - 48 * 3600_000))) {
    await resumeContent(row.content_id, { action: "expire" });
    report.push(`expirado: ${row.content_id}`);
  }

  const token = await rt.store.kvGet<StoredLinkedInToken>(LINKEDIN_TOKEN_KEY);
  const daysLeft = token ? Math.floor((new Date(token.expiresAt).getTime() - now.getTime()) / 86_400_000) : -1;
  if (daysLeft <= 10) {
    await rt.telegram.sendMessage(
      daysLeft < 0
        ? `🔑 LinkedIn no está conectado. Conéctalo aquí: ${esc(rt.linkedinAuthUrl())}`
        : `🔑 El token de LinkedIn vence en ${daysLeft} días. Renuévalo aquí: ${esc(rt.linkedinAuthUrl())}`
    );
    report.push(`aviso de token (${daysLeft} días)`);
  }

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: rt.env.AGENT_TIMEZONE, weekday: "short" }).format(now);
  if (weekday === "Mon") {
    await rt.telegram.sendMessage(
      "☀️ Lunes. ¿Qué construiste, arreglaste o aprendiste la semana pasada? Mándame las notas con cifras y te preparo el artículo y el post."
    );
    report.push("pedido de material");
  }
  if (weekday === "Sun") {
    await rt.telegram.sendMessage(await weeklyReport(rt, now));
    report.push("reporte semanal");
  }

  return report;
}

export async function weeklyReport(rt: Runtime, now: Date): Promise<string> {
  const rows = await rt.store.since(new Date(now.getTime() - 7 * 86_400_000));
  const count = (s: ContentRow["status"]) => rows.filter((r) => r.status === s).length;
  const scored = rows.map((r) => r.eval_scores).filter((e): e is Record<string, number | string> => Boolean(e));
  const avg = (k: string) =>
    scored.length ? (scored.reduce((n, e) => n + Number(e[k] ?? 0), 0) / scored.length).toFixed(1) : "–";
  const published = rows.filter((r) => r.status === "published" && r.published_urls);

  return [
    "<b>📊 Resumen de la semana</b>",
    `Borradores: ${rows.length} · publicados: ${count("published")} · rechazados: ${count("rejected")} · expirados: ${count("expired")} · con error: ${count("failed")}`,
    `Eval promedio: especificidad ${avg("specificity")} · hechos ${avg("factDensity")} · sin marcas de IA ${avg("aiMarkers")} · pilar ${avg("pillarFit")}`,
    published.length ? `\n<b>Publicado</b>\n${published.map((r) => `• ${esc(r.title ?? "")}: ${r.published_urls?.blog_es ?? ""}`).join("\n")}` : "",
    "\nAnota en docs/baseline.md las métricas de LinkedIn de esta semana (impresiones, seguidores, apariciones en búsquedas).",
  ]
    .filter(Boolean)
    .join("\n");
}
