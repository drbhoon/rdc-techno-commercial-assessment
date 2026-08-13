/**
 * PostgreSQL storage layer via the `pg` package (pure JS — no native compilation).
 * Sessions are stored as JSONB blobs, keeping the same interface as the previous
 * JSON-file store so API routes need zero changes.
 *
 * Railway injects DATABASE_URL automatically when you add a PostgreSQL service.
 * For local dev, add DATABASE_URL to .env.local.
 */
import { getPool } from "./dbPool";
import type {
  CandidateInfo,
  ClientQuestion,
  AssessmentType,
  EvaluationResult,
} from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface StoredResponse {
  id: string;
  sessionId: string;
  position: number;
  questionId: string;
  questionText: string;
  modelAnswer: string;
  competencies: string[];
  transcript?: string;
  score?: number;
  evaluation?: EvaluationResult;
  recordedAt?: string;
}

export interface StoredSession {
  id: string;
  candidate: CandidateInfo;
  assessmentType: AssessmentType;
  questions: ClientQuestion[];
  startedAt: string;
  completedAt?: string;
  status: "in_progress" | "submitted" | "completed";
  responses: Record<number, StoredResponse>; // keyed by position 1-20
}

// ── Schema init (idempotent) ──────────────────────────────────────────────────
let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rdc_sessions (
      id          TEXT PRIMARY KEY,
      data        JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_rdc_sessions_created
      ON rdc_sessions (created_at DESC);

    -- Identity, as real columns rather than only inside the JSONB blob. The
    -- session record stays the blob; these exist so a person's assessments can
    -- be found without every query digging through JSON.
    --
    -- CREATE TABLE IF NOT EXISTS is a no-op on an existing table, so new
    -- columns need saying explicitly or they appear only on fresh installs.
    ALTER TABLE rdc_sessions ADD COLUMN IF NOT EXISTS person_id BIGINT;
    ALTER TABLE rdc_sessions ADD COLUMN IF NOT EXISTS employee_code TEXT;
    -- The address exactly as given, kept beside the resolved id: the address
    -- book can change afterwards, and without this there is no record of what
    -- the link was actually made from.
    ALTER TABLE rdc_sessions ADD COLUMN IF NOT EXISTS captured_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_rdc_sessions_person
      ON rdc_sessions (person_id);
    CREATE INDEX IF NOT EXISTS idx_rdc_sessions_employee_code
      ON rdc_sessions (employee_code);
  `);
  schemaReady = true;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function createSession(session: StoredSession): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO rdc_sessions (id, data, person_id, employee_code, captured_email)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      session.id,
      JSON.stringify(session),
      session.candidate.personId ?? null,
      session.candidate.employeeId || null,
      session.candidate.email || null,
    ]
  );
}

export async function getSession(
  sessionId: string
): Promise<StoredSession | null> {
  await ensureSchema();
  const res = await getPool().query(
    "SELECT data FROM rdc_sessions WHERE id = $1",
    [sessionId]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].data as StoredSession;
}

export async function updateSession(session: StoredSession): Promise<void> {
  await ensureSchema();
  await getPool().query(
    "UPDATE rdc_sessions SET data = $2, updated_at = NOW() WHERE id = $1",
    [session.id, JSON.stringify(session)]
  );
}

export async function listSessions(): Promise<StoredSession[]> {
  await ensureSchema();
  const res = await getPool().query(
    "SELECT data FROM rdc_sessions ORDER BY created_at DESC LIMIT 500"
  );
  return res.rows.map((r) => r.data as StoredSession);
}
