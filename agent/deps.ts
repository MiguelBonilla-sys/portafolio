import type { InputDeps } from "./inputs.ts";
import type { ContentStore } from "./lib/db.ts";
import type { GitHubClient } from "./lib/github.ts";
import type { LinkedInClient } from "./lib/linkedin.ts";
import type { ChatLike } from "./lib/llm.ts";
import type { TelegramClient } from "./lib/telegram.ts";
import type { Slide } from "./state.ts";
import type { Preset, VisualSpec } from "./visuals/scene.ts";

/** Todo lo externo que usa el grafo. En producción lo arma runtime.ts; en los tests, dobles en memoria. */
export interface AgentDeps {
  llm: ChatLike;
  telegram: TelegramClient;
  store: ContentStore;
  github: GitHubClient;
  /** Descarga de archivos de Telegram, URLs seguras y visión opcional */
  inputs: InputDeps;
  /** Lanza LinkedInAuthError si no hay token válido */
  linkedin: () => Promise<LinkedInClient>;
  /** Enlace nuevo para conectar LinkedIn (vence) */
  linkedinAuthUrl: () => string;
  renderCarousel?: (slides: Slide[], title: string) => Promise<Uint8Array>;
  /** PNG de una escena (portada, diagrama) */
  renderVisual?: (spec: VisualSpec, preset: Preset) => Promise<Uint8Array>;
  indexNow: (urls: string[]) => Promise<number>;
  fetchStatus: (url: string) => Promise<number>;
  /** HTML de una página del propio sitio, para validar lo publicado */
  fetchPage: (url: string) => Promise<{ status: number; html: string }>;
  sleep: (ms: number) => Promise<void>;
  siteUrl: string;
  timezone: string;
  deployWaitSeconds: number;
  now: () => Date;
}
