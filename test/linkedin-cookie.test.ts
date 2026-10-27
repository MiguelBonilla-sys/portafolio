import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ResponseCookies } from "next/dist/compiled/@edge-runtime/cookies/index.js";

test("el callback elimina la cookie OAuth con la misma ruta con que se creó", () => {
  const auth = readFileSync(new URL("../app/api/linkedin/auth/route.ts", import.meta.url), "utf8");
  const callback = readFileSync(new URL("../app/api/linkedin/callback/route.ts", import.meta.url), "utf8");
  assert.match(auth, /path: "\/api\/linkedin"/);
  assert.match(callback, /jar\.delete\(\{ name: "li_oauth_state", path: "\/api\/linkedin" \}\)/);

  const headers = new Headers();
  const jar = new ResponseCookies(headers);
  jar.set("li_oauth_state", "test", { path: "/api/linkedin" });
  jar.delete({ name: "li_oauth_state", path: "/api/linkedin" });
  assert.match(headers.get("set-cookie") ?? "", /Path=\/api\/linkedin/i);
  assert.match(headers.get("set-cookie") ?? "", /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
});
