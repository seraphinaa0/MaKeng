CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  prompt TEXT NOT NULL,
  essay TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','processing','retrying','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER,
  lease_token TEXT,
  error_code TEXT,
  evaluation TEXT,
  overall REAL,
  UNIQUE(owner, idempotency_key)
);
CREATE INDEX IF NOT EXISTS jobs_ready ON submissions(status, available_at, lease_until);
CREATE INDEX IF NOT EXISTS submissions_owner ON submissions(owner, created_at);
CREATE TABLE IF NOT EXISTS request_events (
  owner TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_owner ON request_events(owner, created_at);
CREATE TABLE IF NOT EXISTS model_runs (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  rubric_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost REAL NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
PRAGMA user_version = 1;
