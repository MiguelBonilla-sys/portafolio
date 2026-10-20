import { Pool } from "pg";

// Un pool por instancia de función. Supabase/Neon aceptan la URL con sslmode en la cadena.
let pool: Pool | null = null;

export function getPool(databaseUrl: string): Pool {
  if (!pool) pool = new Pool({ connectionString: databaseUrl, max: 3 });
  return pool;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS content_log (
  content_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  source_type text NOT NULL,
  pillar text,
  format text NOT NULL DEFAULT 'text',
  status text NOT NULL,
  title text,
  scheduled_for timestamptz,
  preview_message_id bigint,
  eval_scores jsonb,
  published_urls jsonb
);
CREATE INDEX IF NOT EXISTS content_log_status_idx ON content_log (status, scheduled_for);

CREATE TABLE IF NOT EXISTS agent_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id bigint PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
`;

export type ContentStatus =
  | "generating"
  | "blocked"
  | "awaiting_approval"
  | "scheduled"
  | "publishing"
  | "awaiting_deploy"
  | "published"
  | "rejected"
  | "expired"
  | "failed";

export interface ContentRow {
  content_id: string;
  status: ContentStatus;
  title: string | null;
  scheduled_for: string | null;
  preview_message_id: number | null;
  updated_at: string;
  eval_scores: Record<string, number | string> | null;
  published_urls: Record<string, string> | null;
}

/** Registro consultable de cada pieza (el estado completo vive en el checkpoint de LangGraph). */
export interface ContentStore {
  ensureSchema(): Promise<void>;
  upsert(contentId: string, fields: Partial<Omit<ContentRow, "content_id">> & { source_type?: string; pillar?: string; format?: string }): Promise<void>;
  get(contentId: string): Promise<ContentRow | null>;
  byStatus(status: ContentStatus): Promise<ContentRow[]>;
  dueScheduled(now: Date): Promise<ContentRow[]>;
  staleAwaiting(olderThan: Date): Promise<ContentRow[]>;
  since(date: Date): Promise<(ContentRow & { created_at: string })[]>;
  kvGet<T>(key: string): Promise<T | null>;
  kvSet(key: string, value: unknown): Promise<void>;
  kvDelete(key: string): Promise<void>;
  /** true si el update de Telegram es nuevo (deduplicación de reintentos) */
  claimUpdate(updateId: number): Promise<boolean>;
}

export function createContentStore(databaseUrl: string): ContentStore {
  const db = () => getPool(databaseUrl);
  let schemaReady = false;

  return {
    async ensureSchema() {
      if (schemaReady) return;
      await db().query(SCHEMA_SQL);
      schemaReady = true;
    },

    async upsert(contentId, fields) {
      const toDb = (v: unknown) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v);
      const insert: Record<string, unknown> = { source_type: "telegram_note", status: "generating", ...fields };
      const insertCols = Object.keys(insert);
      const updateCols = Object.keys(fields);
      const params = [contentId, ...insertCols.map((c) => toDb(insert[c]))];
      const setClause = [...updateCols.map((c) => `${c} = EXCLUDED.${c}`), "updated_at = now()"].join(", ");
      await db().query(
        `INSERT INTO content_log (content_id, ${insertCols.join(", ")})
         VALUES (${params.map((_, i) => `$${i + 1}`).join(", ")})
         ON CONFLICT (content_id) DO UPDATE SET ${setClause}`,
        params
      );
    },

    async get(contentId) {
      const { rows } = await db().query("SELECT * FROM content_log WHERE content_id = $1", [contentId]);
      return (rows[0] as ContentRow) ?? null;
    },

    async byStatus(status) {
      const { rows } = await db().query("SELECT * FROM content_log WHERE status = $1 ORDER BY updated_at", [status]);
      return rows as ContentRow[];
    },

    async dueScheduled(now) {
      const { rows } = await db().query(
        "SELECT * FROM content_log WHERE status = 'scheduled' AND scheduled_for <= $1 ORDER BY scheduled_for",
        [now.toISOString()]
      );
      return rows as ContentRow[];
    },

    async staleAwaiting(olderThan) {
      const { rows } = await db().query(
        "SELECT * FROM content_log WHERE status IN ('awaiting_approval', 'blocked') AND updated_at < $1",
        [olderThan.toISOString()]
      );
      return rows as ContentRow[];
    },

    async since(date) {
      const { rows } = await db().query("SELECT * FROM content_log WHERE created_at >= $1 ORDER BY created_at", [date.toISOString()]);
      return rows as (ContentRow & { created_at: string })[];
    },

    async kvGet<T>(key: string) {
      const { rows } = await db().query("SELECT value FROM agent_kv WHERE key = $1", [key]);
      return rows[0] ? (rows[0].value as T) : null;
    },

    async kvSet(key, value) {
      await db().query(
        `INSERT INTO agent_kv (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, JSON.stringify(value)]
      );
    },

    async kvDelete(key) {
      await db().query("DELETE FROM agent_kv WHERE key = $1", [key]);
    },

    async claimUpdate(updateId) {
      const { rowCount } = await db().query(
        "INSERT INTO telegram_updates (update_id) VALUES ($1) ON CONFLICT DO NOTHING",
        [updateId]
      );
      return rowCount === 1;
    },
  };
}
