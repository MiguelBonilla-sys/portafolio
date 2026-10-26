import { Pool } from "pg";
import { LEGACY_STATUS, type EditorialStatus } from "../editorial.ts";
import type { Attachment } from "../inputs.ts";

// Un pool por instancia de función. Supabase/Neon aceptan la URL con sslmode en la cadena.
let pool: Pool | null = null;

export function getPool(databaseUrl: string): Pool {
  if (!pool) pool = new Pool({ connectionString: databaseUrl, max: 3 });
  return pool;
}

// Migración aditiva e idempotente: se puede ejecutar en cada arranque
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
ALTER TABLE content_log ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE content_log ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE content_log ADD COLUMN IF NOT EXISTS progress_message_id bigint;
ALTER TABLE content_log ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE content_log ADD COLUMN IF NOT EXISTS published_channels jsonb;
CREATE INDEX IF NOT EXISTS content_log_status_idx ON content_log (status, scheduled_for);
${Object.entries(LEGACY_STATUS)
  .map(([from, to]) => `UPDATE content_log SET status = '${to}' WHERE status = '${from}';`)
  .join("\n")}

CREATE TABLE IF NOT EXISTS content_events (
  id bigserial PRIMARY KEY,
  content_id uuid NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  from_status text,
  to_status text NOT NULL,
  version integer,
  detail text
);
CREATE INDEX IF NOT EXISTS content_events_content_idx ON content_events (content_id, at);

CREATE TABLE IF NOT EXISTS agent_kv (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id bigint PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_events (
  key text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_idx ON rate_events (key, at);
`;

/** @deprecated nombre anterior; los estados viven en editorial.ts */
export type ContentStatus = EditorialStatus;

export interface ContentRow {
  content_id: string;
  status: EditorialStatus;
  title: string | null;
  scheduled_for: string | null;
  preview_message_id: number | null;
  progress_message_id?: number | null;
  version?: number;
  content_hash?: string | null;
  category?: string | null;
  updated_at: string;
  eval_scores: Record<string, number | string> | null;
  published_urls: Record<string, string> | null;
  published_channels?: string[] | null;
}

export interface ContentEvent {
  from: EditorialStatus | null;
  to: EditorialStatus;
  version?: number;
  detail?: string;
}

/** Registro consultable de cada pieza (el estado completo vive en el checkpoint de LangGraph). */
export interface ContentStore {
  ensureSchema(): Promise<void>;
  upsert(
    contentId: string,
    fields: Partial<Omit<ContentRow, "content_id">> & { source_type?: string; pillar?: string; format?: string }
  ): Promise<void>;
  get(contentId: string): Promise<ContentRow | null>;
  byStatus(status: EditorialStatus): Promise<ContentRow[]>;
  /** Últimas piezas, para /drafts */
  recent(limit: number): Promise<ContentRow[]>;
  /** Pieza cuyo id empieza por el prefijo (los 8 caracteres que ve el autor) */
  findByPrefix(prefix: string): Promise<ContentRow | null>;
  dueScheduled(now: Date): Promise<ContentRow[]>;
  staleAwaiting(olderThan: Date): Promise<ContentRow[]>;
  since(date: Date): Promise<(ContentRow & { created_at: string })[]>;
  /** Historial de transiciones (trazabilidad) */
  event(contentId: string, event: ContentEvent): Promise<void>;
  kvGet<T>(key: string): Promise<T | null>;
  kvSet(key: string, value: unknown): Promise<void>;
  kvDelete(key: string): Promise<void>;
  /** Lee y borra en un paso: dos «listo» seguidos no arrancan dos piezas */
  kvTake<T>(key: string): Promise<T | null>;
  /**
   * Agrega una parte a la recolección `key` de forma atómica (los mensajes de un álbum llegan en paralelo).
   * Con `open`, la crea si no existe; con `false`, devuelve null si no hay una abierta.
   */
  collect(key: string, part: CollectedPart, open: false | { target?: string }): Promise<Collection | null>;
  /** true si el update de Telegram es nuevo (deduplicación de reintentos) */
  claimUpdate(updateId: number): Promise<boolean>;
  /** Registra un uso y dice si sigue dentro del límite (max por ventana) */
  rateHit(key: string, windowMs: number, max: number): Promise<boolean>;
  /** Toma un candado atómico que vence solo; false si otro proceso lo tiene */
  tryLock(key: string, ttlMs: number): Promise<boolean>;
}

/** Material que llega en varios mensajes para una sola pieza (/nuevo … «listo», o un álbum) */
export interface CollectedPart {
  note?: string;
  attachments: Attachment[];
  forwarded?: boolean;
}

export interface Collection {
  startedAt: string;
  parts: CollectedPart[];
  /** Pieza que espera respuesta a la propuesta: el material se le suma en vez de abrir otra */
  target?: string;
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
      const insert: Record<string, unknown> = { source_type: "telegram", status: "received", ...fields };
      const insertCols = Object.keys(insert);
      const updateCols = Object.keys(fields);
      // Los nombres de columna vienen del código, nunca del usuario; se validan igual
      for (const c of insertCols) if (!/^[a-z_]+$/.test(c)) throw new Error(`columna inválida: ${c}`);
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

    async recent(limit) {
      const { rows } = await db().query("SELECT * FROM content_log ORDER BY updated_at DESC LIMIT $1", [limit]);
      return rows as ContentRow[];
    },

    async findByPrefix(prefix) {
      if (!/^[0-9a-f-]{4,36}$/i.test(prefix)) return null;
      const { rows } = await db().query("SELECT * FROM content_log WHERE content_id::text LIKE $1 ORDER BY updated_at DESC LIMIT 2", [
        `${prefix.toLowerCase()}%`,
      ]);
      return rows.length === 1 ? (rows[0] as ContentRow) : null;
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
        "SELECT * FROM content_log WHERE status IN ('awaiting_review', 'blocked', 'awaiting_input') AND updated_at < $1",
        [olderThan.toISOString()]
      );
      return rows as ContentRow[];
    },

    async since(date) {
      const { rows } = await db().query("SELECT * FROM content_log WHERE created_at >= $1 ORDER BY created_at", [date.toISOString()]);
      return rows as (ContentRow & { created_at: string })[];
    },

    async event(contentId, e) {
      await db().query("INSERT INTO content_events (content_id, from_status, to_status, version, detail) VALUES ($1, $2, $3, $4, $5)", [
        contentId,
        e.from,
        e.to,
        e.version ?? null,
        e.detail?.slice(0, 500) ?? null,
      ]);
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

    async kvTake<T>(key: string) {
      const { rows } = await db().query("DELETE FROM agent_kv WHERE key = $1 RETURNING value", [key]);
      return rows[0] ? (rows[0].value as T) : null;
    },

    async collect(key, part, open) {
      const initial: Collection = { startedAt: new Date().toISOString(), parts: [part], ...(open && open.target ? { target: open.target } : {}) };
      const append = `value = jsonb_set(agent_kv.value, '{parts}', (agent_kv.value->'parts') || $2::jsonb), updated_at = now()`;
      const { rows } = open
        ? await db().query(
            `INSERT INTO agent_kv (key, value) VALUES ($1, $3::jsonb)
             ON CONFLICT (key) DO UPDATE SET ${append} RETURNING value`,
            [key, JSON.stringify([part]), JSON.stringify(initial)]
          )
        : await db().query(`UPDATE agent_kv SET ${append} WHERE key = $1 RETURNING value`, [key, JSON.stringify([part])]);
      return rows[0] ? (rows[0].value as Collection) : null;
    },

    async claimUpdate(updateId) {
      const { rowCount } = await db().query("INSERT INTO telegram_updates (update_id) VALUES ($1) ON CONFLICT DO NOTHING", [updateId]);
      return rowCount === 1;
    },

    async tryLock(key, ttlMs) {
      const { rowCount } = await db().query(
        `INSERT INTO agent_kv (key, value) VALUES ($1, '{"lock":true}')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
         WHERE agent_kv.updated_at < now() - ($2::text || ' milliseconds')::interval`,
        [key, String(ttlMs)]
      );
      return rowCount === 1;
    },

    async rateHit(key, windowMs, max) {
      const since = new Date(Date.now() - windowMs).toISOString();
      await db().query("DELETE FROM rate_events WHERE at < now() - interval '1 day'");
      const { rows } = await db().query("SELECT count(*)::int AS n FROM rate_events WHERE key = $1 AND at >= $2", [key, since]);
      if ((rows[0]?.n ?? 0) >= max) return false;
      await db().query("INSERT INTO rate_events (key) VALUES ($1)", [key]);
      return true;
    },
  };
}
