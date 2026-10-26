import { test } from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../lib/lint.ts";

// Frases con marcas: todas deben detectarse
const dirty: [string, "linkedin" | "blog"][] = [
  ["En el mundo actual la automatización es clave.", "blog"],
  ["Quiero potenciar los procesos del equipo.", "blog"],
  ["No es solo una herramienta, es una forma de trabajar.", "blog"],
  ["Cabe destacar que el sistema escala.", "blog"],
  ["¿Y tú qué opinas? 👇", "linkedin"],
  ["Nadie te cuenta esto sobre FastAPI.", "linkedin"],
  ["Los expertos coinciden en que es mejor.", "blog"],
  ["Esto lo cambia todo para los equipos.", "blog"],
  ["El sistema ahorró [DATO?: horas] por semana.", "blog"],
  ["Let's dive into the architecture.", "blog"],
  ["We leverage LLMs to unlock value.", "blog"],
  ["It's not just a gateway, it's a platform.", "blog"],
  ["The API serves as the entry point.", "blog"],
  ["What do you think?", "linkedin"],
  ["I hope this helps!", "linkedin"],
  ["Studies show that agents fail.", "blog"],
  ["🚀 Primer punto\n🔥 Segundo punto", "linkedin"],
  ["Mira el repo: https://github.com/x/y", "linkedin"],
  ["#IA #Automatización #Tech #Futuro", "linkedin"],
  ["This could potentially break in production.", "blog"],
];

// Frases limpias: ninguna debe bloquearse
const clean: [string, "linkedin" | "blog"][] = [
  ["Mi API tardaba 1,8 s en responder. El problema era el token, no la base de datos.", "linkedin"],
  ["El gateway pide hasta 2.000 registros y filtra en memoria.", "blog"],
  ["Entregué la integración en 4 días.", "linkedin"],
  ["El token de acceso dura 30 minutos y el de refresco 7 días.", "blog"],
  ["I built the backend, the frontend and the two-factor authentication.", "blog"],
  ["The pipeline runs in under 60 seconds with less than 4 GB of RAM.", "blog"],
  ["¿Alguien cachea tokens de servicio en Redis o en memoria del proceso?", "linkedin"],
  ["#FastAPI #n8n", "linkedin"],
  ["Usa `potenciar` solo si es el nombre de una función.", "blog"],
  ["```python\n# leverage this\nx = 1\n```\nEl código no se juzga.", "blog"],
];

test("detecta todas las marcas P0/P1 del set sucio", () => {
  const missed = dirty.filter(([text, kind]) => !lintText(text, kind).blocked).map(([t]) => t);
  assert.deepEqual(missed, []);
});

test("no bloquea frases limpias", () => {
  const flagged = clean
    .map(([text, kind]) => ({ text, report: lintText(text, kind) }))
    .filter((r) => r.report.blocked)
    .map((r) => `${r.text} → ${[...r.report.p0, ...r.report.p1].map((f) => f.rule).join(", ")}`);
  assert.deepEqual(flagged, []);
});

test("el marcador [DATO?] es P0", () => {
  const r = lintText("Ahorramos [DATO?: horas por semana].", "blog");
  assert.equal(r.p0[0]?.rule, "dato pendiente");
});
