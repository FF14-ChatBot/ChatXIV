-- Feedback submissions (TR-24, FR-25, FR-27).
-- Idempotency enforced by UNIQUE constraint on idempotency_key.

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL,
  reason_code TEXT,
  free_text TEXT,
  category TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_idempotency_key ON feedback_submissions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback_submissions(category);
