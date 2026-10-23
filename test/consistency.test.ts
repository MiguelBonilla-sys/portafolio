// Consistencia entre canales (GEO): un buscador o un asistente de IA que lea el sitio, el CV, el perfil de
// LinkedIn, los datos estructurados o el prompt del agente debe encontrar los mismos hechos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import projects from "../data/projects.en.json" with { type: "json" };
import experience from "../data/experience.en.json" with { type: "json" };
import es from "../messages/es.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };

const ROOT = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const POSITIONING = "Full Stack Engineer · Python, React & AI Systems";

/** Todo lo que se publica o alimenta lo que se publica */
const PUBLIC_SURFACES = [
  "messages/es.json",
  "messages/en.json",
  "data/projects.es.json",
  "data/projects.en.json",
  "data/experience.es.json",
  "data/experience.en.json",
  "lib/jsonld.ts",
  "app/llms.txt/route.ts",
  "app/[locale]/opengraph-image.tsx",
  "app/[locale]/cv/page.tsx",
  "lib/card.ts",
  "agent/prompts.ts",
  "docs/linkedin-profile.md",
  ...["es", "en"].flatMap((l) => readdirSync(join(ROOT, "content/blog", l)).map((f) => `content/blog/${l}/${f}`)),
];

test("el mismo posicionamiento en hero, metadata, CV, JSON-LD, imagen OG, llms.txt, LinkedIn y el prompt del agente", () => {
  assert.equal(en.hero.role, POSITIONING);
  assert.equal(en.cv.role, en.hero.role);
  assert.equal(es.cv.role, es.hero.role);
  assert.match(en.meta.title, /Full Stack Engineer · Python, React & AI Systems/);
  assert.match(es.meta.title, /Full Stack Engineer · Python, React y sistemas con IA/);
  assert.match(read("lib/jsonld.ts"), /jobTitle: "Full Stack Engineer"/);
  assert.match(read("app/[locale]/opengraph-image.tsx"), /FULL STACK ENGINEER<\/div>\s*<div[^>]*>PYTHON · REACT · AI SYSTEMS/);
  assert.match(read("app/llms.txt/route.ts"), /Full Stack Engineer \(Python, React & AI systems\)/);
  assert.ok(read("docs/linkedin-profile.md").includes(`\`${POSITIONING} |`), "titular recomendado de LinkedIn");
  assert.match(read("agent/prompts.ts"), /Full Stack Engineer \(Python, React y sistemas con IA\)/);
});

test("ninguna superficie pública repite afirmaciones retiradas o contradichas por los repositorios", () => {
  const banned: [RegExp, string][] = [
    [/Full Stack AI Engineer/, "titular anterior"],
    [/\bAI Engineer\b/, "título que no corresponde a un cargo real"],
    [/359 (pruebas|automated tests|tests)/i, "cifra que el repositorio de la tesis no registra"],
    [/(agentes sobre|agents built on|built on) LlamaStack/i, "la tesis ya no usa LlamaStack para los agentes"],
    [/github\.com\/MiguelBonilla-sys\/API_AUTH_HACKATON/i, "repositorio con credenciales expuestas sin limpiar"],
  ];
  const hits = PUBLIC_SURFACES.flatMap((file) => banned.filter(([re]) => re.test(read(file))).map(([, why]) => `${file}: ${why}`));
  assert.deepEqual(hits, []);
});

test("la experiencia declarada es la misma en todas partes (años, cargos y empleadores)", () => {
  const years = new Set<string>();
  for (const file of PUBLIC_SURFACES) for (const m of read(file).matchAll(/(\d+)\+? (?:años|years)(?: de experiencia| of (?:professional )?experience| profesionales| professional| en producción| in production)/g)) years.add(m[1]);
  assert.deepEqual([...years], ["2"], `años de experiencia declarados: ${[...years].join(", ")}`);
  const linkedin = read("docs/linkedin-profile.md");
  for (const job of experience.filter((e) => e.type === "work")) {
    const company = job.place.split(" · ")[0];
    assert.ok(linkedin.includes(`${company} · ${job.title}`), `LinkedIn: ${company} · ${job.title}`);
    assert.ok(linkedin.includes(job.date.replace(" — ", " – ").replace("Present", "Present")), `LinkedIn: fechas de ${company}`);
  }
});

test("los proyectos sin código público no se presentan como trabajo verificable en LinkedIn ni en el CV", () => {
  const unverified = projects.filter((p) => p.status === "unverified");
  const linkedin = read("docs/linkedin-profile.md").split("## Proyectos")[1];
  const cv = read("app/[locale]/cv/page.tsx").match(/CV_PROJECTS = \[([^\]]+)\]/)![1];
  for (const p of unverified) {
    assert.ok(!linkedin.includes(p.title.split(":")[0]), `LinkedIn menciona ${p.id}`);
    assert.ok(!cv.includes(`"${p.id}"`), `el CV incluye ${p.id}`);
  }
});

test("los artículos enlazan proyectos que existen, con categoría válida y fuentes https", () => {
  const ids = new Set(projects.map((p) => p.id));
  for (const l of ["es", "en"]) {
    for (const f of readdirSync(join(ROOT, "content/blog", l))) {
      const text = read(`content/blog/${l}/${f}`);
      const refs = text.match(/^projects: \[([^\]]*)\]/m)?.[1].match(/[\w-]+/g) ?? [];
      for (const id of refs) assert.ok(ids.has(id), `${f}: proyecto inexistente ${id}`);
      assert.match(text, /^category: "?(software|backend|frontend|security|ai|automation)"?$/m, `${f}: categoría`);
      for (const url of text.match(/url: "([^"]+)"/g) ?? []) assert.match(url, /url: "https:\/\//, `${f}: ${url}`);
    }
  }
});
