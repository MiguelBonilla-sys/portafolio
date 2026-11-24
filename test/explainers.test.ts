import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { COPY, STEP_COUNT, approvalGateSteps } from "../lib/explainers/approval-gate.ts";
import { COPY as RADIUS_COPY, STEP_COUNT as RADIUS_STEPS, blastRadiusSteps } from "../lib/explainers/blast-radius.ts";
import { WIDGET_IDS, isWidgetId } from "../components/blog/widgets/ids.ts";
import { ensureWidget, explainerSlides, widgetHint, widgetIn } from "../lib/explainers/index.ts";
import { COPY as ROTATION_COPY, STEP_COUNT as ROTATION_STEPS, secretRotationSteps } from "../lib/explainers/secret-rotation.ts";
import { COPY as RESTORE_COPY, STEP_COUNT as RESTORE_STEPS, restoreCheckSteps } from "../lib/explainers/restore-check.ts";
import { COPY as UPDATE_COPY, STEP_COUNT as UPDATE_STEPS, updateDaySteps } from "../lib/explainers/update-day.ts";
import { textWidth, wrapText } from "../agent/visuals/scene.ts";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

test("approval-gate: 5 steps, short captions, same shape in both languages", () => {
  for (const locale of ["en", "es"] as const) {
    for (const [gate, decision] of [[false, null], [true, "approved"], [true, "denied"], [true, null]] as const) {
      const steps = approvalGateSteps(locale, gate, decision);
      assert.equal(steps.length, STEP_COUNT);
      for (const s of steps) assert.ok(words(s.caption) <= 12, `${locale}: "${s.caption}" has ${words(s.caption)} words`);
    }
  }
  const en = approvalGateSteps("en", true, "denied").map((s) => [s.id, s.packet, s.data]);
  const es = approvalGateSteps("es", true, "denied").map((s) => [s.id, s.packet, s.data]);
  assert.deepEqual(en, es);
});

test("approval-gate: without the gate the data is deleted; with it, a person decides", () => {
  const off = approvalGateSteps("en", false, null);
  assert.equal(off[4].data, "deleted");
  assert.equal(off[3].packet, "production", "without a gate the command reaches production at step 4");

  const waiting = approvalGateSteps("en", true, null);
  assert.equal(waiting[3].packet, "gate", "with the gate the command waits");
  assert.equal(waiting[4].data, "intact");

  const denied = approvalGateSteps("en", true, "denied")[4];
  assert.deepEqual([denied.data, denied.packet], ["intact", "agent-back"]);
  const approved = approvalGateSteps("en", true, "approved")[4];
  assert.equal(approved.data, "deleted");
  assert.notEqual(denied.caption, approved.caption);
});

test("copy exists in both languages with the same keys", () => {
  assert.deepEqual(Object.keys(COPY.en).sort(), Object.keys(COPY.es).sort());
  assert.deepEqual(Object.keys(COPY.en.captions).sort(), Object.keys(COPY.es.captions).sort());
  assert.match(COPY.en.note, /not released yet/);
  assert.match(COPY.es.note, /sin publicar/);
});

test("the widget list is closed: unknown ids and prototype keys are rejected", () => {
  assert.equal(isWidgetId("approval-gate"), true);
  for (const id of ["", "unknown", "constructor", "__proto__", "toString", "approval-gate ", "../x"]) assert.equal(isWidgetId(id), false, id);
  assert.ok(WIDGET_IDS.length >= 1);
});

test("every widget a post asks for exists in the registry, in every locale", () => {
  for (const locale of ["es", "en"]) {
    const dir = new URL(`../content/blog/${locale}/`, import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
      const text = readFileSync(new URL(file, dir), "utf8");
      for (const m of text.matchAll(/```widget\s*\n([^\n`]*)\n```/g)) assert.equal(isWidgetId(m[1].trim()), true, `${locale}/${file}: widget "${m[1]}"`);
    }
  }
});

test("the agent's MDX sanitizer keeps a widget block and still strips JSX", async () => {
  const { sanitizeMdxBody } = await import("../agent/lib/mdx.ts");
  const body = "## Idea\n\n```widget\napproval-gate\n```\n\n<Widget id=\"x\" /> and {1 + 1}";
  const { body: clean, findings } = sanitizeMdxBody(body);
  assert.match(clean, /```widget\napproval-gate\n```/);
  assert.match(clean, /\\<Widget/, "the tag is escaped, so it renders as text and never as a component");
  assert.doesNotMatch(clean.replace(/\\</g, ""), /<Widget/);
  assert.ok(findings.includes("etiqueta HTML/JSX escapada"));
});

test("blast-radius: 5 steps, short captions, same shape in both languages", () => {
  for (const locale of ["en", "es"] as const) {
    for (const limited of [false, true]) {
      const steps = blastRadiusSteps(locale, limited);
      assert.equal(steps.length, RADIUS_STEPS);
      for (const s of steps) assert.ok(words(s.caption) <= 12, `${locale}: "${s.caption}" has ${words(s.caption)} words`);
    }
  }
  for (const limited of [false, true]) {
    const shape = (l: "en" | "es") => blastRadiusSteps(l, limited).map((s) => [s.id, s.panel, s.power, s.reach]);
    assert.deepEqual(shape("en"), shape("es"));
  }
  assert.deepEqual(Object.keys(RADIUS_COPY.en).sort(), Object.keys(RADIUS_COPY.es).sort());
  assert.deepEqual(Object.keys(RADIUS_COPY.en.captions).sort(), Object.keys(RADIUS_COPY.es.captions).sort());
  assert.equal(RADIUS_COPY.en.apps.length, RADIUS_COPY.en.users.length);
});

test("blast-radius: root reaches everything, limited privileges reach less but not nothing", () => {
  const root = blastRadiusSteps("en", false);
  assert.deepEqual([root[3].power, root[3].reach, root[4].reach], ["root", "all", "all"]);
  assert.equal(root[0].reach, "none");
  assert.equal(root[1].panel, "breached");
  const limited = blastRadiusSteps("en", true);
  assert.deepEqual([limited[3].power, limited[3].reach], ["limited", "limited"]);
  assert.notEqual(limited[4].reach, "all");
  assert.notEqual(limited[4].reach, "none", "the damage is limited, not zero");
  assert.match(limited[4].caption, /not zero/);
  assert.match(RADIUS_COPY.en.note, /does not remove kernel risk/);
  assert.match(RADIUS_COPY.es.note, /no elimina el riesgo del kernel/);
});

test("blast-radius is registered and the registry stays closed", () => {
  assert.equal(isWidgetId("blast-radius"), true);
  assert.deepEqual([...WIDGET_IDS].sort(), ["approval-gate", "blast-radius", "restore-check", "secret-rotation", "update-day"]);
});

test("secret-rotation: a leaked key stays valid without rotation and is refused with it", () => {
  for (const locale of ["en", "es"] as const) {
    for (const rotate of [false, true]) {
      const steps = secretRotationSteps(locale, rotate);
      assert.equal(steps.length, ROTATION_STEPS);
      for (const x of steps) assert.ok(words(x.caption) <= 12, `${locale}: "${x.caption}"`);
    }
  }
  const off = secretRotationSteps("en", false);
  const on = secretRotationSteps("en", true);
  assert.deepEqual([off[4].leakedCopy, off[4].rotated], ["valid", false]);
  assert.deepEqual([on[4].leakedCopy, on[4].rotated], ["refused", true]);
  assert.equal(on[1].rotated, false, "the leak happens before the rotation");
  assert.deepEqual(Object.keys(ROTATION_COPY.en.captions).sort(), Object.keys(ROTATION_COPY.es.captions).sort());
  assert.equal(ROTATION_COPY.en.axis.length, ROTATION_COPY.es.axis.length);
  assert.match(ROTATION_COPY.en.note, /64%/);
});

test("restore-check: without tests the silent failure surfaces on restore day; with tests it is flagged early", () => {
  for (const locale of ["en", "es"] as const) {
    for (const tested of [false, true]) {
      const steps = restoreCheckSteps(locale, tested);
      assert.equal(steps.length, RESTORE_STEPS);
      for (const x of steps) {
        assert.ok(words(x.caption) <= 12, `${locale}: "${x.caption}"`);
        assert.equal(x.cards.length, 5);
      }
    }
  }
  const off = restoreCheckSteps("en", false);
  assert.deepEqual(off[0].cards, ["ok", "ok", "ok", "ok", "ok"], "all green at the start");
  assert.deepEqual(off[1].cards.slice(2), ["silent", "silent", "silent"], "broken but still showing green");
  assert.deepEqual([off[4].restoreFrom, off[4].lostDays], [2, 3]);
  const on = restoreCheckSteps("en", true);
  assert.equal(on[1].cards[2], "flagged");
  assert.deepEqual([on[4].restoreFrom, on[4].lostDays], [5, 0]);
  assert.deepEqual(Object.keys(RESTORE_COPY.en.captions).sort(), Object.keys(RESTORE_COPY.es.captions).sort());
  assert.match(RESTORE_COPY.en.note, /41%/);
});

test("update-day: apps coupled to the panel go down with it; independent apps keep serving", () => {
  for (const locale of ["en", "es"] as const) {
    for (const independent of [false, true]) {
      const steps = updateDaySteps(locale, independent);
      assert.equal(steps.length, UPDATE_STEPS);
      for (const x of steps) assert.ok(words(x.caption) <= 12, `${locale}: "${x.caption}"`);
    }
  }
  const coupled = updateDaySteps("en", false);
  assert.deepEqual([coupled[2].apps, coupled[3].visitors, coupled[4].downtime], ["down", "errors", true]);
  const independent = updateDaySteps("en", true);
  assert.ok(independent.every((x) => x.apps === "serving" && x.visitors === "ok" && !x.downtime));
  assert.deepEqual(Object.keys(UPDATE_COPY.en.captions).sort(), Object.keys(UPDATE_COPY.es.captions).sort());
  assert.match(UPDATE_COPY.en.note, /patch releases only/);
});

test("widgetHint reads only ids from the closed list", () => {
  assert.equal(widgetHint("Ángulo. Widget: blast-radius. Más texto."), "blast-radius");
  assert.equal(widgetHint("widget: APPROVAL-GATE"), "approval-gate");
  assert.equal(widgetHint("Widget: nope"), null);
  assert.equal(widgetHint("Widget: constructor"), null);
  assert.equal(widgetHint("sin pista"), null);
});

test("ensureWidget leaves one block before the second heading and is idempotent", () => {
  const body = "Intro.\n\n## One\n\nText one.\n\n## Two\n\nText two.\n";
  const once = ensureWidget(body, "update-day");
  assert.equal(widgetIn(once), "update-day");
  assert.ok(once.indexOf("```widget") > once.indexOf("Text one.") && once.indexOf("```widget") < once.indexOf("## Two"));
  assert.equal(ensureWidget(once, "update-day"), once);
  assert.equal(once.match(/```widget/g)?.length, 1);
  assert.match(once, /## Two\n\nText two\./);
});

test("ensureWidget removes unknown or duplicated blocks and swaps a wrong id", () => {
  const messy = "## One\n\n```widget\nconstructor\n```\n\nText.\n\n```widget\nupdate-day\n```\n\n## Two\n";
  const fixed = ensureWidget(messy, "blast-radius");
  assert.equal(widgetIn(fixed), "blast-radius");
  assert.equal(fixed.match(/```widget/g)?.length, 1);
  assert.doesNotMatch(fixed, /constructor|update-day/);
  assert.equal(ensureWidget("## Only one heading\n\nText.\n", "approval-gate").trimEnd().endsWith("```"), true, "no second heading: goes at the end");
});

test("carousel slides come from the same steps and fit the slide in both languages", () => {
  for (const id of WIDGET_IDS) {
    for (const locale of ["en", "es"] as const) {
      const slides = explainerSlides(id, locale);
      assert.ok(slides.length >= 6 && slides.length <= 10, `${id}/${locale}: ${slides.length} slides`);
      for (const s of slides) {
        assert.ok(s.title.trim() && s.body.trim(), `${id}/${locale}: empty slide`);
        assert.ok(wrapText(s.title.toUpperCase(), 904, 92, "display").length <= 3, `${id}/${locale}: title "${s.title}" too long`);
        assert.ok(wrapText(s.body, 904, 46, "sans").length <= 9, `${id}/${locale}: body of "${s.title}" does not fit`);
      }
      assert.match(slides.at(-1)!.body, locale === "en" ? /portfolio/ : /portafolio/);
    }
    assert.notDeepEqual(explainerSlides(id, "en"), explainerSlides(id, "es"));
  }
  const gate = explainerSlides("approval-gate", "en");
  assert.match(gate.find((s) => s.title === "Without it")!.body, /gone/);
  assert.match(gate.find((s) => s.title === "With it")!.body, /Denied/);
  assert.ok(textWidth("x", 10) > 0);
});
