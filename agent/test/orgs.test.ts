// Coordenadas.co y Bikans: enlaces en el blog, menciones en LinkedIn y el texto de LinkedIn sin cortes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BIKANS, COORDENADAS, findOrgs, linkOrgsMarkdown, withOrgUrls } from "../../lib/orgs.ts";
import { createLinkedIn, toLittleText } from "../lib/linkedin.ts";
import { buildMdx } from "../lib/mdx.ts";

const names = (text: string) => findOrgs(text).map((h) => text.slice(h.start, h.end));

test("reconoce a las empresas sin confundirlas con palabras comunes ni dominios", () => {
  assert.deepEqual(names("Trabajo en Coordenadas.co para Bikans."), ["Coordenadas.co", "Bikans"]);
  assert.deepEqual(names("Lo aprendí en Coordenadas, con Bikans Asesores."), ["Coordenadas", "Bikans"]);
  assert.deepEqual(names("las coordenadas GPS y unas Coordenadas polares"), []);
  assert.deepEqual(names("Coordenadas.co · app.bikans.com"), ["Coordenadas.co"]);
  assert.deepEqual(names("Visita Bikans.com"), []);
  assert.equal(withOrgUrls("Coordenadas.co · Bogotá"), "Coordenadas.co (https://coordenadas.co/) · Bogotá");
});

test("Markdown: enlaza la primera mención de cada empresa, nunca en código, encabezados ni enlaces existentes", () => {
  const md = [
    "## Lo que hice en Coordenadas.co",
    "",
    "Esto lo aprendí trabajando en Coordenadas.co para Bikans, y en Coordenadas.co lo seguimos usando.",
    "",
    "```ts\nconst org = 'Coordenadas.co';\n```",
    "",
    "Más sobre `Bikans` y Bikans.",
  ].join("\n");
  const out = linkOrgsMarkdown(md);
  assert.equal(out.match(/\]\(https:\/\/coordenadas\.co\/\)/g)?.length, 1);
  assert.equal(out.match(/\]\(https:\/\/bikans\.com\/\)/g)?.length, 1);
  assert.match(out, /^## Lo que hice en Coordenadas\.co$/m, "el encabezado queda igual");
  assert.match(out, /const org = 'Coordenadas\.co';/, "el código queda igual");
  assert.match(out, /trabajando en \[Coordenadas\.co\]\(https:\/\/coordenadas\.co\/\) para \[Bikans\]\(https:\/\/bikans\.com\/\)/);
  assert.equal(linkOrgsMarkdown(out), out, "aplicarlo dos veces no cambia nada");
  assert.equal(linkOrgsMarkdown("Un texto sin empresas."), "Un texto sin empresas.");
});

test("el artículo publicado enlaza a la empresa cuando el texto la nombra", () => {
  const mdx = buildMdx({
    draft: {
      title: "Control de acceso por dueño",
      description: "Cómo filtré los activos por dueño en un gateway FastAPI sin tocar la API original de inventario.",
      summary: "s",
      tags: [],
      faq: [],
      body: "## Cierre\n\nLo aprendí construyendo la plataforma de Bikans en Coordenadas.co.",
    },
    slug: "control-de-acceso",
    locale: "es",
    date: "2026-10-26",
    category: "backend",
    contentId: "id",
    sources: [],
  });
  assert.match(mdx, /plataforma de \[Bikans\]\(https:\/\/bikans\.com\/\) en \[Coordenadas\.co\]\(https:\/\/coordenadas\.co\/\)\./);
});

test("LinkedIn: el texto se escapa (los paréntesis ya no cortan el post) y la empresa queda mencionada", () => {
  const text = "Armé un gateway (FastAPI + JWT) en Coordenadas.co para Bikans: token_ttl de 30 min. #FastAPI C# [beta] <ok> *n* ~x~ a|b {c} \\ @x";
  const out = toLittleText(text, { mentions: true });
  assert.equal(
    out,
    "Armé un gateway \\(FastAPI + JWT\\) en @[Coordenadas.co](urn:li:organization:15161244) para @[Bikans Asesores](urn:li:organization:101577063): token\\_ttl de 30 min. #FastAPI C\\# \\[beta\\] \\<ok\\> \\*n\\* \\~x\\~ a\\|b \\{c\\} \\\\ \\@x"
  );
  assert.doesNotMatch(toLittleText(text), /urn:li/, "sin menciones, solo escapado");
  assert.equal(COORDENADAS.linkedinUrn, "urn:li:organization:15161244");
  assert.equal(BIKANS.linkedinUrn, "urn:li:organization:101577063");
});

test("LinkedIn: si rechaza la mención, publica igual sin ella", async () => {
  const bodies: { commentary: string }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return bodies.length === 1
      ? new Response("mention not allowed", { status: 422 })
      : new Response("{}", { status: 201, headers: { "x-restli-id": "urn:li:share:1" } });
  }) as typeof fetch;
  try {
    const urn = await createLinkedIn("token", "member", "202608").createPost("Lo aprendí en Coordenadas.co (con FastAPI).");
    assert.equal(urn, "urn:li:share:1");
    assert.equal(bodies.length, 2);
    assert.match(bodies[0].commentary, /@\[Coordenadas\.co\]\(urn:li:organization:15161244\)/);
    assert.equal(bodies[1].commentary, "Lo aprendí en Coordenadas.co \\(con FastAPI\\).");
  } finally {
    globalThis.fetch = realFetch;
  }
});
