// Lo que el agente necesita de los explicadores sin cargar componentes de React:
// encontrar cuál pide el material, insertarlo en el artículo y dibujar sus pasos como carrusel.
import type { Slide } from "../../agent/state.ts";
import { approvalGateSteps, COPY as APPROVAL } from "./approval-gate.ts";
import { blastRadiusSteps, COPY as RADIUS } from "./blast-radius.ts";
import { UI, type Locale } from "./common.ts";
import { isWidgetId, type WidgetId } from "./ids.ts";
import { restoreCheckSteps, COPY as RESTORE } from "./restore-check.ts";
import { secretRotationSteps, COPY as ROTATION } from "./secret-rotation.ts";
import { updateDaySteps, COPY as UPDATE } from "./update-day.ts";

export { WIDGET_IDS, isWidgetId, type WidgetId } from "./ids.ts";

/** "Widget: blast-radius" en el material pide ese explicador. Un id que no está en la lista se ignora. */
export function widgetHint(text: string): WidgetId | null {
  const id = text.match(/\bWidget:\s*([a-z][a-z0-9-]*)/i)?.[1]?.toLowerCase();
  return id && isWidgetId(id) ? id : null;
}

const BLOCK = (id: WidgetId) => "```widget\n" + id + "\n```";

/** Id del primer bloque ```widget del cuerpo, si es de la lista cerrada */
export function widgetIn(body: string): WidgetId | null {
  const id = body.match(/```widget[ \t]*\n[ \t]*([^\n`]*?)[ \t]*\n```/)?.[1];
  return id && isWidgetId(id) ? id : null;
}

/** Deja exactamente un bloque del explicador, antes del segundo encabezado (o al final); quita bloques con ids desconocidos o repetidos */
export function ensureWidget(rawBody: string, id: WidgetId): string {
  // Si el modelo copió la pista del material, se quita: no es parte del artículo
  const body = rawBody.replace(/^[ \t]*Widget:[ \t]*[a-z0-9-]*\.?[ \t]*\n?/gim, "");
  const blocks = [...body.matchAll(/```widget[ \t]*\n[^\n`]*\n```/g)];
  if (blocks.length === 1 && widgetIn(body) === id) return body;
  const stripped = body.replace(/```widget[ \t]*\n[^\n`]*\n```[ \t]*\n*/g, "");
  const headings = [...stripped.matchAll(/^##\s/gm)].map((m) => m.index ?? 0);
  const at = headings.length >= 2 ? headings[1] : stripped.length;
  return `${stripped.slice(0, at).trimEnd()}\n\n${BLOCK(id)}\n\n${stripped.slice(at).trimStart()}`.trimEnd() + "\n";
}

type Explainer = {
  copy: Record<Locale, { cover: string; legend: string; note: string }>;
  /** Los 5 pasos con la protección apagada (false) o activa (true) */
  steps: (locale: Locale, protectedMode: boolean) => { caption: string }[];
};

const EXPLAINERS: Record<WidgetId, Explainer> = {
  "approval-gate": { copy: APPROVAL, steps: (l, on) => approvalGateSteps(l, on, on ? "denied" : null) },
  "blast-radius": { copy: RADIUS, steps: (l, on) => blastRadiusSteps(l, on) },
  "secret-rotation": { copy: ROTATION, steps: (l, on) => secretRotationSteps(l, on) },
  "restore-check": { copy: RESTORE, steps: (l, on) => restoreCheckSteps(l, on) },
  "update-day": { copy: UPDATE, steps: (l, on) => updateDaySteps(l, on) },
};

const WORDS = {
  en: { step: "Step", without: "Without it", withIt: "With it", status: "Status", closing: "Full article on my portfolio." },
  es: { step: "Paso", without: "Sin eso", withIt: "Con eso", status: "Estado", closing: "Artículo completo en mi portafolio." },
} as const;

/**
 * Láminas del carrusel de LinkedIn salidas de los mismos pasos que anima el sitio: portada, los pasos
 * comunes, el cierre sin y con la protección, el estado real del diseño y la firma.
 */
export function explainerSlides(id: WidgetId, locale: Locale, author = "Miguel Bonilla"): Slide[] {
  const e = EXPLAINERS[id];
  const w = WORDS[locale];
  const off = e.steps(locale, false);
  const on = e.steps(locale, true);
  let common = 0;
  while (common < off.length && off[common].caption === on[common].caption) common++;
  const slides: Slide[] = [{ title: e.copy[locale].cover, body: e.copy[locale].legend }];
  for (let i = 0; i < Math.min(common, 3); i++) slides.push({ title: `${w.step} ${i + 1}`, body: off[i].caption });
  const tail = (steps: { caption: string }[]) => steps.slice(-2).map((s) => s.caption).join(" ");
  slides.push({ title: w.without, body: tail(off) }, { title: w.withIt, body: tail(on) });
  slides.push({ title: w.status, body: e.copy[locale].note }, { title: author, body: w.closing });
  return slides;
}

/** Texto de interfaz común, por si el carrusel necesita rotular algo más */
export { UI };
