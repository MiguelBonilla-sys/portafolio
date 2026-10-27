import { test } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { htmlToText } from "../lib/html.ts";

test("htmlToText acota el procesamiento de etiquetas sin cerrar", () => {
  const start = performance.now();
  const page = htmlToText("<".repeat(200_000));
  // El código sin acotar tardaba ~12 s con esta entrada en local; el margen cubre runners lentos de CI.
  assert.ok(performance.now() - start < 10_000, "el HTML hostil no debe bloquear el proceso");
  assert.equal(page.text.length, 40_000);
});
