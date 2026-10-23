// Recorrido E2E del sitio compilado. Uso: pnpm build && pnpm start (en otra terminal) && pnpm test:e2e
// Variables opcionales: BASE_URL (por defecto http://localhost:3000), CHROME_PATH (Chromium ya instalado).
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = [320, 375, 390, 768, 1024, 1440, 1920];
const ROUTES = [
  "/es",
  "/en",
  "/es/blog",
  "/en/cv",
  "/es/privacidad",
  "/en/card",
  "/es/proyectos/bikans",
  "/en/projects/idn-phishing-detector",
  "/es/proyectos/portafolio-content-engine",
  "/en/projects/api-auth-hackaton",
  "/es/proyectos/redes-sockets",
];

let browser;
before(async () => {
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: "chrome" });
});
after(() => browser?.close());

async function open(path, width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const res = await page.goto(BASE + path, { waitUntil: "load" });
  return { page, res };
}

test("las rutas principales responden 200 con un h1, imagen OG y URL OG", async () => {
  for (const path of ROUTES) {
    const { page, res } = await open(path);
    assert.equal(res.status(), 200, path);
    assert.equal(await page.locator("h1").count(), 1, `${path}: h1`);
    assert.ok(await page.locator('meta[property="og:image"]').count(), `${path}: og:image`);
    assert.equal(
      await page.locator('meta[property="og:url"]').getAttribute("content"),
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      `${path}: og:url = canonical`
    );
    await page.close();
  }
});

test("no hay desbordamiento horizontal entre 320 y 1920 px", async () => {
  for (const path of ROUTES) {
    const { page } = await open(path);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(extra, 0, `${path} a ${width}px desborda ${extra}px`);
    }
    await page.close();
  }
});

test("el menú móvil abre, navega y se cierra con Escape", async () => {
  const { page } = await open("/es", 375);
  const button = page.locator('button[aria-controls="menu-principal"]');
  await button.click();
  assert.equal(await button.getAttribute("aria-expanded"), "true");
  assert.ok(await page.locator("#menu-principal").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await button.click();
  await page.locator("#menu-principal a", { hasText: "Proyectos" }).click();
  await page.waitForURL(/#proyectos$/);
  assert.equal(await button.getAttribute("aria-expanded"), "false");
  await page.close();
});

test("el cambio de idioma conserva la página", async () => {
  const { page } = await open("/es/proyectos/bikans");
  await page.locator('a[hreflang="en"]').first().click();
  await page.waitForURL(`${BASE}/en/projects/bikans`);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.close();
});

test("los destacados muestran el caso de estudio y los demás no tienen secciones vacías", async () => {
  const { page } = await open("/es/proyectos/idn-phishing-detector");
  for (const heading of ["Problema", "Arquitectura", "Decisiones técnicas", "Pruebas y validación", "Limitaciones y próximos pasos"]) {
    assert.ok(await page.getByRole("heading", { level: 2, name: heading }).count(), heading);
  }
  assert.ok((await page.locator("ol li").count()) >= 6, "diagrama de flujo");
  await page.close();

  const other = await open("/es/proyectos/redes-sockets");
  assert.equal(await other.page.getByRole("heading", { level: 2, name: "Problema" }).count(), 0);
  assert.equal(await other.page.getByRole("heading", { level: 2, name: "En esta página" }).count(), 0);
  assert.ok(await other.page.getByRole("link", { name: "Escríbeme" }).count(), "CTA de contacto");
  await other.page.close();
});

test("el 404 responde 404 y no se indexa, también después de hidratar", async () => {
  const { page, res } = await open("/es/ruta-que-no-existe");
  assert.equal(res.status(), 404);
  await page.waitForTimeout(500);
  assert.match(await page.title(), /^Página no encontrada/);
  const robots = await page.locator('meta[name="robots"]').evaluateAll((els) => els.map((e) => e.content));
  assert.ok(robots.length > 0 && robots.every((r) => r.includes("noindex")), robots.join(" | "));
  assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
  await page.close();
});

test("el formulario de contacto valida antes de enviar", async () => {
  const { page } = await open("/en");
  await page.locator('#contacto button[type="submit"]').click();
  assert.equal(await page.locator('#contacto [aria-invalid="true"]').count(), 3);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "contact-name");
  await page.close();
});
