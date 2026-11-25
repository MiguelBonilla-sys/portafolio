// El CV en PDF dice lo mismo que la página /cv: se regenera con `pnpm cv` cuando cambian los datos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";
import projectsEs from "../data/projects.es.json" with { type: "json" };
import projectsEn from "../data/projects.en.json" with { type: "json" };
import experienceEs from "../data/experience.es.json" with { type: "json" };
import experienceEn from "../data/experience.en.json" with { type: "json" };
import messagesEs from "../messages/es.json" with { type: "json" };
import messagesEn from "../messages/en.json" with { type: "json" };

type Project = { links: { demo: string | null }; id: string; title: string; description: string; status: string; hidden?: boolean; context?: string; cv?: string[] };
type Job = { title: string; place: string; description: string; highlights?: string[]; cv?: string[]; type: string };

const LOCALES = {
  es: { projects: projectsEs as Project[], experience: experienceEs as Job[], messages: messagesEs },
  en: { projects: projectsEn as Project[], experience: experienceEn as Job[], messages: messagesEn },
};

// Mismo arreglo que app/[locale]/cv/page.tsx, leído del archivo para no duplicarlo
const page = readFileSync(new URL("../app/[locale]/cv/page.tsx", import.meta.url), "utf8");
const CV_PROJECTS = JSON.parse(page.match(/const CV_PROJECTS = (\[[^\]]*\])/)![1]) as string[];

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

async function pdfText(locale: string) {
  const file = readFileSync(new URL(`../public/cv/miguel-bonilla-cv-${locale}.pdf`, import.meta.url));
  const pdf = await getDocumentProxy(new Uint8Array(file));
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return { text: norm(text), totalPages };
}

for (const [locale, { projects, experience, messages }] of Object.entries(LOCALES)) {
  test(`CV en PDF (${locale}) coincide con los datos del sitio`, async () => {
    const { text, totalPages } = await pdfText(locale);
    // Una sola página: lo que piden las guías para menos de 5 años de experiencia
    assert.equal(totalPages, 1, `${totalPages} páginas`);
    assert.ok(text.includes(norm(messages.cv.role)), "titular");
    assert.ok(text.includes("miguelangelboto09@gmail.com") && text.includes("+57 315 002 4744"), "contacto vigente");
    assert.ok(text.includes(norm(messages.cv.summaryText)), "perfil");
    for (const job of experience) {
      assert.ok(text.includes(norm(job.title)), `cargo: ${job.title}`);
      for (const part of job.place.split(" · ")) assert.ok(text.includes(norm(part)), `lugar: ${part}`);
      if (job.type === "course") continue; // los cursos solo muestran título y lugar
      for (const line of job.cv ?? job.highlights ?? [job.description]) assert.ok(text.includes(norm(line)), `logro: ${line.slice(0, 60)}`);
    }
    for (const id of CV_PROJECTS) {
      const p = projects.find((x) => x.id === id);
      assert.ok(p && !p.hidden, `proyecto del CV inexistente u oculto: ${id}`);
      assert.ok(text.includes(norm(p.title)), `título: ${p.title}`);
      for (const line of p.cv ?? [p.description]) assert.ok(text.includes(norm(line)), `proyecto desactualizado: ${p.id}`);
      if (p.context) assert.ok(text.includes(norm(p.context)), `contexto: ${p.id}`);
      const demo = p.links.demo?.replace(/^https:\/\//, "").replace(/\/$/, "");
      if (demo) assert.ok(text.includes(norm(demo.split("/")[0])), `enlace de la demo: ${p.id}`);
    }
    for (const p of projects.filter((x) => x.status === "unverified" || x.hidden)) {
      assert.ok(!text.includes(norm(p.title)), `proyecto sin evidencia en el CV: ${p.id}`);
    }
    assert.doesNotMatch(text, /api_auth_hackaton/i, "enlace al repositorio con credenciales expuestas");
  });
}
