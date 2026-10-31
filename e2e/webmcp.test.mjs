import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const executablePath = process.env.WEBMCP_CHROME_PATH;

async function toolsOn(page) {
  return page.evaluate(async () => document.modelContext.getTools());
}

async function execute(page, name, input) {
  return page.evaluate(async ({ name, input }) => {
    const tool = (await document.modelContext.getTools()).find((item) => item.name === name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    const output = await document.modelContext.executeTool(tool, input, {});
    return JSON.parse(JSON.parse(output).content[0].text);
  }, { name, input });
}

test("native WebMCP registers, invokes, and removes contextual tools", { skip: !executablePath && "Set WEBMCP_CHROME_PATH to Chrome 146+" }, async () => {
  const browser = await chromium.launch({ executablePath, args: ["--enable-features=WebMCP", "--enable-webmcp-testing"] });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/en`);
    assert.equal(await page.evaluate(() => Boolean(document.modelContext)), true, "native API unavailable");
    await page.waitForFunction(async () => (await document.modelContext.getTools()).length === 4);
    const names = (await toolsOn(page)).map((tool) => tool.name);
    assert.deepEqual(names.sort(), ["get_professional_profile", "navigate_to_portfolio_section", "prepare_contact_message", "search_portfolio_projects"]);
    assert.equal(new Set(names).size, names.length);
    const found = await execute(page, "search_portfolio_projects", { technology: "FastAPI" });
    assert.equal(found.ok, true);
    assert.ok(found.data.some((project) => project.id === "idn-phishing-detector"));
    const profile = await execute(page, "get_professional_profile", {});
    assert.equal(profile.data.currentRole, "Development Lead");
    assert.equal(profile.data.experience[0].dates, "Nov 2026 — Present");
    assert.equal(profile.data.experience[1].title, "Frontend Developer");
    assert.equal(profile.data.experience[1].dates, "Sep 2025 — Oct 2026");

    let sends = 0;
    await page.route("https://api.web3forms.com/**", (route) => { sends++; route.abort(); });
    const prepared = await execute(page, "prepare_contact_message", { name: "Test Person", email: "test@example.com", message: "Please contact me about this project." });
    assert.deepEqual(prepared, { ok: true, data: { prepared: true, sent: false, requiresHumanSubmit: true } });
    assert.equal(await page.locator('#contacto [name="message"]').inputValue(), "Please contact me about this project.");
    assert.equal(sends, 0);

    const invalid = await execute(page, "prepare_contact_message", { name: "Test Person", email: "invalid", message: "Please contact me about this project." });
    assert.equal(invalid.error.code, "validation_failed");
    assert.equal(sends, 0);

    const rejectedSection = await execute(page, "navigate_to_portfolio_section", { section: "toString" });
    assert.equal(rejectedSection.error.code, "not_found");
    assert.equal(new URL(page.url()).pathname, "/en");

    const navigation = await execute(page, "navigate_to_portfolio_section", { section: "cv" });
    assert.deepEqual(navigation, { ok: true, data: { path: "/en/cv" } });
    await page.waitForURL(`${BASE}/en/cv`);
    await page.waitForFunction(async () => (await document.modelContext.getTools()).length === 0);
    assert.equal((await toolsOn(page)).length, 0, "home tools must be removed after navigation");

    await page.goto(`${BASE}/en/projects/idn-phishing-detector`);
    await page.waitForFunction(async () => (await document.modelContext.getTools()).length === 1);
    assert.deepEqual((await toolsOn(page)).map((tool) => tool.name), ["get_project_details"]);
    assert.equal((await execute(page, "get_project_details", { id: "idn-phishing-detector" })).data.id, "idn-phishing-detector");
    assert.equal((await execute(page, "get_project_details", { id: "unknown" })).error.code, "not_found");

    await page.goto(`${BASE}/en/blog`);
    await page.waitForFunction(async () => (await document.modelContext.getTools()).length === 1);
    assert.deepEqual((await toolsOn(page)).map((tool) => tool.name), ["search_blog_articles"]);
    assert.deepEqual((await execute(page, "search_blog_articles", { query: "FastAPI" })).data, []);
    await page.close();
  } finally {
    await browser.close();
  }
});

test("without native WebMCP the site renders and the form stays usable", async () => {
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${BASE}/es`);
    assert.equal(response.status(), 200);
    assert.equal(await page.evaluate(() => Boolean(document.modelContext)), false);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok(await page.locator('link[rel="canonical"]').getAttribute("href"));
    await page.locator('#contacto [name="name"]').fill("Test Person");
    await page.locator('#contacto [name="email"]').fill("test@example.com");
    await page.locator('#contacto [name="message"]').fill("This form remains usable.");
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
  }
});
