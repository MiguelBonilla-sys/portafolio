import { Annotation } from "@langchain/langgraph";
import type { LintReport } from "./lib/lint.ts";
import type { Pillar } from "./prompts.ts";

export interface BlogDraft {
  title: string;
  description: string;
  summary: string;
  tags: string[];
  faq: { q: string; a: string }[];
  body: string;
}

export interface Slide {
  title: string;
  body: string;
}

export interface EvalScores {
  specificity: number;
  factDensity: number;
  aiMarkers: number;
  pillarFit: number;
  note: string;
  /** Deterministas */
  lintFindings: number;
  missingFacts: number;
  words: number;
}

export type ReviewAction = "approve" | "edit" | "reschedule" | "reject" | "expire" | "retry";

export interface Review {
  action: ReviewAction;
  instructions?: string;
  /** ISO, para reschedule */
  at?: string;
}

export interface Steps {
  commit?: string;
  deployed?: boolean;
  carouselUrn?: string;
  linkedin?: string;
  comment?: boolean;
  indexNow?: number;
}

/** A qué nodo vuelve el grafo cuando se reanuda una pausa ("hold") */
export type RetryTarget = "waitDeploy" | "publishLinkedIn";

const last = <T,>(initial: () => T) => Annotation<T>({ reducer: (_prev, next) => next, default: initial });

export const ContentState = Annotation.Root({
  contentId: last<string>(() => ""),
  source: last<string>(() => ""),
  sourceType: last<string>(() => "telegram_note"),
  format: last<"text" | "carousel">(() => "text"),
  linkedinLang: last<"es" | "en">(() => "en"),

  facts: last<string[]>(() => []),
  pillar: last<Pillar>(() => "backend"),
  topic: last<string>(() => ""),
  sourceUrls: last<string[]>(() => []),

  slug: last<string>(() => ""),
  date: last<string>(() => ""),
  blogEs: last<BlogDraft | null>(() => null),
  blogEn: last<BlogDraft | null>(() => null),
  linkedin: last<string>(() => ""),
  slides: last<Slide[]>(() => []),

  lint: last<Record<string, LintReport>>(() => ({})),
  missingFacts: last<string[]>(() => []),
  evalScores: last<EvalScores | null>(() => null),

  review: last<Review | null>(() => null),
  scheduledFor: last<string | null>(() => null),
  retryTarget: last<RetryTarget | null>(() => null),
  steps: last<Steps>(() => ({})),
  status: last<string>(() => "generating"),
  error: last<string | null>(() => null),
});

export type State = typeof ContentState.State;
export type Update = typeof ContentState.Update;
