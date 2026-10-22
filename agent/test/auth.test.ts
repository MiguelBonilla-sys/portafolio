import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "../lib/auth.ts";

const SECRET = "0123456789abcdef0123";
const NOW = 1_700_000_000_000;

test("el token firmado vale para su propósito hasta que vence", () => {
  const t = signToken(SECRET, "linkedin-auth", 60_000, NOW);
  assert.equal(t.includes(SECRET), false);
  assert.equal(verifyToken(t, SECRET, "linkedin-auth", NOW + 59_000), true);
  assert.equal(verifyToken(t, SECRET, "linkedin-auth", NOW + 61_000), false);
  assert.equal(verifyToken(t, SECRET, "otro", NOW), false);
  assert.equal(verifyToken(t, "otro-secreto-de-16+", "linkedin-auth", NOW), false);
});

test("un token alterado o vacío no pasa", () => {
  const [exp, sig] = signToken(SECRET, "linkedin-auth", 60_000, NOW).split(".");
  assert.equal(verifyToken(`${Number(exp) + 86_400_000}.${sig}`, SECRET, "linkedin-auth", NOW), false);
  assert.equal(verifyToken(`${exp}.${sig.slice(1)}0`, SECRET, "linkedin-auth", NOW), false);
  assert.equal(verifyToken(null, SECRET, "linkedin-auth", NOW), false);
  assert.equal(verifyToken("", SECRET, "linkedin-auth", NOW), false);
});
