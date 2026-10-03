CREATE TABLE IF NOT EXISTS reading_attempts (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  set_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted')),
  revision INTEGER NOT NULL DEFAULT 0,
  answers TEXT NOT NULL DEFAULT '{}',
  flagged TEXT NOT NULL DEFAULT '[]',
  result TEXT,
  created_at TEXT NOT NULL,
  submitted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS reading_one_active ON reading_attempts(owner,set_id) WHERE status='in_progress';
CREATE INDEX IF NOT EXISTS reading_owner ON reading_attempts(owner,created_at);
PRAGMA user_version = 2;
