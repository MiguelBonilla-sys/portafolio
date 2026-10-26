// Un borrador con material en varios mensajes: /new … «listo», álbumes y archivos sumados a una propuesta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { createHandlers, describeCollection, mergeCollection } from "../handlers.ts";
import type { Attachment } from "../inputs.ts";
import type { Collection } from "../lib/db.ts";
import type { TelegramMessage, TelegramUpdate } from "../lib/telegram.ts";
import type { State } from "../state.ts";
import { setup } from "./helpers.ts";

const CHAT = 42;

const MD = new TextEncoder().encode(`# Arquitectura del gateway

El gateway en FastAPI valida el JWT antes de llamar a la API de inventario. El token de acceso dura 30 minutos.
Decidí filtrar por dueño en el gateway porque la API original no se podía modificar.
`);
// Cabecera JPEG: suficiente para que la firma del archivo la reconozca como imagen
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

async function pdfBytes(text: string) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText(text, { x: 40, y: 700, size: 11, font });
  return pdf.save();
}

const CLAIMS = [
  { text: "El gateway en FastAPI valida el JWT antes de llamar a la API de inventario", sources: ["S2"], support: "doc" },
  { text: "Filtrar por dueño en el gateway porque la API original no se podía modificar", sources: ["S2"], support: "doc" },
];

function bot(opts: Parameters<typeof setup>[0] = {}) {
  const ctx = setup({ claims: CLAIMS, ...opts });
  const h = createHandlers({
    env: { TELEGRAM_CHAT_ID: String(CHAT), AGENT_TIMEZONE: "America/Bogota", SITE_URL: "https://mangel14.dev" },
    store: ctx.store,
    telegram: ctx.deps.telegram,
    graph: ctx.graph as never,
    linkedinAuthUrl: ctx.deps.linkedinAuthUrl,
  });
  let update = 1;
  const send = (extra: Partial<TelegramMessage>) =>
    h.handleUpdate({ update_id: update++, message: { message_id: 1000 + update, chat: { id: CHAT, type: "private" }, from: { id: CHAT }, ...extra } } as TelegramUpdate);
  const say = (text: string, extra: Partial<TelegramMessage> = {}) => send({ text, ...extra });
  const doc = (fileId: string, name: string, mime: string, size: number, extra: Partial<TelegramMessage> = {}) =>
    send({ document: { file_id: fileId, file_name: name, mime_type: mime, file_size: size }, ...extra });
  const photo = (fileId: string, extra: Partial<TelegramMessage> = {}) => send({ photo: [{ file_id: fileId, width: 800, height: 600, file_size: JPEG.length }], ...extra });
  const texts = () => ctx.messages.map((m) => m.text);
  const pieces = () => [...ctx.rows.values()];
  const state = async (id: string) => (await ctx.graph.getState({ configurable: { thread_id: id } })).values as State;
  return { ...ctx, say, doc, photo, texts, pieces, state };
}

test("/new + imagen + Markdown + PDF + nota y «listo»: un solo borrador con todas las fuentes", async () => {
  const pdf = await pdfBytes("Las pruebas de integración cubren el filtro por dueño y la expiración del token.");
  const b = bot({ vision: true, files: { img: JPEG, md: MD, pdf } });

  await b.say("/new");
  assert.match(b.last().text, /Junto el material para un solo borrador/);
  await b.photo("img");
  assert.match(b.last().text, /Agregado\. Llevo 1 archivo \(1 imagen\)\./);
  await b.doc("md", "arquitectura.md", "text/markdown", MD.length);
  await b.doc("pdf", "pruebas.pdf", "application/pdf", pdf.length, { caption: "Quiero un caso de estudio sobre esta decisión de diseño del gateway." });
  assert.match(b.last().text, /Llevo 3 archivos \(1 imagen, 1 PDF, 1 documento\) y 1 nota\./);
  assert.equal(b.pieces().length, 0, "nada arranca antes de «listo»");

  await b.say("listo");
  assert.equal(b.pieces().length, 1, "un solo borrador");
  const [row] = b.pieces();
  assert.equal(row.status, "awaiting_input");
  assert.equal((row as unknown as { source_type: string }).source_type, "telegram_files");
  const s = await b.state(row.content_id);
  assert.deepEqual(s.sources.map((x) => [x.id, x.kind]), [["S1", "note"], ["S2", "image"], ["S3", "markdown"], ["S4", "pdf"]]);
  assert.match(s.sources[2].text, /filtrar por dueño/);
  assert.match(s.sources[3].text, /expiración del token/);
  assert.match(b.last().text, /Leí «imagen\.jpg», «arquitectura\.md», «pruebas\.pdf» y tus notas\./);
  assert.equal(b.llm.calls.filter((c) => c === "research").length, 1);
});

test("un álbum sin /new es un solo borrador y se confirma una sola vez", async () => {
  const b = bot({ files: { a: MD, b: MD, c: MD } });
  const album = { media_group_id: "album-1" };
  await b.doc("a", "uno.md", "text/markdown", MD.length, { ...album, caption: "Tres notas del mismo proyecto para un artículo sobre el gateway." });
  await b.doc("b", "dos.md", "text/markdown", MD.length, album);
  await b.doc("c", "tres.md", "text/markdown", MD.length, album);
  assert.equal(b.texts().filter((t) => /Recibo el álbum/.test(t)).length, 1, "una confirmación por álbum");
  assert.equal(b.pieces().length, 0);

  await b.say("listo");
  assert.equal(b.pieces().length, 1);
  const s = await b.state(b.pieces()[0].content_id);
  assert.deepEqual(s.attachments.map((a) => a.name), ["uno.md", "dos.md", "tres.md"]);
  assert.match(b.last().text, /Leí «uno\.md», «dos\.md», «tres\.md» y tus notas\./);
});

test("varias fotos se numeran para distinguirlas", async () => {
  const b = bot({ vision: true, files: { p1: JPEG, p2: JPEG } });
  await b.say("/new");
  await b.photo("p1");
  await b.photo("p2", { caption: "Dos capturas del panel de administración del gateway." });
  await b.say("listo");
  const s = await b.state(b.pieces()[0].content_id);
  assert.deepEqual(s.attachments.map((a) => a.name), ["imagen-1.jpg", "imagen-2.jpg"]);
});

test("/es y /carrusel valen en cualquier mensaje de la recolección", async () => {
  const b = bot({ files: { md: MD } });
  await b.say("/new");
  await b.doc("md", "arquitectura.md", "text/markdown", MD.length);
  await b.say("/carrusel");
  await b.say("/es");
  await b.say("listo");
  const [row] = b.pieces();
  const s = await b.state(row.content_id);
  assert.equal(s.format, "carousel");
  assert.equal(s.linkedinLang, "es");
  assert.equal(s.note, "", "las opciones no quedan como notas");
});

test("/cancel descarta lo juntado; «listo» sin material no arranca nada", async () => {
  const b = bot({ files: { md: MD } });
  await b.say("/new");
  await b.say("listo");
  assert.match(b.last().text, /Todavía no me mandaste nada/);
  await b.doc("md", "arquitectura.md", "text/markdown", MD.length);
  await b.say("/cancel");
  assert.match(b.last().text, /descarté el material que estabas juntando \(1 archivo \(1 documento\)\)/);
  await b.say("/listo");
  assert.match(b.last().text, /No estoy juntando material/);
  assert.equal(b.pieces().length, 0);
});

test("un segundo «listo» no arranca otro borrador", async () => {
  const b = bot({ files: { a: MD, b: MD } });
  await b.say("/new");
  await b.doc("a", "uno.md", "text/markdown", MD.length);
  await b.doc("b", "dos.md", "text/markdown", MD.length);
  await b.say("listo");
  await b.say("listo");
  assert.equal(b.pieces().length, 1);
});

test("/estado durante la recolección dice qué llevo", async () => {
  const b = bot({ files: { md: MD } });
  await b.say("/new");
  await b.doc("md", "arquitectura.md", "text/markdown", MD.length);
  await b.say("Y un enlace: https://fastapi.tiangolo.com/tutorial/security/");
  await b.say("/estado");
  assert.match(b.last().text, /Estoy juntando material para un borrador: 1 archivo \(1 documento\), 1 nota y 1 enlace\./);
});

test("un borrador admite 10 archivos aunque lleguen en varios mensajes", async () => {
  const files = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`f${i}`, MD]));
  const b = bot({ files });
  await b.say("/new");
  for (let i = 0; i < 11; i++) await b.doc(`f${i}`, `nota-${i}.md`, "text/markdown", MD.length);
  assert.match(b.last().text, /Un borrador admite 10 archivos y ya llevo 10; no agregué este/);
  await b.say("listo");
  const s = await b.state(b.pieces()[0].content_id);
  assert.equal(s.attachments.length, 10);
});

test("la recolección vence a las 6 horas con aviso", async () => {
  const b = bot({ files: { md: MD } });
  b.kv.set("collecting", {
    startedAt: new Date(Date.now() - 7 * 3600_000).toISOString(),
    parts: [{ attachments: [{ fileId: "md", name: "vieja.md", mime: "text/markdown", size: 1, kind: "document" }] }],
  } satisfies Collection);
  await b.say("Notas nuevas sobre el gateway en FastAPI con JWT y filtro por dueño en memoria.");
  assert.ok(b.texts().some((t) => /Descarté el material que estabas juntando \(1 archivo \(1 documento\)\): pasaron más de 6 horas/.test(t)));
  assert.equal(b.pieces().length, 1, "el mensaje nuevo arranca su propio borrador");
  const s = await b.state(b.pieces()[0].content_id);
  assert.equal(s.attachments.length, 0);
});

test("responder a la propuesta con un archivo lo suma a esa pieza y vuelve a proponer", async () => {
  const pdf = await pdfBytes("Las pruebas de integración cubren el filtro por dueño y la expiración del token.");
  const b = bot({ files: { pdf } });
  await b.say("Esta semana armé un gateway en FastAPI con JWT que filtra los activos por dueño en memoria.");
  const [row] = b.pieces();
  assert.equal(row.status, "awaiting_input");
  const proposalId = Number(row.preview_message_id);

  await b.doc("pdf", "pruebas.pdf", "application/pdf", pdf.length, { reply_to_message: { message_id: proposalId } });
  assert.equal(b.pieces().length, 1, "no abre otro borrador");
  assert.ok(b.texts().some((t) => /Agregué «pruebas\.pdf»\. Vuelvo a revisar las fuentes con todo junto\./.test(t)));
  const s = await b.state(row.content_id);
  assert.deepEqual(s.sources.map((x) => [x.id, x.kind]), [["S1", "note"], ["S2", "pdf"]]);
  assert.equal(b.pieces()[0].status, "awaiting_input", "vuelve a la propuesta, no redacta");
  assert.match(b.last().text, /Leí «pruebas\.pdf» y tus notas\./);
  assert.equal(b.llm.calls.filter((c) => c === "research").length, 2);
  assert.ok(!b.llm.calls.includes("blogEs"));
});

test("responder a la propuesta con un álbum: se junta y se suma con «listo»", async () => {
  const b = bot({ files: { a: MD, b: MD } });
  await b.say("Esta semana armé un gateway en FastAPI con JWT que filtra los activos por dueño en memoria.");
  const [row] = b.pieces();
  const reply = { reply_to_message: { message_id: Number(row.preview_message_id) }, media_group_id: "album-2" };
  await b.doc("a", "uno.md", "text/markdown", MD.length, reply);
  await b.doc("b", "dos.md", "text/markdown", MD.length, reply);
  assert.equal(b.texts().filter((t) => /Recibo el álbum para «/.test(t)).length, 1);
  await b.say("listo");
  assert.equal(b.pieces().length, 1);
  const s = await b.state(row.content_id);
  assert.deepEqual(s.sources.map((x) => x.id), ["S1", "S2", "S3"]);
  assert.match(b.last().text, /Leí «uno\.md», «dos\.md» y tus notas\./);
});

test("un archivo que no se puede leer no cuenta como aceptar la propuesta", async () => {
  const b = bot({ files: { bin: new Uint8Array([0, 1, 2, 3]) } });
  await b.say("Esta semana armé un gateway en FastAPI con JWT que filtra los activos por dueño en memoria.");
  const [row] = b.pieces();
  await b.doc("bin", "datos.bin", "application/octet-stream", 4, { reply_to_message: { message_id: Number(row.preview_message_id) } });
  assert.ok(b.texts().some((t) => /No pude usar los archivos nuevos/.test(t)));
  assert.equal(b.pieces()[0].status, "awaiting_input");
  assert.ok(!b.llm.calls.includes("blogEs"));
});

test("a un borrador ya redactado no se le suman archivos, y lo explica", async () => {
  const b = bot({ files: { md: MD } });
  await b.say("Esta semana armé un gateway en FastAPI con JWT que filtra los activos por dueño en memoria.");
  await b.say("Sí, adelante.");
  const [row] = b.pieces();
  assert.ok(b.llm.calls.includes("blogEs"), "ya está redactado");
  assert.notEqual(row.status, "awaiting_input");
  await b.doc("md", "arquitectura.md", "text/markdown", MD.length, { reply_to_message: { message_id: Number(row.preview_message_id) } });
  assert.match(b.last().text, /Ese borrador ya está redactado/);
  assert.equal(b.pieces().length, 1);
});

test("mergeCollection y describeCollection", () => {
  const doc = (name: string, mime = "text/markdown"): Attachment => ({ fileId: name, name, mime, size: 1, kind: "document" });
  const c: Collection = {
    startedAt: new Date().toISOString(),
    parts: [
      { note: "/es primeras notas", attachments: [doc("a.md")] },
      { attachments: [doc("b.pdf", "application/pdf")], forwarded: true },
      { note: "/carrusel /es más notas https://example.com", attachments: [] },
    ],
  };
  const m = mergeCollection(c);
  assert.equal(m.text, "/es /carrusel primeras notas\n\nmás notas https://example.com");
  assert.deepEqual(m.attachments.map((a) => a.name), ["a.md", "b.pdf"]);
  assert.equal(m.forwarded, true);
  assert.equal(m.ignored, 0);
  assert.equal(describeCollection(c), "2 archivos (1 PDF, 1 documento), 2 notas y 1 enlace");
  assert.equal(describeCollection({ startedAt: "", parts: [] }), "nada todavía");
  const many: Collection = { startedAt: "", parts: [{ attachments: Array.from({ length: 12 }, (_, i) => doc(`${i}.md`)) }] };
  assert.equal(mergeCollection(many).ignored, 2);
  assert.equal(mergeCollection(many).attachments.length, 10);
});
