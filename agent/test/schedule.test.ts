// Programación: horas en formato de 12 horas y la franja real del cron diario.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CRON_UTC_HOUR, describeSlot, formatDateTime, nextCronSlot, parseBogotaDateTime } from "../lib/text.ts";
import { setup } from "./helpers.ts";
import { createHandlers } from "../handlers.ts";

const TZ = "America/Bogota";
// Intl separa "6:30" de "p. m." con espacios que no se cortan (U+202F, U+00A0): bien para Telegram, se normaliza aquí
const plain = (t: string) => t.replace(/[\u00a0\u202f]/g, " ");
const iso = (s: string) => parseBogotaDateTime(s)?.toISOString() ?? null;

test("acepta horas de 12 horas y rechaza las ambiguas", () => {
  assert.equal(iso("2026-11-03 6:30 pm"), "2026-11-03T23:30:00.000Z");
  assert.equal(iso("2026-11-03 6 p. m."), "2026-11-03T23:00:00.000Z");
  assert.equal(iso("2026-11-03 8:00 a.m."), "2026-11-03T13:00:00.000Z");
  assert.equal(iso("2026-11-03 12 am"), "2026-11-03T05:00:00.000Z", "medianoche");
  assert.equal(iso("2026-11-03 12:15 PM"), "2026-11-03T17:15:00.000Z", "mediodía");
  assert.equal(iso("2026-11-03"), "2026-11-03T13:00:00.000Z", "sin hora: 8:00 a. m.");
  assert.equal(iso("2026-11-03 18:30"), "2026-11-03T23:30:00.000Z", "13 a 23 no es ambigua");
  assert.equal(iso("2026-11-03 6:30"), null, "sin a. m./p. m. es ambigua");
  assert.equal(iso("2026-11-03 13 pm"), null);
  assert.equal(iso("2026-02-31 8 am"), null, "fecha inexistente");
  assert.equal(iso("mañana a las 6"), null);
});

test("la franja es la primera corrida del cron que ve la pieza vencida", () => {
  const slot = (s: string) => nextCronSlot(parseBogotaDateTime(s)!).toISOString();
  assert.equal(slot("2026-11-03 7:30 am"), "2026-11-03T13:00:00.000Z", "antes de las 8: ese mismo día");
  assert.equal(slot("2026-11-03 8:00 am"), "2026-11-03T13:00:00.000Z");
  assert.equal(slot("2026-11-03 8:30 am"), "2026-11-04T13:00:00.000Z", "dentro de la franja no está garantizado: al día siguiente");
  assert.equal(slot("2026-11-03 6:30 pm"), "2026-11-04T13:00:00.000Z");
  assert.equal(slot("2026-12-31 9 pm"), "2027-01-01T13:00:00.000Z", "cambio de año");
});

test("los textos para el autor usan el formato de 12 horas", () => {
  const d = parseBogotaDateTime("2026-11-03 6:30 pm")!;
  assert.equal(plain(formatDateTime(d, TZ)), "martes, 3 de noviembre, 6:30 p. m.");
  assert.equal(plain(describeSlot(nextCronSlot(d), TZ)), "el miércoles, 4 de noviembre, entre las 8:00 a. m. y las 9:00 a. m.");
  assert.doesNotMatch(formatDateTime(parseBogotaDateTime("2026-11-03 11:45 pm")!, TZ), /23:45/);
});

test("CRON_UTC_HOUR coincide con vercel.json", () => {
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  const cron = vercel.crons.find((c: { path: string }) => c.path === "/api/cron/daily");
  assert.equal(cron.schedule, `0 ${CRON_UTC_HOUR} * * *`);
});

test("programar desde Telegram: pide la hora en 12 horas y dice el día real en que sale", async () => {
  const ctx = setup();
  const h = createHandlers({
    env: { TELEGRAM_CHAT_ID: "42", AGENT_TIMEZONE: TZ, SITE_URL: "https://mangel14.dev" },
    store: ctx.store,
    telegram: ctx.deps.telegram,
    graph: ctx.graph as never,
    linkedinAuthUrl: ctx.deps.linkedinAuthUrl,
  });
  let u = 1;
  const say = (text: string) => h.handleUpdate({ update_id: u++, message: { message_id: u, chat: { id: 42, type: "private" }, from: { id: 42 }, text } });
  const press = (data: string) =>
    h.handleUpdate({ update_id: u++, callback_query: { id: `cb${u}`, from: { id: 42 }, data, message: { message_id: 1, chat: { id: 42, type: "private" } } } });

  // Las cifras del borrador falso están en la nota: nada queda como [DATO?] y se puede programar
  await say("Esta semana armé un gateway en FastAPI con JWT. El token de acceso dura 30 minutos y filtra 2.000 registros por dueño.");
  await say("Sí, adelante.");
  const schedule = ctx.messages.flatMap((m) => m.buttons?.flat() ?? []).map((b) => b.callback_data).find((d) => d.startsWith("s:"));
  assert.ok(schedule, "botón de programar");
  await press(schedule);
  const last = () => plain(ctx.last().text);
  assert.match(last(), /2026-11-03 8:00 am/);
  assert.doesNotMatch(last(), /HH:mm/);

  await say("2026-11-03 6:30");
  assert.match(last(), /falta decir si es a\. m\. o p\. m\./);

  await say("2026-11-03 6:30 pm");
  const [row] = [...ctx.rows.values()];
  assert.equal(row.status, "scheduled");
  assert.equal(row.scheduled_for, "2026-11-04T13:00:00.000Z", "se guarda la franja real");
  assert.match(last(), /Pediste martes, 3 de noviembre, 6:30 p\. m\.; .* sale el miércoles, 4 de noviembre, entre las 8:00 a\. m\. y las 9:00 a\. m\./);
  assert.doesNotMatch(last(), /18:30|13:00/);
});
