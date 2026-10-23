import { EMAIL, GITHUB_URL, LINKEDIN_URL, PHONE, X_URL } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/** Datos de la tarjeta de contacto: vCard, página /tarjeta y pase de Google Wallet. */
export const CARD = {
  firstName: "Miguel Ángel",
  lastName: "Bonilla Torres",
  fullName: "Miguel Ángel Bonilla Torres",
  // Mismo titular que el sitio (test/consistency.test.ts)
  title: "Full Stack Engineer · Python, React & AI Systems",
  place: "Bogotá, Colombia",
  email: EMAIL,
  phone: PHONE,
  site: SITE_URL,
  siteLabel: SITE_URL.replace(/^https?:\/\//, ""),
  linkedin: LINKEDIN_URL,
  github: GITHUB_URL,
  x: X_URL,
  vcardUrl: `${SITE_URL}/contact.vcf`,
  colors: { background: "#0a0b10", foreground: "#edeff5", label: "#2ee6ff" },
} as const;

// RFC 6350 §3.4: escapar \ , ; y saltos de línea en los valores
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");

// RFC 6350 §3.2: líneas de máximo 75 octetos, continuadas con CRLF + espacio
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--; // no partir un carácter UTF-8
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts.join("\r\n ");
}

/** vCard 3.0 (la versión que leen bien iOS, Android y Outlook). `photo` es un JPEG opcional. */
export function buildVCard(photo?: Buffer): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(CARD.lastName)};${esc(CARD.firstName)};;;`,
    `FN:${esc(CARD.fullName)}`,
    `TITLE:${esc(CARD.title)}`,
    `EMAIL;TYPE=INTERNET,PREF:${CARD.email}`,
    `TEL;TYPE=CELL,VOICE:${CARD.phone.replace(/\s/g, "")}`,
    `ADR;TYPE=WORK:;;;Bogotá;;;Colombia`,
    `URL:${CARD.site}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${CARD.linkedin}`,
    `X-SOCIALPROFILE;TYPE=github:${CARD.github}`,
    `X-SOCIALPROFILE;TYPE=twitter:${CARD.x}`,
    `NOTE:${esc(`Portafolio: ${CARD.site} · LinkedIn: ${CARD.linkedin} · GitHub: ${CARD.github}`)}`,
  ];
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString("base64")}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}
