// Integridad del contenido: ES y EN describen lo mismo y ningún proyecto declara más de lo que muestra.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import projectsEs from "../data/projects.es.json" with { type: "json" };
import projectsEn from "../data/projects.en.json" with { type: "json" };
import experienceEs from "../data/experience.es.json" with { type: "json" };
import experienceEn from "../data/experience.en.json" with { type: "json" };
import skills from "../data/skills.json" with { type: "json" };
import messagesEs from "../messages/es.json" with { type: "json" };
import messagesEn from "../messages/en.json" with { type: "json" };

const STATUSES = ["commercial", "deployed", "academic", "prototype", "archived", "unverified"];
const CASE_LISTS = ["constraints", "decisions", "challenges", "validation", "results", "limitations"] as const;

type AnyProject = (typeof projectsEs)[number] & { caseStudy?: Record<string, unknown>; hidden?: boolean };

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

test("los proyectos son los mismos, en el mismo orden y con el mismo estado en ES y EN", () => {
  assert.deepEqual(
    projectsEs.map((p) => p.id),
    projectsEn.map((p) => p.id)
  );
  for (const [i, es] of projectsEs.entries()) {
    const en = projectsEn[i];
    assert.equal(es.status, en.status, es.id);
    assert.equal(es.featured, en.featured, es.id);
    assert.deepEqual(es.links, en.links, es.id);
    assert.equal(es.tags.length, en.tags.length, `${es.id}: tags`);
    assert.equal(Boolean(es.solves), Boolean(en.solves), `${es.id}: solves`);
  }
});

test("cada proyecto tiene un estado válido y respaldado por su evidencia", () => {
  for (const p of projectsEs) {
    assert.ok(STATUSES.includes(p.status), `${p.id}: estado "${p.status}"`);
    if (p.status === "commercial" || p.status === "deployed") assert.ok(p.links.demo, `${p.id}: ${p.status} sin URL pública`);
    if (p.status === "unverified") {
      assert.equal(p.links.repo, null, p.id);
      assert.equal(p.links.demo, null, p.id);
      assert.equal(p.featured, false, `${p.id}: sin evidencia no puede ser destacado`);
    } else {
      const withheld = (p.links as { repoWithheld?: boolean }).repoWithheld === true;
      assert.ok(p.links.repo || p.links.demo || withheld, `${p.id}: sin repo ni demo debe ser "unverified"`);
    }
    // "Producción" en el contexto solo con una URL que lo demuestre
    if (/producci[oó]n|production/i.test(p.context ?? "")) assert.ok(p.links.demo, `${p.id}: dice producción sin demo`);
  }
});

test("un proyecto oculto queda sin evidencia, fuera de destacados y no lo cita ningún artículo", () => {
  // docs/remediation/CONTENT_DECISIONS.md: se oculta mientras el autor no confirme qué existe
  for (const es of projectsEs as AnyProject[]) {
    const en = (projectsEn as AnyProject[]).find((p) => p.id === es.id)!;
    assert.equal(Boolean(es.hidden), Boolean(en.hidden), `${es.id}: hidden distinto entre idiomas`);
    if (!es.hidden) continue;
    assert.equal(es.status, "unverified", es.id);
    assert.equal(es.featured, false, es.id);
  }
  const hidden = new Set((projectsEs as AnyProject[]).filter((p) => p.hidden).map((p) => p.id));
  const dir = new URL("../content/blog/", import.meta.url);
  for (const locale of readdirSync(dir)) {
    for (const f of readdirSync(new URL(`${locale}/`, dir))) {
      const text = readFileSync(new URL(`${locale}/${f}`, dir), "utf8");
      for (const id of hidden) assert.doesNotMatch(text, new RegExp(`\\b${id}\\b`), `${locale}/${f} cita ${id}`);
    }
  }
});

test("el repositorio con credenciales expuestas no se enlaza mientras siga sin limpiar", () => {
  // docs/phase-2/SECURITY_REMEDIATION.md: se vuelve a enlazar cuando el historial esté purgado y las cuentas rotadas
  const all = JSON.stringify([projectsEs, projectsEn]);
  assert.doesNotMatch(all, /API_AUTH_HACKATON/i);
});

test("el CV detalla exactamente los proyectos principales", () => {
  const page = readFileSync(new URL("../app/[locale]/cv/page.tsx", import.meta.url), "utf8");
  const cv = JSON.parse(page.match(/const CV_PROJECTS = (\[[^\]]*\])/)![1]) as string[];
  assert.deepEqual(cv, projectsEs.filter((p) => p.featured).map((p) => p.id));
});

test("los destacados dicen qué resuelven y tienen caso de estudio, con las mismas secciones en ambos idiomas", () => {
  const featured = projectsEs.filter((p) => p.featured);
  assert.ok(featured.length >= 3 && featured.length <= 5, `destacados: ${featured.length}`);
  for (const es of projectsEs as AnyProject[]) {
    const en = (projectsEn as AnyProject[]).find((p) => p.id === es.id)!;
    if (es.featured) {
      assert.ok(es.solves, `${es.id}: falta solves`);
      assert.ok(es.caseStudy, `${es.id}: falta caseStudy`);
      for (const key of ["need", "solution", "role"]) assert.ok(es.caseStudy?.[key], `${es.id}: falta caseStudy.${key}`);
    }
    if (!es.caseStudy) {
      assert.equal(en.caseStudy, undefined, es.id);
      continue;
    }
    const a = es.caseStudy as Record<string, unknown>;
    const b = en.caseStudy as Record<string, unknown>;
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `${es.id}: secciones`);
    for (const key of CASE_LISTS) {
      if (!a[key]) continue;
      const list = a[key] as string[];
      assert.ok(list.length > 0, `${es.id}.${key} vacío`);
      assert.equal(list.length, (b[key] as string[]).length, `${es.id}.${key}`);
    }
    const flowEs = (a.architecture as { flow: string[] } | undefined)?.flow ?? [];
    const flowEn = (b.architecture as { flow: string[] } | undefined)?.flow ?? [];
    assert.equal(flowEs.length, flowEn.length, `${es.id}: pasos de arquitectura`);
  }
});

test("la experiencia coincide entre idiomas (cargos, tipos y tecnologías)", () => {
  // Los cargos se publican con su nombre real en ambos idiomas; formación y cursos sí se traducen
  const roles = (list: typeof experienceEs) => list.map((e) => [e.id, e.type, e.type === "work" ? e.title : ""]);
  assert.deepEqual(roles(experienceEs), roles(experienceEn));
  for (const [i, es] of experienceEs.entries()) {
    assert.deepEqual((es as { stack?: string[] }).stack, (experienceEn[i] as { stack?: string[] }).stack, es.id);
    assert.equal(es.highlights?.length, experienceEn[i].highlights?.length, `${es.id}: logros`);
  }
});

test("las categorías del stack tienen nombre en ambos idiomas y al menos una tecnología principal", () => {
  const seen = new Set<string>();
  for (const c of skills) {
    assert.ok(c.label.es && c.label.en, c.id);
    assert.ok(c.core.length > 0, `${c.id}: sin principales`);
    for (const item of [...c.core, ...c.items]) {
      const name = typeof item === "string" ? item : item.en;
      assert.ok(!seen.has(name), `tecnología repetida: ${name}`);
      seen.add(name);
    }
  }
});

test("los textos de la interfaz tienen las mismas claves en ES y EN", () => {
  assert.deepEqual(keys(messagesEs).sort(), keys(messagesEn).sort());
  for (const status of STATUSES) {
    assert.ok(messagesEs.projects.status[status as keyof typeof messagesEs.projects.status], status);
  }
});

test("el posicionamiento no usa títulos ni adjetivos sin respaldo", () => {
  const text = JSON.stringify([messagesEs, messagesEn, projectsEs, projectsEn, experienceEs, experienceEn]);
  for (const banned of [/\bsenior\b/i, /\bexpert[oa]?s?\b/i, /production-ready/i, /enterprise-grade/i, /world-class/i]) {
    assert.doesNotMatch(text, banned);
  }
  assert.match(messagesEn.hero.role, /^Full Stack Engineer · Python, React & AI Systems$/);
});

// docs/research/PROJECT_NARRATIVE.md: la tarjeta dice qué necesidad atiende y qué hace el sistema; quién lo hizo va en "Mi parte"
const FIRST_PERSON = /^(Construí|Desarrollé|Entregué|Hice|Implementé|Diseñé|Creé|Automaticé|Uní|Integré|Escribí|I (built|developed|delivered|made|implemented|designed|created|automated|merged|integrated|wrote))\b/;
// Métricas de proceso ("en 4 días, 5 fases y 17 tareas"): cuentan el esfuerzo, no qué cambió. Un plazo va en Restricciones
const PROCESS_METRIC = /\b(en|in) \d+ (días|semanas|days|weeks)\b|\b\d+ (fases|tareas|sprints|phases|tasks)\b/i;

test("las tarjetas de proyecto empiezan por la necesidad y la solución, no por «construí»", () => {
  for (const p of [...projectsEs, ...projectsEn] as AnyProject[]) {
    assert.doesNotMatch(p.description, FIRST_PERSON, `${p.id}: description`);
    if (p.solves) assert.doesNotMatch(p.solves, FIRST_PERSON, `${p.id}: solves`);
    const need = p.caseStudy?.need as string | undefined;
    if (need) assert.doesNotMatch(need, FIRST_PERSON, `${p.id}: need`);
  }
});

test("ni los proyectos ni la experiencia usan métricas de proceso fuera de Restricciones", () => {
  for (const p of [...projectsEs, ...projectsEn] as AnyProject[]) {
    const rest: Record<string, unknown> = { ...p.caseStudy };
    delete rest.constraints;
    const text = JSON.stringify([p.description, p.solves, p.longDescription, rest]);
    assert.doesNotMatch(text, PROCESS_METRIC, p.id);
  }
  for (const e of [...experienceEs, ...experienceEn]) {
    for (const h of e.highlights ?? []) assert.doesNotMatch(h, PROCESS_METRIC, `${e.id}: ${h}`);
  }
  assert.doesNotMatch(JSON.stringify([messagesEs.about, messagesEn.about]), PROCESS_METRIC, "about");
});
