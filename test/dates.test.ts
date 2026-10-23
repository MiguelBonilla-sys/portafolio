// Fechas de los datos estructurados: Search Console rechaza las fechas sin hora ni zona.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PROFILE_UPDATED, toDateTime } from "../lib/dates.ts";

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

test("las fechas salen con hora y zona horaria, y siguen siendo la misma fecha", () => {
  assert.equal(toDateTime("2026-10-23"), "2026-10-23T00:00:00-05:00");
  assert.match(toDateTime(PROFILE_UPDATED), ISO_DATETIME);
  assert.ok(!Number.isNaN(Date.parse(toDateTime(PROFILE_UPDATED))));
  assert.equal(toDateTime("2026-10-23T08:30:00Z"), "2026-10-23T08:30:00Z");
  assert.throws(() => toDateTime("23/10/2026"));
  assert.throws(() => toDateTime("2026-10-23T08:30"));
});

test("PROFILE_UPDATED no es anterior al último cambio del perfil", (t) => {
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
  let last = "";
  try {
    // En un clon superficial (el checkout del CI) el único commit parece haber tocado todo
    if (git("rev-parse", "--is-shallow-repository") === "false") last = git("log", "-1", "--format=%cs", "--", "data", "messages");
  } catch {
    // sin git
  }
  if (!last) return t.skip("sin historial de git completo");
  assert.ok(PROFILE_UPDATED >= last, `PROFILE_UPDATED (${PROFILE_UPDATED}) es anterior al último cambio del perfil (${last}): actualízala en lib/dates.ts`);
});
