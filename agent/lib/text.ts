export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

/** Fecha YYYY-MM-DD en la zona horaria dada */
export function dateIn(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/**
 * Convierte "YYYY-MM-DD HH:mm" en hora de Bogotá (UTC−5, sin horario de verano) a Date.
 * Devuelve null si el formato no es válido.
 */
export function parseBogotaDateTime(input: string): Date | null {
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h = "8", mi = "0"] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, +h + 5, +mi));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Cifras de un texto, normalizadas (1.800 → 1800, 1,8 → 1.8) */
export function numbersIn(text: string): string[] {
  const found = text.match(/\d+(?:[.,]\d+)*/g) ?? [];
  return found.map(normalizeNumber);
}

export function normalizeNumber(n: string): string {
  // "2.000" y "2,000" → "2000"; "1,8" y "1.8" → "1.8"
  if (/^\d{1,3}([.,]\d{3})+$/.test(n)) return n.replace(/[.,]/g, "");
  return n.replace(",", ".");
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
