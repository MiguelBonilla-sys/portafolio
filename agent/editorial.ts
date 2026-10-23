import { createHash } from "node:crypto";

/**
 * Estados editoriales de una pieza. El flujo normal es:
 * received → extracting → researching → awaiting_input → drafting → validating → awaiting_review
 *   → approved → publishing → (awaiting_deploy) → published
 * con desvíos a blocked, revising, scheduled, partially_published, failed, cancelled y expired.
 */
export const EDITORIAL_STATUSES = [
  "received",
  "extracting",
  "researching",
  "awaiting_input",
  "drafting",
  "validating",
  "awaiting_review",
  "blocked",
  "revising",
  "approved",
  "scheduled",
  "publishing",
  "awaiting_deploy",
  "published",
  "partially_published",
  "failed",
  "cancelled",
  "expired",
] as const;

export type EditorialStatus = (typeof EDITORIAL_STATUSES)[number];

const TERMINAL: EditorialStatus[] = ["published", "cancelled", "expired"];

/** Transiciones válidas. failed y cancelled se alcanzan desde cualquier estado no terminal. */
const NEXT: Record<EditorialStatus, EditorialStatus[]> = {
  received: ["extracting"],
  extracting: ["researching", "awaiting_input"],
  researching: ["awaiting_input", "drafting"],
  awaiting_input: ["drafting", "researching", "expired"],
  drafting: ["validating"],
  validating: ["awaiting_review", "blocked", "partially_published"],
  awaiting_review: ["approved", "revising", "scheduled", "expired", "awaiting_review"],
  blocked: ["revising", "expired", "blocked"],
  revising: ["validating"],
  approved: ["publishing", "awaiting_review", "blocked"],
  scheduled: ["approved", "revising", "scheduled"],
  publishing: ["awaiting_deploy", "published", "partially_published"],
  awaiting_deploy: ["publishing", "partially_published"],
  partially_published: ["approved", "publishing", "revising", "published", "partially_published"],
  published: [],
  failed: ["publishing", "approved", "awaiting_review", "partially_published", "published"],
  cancelled: [],
  expired: [],
};

export function canTransition(from: EditorialStatus, to: EditorialStatus): boolean {
  if (from === to && !TERMINAL.includes(from)) return true;
  if ((to === "failed" || to === "cancelled") && !TERMINAL.includes(from)) return true;
  return NEXT[from].includes(to);
}

export class TransitionError extends Error {}

export function assertTransition(from: EditorialStatus, to: EditorialStatus): void {
  if (!canTransition(from, to)) throw new TransitionError(`transición no permitida: ${from} → ${to}`);
}

export const isTerminal = (s: EditorialStatus) => TERMINAL.includes(s);

/** Estados en los que la pieza espera algo del autor */
export const WAITING_FOR_AUTHOR: EditorialStatus[] = ["awaiting_input", "awaiting_review", "blocked", "partially_published"];

/** Estados de la versión anterior del esquema, para migrar filas viejas */
export const LEGACY_STATUS: Record<string, EditorialStatus> = {
  generating: "drafting",
  awaiting_approval: "awaiting_review",
  rejected: "cancelled",
};

/** Etiquetas para el autor */
export const STATUS_LABEL: Record<EditorialStatus, string> = {
  received: "recibido",
  extracting: "extrayendo contenido",
  researching: "revisando fuentes",
  awaiting_input: "esperando tu respuesta",
  drafting: "redactando",
  validating: "validando",
  awaiting_review: "listo para revisar",
  blocked: "bloqueado: faltan datos o hay marcas por corregir",
  revising: "aplicando cambios",
  approved: "aprobado",
  scheduled: "programado",
  publishing: "publicando",
  awaiting_deploy: "esperando el deploy",
  published: "publicado",
  partially_published: "publicado en parte",
  failed: "con error",
  cancelled: "cancelado",
  expired: "expirado",
};

/** Hash estable del contenido publicable: una aprobación vale solo para el texto que vio el autor */
export function contentHash(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 12);
}

export type Channel = "blog" | "linkedin";
export const CHANNEL_LABEL: Record<Channel, string> = { blog: "blog", linkedin: "LinkedIn" };
