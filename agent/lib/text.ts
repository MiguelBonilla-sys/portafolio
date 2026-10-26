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

// Bogotá es UTC−5 todo el año (sin horario de verano)
const BOGOTA_UTC_OFFSET = 5;

/**
 * Hora en UTC del cron diario que publica lo programado (vercel.json: "0 13 * * *" = 8:00 a. m. en Bogotá).
 * En el plan Hobby, Vercel lo ejecuta en algún momento dentro de esa hora.
 */
export const CRON_UTC_HOUR = 13;

/**
 * Fecha y hora de Bogotá → Date. Formato de 12 horas: "2026-11-03 6:30 pm", "2026-11-03 6 p. m.",
 * "2026-11-03 8:00 a.m.". Sin hora vale 8:00 a. m. Una hora de 13 a 23 sin a. m./p. m. se acepta
 * (no es ambigua); de 1 a 12 sin a. m./p. m. es ambigua y devuelve null para que el bot pregunte.
 */
export function parseBogotaDateTime(input: string): Date | null {
  const m = input
    .trim()
    .toLowerCase()
    .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t]+(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hour, minute = "0", meridiem] = m;
  let h = hour === undefined ? 8 : Number(hour);
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (meridiem.startsWith("p") ? 12 : 0);
  } else if (hour !== undefined && h <= 12) {
    return null;
  }
  if (h > 23 || Number(minute) > 59) return null;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, h + BOGOTA_UTC_OFFSET, +minute));
  // Descarta fechas que no existen (2026-02-31 no se convierte en 3 de marzo)
  const day = new Date(Date.UTC(+y, +mo - 1, +d));
  if (Number.isNaN(date.getTime()) || day.getUTCMonth() !== +mo - 1 || day.getUTCDate() !== +d) return null;
  return date;
}

/** La primera corrida del cron que encuentra la pieza vencida: el inicio de esa hora, en UTC */
export function nextCronSlot(at: Date): Date {
  const slot = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), CRON_UTC_HOUR));
  // Si la hora pedida cae después del inicio de la franja, esa corrida puede no verla: va a la del día siguiente
  if (slot.getTime() < at.getTime()) slot.setUTCDate(slot.getUTCDate() + 1);
  return slot;
}

/** "martes, 3 de noviembre, 6:30 p. m.", siempre en formato de 12 horas */
export function formatDateTime(date: Date, timeZone: string): string {
  return date.toLocaleString("es-CO", { timeZone, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
}

/** "el martes, 4 de noviembre, entre las 8:00 a. m. y las 9:00 a. m." para una franja del cron */
export function describeSlot(slot: Date, timeZone: string): string {
  const day = slot.toLocaleDateString("es-CO", { timeZone, weekday: "long", day: "numeric", month: "long" });
  const time = (d: Date) => d.toLocaleTimeString("es-CO", { timeZone, hour: "numeric", minute: "2-digit", hour12: true });
  return `el ${day}, entre las ${time(slot)} y las ${time(new Date(slot.getTime() + 3600_000))}`;
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
