import { test } from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../lib/lint.ts";
import { relatedProjects, seoReport } from "../seo.ts";
import { pngSize, renderPng } from "../visuals/render.ts";
import { altText, contrastRatio, fitText, PRESETS, TEXT_PAIRS, validateSpec, VisualFitError, wrapText, type VisualSpec } from "../visuals/scene.ts";
import { renderSvg } from "../visuals/svg.ts";
import { BODY_ES } from "./helpers.ts";

test("los pares de texto y fondo de los visuales cumplen contraste AA (≥ 4.5:1)", () => {
  for (const [fg, bg] of TEXT_PAIRS) assert.ok(contrastRatio(fg, bg) >= 4.5, `${fg} sobre ${bg}: ${contrastRatio(fg, bg).toFixed(2)}`);
});

test("el ajuste de texto nunca corta: reduce el tamaño o falla con un motivo", () => {
  const fit = fitText("Control de acceso por propiedad en un gateway FastAPI", { width: 700, maxLines: 3, max: 84, min: 44 }, "display");
  assert.ok(fit.lines.length <= 3 && fit.fontSize >= 44);
  assert.throws(() => fitText("Una palabra imposiblementelarguísimaquenocabeenningunaparte", { width: 200, maxLines: 2, max: 40, min: 30 }), VisualFitError);
  assert.throws(() => wrapText("x".repeat(80), 100, 20), VisualFitError);
});

test("validateSpec rechaza diagramas que no aportan o no caben", () => {
  assert.match(validateSpec({ kind: "flow", name: "f", title: "Flujo", steps: ["a", "b"] }).join(), /menos de 3 pasos/);
  assert.match(validateSpec({ kind: "bars", name: "b", title: "B", unit: "ms", bars: [{ label: "a", value: 1 }, { label: "b", value: 2 }], source: "" }).join(), /fuente/);
  assert.match(
    validateSpec({ kind: "comparison", name: "c", title: "C", columns: ["A", "B"], rows: [{ criterion: "x", values: ["1"] }, { criterion: "y", values: ["1", "2"] }] }).join(),
    /no tiene un valor por opción/
  );
  assert.match(validateSpec({ kind: "sequence", name: "s", title: "S", actors: ["A", "B"], messages: [{ from: "A", to: "Z", label: "x" }, { from: "A", to: "B", label: "y" }] }).join(), /desconocido/);
});

const specs: VisualSpec[] = [
  { kind: "flow", name: "flujo", title: "Cómo decide el gateway", steps: ["Valida el JWT", "Consulta la API externa con httpx", "Filtra por dueno_de_activo", "Devuelve los activos"] },
  { kind: "sequence", name: "secuencia", title: "Login", actors: ["Cliente", "Gateway", "PostgreSQL"], messages: [{ from: "Cliente", to: "Gateway", label: "POST /auth/login" }, { from: "Gateway", to: "PostgreSQL", label: "usuario" }, { from: "Gateway", to: "Cliente", label: "JWT" }] },
  { kind: "comparison", name: "comparacion", title: "Dónde autorizar", columns: ["Gateway", "API original"], rows: [{ criterion: "Cambios en la API", values: ["Ninguno", "Muchos"] }, { criterion: "Latencia", values: ["Una llamada extra", "Sin salto"] }] },
  { kind: "bars", name: "barras", title: "Tiempo por documento", unit: "s", bars: [{ label: "GPU", value: 30 }, { label: "CPU", value: 90 }], source: "README del repositorio" },
  { kind: "code", name: "codigo", title: "Filtro por dueño", language: "python", code: "assets = [a for a in all_assets\n          if a['dueno'] == user.owner]" },
];

test("renderSvg produce SVG accesible (title, desc, role=img) para cada tipo de diagrama", () => {
  for (const spec of specs) {
    const svg = renderSvg(spec);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /role="img"/);
    assert.match(svg, new RegExp(`<desc id="v-${spec.name}-d">`));
    assert.doesNotMatch(svg, /undefined|NaN/);
    assert.ok(altText(spec).length > 20);
  }
  assert.match(renderSvg({ ...(specs[0] as Extract<VisualSpec, { kind: "flow" }>), title: "<script>x</script>" }), /&lt;script&gt;/, "el texto se escapa");
});

test("renderPng genera PNG con las medidas exactas de cada formato", async () => {
  const cover: VisualSpec = { kind: "cover", name: "portada", title: "Control de acceso por propiedad en FastAPI", category: "security", kicker: "Ciberseguridad · Caso de estudio" };
  for (const preset of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
    const png = await renderPng(cover, preset);
    assert.deepEqual(pngSize(png), PRESETS[preset], preset);
  }
  assert.deepEqual(pngSize(await renderPng(specs[0], "linkedin")), PRESETS.linkedin);
  await assert.rejects(renderPng({ ...(specs[0] as Extract<VisualSpec, { kind: "flow" }>), steps: Array.from({ length: 8 }, (_, i) => `Paso ${i} ${"con texto largo ".repeat(6)}`) }, "linkedin"), VisualFitError);
});

test("seoReport: estructura citable, longitudes y proyectos relacionados", () => {
  const r = seoReport(
    { title: "Control de acceso por propiedad en FastAPI", description: "d".repeat(130), summary: "palabra ".repeat(45), tags: ["FastAPI", "JWT"], faq: [], body: BODY_ES },
    "es"
  );
  assert.deepEqual(r.errors, []);
  assert.deepEqual(relatedProjects({ title: "Gateway con FastAPI y JWT", tags: ["FastAPI", "JWT", "PostgreSQL"], body: "" }).slice(0, 1), ["api-auth-hackaton"]);
  const short = seoReport({ title: "", description: "corta", summary: "x", tags: [], faq: [{ q: "q", a: "a" }], body: "Poco texto. ![](/x.png)" }, "es");
  assert.ok(short.errors.length >= 3);
  assert.ok(short.warnings.some((w) => /FAQ de una sola pregunta/.test(w)));
});

test("linter: reglas nuevas sin penalizar términos técnicos correctos", () => {
  const hit = (text: string, kind: "blog" | "linkedin" = "blog") => [...lintText(text, kind).p1, ...lintText(text, kind).p2].map((f) => f.rule);
  assert.ok(hit("Una solución innovadora y de última generación.").includes("marketing vacío"));
  assert.ok(hit("En mi experiencia, esto siempre falla.").includes("experiencia simulada"));
  assert.ok(hit("La arquitectura es escalable.").includes("«escalable» sin evidencia"));
  assert.ok(!hit("Es escalable: probamos 3 réplicas con 2.000 peticiones.").includes("«escalable» sin evidencia"));
  assert.ok(!hit("Usamos errores estándar robustos (robust standard errors) en la regresión.").length);
  assert.ok(hit("## Contexto\n\n## Decisión\n\nTexto.").includes("encabezado vacío"));
  assert.ok(hit("## Conclusión\n\nTodo salió bien.").includes("sección de conclusión genérica"));
  assert.ok(hit("- Rápido\n- Seguro\n- Simple\n- Barato\n- Moderno\n").includes("lista sin explicación"));
  assert.ok(hit("```\nx = 1\n```").includes("bloque de código sin lenguaje"));
});

test("storyboard para Hyperframes: derivado del artículo, validado y con composición HTML sin render", async () => {
  const { storyboardFromArticle, compositionHtml, totalDuration } = await import("../video/storyboard.ts");
  const sb = storyboardFromArticle({
    slug: "control-de-acceso",
    locale: "es",
    title: "Control de acceso por propiedad",
    summary: "Un gateway filtra por dueño. El token dura 30 minutos.",
    body: BODY_ES,
    url: "https://mangel14.dev/es/blog/control-de-acceso",
    visuals: [specs[0]],
  });
  assert.deepEqual(sb.scenes.map((s) => s.kind), ["title", "visual", "claim", "claim", "claim", "outro"]);
  assert.ok(sb.scenes.filter((s) => s.kind === "claim").every((s) => s.kind === "claim" && s.source === "artículo"));
  assert.equal(sb.captions.length, sb.scenes.length, "subtítulos para ver sin audio");
  const html = compositionHtml(sb);
  assert.match(html, /data-composition-id="root"/);
  assert.match(html, /gsap\.timeline\(\{ paused: true \}\)/);
  assert.match(html, /window\.__timelines\["root"\] = tl/);
  assert.match(html, new RegExp(`tl\\.set\\(\\{\\}, \\{\\}, ${totalDuration(sb)}\\)`), "el timeline dura lo mismo que el storyboard");
  assert.equal((html.match(/class="step"/g) ?? []).length, 4, "cada paso del flujo se anima por separado");
});
