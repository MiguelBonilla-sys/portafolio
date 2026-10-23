import { htmlToText } from "./lib/html.ts";
import { UserFacingError } from "./lib/redact.ts";
import type { SafeResponse } from "./lib/safe-fetch.ts";

// Entradas del autor convertidas en fuentes de texto. Todo lo que no escribió el autor en el chat
// (archivos, páginas, mensajes reenviados) es material externo: se cita, nunca se obedece.

export interface Attachment {
  fileId: string;
  name: string;
  mime: string;
  size: number;
  kind: "document" | "photo";
}

export type SourceKind = "note" | "forwarded" | "markdown" | "text" | "pdf" | "image" | "url";

export interface SourceDoc {
  /** S1, S2…: el modelo cita estos ids y el verificador los comprueba */
  id: string;
  kind: SourceKind;
  title: string;
  origin: string;
  text: string;
  /** author = lo escribió Miguel en el chat; external = documento, página o reenvío */
  trust: "author" | "external";
  warnings: string[];
}

export interface InputDeps {
  download(fileId: string): Promise<Uint8Array>;
  fetchUrl(url: string): Promise<SafeResponse>;
  /** Solo si hay un modelo con visión configurado */
  describeImage?: (bytes: Uint8Array, mime: string) => Promise<string>;
}

export const LIMITS = {
  fileBytes: 10 * 1024 * 1024,
  textBytes: 1024 * 1024,
  pdfPages: 60,
  sourceChars: 30_000,
  totalChars: 90_000,
  urls: 3,
};

const IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];

/** Tipo real por firma de bytes; el MIME que declara el cliente no se cree */
export function sniff(bytes: Uint8Array): "pdf" | "png" | "jpeg" | "webp" | "text" | "binary" {
  const head = (n: number) => [...bytes.subarray(0, n)];
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 5) === "%PDF-") return "pdf";
  if (head(4).join() === [0x89, 0x50, 0x4e, 0x47].join()) return "png";
  if (head(3).join() === [0xff, 0xd8, 0xff].join()) return "jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (bytes.includes(0)) return "binary";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, 65_536));
    return "text";
  } catch {
    return "binary";
  }
}

// Frases típicas de inyección de instrucciones. Su presencia no bloquea: se avisa al autor
// y el texto sigue tratándose como dato.
const INJECTION =
  /ignore (all |the )?(previous|prior|above) instructions|disregard (the )?(system|previous)|you are now|new instructions:|system prompt|ignora (todas )?las instrucciones|olvida (las )?instrucciones|eres ahora|actúa como (si fueras )?(el|un) (sistema|administrador)/i;

export function injectionWarning(text: string): string | null {
  return INJECTION.test(text) ? "contiene frases que parecen instrucciones para un modelo; se tratan como texto citado" : null;
}

export const URL_RE = /https?:\/\/[^\s<>()"'`]+[^\s<>()"'`.,;:!?]/g;

export function urlsIn(text: string): string[] {
  return [...new Set(text.match(URL_RE) ?? [])];
}

function clip(text: string, warnings: string[]): string {
  if (text.length <= LIMITS.sourceChars) return text;
  warnings.push(`recortado a ${LIMITS.sourceChars.toLocaleString("es-CO")} caracteres`);
  return text.slice(0, LIMITS.sourceChars);
}

export async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number; scanned: boolean }> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(bytes));
  const pages = doc.numPages;
  const { text } = await extractText(doc, { mergePages: false });
  const used = (text as string[]).slice(0, LIMITS.pdfPages);
  const joined = used.map((t, i) => `[página ${i + 1}]\n${t.trim()}`).join("\n\n");
  const chars = used.join("").replace(/\s/g, "").length;
  return { text: joined, pages, scanned: chars / Math.max(1, used.length) < 30 };
}

async function fromAttachment(a: Attachment, id: string, deps: InputDeps): Promise<SourceDoc> {
  const warnings: string[] = [];
  if (a.size > LIMITS.fileBytes) throw new UserFacingError(`«${a.name}» pesa más de 10 MB; no lo proceso.`);
  const bytes = await deps.download(a.fileId);
  if (bytes.length > LIMITS.fileBytes) throw new UserFacingError(`«${a.name}» pesa más de 10 MB; no lo proceso.`);
  const type = sniff(bytes);
  const base = { id, title: a.name, origin: a.name, trust: "external" as const, warnings };

  if (type === "pdf") {
    const { text, pages, scanned } = await pdfText(bytes);
    if (pages > LIMITS.pdfPages) warnings.push(`solo leí las primeras ${LIMITS.pdfPages} de ${pages} páginas`);
    if (scanned) warnings.push("parece escaneado: casi no tiene texto extraíble y no hay OCR configurado");
    const w = injectionWarning(text);
    if (w) warnings.push(w);
    return { ...base, kind: "pdf", text: clip(text, warnings) };
  }

  if (type === "png" || type === "jpeg" || type === "webp") {
    const mime = `image/${type}`;
    if (!IMAGE_MIME.includes(mime)) throw new UserFacingError(`No leo imágenes ${type}.`);
    if (!deps.describeImage) {
      warnings.push("no hay un modelo con visión configurado: describe la imagen en un mensaje si es importante");
      return { ...base, kind: "image", text: "" };
    }
    const description = await deps.describeImage(bytes, mime);
    warnings.push("descripción generada por un modelo de visión: verifícala antes de citarla");
    return { ...base, kind: "image", text: clip(description, warnings) };
  }

  if (type === "text") {
    if (bytes.length > LIMITS.textBytes) throw new UserFacingError(`«${a.name}» tiene más de 1 MB de texto; envíame la parte relevante.`);
    const text = new TextDecoder("utf-8").decode(bytes);
    const w = injectionWarning(text);
    if (w) warnings.push(w);
    const kind = /\.(md|mdx|markdown)$/i.test(a.name) || a.mime === "text/markdown" ? "markdown" : "text";
    return { ...base, kind, text: clip(text, warnings) };
  }

  throw new UserFacingError(`No sé leer «${a.name}». Acepto Markdown, texto, PDF e imágenes PNG, JPEG o WebP.`);
}

async function fromUrl(url: string, id: string, deps: InputDeps): Promise<SourceDoc> {
  const warnings: string[] = [];
  const res = await deps.fetchUrl(url);
  if (res.status >= 400) throw new UserFacingError(`El enlace ${url} respondió ${res.status}.`);
  const raw = res.body.toString("utf8");
  const page = res.contentType.includes("html") ? htmlToText(raw) : { title: "", description: "", canonical: "", text: raw };
  const w = injectionWarning(page.text);
  if (w) warnings.push(w);
  if (page.text.length < 200) warnings.push("la página casi no tiene texto legible sin JavaScript");
  const text = [page.description && `Descripción: ${page.description}`, page.text].filter(Boolean).join("\n\n");
  return { id, kind: "url", title: page.title || url, origin: res.url, text: clip(text, warnings), trust: "external", warnings };
}

export interface ExtractInput {
  note: string;
  forwarded?: boolean;
  attachments: Attachment[];
}

/** Notas, archivos y enlaces → fuentes numeradas. Los problemas por fuente se informan, no se ocultan. */
export async function extractSources(input: ExtractInput, deps: InputDeps): Promise<{ sources: SourceDoc[]; notices: string[] }> {
  const sources: SourceDoc[] = [];
  const notices: string[] = [];
  const nextId = () => `S${sources.length + 1}`;

  const note = input.note.trim();
  if (note) {
    const warnings: string[] = [];
    if (input.forwarded) {
      const w = injectionWarning(note);
      if (w) warnings.push(w);
    }
    sources.push({
      id: nextId(),
      kind: input.forwarded ? "forwarded" : "note",
      title: input.forwarded ? "Mensaje reenviado" : "Tus notas",
      origin: "Telegram",
      text: clip(note, warnings),
      trust: input.forwarded ? "external" : "author",
      warnings,
    });
  }

  for (const a of input.attachments) {
    try {
      sources.push(await fromAttachment(a, nextId(), deps));
    } catch (e) {
      notices.push(e instanceof UserFacingError ? e.userMessage : `No pude leer «${a.name}».`);
    }
  }

  const urls = urlsIn(note).slice(0, LIMITS.urls);
  if (urlsIn(note).length > LIMITS.urls) notices.push(`Solo leo los primeros ${LIMITS.urls} enlaces de un mensaje.`);
  for (const url of urls) {
    try {
      sources.push(await fromUrl(url, nextId(), deps));
    } catch (e) {
      notices.push(e instanceof UserFacingError ? e.userMessage : `No pude leer ${url}.`);
    }
  }

  let total = 0;
  for (const s of sources) {
    const room = Math.max(0, LIMITS.totalChars - total);
    if (s.text.length > room) {
      s.text = s.text.slice(0, room);
      s.warnings.push("recortado por el límite total de material");
    }
    total += s.text.length;
  }
  return { sources, notices };
}

/** Bloque de fuentes para un prompt: delimitado y marcado como dato, con su id para citar */
export function sourcesBlock(sources: SourceDoc[]): string {
  return sources
    .map(
      (s) =>
        `<fuente id="${s.id}" tipo="${s.kind}" confianza="${s.trust === "author" ? "autor" : "externa"}" titulo="${s.title.replace(/"/g, "'")}">\n${s.text.replace(/<\/?fuente/gi, "‹fuente")}\n</fuente>`
    )
    .join("\n\n");
}
