// Genera public/cv/miguel-bonilla-cv-{es,en}.pdf desde la página /[locale]/cv.
// Uso: npm run build && npm run start (en otra terminal) && npm run cv
// Variables opcionales: BASE_URL (por defecto http://localhost:3000), CHROME_PATH.
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" });
await mkdir("public/cv", { recursive: true });

for (const locale of ["es", "en"]) {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem("mantine-color-scheme-value", "light"));
  await page.goto(`${base}/${locale}/cv`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  const path = `public/cv/miguel-bonilla-cv-${locale}.pdf`;
  await page.pdf({ path, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log(`✓ ${path}`);
  await page.close();
}

await browser.close();
