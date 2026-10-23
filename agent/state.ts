import { Annotation } from "@langchain/langgraph";
import type { Channel, EditorialStatus } from "./editorial.ts";
import type { Attachment, SourceDoc } from "./inputs.ts";
import type { LintReport } from "./lib/lint.ts";
import type { ArticleType, Category } from "../lib/taxonomy.ts";
import type { SeoReport } from "./seo.ts";
import type { VisualSpec } from "./visuals/scene.ts";

export interface BlogDraft {
  title: string;
  description: string;
  summary: string;
  tags: string[];
  /** Solo preguntas que el material responde; [] por defecto */
  faq: { q: string; a: string }[];
  body: string;
  articleType?: ArticleType;
}

export interface Slide {
  title: string;
  body: string;
}

/** Afirmación extraída de las fuentes, con su trazabilidad */
export interface Claim {
  text: string;
  /** ids de fuente (S1, S2…) que la respaldan */
  sources: string[];
  /** author = la dijo Miguel; sourced = está en una fuente externa citada; unsourced = no se pudo rastrear */
  status: "author" | "sourced" | "unsourced";
  numeric: boolean;
}

export interface RawClaim {
  text: string;
  sources: string[];
  /** Qué respalda la afirmación dentro de la fuente */
  support: "code" | "test" | "doc" | "citation" | "none";
}

export interface Research {
  topic: string;
  topics: string[];
  category: Category;
  articleType: ArticleType;
  /** Por qué ese tipo y ese enfoque, en una frase */
  angle: string;
  /** Datos esenciales que faltan para no inventar */
  questions: string[];
  /** Material de cliente o privado que no debería publicarse */
  privateMaterial: string[];
  /** Flujo ordenado que justifica un diagrama, si el material lo describe */
  flow: { title: string; steps: string[] } | null;
}

export interface EvalScores {
  specificity: number;
  factDensity: number;
  aiMarkers: number;
  categoryFit: number;
  note: string;
  /** Deterministas */
  lintFindings: number;
  missingFacts: number;
  words: number;
}

export type ReviewAction =
  | "accept" // acepta la propuesta (con ajustes opcionales)
  | "approve"
  | "edit"
  | "reschedule"
  | "reject"
  | "expire"
  | "retry"
  | "force"
  | "preview"; // vuelve a mandar la vista previa

export interface Review {
  action: ReviewAction;
  instructions?: string;
  /** ISO, para reschedule */
  at?: string;
  /** Canales que se aprueban */
  channels?: Channel[];
  /** Hash de la versión que vio el autor: si no coincide, la aprobación no vale */
  hash?: string;
  /** Al aceptar la propuesta: qué hacer con las cifras sin fuente */
  unsourced?: "mark" | "drop";
}

export interface Steps {
  commit?: string;
  assets?: string[];
  deployed?: boolean;
  validated?: boolean;
  carouselUrn?: string;
  imageUrn?: string;
  linkedin?: string;
  comment?: boolean;
  indexNow?: number;
}

/** Resultado del validador posterior a la publicación */
export interface PublishCheck {
  url: string;
  status: number;
  checks: Record<string, boolean>;
}

/** A qué nodo vuelve el grafo cuando se reanuda una pausa ("hold") */
export type RetryTarget = "waitDeploy" | "publishLinkedIn";

const last = <T,>(initial: () => T) => Annotation<T>({ reducer: (_prev, next) => next, default: initial });

export const ContentState = Annotation.Root({
  contentId: last<string>(() => ""),
  version: last<number>(() => 0),
  contentHash: last<string>(() => ""),

  // Entrada
  note: last<string>(() => ""),
  forwarded: last<boolean>(() => false),
  attachments: last<Attachment[]>(() => []),
  /** Ajustes del autor acumulados (respuestas a la propuesta y ediciones) */
  instructions: last<string[]>(() => []),
  sources: last<SourceDoc[]>(() => []),
  notices: last<string[]>(() => []),

  // Investigación
  research: last<Research | null>(() => null),
  claims: last<Claim[]>(() => []),
  unsourced: last<"mark" | "drop">(() => "mark"),
  /** La respuesta del autor trajo material nuevo: se investiga otra vez antes de redactar */
  rerunResearch: last<boolean>(() => false),

  // Formato
  format: last<"text" | "carousel">(() => "text"),
  linkedinLang: last<"es" | "en">(() => "en"),
  linkedinMedia: last<"none" | "card">(() => "none"),

  // Borradores
  slug: last<string>(() => ""),
  date: last<string>(() => ""),
  blogEs: last<BlogDraft | null>(() => null),
  blogEn: last<BlogDraft | null>(() => null),
  linkedin: last<string>(() => ""),
  slides: last<Slide[]>(() => []),
  visuals: last<VisualSpec[]>(() => []),
  relatedProjects: last<string[]>(() => []),

  // Validación
  lint: last<Record<string, LintReport>>(() => ({})),
  seo: last<SeoReport | null>(() => null),
  missingFacts: last<string[]>(() => []),
  evalScores: last<EvalScores | null>(() => null),

  // Revisión y publicación
  review: last<Review | null>(() => null),
  approvedChannels: last<Channel[]>(() => []),
  publishedChannels: last<Channel[]>(() => []),
  scheduledFor: last<string | null>(() => null),
  retryTarget: last<RetryTarget | null>(() => null),
  steps: last<Steps>(() => ({})),
  checks: last<PublishCheck[]>(() => []),
  status: last<EditorialStatus>(() => "received"),
  /** Mensaje de progreso que se edita en lugar de mandar uno por etapa */
  progressId: last<number | null>(() => null),
  progressLines: last<string[]>(() => []),
  /** Resumen de la última edición para contarle al autor qué cambió */
  changeNote: last<string>(() => ""),
  error: last<string | null>(() => null),
});

export type State = typeof ContentState.State;
export type Update = typeof ContentState.Update;
